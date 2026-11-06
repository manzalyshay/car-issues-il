/**
 * GET /api/cron/refresh-news
 * Fetches global car news (Motor1 + Car and Driver, alternating), AI-rewrites in
 * Hebrew (Gemini, Workers AI fallback), saves to D1. The three rewrite passes run
 * one after another (new articles first), each one article at a time, so a run
 * never fires a burst of Gemini calls; after the first Gemini 429 the rest of the
 * run uses Workers AI only (detail.geminiSkippedAfter429). Called by the Cloudflare Cron Trigger (daily at 06:00 UTC).
 * Protected by CRON_SECRET. Every run is recorded in `cron_runs` with per-feed
 * fetched / already-stored / picked counts, feed errors, and Hebrew rewrite
 * counts with a failure reason per provider. Status: failed when no new or
 * untranslated article got Hebrew from either provider, partial on a feed error or any article still
 * without Hebrew, ok otherwise.
 */
import { NextRequest, NextResponse } from 'next/server';
import { refreshCarNews, retranslateUntranslated, retranslateShort, fillMissingNewsImages, type NewsRefreshStats } from '@/lib/carNews';
import { startRun, finishRun, runTrigger } from '@/lib/cronRuns';
import { newTranslationStats, newsRunStatus, newRunState } from '@/lib/newsTranslate';

/** Re-writes of already-translated short articles per run (they are already readable). */
const MAX_SHORT_RETRIES = 3;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const runId = await startRun('refresh-news', runTrigger(req));
  const stats: NewsRefreshStats = { saved: 0, sources: {}, translation: newTranslationStats() };
  const retryStats = newTranslationStats();
  const shortStats = newTranslationStats();
  const state = newRunState();
  try {
    // Sequential on purpose: in parallel these fired up to 25 Gemini calls at once.
    const newArticles = await refreshCarNews(5, stats, state);
    const retranslated = await retranslateUntranslated(10, retryStats, state);
    const retranslatedShort = await retranslateShort(MAX_SHORT_RETRIES, 150, shortStats, state);
    // Run after the refresh so freshly inserted articles without a photo are covered too.
    const imagesFilled = await fillMissingNewsImages(10);
    const feedErrors = Object.values(stats.sources).filter(s => s.error).length;
    const status = newsRunStatus(feedErrors, [stats.translation!, retryStats]);
    const detail = {
      newArticles, retranslated, retranslatedShort, imagesFilled, sources: stats.sources,
      geminiSkippedAfter429: state.geminiSkipped,
      translation: { newArticles: stats.translation, retryUntranslated: retryStats, retryShort: shortStats },
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
