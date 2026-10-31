'use client';

import { useId, useRef } from 'react';
import type { ExternalScoreSet } from '@/lib/proReviewScores';

const SITE_NAMES: Record<string, string> = {
  carbuyer: 'Carbuyer', autocar: 'Autocar', topgear: 'Top Gear', autoexpress: 'Auto Express',
  caranddriver: 'Car and Driver', icar: 'icar', carwow: 'Carwow',
};
const FLAGS: Record<string, string> = { IL: '🇮🇱', UK: '🇬🇧', US: '🇺🇸' };

function siteName(site: string): string {
  return SITE_NAMES[site.toLowerCase().replace(/\s+/g, '')] ?? site;
}

function scoreColor(score: number): string {
  if (score >= 8) return '#1b7a4b';
  if (score >= 6.5) return '#1b4f8a';
  if (score >= 5) return '#b45309';
  return '#b23b2e';
}

/**
 * "i" button next to a score. Tapping it opens the external test scores (normalised to /10)
 * in a native popover: it renders above the page, so card overflow can't clip it, and it
 * closes on outside tap or Escape on desktop and mobile alike.
 */
export default function ExternalScoresInfo({ sets, isEn }: { sets: ExternalScoreSet[]; isEn: boolean }) {
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!sets.length) return null;
  const title = isEn ? 'External test scores' : 'ציוני מבחנים חיצוניים';

  // Desktop (mouse/trackpad): open on hover, anchored under the button.
  // Touch: open on tap, centred on screen (the popover's default placement).
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isOpen = () => !!panelRef.current?.matches(':popover-open');
  const cancelHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const show = (anchored: boolean) => {
    const panel = panelRef.current, btn = btnRef.current;
    if (!panel || !btn) return;
    cancelHide();
    if (anchored) {
      const r = btn.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 32);
      const left = isEn ? r.left : r.right - width; // grow towards the text direction
      Object.assign(panel.style, {
        position: 'fixed', margin: '0', inset: 'auto',
        top: `${Math.min(r.bottom + 8, window.innerHeight - 120)}px`,
        left: `${Math.max(16, Math.min(left, window.innerWidth - width - 16))}px`,
      });
    } else {
      Object.assign(panel.style, { position: '', margin: '', inset: '', top: '', left: '' });
    }
    if (!isOpen()) panel.showPopover();
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => { if (isOpen()) panelRef.current?.hidePopover(); }, 200);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => { const hover = canHover(); if (isOpen() && !hover) panelRef.current?.hidePopover(); else show(hover); }}
        onMouseEnter={() => { if (canHover()) show(true); }}
        onMouseLeave={() => { if (canHover()) scheduleHide(); }}
        onFocus={() => { if (canHover()) show(true); }}
        aria-label={title}
        title={title}
        style={{
          width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: '1.5px solid #8595a6',
          background: '#fff', color: '#4a5b6d', alignSelf: 'center',
          fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 14, lineHeight: 1,
          cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0,
        }}
      >
        i
      </button>

      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        onMouseEnter={cancelHide}
        onMouseLeave={() => { if (canHover()) scheduleHide(); }}
        role="dialog"
        aria-label={title}
        style={{
          width: 'min(340px, calc(100vw - 32px))', maxHeight: '70vh', overflowY: 'auto',
          background: '#fff', border: '1px solid #e3e8ee', borderRadius: 14,
          boxShadow: '0 12px 40px rgba(15,30,50,0.25)', padding: '16px 18px',
          direction: isEn ? 'ltr' : 'rtl', textAlign: 'start', color: '#1c2733',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#66788c', margin: '2px 0 12px' }}>
              {isEn ? 'Reviews from other sites, normalised to a score out of 10' : 'ביקורות מאתרים אחרים, מנורמלות לציון מתוך 10'}
            </div>
          </div>
          <button
            type="button"
            popoverTarget={panelId}
            popoverTargetAction="hide"
            aria-label={isEn ? 'Close' : 'סגירה'}
            style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, color: '#8595a6', cursor: 'pointer', padding: 0 }}
          >
            ×
          </button>
        </div>

        {sets.map((set, i) => (
          <div key={i} style={{ borderTop: i ? '1px solid #eef1f5' : 'none', paddingTop: i ? 10 : 0, marginTop: i ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4a5b6d' }}>
                {set.generation}{set.years ? ` · ${set.years}` : ''}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(set.score), whiteSpace: 'nowrap', direction: 'ltr' }}>
                {set.score.toFixed(1)}<span style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>/10</span>
              </span>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
              {set.sources.map((s, j) => (
                <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span aria-hidden>{s.market ? FLAGS[s.market] ?? '' : ''}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1b4f8a', fontWeight: 600 }}>{siteName(s.site)}</a>
                    ) : <span style={{ fontWeight: 600 }}>{siteName(s.site)}</span>}
                    {(s.original || s.date) && (
                      <span style={{ color: '#8595a6', fontSize: 11.5 }}>
                        {' '}({[s.original, s.date?.slice(0, 4)].filter(Boolean).join(', ')})
                      </span>
                    )}
                  </span>
                  {s.norm != null && (
                    <span style={{ fontWeight: 800, color: scoreColor(s.norm), whiteSpace: 'nowrap', direction: 'ltr' }}>
                      {s.norm.toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
