/**
 * /api/cron/scrape
 *
 * Called automatically by Vercel Cron every hour (see vercel.json).
 * Each call scrapes the 10 entries with the oldest (or missing) scraped_at.
 * Covers both general (year=null) and year-specific rows.
 *
 * Full rotation of all ~1,113 entries happens every ~5 days.
 *
 * Security: Vercel automatically sends the CRON_SECRET as
 *   Authorization: Bearer <CRON_SECRET>
 * For manual triggers, send the same header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { carDatabase, getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeExpertReviews } from '@/lib/expertReviews';

const BATCH_SIZE = 10;

export const maxDuration = 300; // Vercel Pro: 5 min max

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch all existing rows (general + year-specific)
  const { data: existing } = await sb
    .from('expert_reviews')
    .select('make_slug,model_slug,year,scraped_at')
    .order('scraped_at', { ascending: true });

  const scrapedMap = new Map(
    (existing ?? []).map((r: any) => [
      `${r.make_slug}/${r.model_slug}/${r.year ?? 'general'}`,
      r.scraped_at as string,
    ])
  );

  // Build full target list: general + all year-specific rows from carDatabase
  interface Target {
    makeSlug: string;
    modelSlug: string;
    year: number | null;
    make: (typeof carDatabase)[0];
    model: (typeof carDatabase)[0]['models'][0];
    scrapedAt: string | null;
  }

  const allTargets: Target[] = [];

  for (const make of carDatabase) {
    for (const model of make.models) {
      // General row
      allTargets.push({
        makeSlug: make.slug,
        modelSlug: model.slug,
        year: null,
        make,
        model,
        scrapedAt: scrapedMap.get(`${make.slug}/${model.slug}/general`) ?? null,
      });
      // Year-specific rows
      for (const year of model.years) {
        allTargets.push({
          makeSlug: make.slug,
          modelSlug: model.slug,
          year,
          make,
          model,
          scrapedAt: scrapedMap.get(`${make.slug}/${model.slug}/${year}`) ?? null,
        });
      }
    }
  }

  // Sort: never-scraped first, then oldest scraped_at
  allTargets.sort((a, b) => {
    if (!a.scrapedAt && !b.scrapedAt) return 0;
    if (!a.scrapedAt) return -1;
    if (!b.scrapedAt) return 1;
    return new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime();
  });

  const batch = allTargets.slice(0, BATCH_SIZE);
  const results: { key: string; saved: number }[] = [];

  for (const { makeSlug, modelSlug, year, make, model } of batch) {
    const saved = await scrapeExpertReviews(
      makeSlug, modelSlug,
      make.nameHe, model.nameHe,
      make.nameEn, model.nameEn,
      year ?? undefined,
    );
    const key = year ? `${makeSlug}/${modelSlug}/${year}` : `${makeSlug}/${modelSlug}`;
    results.push({ key, saved });
    await new Promise((r) => setTimeout(r, 1200));
  }

  return NextResponse.json({
    processed: results.length,
    saved: results.filter((r) => r.saved > 0).length,
    results,
    nextBatch: allTargets.slice(BATCH_SIZE, BATCH_SIZE + 3).map((m) =>
      m.year ? `${m.makeSlug}/${m.modelSlug}/${m.year}` : `${m.makeSlug}/${m.modelSlug}`
    ),
  });
}
