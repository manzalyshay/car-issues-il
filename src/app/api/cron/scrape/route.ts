/**
 * /api/cron/scrape
 *
 * Called automatically by Vercel Cron every hour (see vercel.json).
 * Each call scrapes up to 10 entries that are due (next_scrape_at is null or in the past).
 * Covers both general (year=null) and year-specific rows.
 * Intervals: AI-knowledge rows=7d, recent year rows=14d, general=30d, old year rows=90d.
 *
 * Security: Vercel automatically sends the CRON_SECRET as
 *   Authorization: Bearer <CRON_SECRET>
 * For manual triggers, send the same header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllMakes } from '@/lib/carsDb';
import type { CarMake, CarModel } from '@/lib/carsDb';
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
    .select('make_slug,model_slug,year,scraped_at,next_scrape_at')
    .order('next_scrape_at', { ascending: true, nullsFirst: true });

  // Map: key → next_scrape_at (null = never scraped = highest priority)
  const nextScrapeMap = new Map(
    (existing ?? []).map((r: any) => [
      `${r.make_slug}/${r.model_slug}/${r.year ?? 'general'}`,
      (r.next_scrape_at ?? null) as string | null,
    ])
  );

  const now = new Date();

  const carDatabase = await getAllMakes();

  // Build full target list: general + all year-specific rows from carDatabase
  interface Target {
    makeSlug: string;
    modelSlug: string;
    year: number | null;
    make: CarMake;
    model: CarModel;
    nextScrapeAt: string | null;
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
        nextScrapeAt: nextScrapeMap.get(`${make.slug}/${model.slug}/general`) ?? null,
      });
      // Year-specific rows
      for (const year of model.years) {
        allTargets.push({
          makeSlug: make.slug,
          modelSlug: model.slug,
          year,
          make,
          model,
          nextScrapeAt: nextScrapeMap.get(`${make.slug}/${model.slug}/${year}`) ?? null,
        });
      }
    }
  }

  // Sort: never-scraped (null) first, then by next_scrape_at ascending (most overdue first)
  allTargets.sort((a, b) => {
    if (!a.nextScrapeAt && !b.nextScrapeAt) return 0;
    if (!a.nextScrapeAt) return -1;
    if (!b.nextScrapeAt) return 1;
    return new Date(a.nextScrapeAt).getTime() - new Date(b.nextScrapeAt).getTime();
  });

  // Only process entries that are due (next_scrape_at is null or in the past)
  const dueTargets = allTargets.filter(
    (t) => !t.nextScrapeAt || new Date(t.nextScrapeAt) <= now,
  );

  const batch = dueTargets.slice(0, BATCH_SIZE);
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
    due: dueTargets.length,
    results,
    nextBatch: dueTargets.slice(BATCH_SIZE, BATCH_SIZE + 3).map((m) =>
      m.year ? `${m.makeSlug}/${m.modelSlug}/${m.year}` : `${m.makeSlug}/${m.modelSlug}`
    ),
  });
}
