'use client';

import { useRouter } from 'next/navigation';

interface Props {
  years: number[];
  makeSlug: string;
  modelSlug: string;
}

export default function HeroYearPicker({ years, makeSlug, modelSlug }: Props) {
  const router = useRouter();

  const handleClick = (y: number) => {
    router.push(`/cars/${makeSlug}/${modelSlug}/${y}`);
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
      {years.slice(0, 8).map((y) => (
        <button
          key={y}
          onClick={() => handleClick(y)}
          style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', color: '#c8d8f0', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
