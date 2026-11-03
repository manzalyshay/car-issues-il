/**
 * Run ledger for scheduled jobs (table `cron_runs`, migration 0012) plus a tiny
 * key/value store for job cursors (`cron_state`). Every job run records when it
 * started and finished, whether it succeeded, and what it fetched and wrote, so
 * "did the daily job run?" can be answered from data instead of guesswork.
 */
import { dbFirst, dbRun } from './db';

export type RunStatus = 'running' | 'ok' | 'partial' | 'failed';

/** 'scheduled' when called by worker-entry's cron dispatcher, else 'manual'. */
export function runTrigger(req: Request): string {
  return req.headers.get('x-cron-trigger') ? 'scheduled' : 'manual';
}

export async function startRun(job: string, trigger: string): Promise<number | null> {
  try {
    const row = await dbFirst<{ id: number }>(
      `INSERT INTO cron_runs (job, trigger, started_at, status) VALUES (?, ?, datetime('now'), 'running') RETURNING id`,
      job, trigger,
    );
    return row?.id ?? null;
  } catch (err) {
    console.error('[cron_runs] start failed', err);
    return null;
  }
}

export async function finishRun(id: number | null, status: RunStatus, detail: Record<string, unknown>): Promise<void> {
  if (id == null) return;
  try {
    await dbRun(
      `UPDATE cron_runs SET finished_at = datetime('now'), status = ?, detail = ? WHERE id = ?`,
      status, JSON.stringify(detail).slice(0, 20000), id,
    );
  } catch (err) {
    console.error('[cron_runs] finish failed', err);
  }
}

export async function getState(key: string): Promise<string | null> {
  const row = await dbFirst<{ value: string | null }>('SELECT value FROM cron_state WHERE key = ?', key).catch(() => null);
  return row?.value ?? null;
}

export async function setState(key: string, value: string): Promise<void> {
  await dbRun(
    `INSERT INTO cron_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key, value,
  );
}
