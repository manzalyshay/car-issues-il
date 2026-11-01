'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import MakeLogo from '@/components/MakeLogo';
import type { CarMake } from '@/lib/carsDb';
import { searchCars } from '@/lib/carSearch';

interface Props {
  makes: CarMake[];
  isEn: boolean;
  modelsLabel: string;
  initialQuery?: string;
}

export default function CarsSearch({ makes, isEn, modelsLabel, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);

  const q = query.trim();

  // Bilingual search (Hebrew/English/mixed, typos, wrong keyboard layout).
  // A make-only query expands to all of that make's models.
  const filtered = useMemo(() => {
    if (!q) return [];
    const out: { make: CarMake; model: CarMake['models'][number] }[] = [];
    const seen = new Set<string>();
    for (const hit of searchCars(makes, q, 40)) {
      const models = hit.model ? [hit.model] : hit.make.models;
      for (const model of models) {
        const key = `${hit.make.slug}/${model.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ make: hit.make, model });
      }
    }
    return out.slice(0, 24);
  }, [q, makes]);

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Search input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 46, borderRadius: 12,
        border: '1.5px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 14px',
        maxWidth: 420,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={isEn ? 'Search make or model…' : 'חיפוש יצרן או דגם…'}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'inherit',
            direction: isEn ? 'ltr' : 'rtl',
          }}
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Results */}
      {q && (
        <div style={{ marginTop: 12 }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isEn ? 'No results found.' : 'לא נמצאו תוצאות.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map(({ make, model }) => (
                <Link
                  key={`${make.slug}/${model.slug}`}
                  href={`/cars/${make.slug}/${model.slug}`}
                  className="card"
                  style={{ padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={36} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
                      {isEn ? model.nameEn : model.nameHe}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {isEn ? make.nameEn : make.nameHe}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
