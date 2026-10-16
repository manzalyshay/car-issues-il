import { TOP_COMPARE_PAIRS } from '@/data/top-compare-pairs';
import { SEARCHED_COMPARE_PAIRS } from '@/data/searched-compare-pairs';
import type { CarMake, CarModel } from '@/data/cars';

/** Canonical compare path: the two "make/model" keys sorted alphabetically (matches middleware + page redirect). */
export function canonicalComparePath(a: string, b: string): string {
  const [c1, c2] = [a, b].sort();
  return `/cars/compare/${c1}/${c2}`;
}

export interface ResolvedPair {
  path: string;
  a: { key: string; make: CarMake; model: CarModel };
  b: { key: string; make: CarMake; model: CarModel };
}

function resolveKey(makes: CarMake[], key: string) {
  const [makeSlug, modelSlug] = key.split('/');
  const make = makes.find((m) => m.slug === makeSlug);
  const model = make?.models.find((mo) => mo.slug === modelSlug);
  return make && model ? { key, make, model } : null;
}

/** Resolve a list of slug pairs against the live catalogue, dropping pairs whose models no longer exist. */
export function resolvePairs(makes: CarMake[], pairs: ReadonlyArray<readonly [string, string]>): ResolvedPair[] {
  const seen = new Set<string>();
  const out: ResolvedPair[] = [];
  for (const [ka, kb] of pairs) {
    const a = resolveKey(makes, ka);
    const b = resolveKey(makes, kb);
    if (!a || !b) continue;
    const path = canonicalComparePath(ka, kb);
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ path, a, b });
  }
  return out;
}

/** Top-clicked + searched pairs, de-duplicated (top pairs first). */
export function curatedPairs(makes: CarMake[]): ResolvedPair[] {
  return resolvePairs(makes, [...TOP_COMPARE_PAIRS, ...SEARCHED_COMPARE_PAIRS]);
}

/**
 * Compare pages most relevant to one model: curated pairs involving it first, then
 * same-category models from the catalogue (same make first), up to `limit`.
 */
export function comparePairsForModel(makes: CarMake[], makeSlug: string, modelSlug: string, limit = 5): ResolvedPair[] {
  const self = `${makeSlug}/${modelSlug}`;
  const curated = curatedPairs(makes).filter((p) => p.a.key === self || p.b.key === self);
  const out = [...curated];
  const have = new Set(out.map((p) => p.path));
  const me = resolveKey(makes, self);
  if (me && out.length < limit) {
    const candidates: string[] = [];
    for (const mk of makes) for (const mo of mk.models) {
      const key = `${mk.slug}/${mo.slug}`;
      if (key !== self && mo.category === me.model.category) candidates.push(key);
    }
    candidates.sort((x, y) => Number(y.startsWith(`${makeSlug}/`)) - Number(x.startsWith(`${makeSlug}/`)));
    for (const key of candidates) {
      if (out.length >= limit) break;
      const path = canonicalComparePath(self, key);
      if (have.has(path)) continue;
      const other = resolveKey(makes, key);
      if (!other) continue;
      have.add(path);
      out.push({ path, a: me, b: other });
    }
  }
  return out.slice(0, limit);
}
