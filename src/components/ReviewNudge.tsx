'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/localeContext';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn: string;
  modelNameEn: string;
}

const DELAY_MS = 30_000;
const STAR_LABELS_HE: Record<number, string> = { 1: 'גרוע', 2: 'לא מרוצה', 3: 'בסדר', 4: 'טוב', 5: 'מצוין' };
const STAR_LABELS_EN: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

export default function ReviewNudge({ makeSlug, modelSlug, makeNameHe, modelNameHe, makeNameEn, modelNameEn }: Props) {
  const { locale } = useLocale();
  const isHe = locale === 'he';
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [hovered, setHovered] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  const storageKey = `rnudge_${makeSlug}_${modelSlug}`;

  useEffect(() => {
    if (sessionStorage.getItem(storageKey)) return;

    function tick() {
      if (lastRef.current !== null) activeRef.current += Date.now() - lastRef.current;
      lastRef.current = Date.now();
      const remaining = DELAY_MS - activeRef.current;
      if (remaining <= 0) {
        const el = document.getElementById('write-review');
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
        }
        setVisible(true);
        sessionStorage.setItem(storageKey, '1');
      } else {
        timerRef.current = setTimeout(tick, remaining);
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        lastRef.current = Date.now();
        timerRef.current = setTimeout(tick, DELAY_MS - activeRef.current);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (lastRef.current !== null) { activeRef.current += Date.now() - lastRef.current; lastRef.current = null; }
      }
    }

    if (document.visibilityState === 'visible') {
      lastRef.current = Date.now();
      timerRef.current = setTimeout(tick, DELAY_MS);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey]);

  function handleStarPick(star: number) {
    // Dismiss nudge, scroll to form, click matching star in the real form
    setDismissed(true);
    setTimeout(() => setVisible(false), 300);
    const el = document.getElementById('write-review');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const stars = document.querySelectorAll<HTMLButtonElement>('#write-review button[type="button"]');
      stars[star - 1]?.click();
    }, 600);
  }

  function dismiss() {
    setDismissed(true);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  const carName = isHe ? `${makeNameHe} ${modelNameHe}` : `${makeNameEn} ${modelNameEn}`;
  const displayRating = hovered;

  return (
    <div
      role="dialog"
      aria-label={isHe ? 'כתיבת ביקורת' : 'Write a review'}
      style={{
        position: 'fixed',
        bottom: 20,
        insetInlineStart: '50%',
        transform: dismissed ? 'translateX(-50%) translateY(120%)' : 'translateX(-50%) translateY(0)',
        zIndex: 9000,
        width: 'min(400px, calc(100vw - 32px))',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 40px -8px rgba(13,27,47,.28), 0 2px 8px rgba(0,0,0,.08)',
        border: '1px solid rgba(23,64,143,.15)',
        padding: '18px 18px 16px',
        transition: 'transform 0.3s cubic-bezier(.23,1,.32,1)',
        direction: isHe ? 'rtl' : 'ltr',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: showStars ? 14 : 0 }}>
        <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⭐</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0d1b2f', lineHeight: 1.3 }}>
            {isHe ? `יש לכם ${carName}?` : `Do you own the ${carName}?`}
          </div>
          {!showStars && (
            <div style={{ fontSize: '0.8rem', color: '#5b6a86', marginTop: 3 }}>
              {isHe ? 'דרגו אותו ועזרו לקונים אחרים' : 'Rate it and help other buyers'}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label={isHe ? 'סגור' : 'Dismiss'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9ab8', fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* Inline CTA → expands to star picker */}
      {!showStars ? (
        <button
          onClick={() => setShowStars(true)}
          style={{
            width: '100%',
            marginTop: 12,
            background: '#17408f',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.88rem',
            padding: '10px 0',
            cursor: 'pointer',
          }}
        >
          {isHe ? 'דרגו את הרכב ←' : 'Rate this car →'}
        </button>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b6a86', marginBottom: 10 }}>
            {isHe ? 'כמה כוכבים תתנו?' : 'How many stars?'}
          </div>
          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => handleStarPick(star)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px',
                  fontSize: 38, lineHeight: 1,
                  color: star <= displayRating ? '#f59e0b' : '#d1d5db',
                  transition: 'color 0.1s, transform 0.1s',
                  transform: star <= displayRating ? 'scale(1.15)' : 'scale(1)',
                }}
                aria-label={`${star} ${isHe ? 'כוכבים' : 'stars'}`}
              >
                ★
              </button>
            ))}
          </div>
          {/* Label under stars */}
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: displayRating > 0 ? '#f59e0b' : 'var(--text-muted)', minHeight: 18 }}>
            {displayRating > 0
              ? (isHe ? STAR_LABELS_HE[displayRating] : STAR_LABELS_EN[displayRating])
              : (isHe ? 'העבירו את העכבר לדירוג' : 'Hover to rate')}
          </div>
          <div style={{ fontSize: '0.73rem', color: '#8a9ab8', marginTop: 6 }}>
            {isHe ? 'לחיצה תפתח את טופס הביקורת' : 'Clicking opens the full review form'}
          </div>
        </div>
      )}
    </div>
  );
}
