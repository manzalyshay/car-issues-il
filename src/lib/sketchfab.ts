/**
 * 3D model lookup — data lives in D1 `car_3d_models` table.
 * Uses a globalThis cache so the table is only queried once per Worker isolate.
 */
import { dbAll } from './db';

export interface SketchfabModel {
  uid: string;
  name: string;
  author: string;
  license: string;
  viewerUrl: string;
  reelUrl: string | null;
}

type ModelsMap = Record<string, { uid: string; name: string; author: string; license: string; reelUrl: string | null }>;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const g = globalThis as typeof globalThis & {
  _3dModelsCache?: { data: ModelsMap; ts: number };
};

async function fetch3dModels(): Promise<ModelsMap> {
  const now = Date.now();
  if (g._3dModelsCache && now - g._3dModelsCache.ts < CACHE_TTL_MS) {
    return g._3dModelsCache.data;
  }
  try {
    const rows = await dbAll<{
      make_slug: string; model_slug: string; sketchfab_uid: string;
      sketchfab_name: string; sketchfab_author: string; license: string; reel_url: string | null;
    }>('SELECT make_slug, model_slug, sketchfab_uid, sketchfab_name, sketchfab_author, license, reel_url FROM car_3d_models WHERE hidden IS NOT 1');
    const map: ModelsMap = {};
    for (const row of rows) {
      map[`${row.make_slug}/${row.model_slug}`] = {
        uid: row.sketchfab_uid,
        name: row.sketchfab_name,
        author: row.sketchfab_author,
        license: row.license,
        reelUrl: row.reel_url ?? null,
      };
    }
    g._3dModelsCache = { data: map, ts: now };
    return map;
  } catch {
    return {};
  }
}

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
