import { NextRequest, NextResponse } from 'next/server';
import { getAllMakes } from '@/lib/carsDb';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll } from '@/lib/db';
import { scrapeExpertReviews } from '@/lib/expertReviews';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// GET — list all missing make/model/year combos
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [makes, existing] = await Promise.all([
    getAllMakes(),
    dbAll<{ make_slug: string; model_slug: string; year: number | null }>(
      'SELECT make_slug, model_slug, year FROM expert_reviews WHERE year IS NOT NULL'
    ),
  ]);

  const existingSet = new Set(existing.map(r => `${r.make_slug}/${r.model_slug}/${r.year}`));

  const missing: { makeSlug: string; modelSlug: string; year: number }[] = [];
  for (const make of makes) {
    for (const model of make.models) {
      for (const year of model.years) {
        const key = `${make.slug}/${model.slug}/${year}`;
        if (!existingSet.has(key)) {
          missing.push({ makeSlug: make.slug, modelSlug: model.slug, year });
        }
      }
    }
  }

  return NextResponse.json({ total: missing.length, missing });
}

// POST — generate ONE missing review (call repeatedly until done)
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, year } = await req.json();
  if (!makeSlug || !modelSlug || !year) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const yearNum = parseInt(year);

  // Check if already exists
  const existing = await dbAll<{ id: string }>(
    'SELECT id FROM expert_reviews WHERE make_slug=? AND model_slug=? AND year=? LIMIT 1',
    makeSlug, modelSlug, yearNum
  ).catch(() => []);
  if (existing.length > 0) {
    return NextResponse.json({ skipped: true, reason: 'already exists' });
  }

  const makes = await getAllMakes();
  const make = makes.find(m => m.slug === makeSlug);
  const model = make?.models.find(m => m.slug === modelSlug);
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const count = await scrapeExpertReviews(
    makeSlug, modelSlug,
    make.nameHe, model.nameHe,
    make.nameEn, model.nameEn,
    yearNum,
  );

  if (count === 0) {
    return NextResponse.json({ error: 'Generation failed (LLM or DB error)' }, { status: 500 });
  }

  return NextResponse.json({ generated: true, makeSlug, modelSlug, year: yearNum });
}
