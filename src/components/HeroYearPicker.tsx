'use client';

import Link from 'next/link';

interface Props {
  years: number[];
  makeSlug: string;
  modelSlug: string;
}

/** Year chips in the model hero. Real links (not buttons) so crawlers reach every year page. */
export default function HeroYearPicker({ years, makeSlug, modelSlug }: Props) {
  const sorted = [...years].sort((a, b) => b - a);
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
      {sorted.slice(0, 8).map((y) => (
        <Link
          key={y}
          href={`/cars/${makeSlug}/${modelSlug}/${y}`}
          style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', color: '#c8d8f0', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}
