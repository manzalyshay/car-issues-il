'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CarMake } from '@/lib/carsDb';
import MakeLogo from './MakeLogo';
import { useLocale } from '@/lib/localeContext';

interface Result { label: string; sublabel?: string; href: string; type: 'make' | 'model'; logoUrl: string; nameEn: string; }

export default function HeroSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const [focused, setFocused] = useState(false);
  const [db, setDb]           = useState<CarMake[]>([]);
  const inputRef              = useRef<HTMLInputElement>(null);
  const router                = useRouter();
  const { locale, t }         = useLocale();

  useEffect(() => { fetch('/api/cars').then(r => r.json()).then(setDb); }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setOpen(false); setActive(-1); return; }
    const makes: Result[] = [];
    const models: Result[] = [];
    for (const make of db) {
      if (make.nameHe.toLowerCase().includes(q) || make.nameEn.toLowerCase().includes(q)) {
        makes.push({ label: locale==='en' ? make.nameEn : make.nameHe, sublabel: `${make.models.length} ${t.search.model}s`, href: `/cars/${make.slug}`, type: 'make', logoUrl: make.logoUrl, nameEn: make.nameEn });
      }
      for (const model of make.models) {
        if (model.nameHe.toLowerCase().includes(q) || model.nameEn.toLowerCase().includes(q) || (`${make.nameHe} ${model.nameHe}`).toLowerCase().includes(q) || (`${make.nameEn} ${model.nameEn}`).toLowerCase().includes(q)) {
          models.push({ label: locale==='en' ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`, sublabel: locale==='en' ? '' : model.nameEn, href: `/cars/${make.slug}/${model.slug}`, type: 'model', logoUrl: make.logoUrl, nameEn: make.nameEn });
        }
      }
    }
    const combined = [...makes.slice(0, 3), ...models].slice(0, 8);
    setResults(combined); setOpen(combined.length > 0); setActive(-1);
  }, [query, db, locale, t.search.model]);

  const choose = useCallback((href: string) => { setQuery(''); setOpen(false); router.push(href); }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown')              { e.preventDefault(); setActive(p => Math.min(p+1, results.length-1)); }
    else if (e.key === 'ArrowUp')           { e.preventDefault(); setActive(p => Math.max(p-1, -1)); }
    else if (e.key==='Enter' && active>=0)  { e.preventDefault(); choose(results[active].href); }
    else if (e.key === 'Escape')            { setOpen(false); }
  };

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:560 }}>
      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 54, borderRadius: 999,
        background: '#fff',
        border: `2px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: focused ? '0 4px 20px rgba(27,79,138,.12)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={focused ? 'var(--accent)' : 'var(--text-muted)'}
          strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink:0, transition:'stroke 0.2s', marginInlineStart: 18 }}
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef} value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { setFocused(true); results.length>0 && setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 160); }}
          placeholder={t.search.placeholder}
          style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:'0.9375rem', color:'var(--text)', fontFamily:'inherit', direction:locale==='he'?'rtl':'ltr', minWidth:0, padding:'0 14px' }}
          autoComplete="off" spellCheck={false}
        />
        <button
          onMouseDown={() => setQuery('')}
          style={{ background:'var(--accent)', border:'none', height:'100%', padding:'0 20px', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:6, transition:'background 0.15s', borderRadius: '0 999px 999px 0' }}
          tabIndex={-1}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          {locale === 'he' ? 'חפש' : 'Search'}
        </button>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, left:0,
          background:'#fff',
          border:'1px solid var(--border)',
          borderRadius:14,
          boxShadow:'0 12px 48px rgba(0,0,0,.12)',
          zIndex:300, overflow:'hidden',
        }}>
          {results.map((r, i) => (
            <button key={r.href} onMouseDown={() => choose(r.href)}
              style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 16px', border:'none', borderTop:i===0?'none':`1px solid var(--border)`, background:active===i?'var(--accent-soft)':'transparent', cursor:'pointer', textAlign:'right', color:'var(--text)', fontFamily:'inherit', transition:'background 0.1s' }}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(-1)}
            >
              <MakeLogo logoUrl={r.logoUrl} nameEn={r.nameEn} size={26} />
              <div style={{ flex:1, minWidth:0, textAlign:locale==='he'?'right':'left' }}>
                <div style={{ fontSize:'0.9rem', fontWeight:600, lineHeight:1.3 }}>{r.label}</div>
                {r.sublabel && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{r.sublabel}</div>}
              </div>
              <span style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.07em', padding:'2px 8px', borderRadius:6, background:r.type==='make'?'var(--accent-soft)':'rgba(79,70,229,.06)', color:r.type==='make'?'var(--accent)':'#4f46e5', border:`1px solid ${r.type==='make'?'rgba(27,79,138,.2)':'rgba(79,70,229,.15)'}`, flexShrink:0, textTransform:'uppercase' }}>
                {r.type==='make' ? t.search.make : t.search.model}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
