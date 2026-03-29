'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { carDatabase } from '@/data/cars';

interface SearchResult {
  label: string;
  href: string;
  type: 'make' | 'model';
}

export default function SearchBox({ fullWidth = false, compact = false }: { fullWidth?: boolean; compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    const q = query.toLowerCase().trim();
    const found: SearchResult[] = [];

    for (const make of carDatabase) {
      if (
        make.nameHe.toLowerCase().includes(q) ||
        make.nameEn.toLowerCase().includes(q)
      ) {
        found.push({ label: `${make.nameHe} — כל הדגמים`, href: `/cars/${make.slug}`, type: 'make' });
      }
      for (const model of make.models) {
        if (
          model.nameHe.toLowerCase().includes(q) ||
          model.nameEn.toLowerCase().includes(q)
        ) {
          found.push({
            label: `${make.nameHe} ${model.nameHe}`,
            href: `/cars/${make.slug}/${model.slug}`,
            type: 'model',
          });
        }
      }
    }

    setResults(found.slice(0, 8));
    setOpen(found.length > 0);
  }, [query]);

  const choose = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, fontSize: '1.2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
        aria-label="חיפוש"
      >
        🔍
      </button>
    );
  }

  return (
    <div style={{ position: 'relative', width: fullWidth || compact ? '100%' : 220 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 38,
          border: '1.5px solid var(--border)',
          borderRadius: 9999,
          padding: '0 14px',
          background: 'var(--bg-muted)',
          transition: 'border-color 0.2s',
          width: '100%',
        }}
      >
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש יצרן או דגם..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            direction: 'rtl',
            minWidth: 0,
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); if (compact && !query) setExpanded(false); }, 150)}
        />
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => choose(r.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'right',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)')}
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
