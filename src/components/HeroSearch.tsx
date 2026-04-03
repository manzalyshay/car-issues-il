'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CarMake } from '@/lib/carsDb';
import MakeLogo from './MakeLogo';

interface Result {
  label: string;
  sublabel?: string;
  href: string;
  type: 'make' | 'model';
  logoUrl: string;
  nameEn: string;
}

export default function HeroSearch() {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<Result[]>([]);
  const [open, setOpen]             = useState(false);
  const [active, setActive]         = useState(-1);
  const [db, setDb]                 = useState<CarMake[]>([]);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const listRef                     = useRef<HTMLDivElement>(null);
  const router                      = useRouter();

  useEffect(() => {
    fetch('/api/cars').then((r) => r.json()).then(setDb);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setOpen(false); setActive(-1); return; }

    const makes: Result[]  = [];
    const models: Result[] = [];

    for (const make of db) {
      const matchMake =
        make.nameHe.toLowerCase().includes(q) ||
        make.nameEn.toLowerCase().includes(q);

      if (matchMake) {
        makes.push({
          label:    make.nameHe,
          sublabel: `${make.models.length} דגמים`,
          href:     `/cars/${make.slug}`,
          type:     'make',
          logoUrl:  make.logoUrl,
          nameEn:   make.nameEn,
        });
      }

      for (const model of make.models) {
        if (
          model.nameHe.toLowerCase().includes(q) ||
          model.nameEn.toLowerCase().includes(q) ||
          (`${make.nameHe} ${model.nameHe}`).toLowerCase().includes(q) ||
          (`${make.nameEn} ${model.nameEn}`).toLowerCase().includes(q)
        ) {
          models.push({
            label:    `${make.nameHe} ${model.nameHe}`,
            sublabel: model.nameEn,
            href:     `/cars/${make.slug}/${model.slug}`,
            type:     'model',
            logoUrl:  make.logoUrl,
            nameEn:   make.nameEn,
          });
        }
      }
    }

    // Makes first, then models; cap total at 8
    const combined = [...makes.slice(0, 3), ...models].slice(0, 8);
    setResults(combined);
    setOpen(combined.length > 0);
    setActive(-1);
  }, [query, db]);

  const choose = useCallback((href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((p) => Math.min(p + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((p) => Math.max(p - 1, -1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 580, margin: '0 auto' }}>
      {/* Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 60,
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(230,57,70,0.15)',
        padding: '0 20px',
        border: '2px solid rgba(255,255,255,0.2)',
        transition: 'box-shadow 0.2s',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder="חפש יצרן או דגם... (למשל: יונדאי, טוסון, מאזדה CX-5)"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '1rem',
            color: '#111',
            fontFamily: 'inherit',
            direction: 'rtl',
            minWidth: 0,
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onMouseDown={() => { setQuery(''); inputRef.current?.focus(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#aaa', flexShrink: 0, lineHeight: 1 }}
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            zIndex: 300,
            overflow: 'hidden',
          }}
        >
          {results.map((r, i) => (
            <button
              key={r.href}
              onMouseDown={() => choose(r.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                background: active === i ? 'var(--bg-muted)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'right',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(-1)}
            >
              <MakeLogo logoUrl={r.logoUrl} nameEn={r.nameEn} size={28} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{r.label}</div>
                {r.sublabel && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{r.sublabel}</div>
                )}
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                padding: '2px 8px',
                borderRadius: 9999,
                background: r.type === 'make' ? 'rgba(230,57,70,0.1)' : 'rgba(99,102,241,0.1)',
                color: r.type === 'make' ? 'var(--brand-red)' : '#818cf8',
                flexShrink: 0,
              }}>
                {r.type === 'make' ? 'יצרן' : 'דגם'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
