'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CarMake } from '@/lib/carsDb';
import { useLocale } from '@/lib/localeContext';

interface SearchResult {
  label: string;
  href: string;
  type: 'make' | 'model';
}

export default function SearchBox({ fullWidth = false, compact = false }: { fullWidth?: boolean; compact?: boolean }) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [open, setOpen]           = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [carDatabase, setCarDatabase] = useState<CarMake[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const { locale, t } = useLocale();
  const isEn = locale === 'en';

  useEffect(() => {
    fetch('/api/cars').then(r => r.json()).then(setCarDatabase);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = query.toLowerCase().trim();
    const found: SearchResult[] = [];
    for (const make of carDatabase) {
      if (
        make.nameHe.toLowerCase().includes(q) ||
        make.nameEn.toLowerCase().includes(q)
      ) {
        const makeName = isEn ? make.nameEn : make.nameHe;
        const allModels = isEn ? 'All Models' : 'כל הדגמים';
        found.push({ label: `${makeName} — ${allModels}`, href: `/cars/${make.slug}`, type: 'make' });
      }
      for (const model of make.models) {
        if (
          model.nameHe.toLowerCase().includes(q) ||
          model.nameEn.toLowerCase().includes(q)
        ) {
          const makeName = isEn ? make.nameEn : make.nameHe;
          const modelName = isEn ? model.nameEn : model.nameHe;
          found.push({ label: `${makeName} ${modelName}`, href: `/cars/${make.slug}/${model.slug}`, type: 'model' });
        }
      }
    }
    setResults(found.slice(0, 8));
    setOpen(found.length > 0);
  }, [query, carDatabase, isEn]);

  const choose = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          background: 'rgba(255,255,255,.07)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 8,
          cursor: 'pointer',
          padding: '6px 10px',
          fontSize: '1rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
        }}
        aria-label="חיפוש"
      >
        🔍
      </button>
    );
  }

  return (
    <div style={{ position: 'relative', width: fullWidth || compact ? '100%' : 210 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 9,
        padding: '0 12px',
        background: 'rgba(255,255,255,.05)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        width: '100%',
      }}>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '0.875rem' }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholderShort}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.8375rem',
            color: 'var(--text)',
            fontFamily: 'inherit',
            direction: isEn ? 'ltr' : 'rtl',
            minWidth: 0,
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); if (compact && !query) setExpanded(false); }, 150)}
        />
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          left: 0,
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,.9)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => choose(r.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.05)',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'right',
                color: 'var(--text)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(230,57,70,.07)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {r.type === 'make' ? '🏭' : '🚗'}
              </span>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
