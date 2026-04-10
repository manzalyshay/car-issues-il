import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { fetchAndStoreVideos } from '@/lib/youtubeVideos';
import { getAllMakes } from '@/lib/carsDb';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { makeSlug, modelSlug, makeEn, modelEn, makeHe, modelHe, all } = body;

  // Fetch for all cars (bulk, slow — runs in background)
  if (all) {
    const makes = await getAllMakes();
    let totalInserted = 0;
    const errors: string[] = [];
    for (const make of makes) {
      for (const model of make.models) {
        const result = await fetchAndStoreVideos(
          make.slug, model.slug,
          make.nameEn, model.nameEn,
          make.nameHe, model.nameHe,
        );
        totalInserted += result.inserted;
        if (result.error) errors.push(`${make.slug}/${model.slug}: ${result.error}`);
      }
    }
    return NextResponse.json({ ok: true, totalInserted, errors });
  }

  // Fetch for a single car
  if (!makeSlug || !modelSlug) {
    return NextResponse.json({ error: 'makeSlug, modelSlug required' }, { status: 400 });
  }
  const result = await fetchAndStoreVideos(makeSlug, modelSlug, makeEn, modelEn, makeHe, modelHe);
  return NextResponse.json({ ok: !result.error, ...result });
}
