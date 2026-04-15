/**
 * 3D model lookup — data lives in Supabase `car_3d_models` table.
 * Previously hardcoded; now DB-backed so admin can manage without deploys.
 */
import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';

export interface SketchfabModel {
  uid: string;
  name: string;
  author: string;
  license: string;
  viewerUrl: string;
  reelUrl: string | null;
}

const fetch3dModels = unstable_cache(
  async (): Promise<Record<string, { uid: string; name: string; author: string; license: string; reelUrl: string | null }>> => {
    const { data, error } = await getServiceClient()
      .from('car_3d_models')
      .select('make_slug,model_slug,sketchfab_uid,sketchfab_name,sketchfab_author,license,reel_url')
      .not('hidden', 'is', true);
    if (error) throw new Error(`car_3d_models: ${error.message}`);
    const map: Record<string, { uid: string; name: string; author: string; license: string; reelUrl: string | null }> = {};
    for (const row of data ?? []) {
      map[`${row.make_slug}/${row.model_slug}`] = {
        uid: row.sketchfab_uid,
        name: row.sketchfab_name,
        author: row.sketchfab_author,
        license: row.license,
        reelUrl: row.reel_url ?? null,
      };
    }
    return map;
  },
  ['car-3d-models'],
  { revalidate: 3600, tags: ['car-data'] },
);

export async function findCarModel(
  makeSlug: string,
  modelSlug: string,
): Promise<SketchfabModel | null> {
  const models = await fetch3dModels();
  const entry = models[`${makeSlug}/${modelSlug}`];
  if (!entry) return null;
  return {
    uid: entry.uid,
    name: entry.name,
    author: entry.author,
    license: entry.license,
    viewerUrl: `https://sketchfab.com/models/${entry.uid}`,
    reelUrl: entry.reelUrl,
  };
}
