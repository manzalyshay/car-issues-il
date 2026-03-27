import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { carDatabase, getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeExpertReviews } from '@/lib/expertReviews';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;
  // Verify the JWT to get the user ID
  const { data: { user } } = await getServiceClient().auth.getUser(token);
  if (!user) return false;
  // Use service role to read profiles (bypasses RLS)
  const { data } = await getServiceClient()
    .from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin === true;
}

// GET /api/admin — scrape status for all models
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const { data: rows } = await sb
    .from('expert_reviews')
    .select('make_slug,model_slug,local_score,global_score,top_score,local_post_count,global_post_count,scraped_at')
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
      };
    })
  );

  return NextResponse.json(allModels);
}

// POST /api/admin — actions: scrape, delete, bulk_scrape
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, makeSlug, modelSlug } = await req.json();

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
    const make = getMakeBySlug(makeSlug);
    const model = make ? getModelBySlug(make, modelSlug) : null;
    if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

    const saved = await scrapeExpertReviews(
      makeSlug, modelSlug,
      make.nameHe, model.nameHe,
      make.nameEn, model.nameEn,
    );
    return NextResponse.json({ ok: true, saved });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
