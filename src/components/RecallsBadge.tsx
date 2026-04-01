'use client';

import { useState, useEffect } from 'react';

interface Props {
  makeEn: string;
  modelEn: string;
  year?: number;
}

export default function RecallsBadge({ makeEn, modelEn, year }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ make: makeEn, model: modelEn });
    if (year) params.set('year', String(year));
    fetch(`/api/recalls?${params}`)
      .then(r => r.json())
      .then(d => setCount((d.recalls ?? []).length))
      .catch(() => setCount(0));
  }, [makeEn, modelEn, year]);

  if (!count) return null;

  return (
    <a
      href="#recalls"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 999,
        background: 'rgba(220,38,38,0.1)', color: '#dc2626',
        fontSize: '0.8125rem', fontWeight: 700,
        textDecoration: 'none', border: '1px solid rgba(220,38,38,0.2)',
        transition: 'background 0.15s',
      }}
      onClick={e => {
        e.preventDefault();
        document.getElementById('recalls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      ⚠️ {count} ריקול{count > 1 ? 'ים' : ''}
    </a>
  );
}
