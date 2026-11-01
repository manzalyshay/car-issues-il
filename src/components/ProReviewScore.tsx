'use client';

import { useState, useId, useRef, useEffect } from 'react';
import { labelForScoreSet, type ProReviewScoreSet } from '@/lib/proReviewScoreLabels';

interface NoScoreNote {
  labelHe: string;
  labelEn: string;
  noteHe: string;
  noteEn: string;
}

interface Props {
  sets: ProReviewScoreSet[];
  isHe: boolean;
  /** Explicit "no verified test for this variant" notes - e.g. FX HEV, shown
   * alongside the model's other scored sets rather than silently omitted. */
  noScoreNotes?: NoScoreNote[];
}

const L = {
  he: {
    heading: 'ציון מבחנים',
    definition: 'ציון כללי של הדגם לעומת רכבים אחרים בקטגוריה, מבוסס על מבחני רכב מאומתים - אינו ציון אמינות.',
    single: 'מבחן אחד, לא קונצנזוס',
    basedOn: (n: number) => `מבוסס על ${n} מבחנים`,
    sources: 'מקורות', close: 'סגור', coveredVariants: 'גרסאות שנבדקו', notCovered: 'לא כלול בציון זה',
  },
  en: {
    heading: 'Test score',
    definition: "A general score for the model versus other cars in its category, based on verified car reviews - not a reliability score.",
    single: 'Single test, not a consensus',
    basedOn: (n: number) => `Based on ${n} reviews`,
    sources: 'Sources', close: 'Close', coveredVariants: 'Tested variants', notCovered: 'Not covered by this score',
  },
};

function ScoreBlock({ set, label, isHe }: { set: ProReviewScoreSet; label: string | null; isHe: boolean }) {
  const t = isHe ? L.he : L.en;
  // Hover (desktop mouse) and pinned (click/keyboard/tap) are tracked separately
  // so a click doesn't immediately re-close a panel a hover just opened - the
  // panel shows whenever either is true.
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovering || pinned;
  const panelId = useId();
  const isSingle = set.n === 1;
  const containerRef = useRef<HTMLDivElement>(null);
  // Touch browsers synthesize mouseenter on tap with no matching mouseleave,
  // so hovering can get stuck true and the tap-to-close toggle looks like it
  // silently fails. On a coarse pointer (no real hover), rely on tap/click
  // (pinned) alone - never set hovering.
  const hoverCapableRef = useRef(true);
  useEffect(() => {
    hoverCapableRef.current = typeof window !== 'undefined'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  // Click/tap anywhere outside this block closes an open popover.
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

  const caveats = isHe ? set.caveats : (set.caveatsEn.length ? set.caveatsEn : set.caveats);
  const testedVariants = isHe ? set.testedVariants : (set.testedVariantsEn.length ? set.testedVariantsEn : set.testedVariants);
  const notApplicable = isHe ? set.notApplicable : (set.notApplicableEn.length ? set.notApplicableEn : set.notApplicable);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{t.heading}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: isSingle ? 20 : 26, fontWeight: 800, color: isSingle ? 'var(--text-muted)' : 'var(--text)', letterSpacing: '-0.02em' }}>{set.score.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>/10</span>
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t.sources}
          onMouseEnter={() => { if (hoverCapableRef.current) setHovering(true); }}
          onMouseLeave={() => setHovering(false)}
          onClick={() => setPinned((p) => !p)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPinned((p) => !p); }
            if (e.key === 'Escape') { setPinned(false); setHovering(false); }
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)', color: 'var(--accent)',
            fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, userSelect: 'none',
          }}
        >
          i
        </span>
      </div>
      <span style={{ fontSize: 12, color: isSingle ? 'var(--text-faint)' : 'var(--text-muted)', fontStyle: isSingle ? 'italic' : 'normal' }}>
        {isSingle ? t.single : t.basedOn(set.n)}
      </span>

      {open && (
        <div
          id={panelId}
          role="region"
          onMouseEnter={() => { if (hoverCapableRef.current) setHovering(true); }}
          onMouseLeave={() => setHovering(false)}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', insetInlineStart: 0, zIndex: 20,
            width: 'min(340px, 86vw)', background: 'var(--surface)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-lg)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.definition}</span>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => { setPinned(false); setHovering(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
            {t.sources}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {set.sources.map((src, i) => (
              <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener nofollow"
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {src.site}
                </a>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {src.original} ({src.norm.toFixed(1)}/10){src.date ? ` · ${src.date}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {testedVariants.length > 0 && (
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{t.coveredVariants}</div>
              {testedVariants.map((v, i) => (
                <div key={i} style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>{v}</div>
              ))}
            </div>
          )}
          {notApplicable.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{t.notCovered}</div>
              {notApplicable.map((v, i) => (
                <div key={i} style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>{v}</div>
              ))}
            </div>
          )}
          {caveats.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
              {caveats.map((c, i) => (
                <li key={i} style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProReviewScore({ sets, isHe, noScoreNotes = [] }: Props) {
  if (sets.length === 0 && noScoreNotes.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {sets.map((set) => (
        <ScoreBlock
          key={`${set.scoreKey}-${set.setIndex}`}
          set={set}
          label={labelForScoreSet(set, sets, isHe)}
          isHe={isHe}
        />
      ))}
      {noScoreNotes.map((note, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, maxWidth: 260 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isHe ? note.labelHe : note.labelEn}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>
            {isHe ? (L.he.heading) : (L.en.heading)}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
            {isHe ? note.noteHe : note.noteEn}
          </span>
        </div>
      ))}
    </div>
  );
}
