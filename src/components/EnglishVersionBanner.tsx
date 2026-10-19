'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const DISMISS_COOKIE = 'en_banner_dismissed';

/**
 * Dismissible "English version" banner for non-Israeli visitors on carissues.co.il.
 * Replaces the old automatic co.il → .net geo-redirect. Rendered only after mount,
 * so the server HTML (what crawlers see) never changes.
 */
export default function EnglishVersionBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.location.hostname !== 'carissues.co.il') return;
    if (document.cookie.split('; ').some((c) => c.startsWith(`${DISMISS_COOKIE}=`))) return;
    let cancelled = false;
    fetch('/api/geo', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { country?: string } | null) => {
        if (!cancelled && d?.country && d.country !== 'IL') setShow(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  // Same codebase serves both hosts, so every co.il path has an English twin on .net.
  const href = `https://carissues.net${pathname && pathname !== '/' ? pathname : '/'}?clang=1`;

  function dismiss() {
    document.cookie = `${DISMISS_COOKIE}=1;path=/;max-age=${60 * 60 * 24 * 180};samesite=lax`;
    setShow(false);
  }

  return (
    <div
      dir="ltr"
      role="region"
      aria-label="English version"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        background: '#0f1e3a', color: '#e2e8f0', fontSize: '0.875rem',
        padding: '8px 16px', flexWrap: 'wrap',
      }}
    >
      <span>Looking for English?</span>
      <a href={href} lang="en" hrefLang="en" style={{ color: '#93c5fd', fontWeight: 700, textDecoration: 'underline' }}>
        English version → carissues.net
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'transparent', border: 0, color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
