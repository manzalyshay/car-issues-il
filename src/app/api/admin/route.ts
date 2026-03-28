import { NextRequest, NextResponse } from 'next/server';
import { carDatabase, getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeExpertReviews } from '@/lib/expertReviews';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

function validateCar(makeSlug: string, modelSlug: string) {
  const make  = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  return make && model ? { make, model } : null;
}

// GET /api/admin — scrape status for all models
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const { data: rows } = await sb
    .from('expert_reviews')
    .select('make_slug,model_slug,local_score,global_score,top_score,local_post_count,global_post_count,scraped_at,local_summary_he,global_summary_he')
    .order('make_slug').order('model_slug');

  const scraped = new Map((rows ?? []).map((r: any) => [`${r.make_slug}/${r.model_slug}`, r]));

  const allModels = carDatabase.flatMap((make) =>
    make.models.map((model) => {
      const key = `${make.slug}/${model.slug}`;
      const row = scraped.get(key);
      return {
        makeSlug: make.slug,
        makeNameHe: make.nameHe,
        modelSlug: model.slug,
        modelNameHe: model.nameHe,
        scraped: !!row,
        localScore: row?.local_score ?? null,
        globalScore: row?.global_score ?? null,
        topScore: row?.top_score ?? null,
        localPosts: row?.local_post_count ?? 0,
        globalPosts: row?.global_post_count ?? 0,
        scrapedAt: row?.scraped_at ?? null,
        hasLocalSummary: !!(row?.local_summary_he),
        hasGlobalSummary: !!(row?.global_summary_he),
      };
    })
  );

  return NextResponse.json(allModels);
}

// POST /api/admin — actions: scrape, delete, bulk_scrape
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, makeSlug, modelSlug, localPosts = [], globalPosts = [], reviewId, ids, title, body: reviewBody, rating } = body;

  if (action === 'delete') {
    const sb = getServiceClient();
    await sb.from('expert_reviews')
      .delete()
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug);
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_all') {
    const sb = getServiceClient();
    await sb.from('expert_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return NextResponse.json({ ok: true });
  }

  if (action === 'scrape') {
    const car = validateCar(makeSlug, modelSlug);
    if (!car) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });
    const saved = await scrapeExpertReviews(
      makeSlug, modelSlug,
      car.make.nameHe, car.model.nameHe,
      car.make.nameEn, car.model.nameEn,
    );
    return NextResponse.json({ ok: true, saved });
  }

  if (action === 'delete_review') {
    if (!reviewId) return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
    await getServiceClient().from('reviews').delete().eq('id', reviewId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'bulk_delete_reviews') {
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ ok: true });
    await getServiceClient().from('reviews').delete().in('id', ids);
    return NextResponse.json({ ok: true });
  }

  if (action === 'edit_review') {
    if (!reviewId) return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (title !== undefined)      updates.title  = title;
    if (reviewBody !== undefined) updates.body   = reviewBody;
    if (rating !== undefined)     updates.rating = rating;
    await getServiceClient().from('reviews').update(updates).eq('id', reviewId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'summarize_from_posts') {
    const car = validateCar(makeSlug, modelSlug);
    if (!car) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });
    const { summarizeFromPosts } = await import('@/lib/expertReviews');
    const saved = await summarizeFromPosts(
      makeSlug, modelSlug,
      car.make.nameHe, car.model.nameHe,
      car.make.nameEn, car.model.nameEn,
      localPosts, globalPosts,
    );
    return NextResponse.json({ ok: true, saved });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
