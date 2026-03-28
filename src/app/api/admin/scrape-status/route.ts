import { NextRequest, NextResponse } from 'next/server';
import { carDatabase } from '@/data/cars';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const { data: rows } = await sb
    .from('scraped_posts')
    .select('make_slug,model_slug,scope,cloned,scraped_at');

  // Aggregate per model
  type ModelStats = { local: number; global: number; cloned: number; scrapedAt: string | null };
  const stats = new Map<string, ModelStats>();

  for (const r of rows ?? []) {
    const key = `${r.make_slug}/${r.model_slug}`;
    if (!stats.has(key)) stats.set(key, { local: 0, global: 0, cloned: 0, scrapedAt: null });
    const s = stats.get(key)!;
    if (r.scope === 'local')  s.local++;
    if (r.scope === 'global') s.global++;
    if (r.cloned) s.cloned++;
    if (!s.scrapedAt || r.scraped_at > s.scrapedAt) s.scrapedAt = r.scraped_at;
  }

  const result = carDatabase.flatMap(make =>
    make.models.map(model => {
      const key   = `${make.slug}/${model.slug}`;
      const s     = stats.get(key);
      return {
        makeSlug:    make.slug,
        makeNameHe:  make.nameHe,
        modelSlug:   model.slug,
        modelNameHe: model.nameHe,
        localPosts:  s?.local   ?? 0,
        globalPosts: s?.global  ?? 0,
        clonedPosts: s?.cloned  ?? 0,
        scrapedAt:   s?.scrapedAt ?? null,
      };
    })
  );

  return NextResponse.json(result);
}
