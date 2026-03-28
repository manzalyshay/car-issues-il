import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeRawPosts, type RawPost } from '@/lib/expertReviews';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

function dbToPost(r: any): RawPost & { cloned: boolean } {
  return {
    id:         r.post_id,
    title:      r.title,
    url:        r.url,
    sourceName: r.source_name,
    snippet:    r.snippet ?? '',
    scope:      r.scope as 'local' | 'global',
    score:      r.score ?? undefined,
    cloned:     r.cloned ?? false,
  };
}

// GET — load cached posts from DB
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const makeSlug  = searchParams.get('makeSlug');
  const modelSlug = searchParams.get('modelSlug');
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const sb = getServiceClient();
  const { data } = await sb
    .from('scraped_posts')
    .select('post_id,title,url,source_name,snippet,scope,score,scraped_at,cloned')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('scraped_at', { ascending: false });

  const posts = (data ?? []).map(dbToPost);
  const scrapedAt: string | null = data?.[0]?.scraped_at ?? null;
  return NextResponse.json({
    posts: { local: posts.filter(p => p.scope === 'local'), global: posts.filter(p => p.scope === 'global') },
    scrapedAt,
  });
}

// POST — live scrape; upsert new posts (preserve existing cloned status), return new post IDs
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug } = await req.json();
  const make  = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const sb = getServiceClient();

  // Blocked sources (too many invalids)
  const { data: stats } = await sb
    .from('scrape_source_stats')
    .select('source_name,invalid_count')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .gt('invalid_count', 2);
  const blockedSources = (stats ?? []).map((s: any) => s.source_name as string);

  // Get existing post IDs so we can flag new ones
  const { data: existing } = await sb
    .from('scraped_posts')
    .select('post_id')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug);
  const existingIds = new Set((existing ?? []).map((r: any) => r.post_id as string));

  const result = await scrapeRawPosts(make.nameHe, model.nameHe, make.nameEn, model.nameEn, undefined, blockedSources);

  const now  = new Date().toISOString();
  const allPosts = [...result.local, ...result.global];
  const newIds: string[] = [];

  const rows = allPosts.map(p => {
    if (!existingIds.has(p.id)) newIds.push(p.id);
    return {
      make_slug:   makeSlug,
      model_slug:  modelSlug,
      post_id:     p.id,
      title:       p.title,
      url:         p.url,
      source_name: p.sourceName,
      snippet:     p.snippet,
      scope:       p.scope,
      score:       p.score ?? null,
      scraped_at:  now,
      // cloned not set here — upsert preserves existing value
    };
  });

  // Upsert: insert new, update existing (except cloned flag)
  if (rows.length > 0) {
    await sb.from('scraped_posts').upsert(rows, {
      onConflict: 'make_slug,model_slug,post_id',
      ignoreDuplicates: false,
    });
  }

  // Load full updated list from DB (includes cloned flags)
  const { data: updated } = await sb
    .from('scraped_posts')
    .select('post_id,title,url,source_name,snippet,scope,score,scraped_at,cloned')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('scraped_at', { ascending: false });

  const posts = (updated ?? []).map(dbToPost);
  return NextResponse.json({
    posts: { local: posts.filter(p => p.scope === 'local'), global: posts.filter(p => p.scope === 'global') },
    newIds,
    scrapedAt: now,
  });
}

// DELETE — mark invalid: remove from DB + update source stats
export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, postId, sourceName } = await req.json();
  const sb = getServiceClient();

  await sb.from('scraped_posts')
    .delete()
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .eq('post_id', postId);

  const { data: existing } = await sb
    .from('scrape_source_stats')
    .select('invalid_count')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .eq('source_name', sourceName)
    .single();

  if (existing) {
    await sb.from('scrape_source_stats')
      .update({ invalid_count: (existing as any).invalid_count + 1 })
      .eq('make_slug', makeSlug).eq('model_slug', modelSlug).eq('source_name', sourceName);
  } else {
    await sb.from('scrape_source_stats').insert({
      make_slug: makeSlug, model_slug: modelSlug, source_name: sourceName, invalid_count: 1,
    });
  }

  return NextResponse.json({ ok: true });
}

// PATCH — mark a post as cloned
export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, postId } = await req.json();
  const sb = getServiceClient();

  await sb.from('scraped_posts')
    .update({ cloned: true })
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .eq('post_id', postId);

  return NextResponse.json({ ok: true });
}
