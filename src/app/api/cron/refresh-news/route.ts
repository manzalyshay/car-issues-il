/**
 * GET /api/cron/refresh-news
 * Fetches global car news (Motor1 + Car and Driver, alternating), AI-rewrites in
 * Hebrew, saves to D1. Called by the Cloudflare Cron Trigger (daily at 06:00 UTC).
 * Protected by CRON_SECRET. Every run is recorded in `cron_runs` with per-feed
 * fetched / already-stored / picked counts, feed errors, and Hebrew rewrite
 * counts with a failure reason per provider. Status: failed when no new or
 * untranslated article got Hebrew, partial on a feed error or any article still
 * without Hebrew, ok otherwise.
 */
import { NextRequest, NextResponse } from 'next/server';
import { refreshCarNews, retranslateUntranslated, retranslateShort, fillMissingNewsImages, type NewsRefreshStats } from '@/lib/carNews';
import { startRun, finishRun, runTrigger } from '@/lib/cronRuns';
import { newTranslationStats, newsRunStatus } from '@/lib/newsTranslate';

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
  try {
    const [newArticles, retranslated, retranslatedShort] = await Promise.all([
      refreshCarNews(5, stats),
      retranslateUntranslated(10, retryStats),
      retranslateShort(10, 150, shortStats),
    ]);
    // Run after the refresh so freshly inserted articles without a photo are covered too.
    const imagesFilled = await fillMissingNewsImages(10);
    const feedErrors = Object.values(stats.sources).filter(s => s.error).length;
    const status = newsRunStatus(feedErrors, [stats.translation!, retryStats]);
    const detail = {
      newArticles, retranslated, retranslatedShort, imagesFilled, sources: stats.sources,
      translation: { newArticles: stats.translation, retryUntranslated: retryStats, retryShort: shortStats },
      elapsedMs: Date.now() - started,
    };
    await finishRun(runId, status, detail);
    return NextResponse.json({ ok: status !== 'failed', status, ...detail }, { status: status === 'failed' ? 500 : 200 });
  } catch (err) {
    console.error('[refresh-news]', err);
    await finishRun(runId, 'failed', { error: String(err), sources: stats.sources, elapsedMs: Date.now() - started });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
