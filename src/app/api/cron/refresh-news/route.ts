/**
 * GET /api/cron/refresh-news
 * Fetches global car news (Motor1 + Car and Driver, alternating), AI-rewrites in
 * Hebrew (Gemini, Workers AI fallback), saves to D1. New articles are rewritten
 * first, then recent untranslated ones are retried, one article at a time, so a run
 * never fires a burst of Gemini calls; after the first Gemini 429 the rest of the
 * run uses Workers AI only (detail.geminiSkippedAfter429); 3 Gemini timeouts do the same. Untranslated articles are
 * retried only if stored in the last RETRY_MAX_AGE_DAYS (3) days - the older backlog
 * is left as is. Called by the Cloudflare Cron Trigger (daily at 06:00 UTC).
 * Protected by CRON_SECRET. Every run is recorded in `cron_runs` with per-feed
 * fetched / already-stored / picked counts, feed errors, and Hebrew rewrite
 * counts with a failure reason per provider. Status: failed when no new or
 * untranslated article got Hebrew from either provider, partial on a feed error or any article still
 * without Hebrew, ok otherwise.
 */
import { NextRequest, NextResponse } from 'next/server';
import { refreshCarNews, retranslateUntranslated, fillMissingNewsImages, type NewsRefreshStats } from '@/lib/carNews';
import { startRun, finishRun, runTrigger } from '@/lib/cronRuns';
import { newTranslationStats, newsRunStatus, newRunState } from '@/lib/newsTranslate';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const runId = await startRun('refresh-news', runTrigger(req));
  const stats: NewsRefreshStats = { saved: 0, sources: {}, translation: newTranslationStats() };
  const retryStats = newTranslationStats();
  const state = newRunState();
  try {
    // Sequential on purpose: in parallel these fired up to 25 Gemini calls at once.
    const newArticles = await refreshCarNews(5, stats, state);
    // 15 = 3-day retry window x 5 new articles a day, so every recent article gets a retry.
    const retranslated = await retranslateUntranslated(15, retryStats, state);
    // Run after the refresh so freshly inserted articles without a photo are covered too.
    const imagesFilled = await fillMissingNewsImages(10);
    const feedErrors = Object.values(stats.sources).filter(s => s.error).length;
    const status = newsRunStatus(feedErrors, [stats.translation!, retryStats]);
    const detail = {
      newArticles, retranslated, imagesFilled, sources: stats.sources,
      geminiSkippedAfter429: state.geminiSkipped,
      geminiSkipReason: state.geminiSkipReason ?? null,
      geminiTimeouts: state.geminiTimeouts,
      translation: { newArticles: stats.translation, retryUntranslated: retryStats },
      elapsedMs: Date.now() - started,
    };
    await finishRun(runId, status, detail);
    return NextResponse.json({ ok: status !== 'failed', status, ...detail }, { status: status === 'failed' ? 500 : 200 });
  } catch (err) {
    console.error('[refresh-news]', err);
    await finishRun(runId, 'failed', { error: String(err), sources: stats.sources, geminiSkippedAfter429: state.geminiSkipped, elapsedMs: Date.now() - started });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
