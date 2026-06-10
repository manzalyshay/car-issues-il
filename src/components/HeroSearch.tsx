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
          models.push({ label: locale==='en' ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`, sublabel: locale==='en' ? model.nameHe : model.nameEn, href: `/cars/${make.slug}/${model.slug}`, type: 'model', logoUrl: make.logoUrl, nameEn: make.nameEn });
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
      {/* Glass search pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 56, borderRadius: 14,
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${focused ? 'rgba(220,26,44,.6)' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: focused
          ? '0 0 0 3px rgba(220,26,44,.12), 0 8px 40px rgba(0,0,0,.6)'
          : '0 8px 40px rgba(0,0,0,.4)',
        padding: '0 18px',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.22s, box-shadow 0.22s',
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={focused ? 'var(--brand-red)' : 'rgba(255,255,255,0.3)'}
          strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink:0, transition:'stroke 0.2s' }}
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
          style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:'0.9375rem', color:'#fff', fontFamily:'inherit', direction:locale==='he'?'rtl':'ltr', minWidth:0 }}
          autoComplete="off" spellCheck={false}
        />
        {query && (
          <button onMouseDown={() => { setQuery(''); inputRef.current?.focus(); }}
            style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:6, cursor:'pointer', padding:'2px 7px', color:'rgba(255,255,255,.4)', flexShrink:0, lineHeight:1, fontSize:'0.8rem', transition:'background 0.15s' }}
            tabIndex={-1}>✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, left:0,
          background:'rgba(16,16,22,0.97)',
          border:'1px solid rgba(255,255,255,.08)',
          borderRadius:14,
          boxShadow:'0 24px 72px rgba(0,0,0,.95)',
          backdropFilter:'blur(20px)',
          zIndex:300, overflow:'hidden',
        }}>
          {results.map((r, i) => (
            <button key={r.href} onMouseDown={() => choose(r.href)}
              style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 16px', border:'none', borderTop:i===0?'none':'1px solid rgba(255,255,255,.04)', background:active===i?'rgba(220,26,44,.08)':'transparent', cursor:'pointer', textAlign:'right', color:'#fff', fontFamily:'inherit', transition:'background 0.1s' }}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(-1)}
            >
              <MakeLogo logoUrl={r.logoUrl} nameEn={r.nameEn} size={26} />
              <div style={{ flex:1, minWidth:0, textAlign:locale==='he'?'right':'left' }}>
                <div style={{ fontSize:'0.9rem', fontWeight:600, lineHeight:1.3 }}>{r.label}</div>
                {r.sublabel && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{r.sublabel}</div>}
              </div>
              <span style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.07em', padding:'2px 8px', borderRadius:6, background:r.type==='make'?'rgba(220,26,44,.12)':'rgba(129,140,248,.1)', color:r.type==='make'?'var(--brand-red)':'#818cf8', border:`1px solid ${r.type==='make'?'rgba(220,26,44,.2)':'rgba(129,140,248,.15)'}`, flexShrink:0, textTransform:'uppercase' }}>
                {r.type==='make' ? t.search.make : t.search.model}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
