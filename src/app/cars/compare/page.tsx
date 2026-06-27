import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { CompareClient } from './CompareClient';

export const revalidate = 86400;

// Top popular comparison pairs — curated from GSC traffic + Israeli market demand
const POPULAR_PAIRS = [
  // ─── Toyota Corolla Cross (top traffic driver) ────────────────────────────
  ['toyota/corolla-cross', 'kia/sportage'],
  ['toyota/corolla-cross', 'hyundai/tucson'],
  ['toyota/corolla-cross', 'skoda/karoq'],
  ['toyota/corolla-cross', 'toyota/yaris-cross'],
  ['toyota/corolla-cross', 'nissan/qashqai'],
  ['toyota/corolla-cross', 'kia/niro'],
  ['toyota/corolla-cross', 'kia/seltos'],
  ['toyota/corolla-cross', 'mazda/cx5'],
  ['toyota/corolla-cross', 'volkswagen/tiguan'],
  ['toyota/corolla-cross', 'mazda/cx30'],
  ['toyota/corolla-cross', 'honda/hrv'],
  ['toyota/corolla-cross', 'subaru/xv'],
  ['toyota/corolla-cross', 'mitsubishi/asx'],
  ['toyota/corolla-cross', 'toyota/rav4'],
  ['toyota/corolla-cross', 'peugeot/2008'],
  ['toyota/corolla-cross', 'opel/grandland'],

  // ─── Korean vs Japanese ───────────────────────────────────────────────────
  ['nissan/qashqai', 'kia/sportage'],
  ['nissan/qashqai', 'hyundai/tucson'],
  ['kia/sportage', 'hyundai/tucson'],
  ['hyundai/tucson', 'mazda/cx5'],
  ['kia/sportage', 'mazda/cx5'],
  ['hyundai/elantra', 'toyota/corolla'],
  ['kia/cerato', 'toyota/corolla'],
  ['hyundai/i30', 'volkswagen/golf'],
  ['kia/ceed', 'volkswagen/golf'],
  ['hyundai/i30', 'skoda/octavia'],
  ['kia/sorento', 'hyundai/santa-fe'],
  ['kia/sorento', 'toyota/rav4'],
  ['hyundai/santa-fe', 'toyota/rav4'],
  ['hyundai/kona', 'nissan/juke'],
  ['hyundai/kona', 'mazda/cx3'],

  // ─── Popular Israeli compact SUV pairs ────────────────────────────────────
  ['hyundai/tucson', 'volkswagen/tiguan'],
  ['skoda/kodiaq', 'volkswagen/tiguan'],
  ['nissan/x-trail', 'hyundai/tucson'],
  ['nissan/x-trail', 'kia/sportage'],
  ['skoda/karoq', 'volkswagen/troc'],
  ['peugeot/3008', 'volkswagen/tiguan'],
  ['peugeot/3008', 'kia/sportage'],
  ['subaru/forester', 'toyota/rav4'],
  ['mitsubishi/outlander', 'kia/sorento'],
  ['mitsubishi/eclipse-cross', 'nissan/qashqai'],
  ['honda/crv', 'mazda/cx5'],
  ['honda/crv', 'toyota/rav4'],

  // ─── Small crossovers / city SUVs ─────────────────────────────────────────
  ['toyota/yaris-cross', 'kia/stonic'],
  ['toyota/yaris-cross', 'nissan/juke'],
  ['toyota/yaris-cross', 'hyundai/kona'],
  ['toyota/chr', 'kia/stonic'],
  ['kia/stonic', 'hyundai/bayon'],
  ['kia/stonic', 'nissan/juke'],
  ['hyundai/bayon', 'seat/arona'],
  ['volkswagen/troc', 'seat/arona'],
  ['ford/puma', 'nissan/juke'],
  ['skoda/kamiq', 'seat/arona'],
  ['opel/mokka', 'peugeot/2008'],

  // ─── Electric & hybrid comparisons ───────────────────────────────────────
  ['kia/niro', 'hyundai/kona'],
  ['kia/ev6', 'hyundai/ioniq-5'],
  ['kia/ev6', 'tesla/model-3'],
  ['hyundai/ioniq-5', 'tesla/model-y'],
  ['hyundai/ioniq-6', 'tesla/model-3'],
  ['volkswagen/id4', 'hyundai/ioniq-5'],
  ['volkswagen/id4', 'kia/ev6'],
  ['volkswagen/id3', 'hyundai/ioniq-6'],
  ['toyota/bz4x', 'hyundai/ioniq-5'],
  ['toyota/bz4x', 'volkswagen/id4'],
  ['nissan/leaf', 'volkswagen/id3'],
  ['lexus/ux', 'toyota/chr'],
  ['toyota/prius', 'toyota/corolla'],
  ['mazda/cx30', 'toyota/chr'],

  // ─── Budget / value ───────────────────────────────────────────────────────
  ['dacia/duster', 'renault/arkana'],
  ['dacia/duster', 'kia/stonic'],
  ['dacia/sandero', 'kia/picanto'],
  ['suzuki/vitara', 'dacia/duster'],
  ['suzuki/swift', 'hyundai/i20'],
  ['fiat/tipo', 'hyundai/i20'],
] as const;

export default async function ComparePage() {
  const [locale, makes] = await Promise.all([
    getHostLocale(),
    getAllMakes().catch(() => []),
  ]);
  const isEn = locale === 'en';
  const cmp = translations[locale].comparePage;

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
    const labelA = isEn ? `${nA.makeEn} ${nA.modelEn}` : `${nA.makeHe} ${nA.modelHe}`;
    const labelB = isEn ? `${nB.makeEn} ${nB.modelEn}` : `${nB.makeHe} ${nB.modelHe}`;
    return [{ href: `/cars/compare/${s1}/${s2}`, labelA, labelB }];
  });

  return (
    <>
      <CompareClient />

      {/* Server-rendered popular pairs — indexed by Google */}
      {resolvedPairs.length > 0 && (
        <div className="container" style={{ paddingBottom: 64 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 20 }}>{cmp.popularPairs}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {resolvedPairs.map(({ href, labelA, labelB }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  color: 'var(--text)',
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
