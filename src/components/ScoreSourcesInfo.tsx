'use client';

import { useState, useId, useRef, useEffect, useLayoutEffect } from 'react';
import { labelForScoreSet, type ProReviewScoreSet } from '@/lib/proReviewScoreLabels';

interface Props {
  sets: ProReviewScoreSet[] | null | undefined;
  isHe: boolean;
}

const L = {
  he: {
    aria: 'מקורות וציונים ממבחנים אחרים',
    heading: 'ציונים ממבחני רכב',
    definition: 'ציונים מאתרי מבחנים חיצוניים שנבדקו ואומתו ידנית - אחד מהגורמים התומכים בציון שלמעלה.',
    single: 'מבחן אחד, לא קונצנזוס',
    basedOn: (n: number) => `מבוסס על ${n} מבחנים`,
    sources: 'מקורות', close: 'סגור',
  },
  en: {
    aria: 'Sources and scores from other tests',
    heading: 'Scores from car tests',
    definition: 'Scores from external, manually verified review sites - one of the factors behind the score above.',
    single: 'Single test, not a consensus',
    basedOn: (n: number) => `Based on ${n} reviews`,
    sources: 'Sources', close: 'Close',
  },
};

export default function ScoreSourcesInfo({ sets, isHe }: Props) {
  const t = isHe ? L.he : L.en;
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovering || pinned;
  const panelId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const hoverCapableRef = useRef(true);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  // Viewport position for the panel. It's rendered position:fixed and clamped inside the
  // screen, so it can't run off the edge (RTL, icon near the side) or be clipped by a
  // parent with overflow:hidden.
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const icon = iconRef.current;
      if (!icon) return;
      const r = icon.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const margin = 12;
      const width = Math.min(340, vw - margin * 2);
      // Prefer opening toward the reading direction from the icon, then clamp on-screen
      const rtl = getComputedStyle(icon).direction === 'rtl';
      const preferred = rtl ? r.right - width : r.left;
      const left = Math.max(margin, Math.min(preferred, vw - width - margin));
      setPos({ top: r.bottom + 8, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    hoverCapableRef.current = typeof window !== 'undefined'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  // There's a gap between the icon and the popover below it, so the mouse
  // passes through a moment of "hovering neither" on the way there - close on
  // a short delay instead of instantly, so that crossing the gap doesn't
  // unmount the popover before the pointer arrives. Entering either element
  // cancels the pending close.
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setHovering(false), 200);
  };
  const cancelCloseAndHover = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    if (hoverCapableRef.current) setHovering(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPinned(false);
        setHovering(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!sets || sets.length === 0) return null;

  return (
    <span ref={containerRef} style={{ position: 'relative', display: 'inline-flex', marginInlineStart: 6 }}>
      <span
        ref={iconRef}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.aria}
        onMouseEnter={cancelCloseAndHover}
        onMouseLeave={scheduleClose}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinned((p) => !p); }
          if (e.key === 'Escape') { setPinned(false); setHovering(false); }
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: '50%', background: '#eef2f8',
          border: '1px solid #d7deea', color: '#5b7cb0',
          fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0, userSelect: 'none',
        }}
      >
        i
      </span>

      {open && pos && (
        <div
          id={panelId}
          role="region"
          onMouseEnter={cancelCloseAndHover}
          onMouseLeave={scheduleClose}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000,
            width: pos.width, maxHeight: `calc(100vh - ${Math.round(pos.top) + 12}px)`, overflowY: 'auto',
            textAlign: 'start', background: '#fff', border: '1px solid #d7deea',
            borderRadius: 12, boxShadow: '0 10px 30px rgba(20,40,70,.18)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2733' }}>{t.heading}</div>
              <div style={{ fontSize: 11, color: '#66788c', lineHeight: 1.5, marginTop: 2 }}>{t.definition}</div>
            </div>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => { setPinned(false); setHovering(false); }}
              style={{ background: 'none', border: 'none', color: '#8595a6', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          {sets.map((set) => {
            const label = labelForScoreSet(set, sets, isHe);
            const isSingle = set.n === 1;
            return (
              <div key={`${set.scoreKey}-${set.setIndex}`} style={{ borderTop: '1px solid #eef1f5', paddingTop: 10 }}>
                {label && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#8595a6', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    {label}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#1c2733' }}>{set.score.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: '#a0adb8' }}>/10</span>
                  <span style={{ fontSize: 11, color: isSingle ? '#92620a' : '#66788c', fontStyle: isSingle ? 'italic' : 'normal' }}>
                    {isSingle ? t.single : t.basedOn(set.n)}
                  </span>
                </div>
                <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {set.sources.map((src, i) => (
                    <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener nofollow"
                        style={{ fontSize: 12.5, fontWeight: 700, color: '#2f6fb0', textDecoration: 'none' }}
                      >
                        {src.site}
                      </a>
                      <span style={{ fontSize: 11.5, color: '#66788c' }}>
                        {src.original} ({src.norm.toFixed(1)}/10){src.date ? ` · ${src.date}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}
