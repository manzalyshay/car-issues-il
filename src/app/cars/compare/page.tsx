import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import { CompareClient } from './CompareClient';

export const dynamic = 'force-dynamic';

// Top popular comparison pairs — curated from GSC traffic + Israeli market demand
const POPULAR_PAIRS = [
  ['toyota/corolla-cross', 'kia/sportage'],
  ['toyota/corolla-cross', 'hyundai/tucson'],
  ['toyota/corolla-cross', 'skoda/karoq'],
  ['toyota/corolla-cross', 'toyota/yaris-cross'],
  ['toyota/corolla-cross', 'nissan/qashqai'],
  ['toyota/corolla-cross', 'kia/niro'],
  ['toyota/corolla-cross', 'kia/seltos'],
  ['toyota/corolla-cross', 'mazda/cx5'],
  ['nissan/qashqai', 'kia/sportage'],
  ['nissan/qashqai', 'hyundai/tucson'],
  ['kia/sportage', 'hyundai/tucson'],
  ['skoda/kodiaq', 'volkswagen/tiguan'],
  ['mazda/cx5', 'kia/sportage'],
  ['toyota/corolla', 'kia/cerato'],
  ['hyundai/tucson', 'mazda/cx5'],
  ['toyota/yaris-cross', 'kia/stonic'],
  ['toyota/yaris-cross', 'nissan/juke'],
  ['toyota/yaris-cross', 'hyundai/kona'],
  ['toyota/chr', 'kia/stonic'],
  ['dacia/duster', 'renault/arkana'],
] as const;

export default async function ComparePage() {
  // Fetch makes to resolve Hebrew names for popular pairs
  const makes = await getAllMakes();
  const nameMap: Record<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string }> = {};
  for (const make of makes) {
    for (const model of make.models) {
      nameMap[`${make.slug}/${model.slug}`] = {
        makeHe: make.nameHe, modelHe: model.nameHe,
        makeEn: make.nameEn, modelEn: model.nameEn,
      };
    }
  }

  // Build resolved popular pairs (skip if either side not found)
  const resolvedPairs = POPULAR_PAIRS.flatMap(([a, b]) => {
    const nA = nameMap[a];
    const nB = nameMap[b];
    if (!nA || !nB) return [];
    const [s1, s2] = [a, b].sort();
    return [{ href: `/cars/compare/${s1}/${s2}`, labelA: `${nA.makeHe} ${nA.modelHe}`, labelB: `${nB.makeHe} ${nB.modelHe}` }];
  });

  return (
    <>
      <CompareClient />

      {/* Server-rendered popular pairs — indexed by Google */}
      {resolvedPairs.length > 0 && (
        <div className="container" style={{ paddingBottom: 64 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 20 }}>השוואות פופולריות</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {resolvedPairs.map(({ href, labelA, labelB }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontWeight: 600 }}>{labelA}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>vs</span>
                <span style={{ fontWeight: 600 }}>{labelB}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
