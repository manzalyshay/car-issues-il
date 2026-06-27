/**
 * D1 database accessor for Cloudflare Workers.
 * Uses getCloudflareContext() from @opennextjs/cloudflare to get the D1 binding.
 * Falls back to better-sqlite3 (local .sqlite file) when running via `next dev`.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface D1Env {
  DB: D1Database;
}

const LOCAL_SQLITE_PATH = process.env.LOCAL_SQLITE_PATH ??
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/94d3a3dca7223ebf64b57b6a465db86c2414ed4822522900b8878ff93c47b3f7.sqlite';

/** Wrap better-sqlite3 to look like a D1Database */
function makeLocalDB(): D1Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSQLite = require('better-sqlite3') as typeof import('better-sqlite3');
  const sqlite = new BetterSQLite(LOCAL_SQLITE_PATH, { readonly: true });

  const wrap = (sql: string, params: unknown[]): D1PreparedStatement => ({
    bind: (...args) => wrap(sql, args),
    all: async () => {
      const rows = sqlite.prepare(sql).all(...params);
      return { results: rows as Record<string, unknown>[], meta: {} as D1Meta, success: true };
    },
    first: async <T = unknown>() => {
      const row = sqlite.prepare(sql).get(...params);
      return (row ?? null) as T;
    },
    run: async () => {
      const info = sqlite.prepare(sql).run(...params);
      return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } as D1Meta };
    },
    raw: async () => {
      const rows = sqlite.prepare(sql).raw().all(...params);
      return rows as unknown[][];
    },
  });

  return {
    prepare: (sql: string) => wrap(sql, []),
    batch: async (statements) => Promise.all(statements.map(s => (s as ReturnType<typeof wrap>).run())),
    exec: async (sql) => { sqlite.exec(sql); return { count: 0, duration: 0 }; },
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

let _db: D1Database | null = null;

export async function getDB(): Promise<D1Database> {
  if (_db) return _db;
  // Skip wrangler spawn during next build — pages handle the error via try/catch
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('D1 not available at build time');
  }
  try {
    const ctx = await getCloudflareContext({ async: true });
    _db = (ctx.env as D1Env).DB;
    return _db;
  } catch {
    // Not in Workers context (e.g. next dev) — use local SQLite file
    _db = makeLocalDB();
    return _db;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run a query returning multiple rows. */
export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null)[]
): Promise<T[]> {
  const db = await getDB();
  const { results } = await db.prepare(sql).bind(...params).all();
  return (results ?? []) as T[];
}

/** Run a query returning a single row or null. */
export async function dbFirst<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null)[]
): Promise<T | null> {
  const db = await getDB();
  const result = await db.prepare(sql).bind(...params).first<T>();
  return result ?? null;
}

/** Run an INSERT/UPDATE/DELETE. */
export async function dbRun(
  sql: string,
  ...params: (string | number | null)[]
): Promise<D1Result> {
  const db = await getDB();
  return db.prepare(sql).bind(...params).run();
}

/** Run multiple statements in a batch (single round-trip). */
export async function dbBatch(
  statements: { sql: string; params?: (string | number | null)[] }[],
): Promise<void> {
  const db = await getDB();
  await db.batch(statements.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
}
