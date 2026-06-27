import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbRun } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/** POST — insert a pre-generated review directly (no LLM call) */
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    makeSlug, modelSlug, year,
    summaryHe, localSummaryHe, globalSummaryHe,
    localScore, globalScore,
    pros, cons,
  } = await req.json();

  if (!makeSlug || !modelSlug || !year || !summaryHe) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Skip if already exists
  const existing = await dbAll<{ id: string }>(
    'SELECT id FROM expert_reviews WHERE make_slug=? AND model_slug=? AND year=? LIMIT 1',
    makeSlug, modelSlug, Number(year)
  ).catch(() => []);
  if (existing.length > 0) return NextResponse.json({ skipped: true });

  const ls = Number(localScore) || 7;
  const gs = Number(globalScore) || 7;
  const topScore = (ls + gs) / 2;

  await dbRun(
    `INSERT INTO expert_reviews
       (id,make_slug,model_slug,year,source_name,source_url,original_title,
        summary_he,local_summary_he,global_summary_he,
        local_score,global_score,top_score,
        pros,cons,local_post_count,global_post_count,sources_breakdown,scraped_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    randomUUID(), makeSlug, modelSlug, Number(year),
    'AI Knowledge', '', '',
    summaryHe, localSummaryHe ?? null, globalSummaryHe ?? null,
    ls, gs, topScore,
    JSON.stringify(Array.isArray(pros) ? pros : []),
    JSON.stringify(Array.isArray(cons) ? cons : []),
    0, 0, '[]', new Date().toISOString(),
  );

  return NextResponse.json({ inserted: true, makeSlug, modelSlug, year });
}
