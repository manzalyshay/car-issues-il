/**
 * GET /api/cron/translate-news-backlog?limit=50[&skipGemini=1]
 * One-off/manual: rewrites in Hebrew the stored articles that still have no
 * title_he/body_he (newest first), using the same Gemini → Workers AI path and
 * circuit breaker as the daily refresh-news job, one article at a time.
 * Not on a schedule. Call repeatedly until `remaining` stops falling: each
 * translated row drops out of the WHERE clause, so no offset is needed.
 * `skipGemini=1` goes straight to Workers AI (saves the Gemini quota for the daily run).
 * Requires CRON_SECRET (refuses to run when it is not set). Each call is logged
 * in cron_runs as job 'translate-news-backlog'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { retranslateUntranslated } from '@/lib/carNews';
import { dbFirst } from '@/lib/db';
import { startRun, finishRun, runTrigger } from '@/lib/cronRuns';
import { newTranslationStats, newRunState } from '@/lib/newsTranslate';

const MAX_LIMIT = 200;

async function countBacklog(): Promise<number> {
  const row = await dbFirst<{ n: number }>(
    `SELECT COUNT(*) AS n FROM car_news WHERE (title_he IS NULL OR body_he IS NULL) AND title_en IS NOT NULL AND body_en IS NOT NULL`,
  );
  return row?.n ?? 0;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), MAX_LIMIT);
  const state = newRunState();
  if (req.nextUrl.searchParams.get('skipGemini') === '1') state.geminiSkipped = true;

  const started = Date.now();
  const runId = await startRun('translate-news-backlog', runTrigger(req));
  const stats = newTranslationStats();
  try {
    const before = await countBacklog();
    const translated = await retranslateUntranslated(limit, stats, state);
    const remaining = await countBacklog();
    const status = stats.attempted > 0 && stats.translated === 0 ? 'failed' : stats.untranslated > 0 ? 'partial' : 'ok';
    const detail = { limit, before, translated, remaining, geminiSkippedAfter429: state.geminiSkipped, translation: stats, elapsedMs: Date.now() - started };
    await finishRun(runId, status, detail);
    return NextResponse.json({ ok: status !== 'failed', status, ...detail }, { status: status === 'failed' ? 500 : 200 });
  } catch (err) {
    console.error('[translate-news-backlog]', err);
    await finishRun(runId, 'failed', { error: String(err), translation: stats, elapsedMs: Date.now() - started });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
