'use client';

import { useEffect } from 'react';

const isEn = typeof window !== 'undefined' && window.location.hostname.includes('.net');

const CONTENT = {
  en: { lang: 'en', dir: 'ltr', title: 'Site Under Maintenance', body: "The database is currently unavailable. We're working on it — we'll be back soon.", retry: 'Please try again in a few minutes.', tryAgain: 'Try Again', home: 'Home' },
  he: { lang: 'he', dir: 'rtl', title: 'האתר בתחזוקה זמנית', body: 'מסד הנתונים אינו זמין כרגע. אנחנו עובדים על זה — נחזור בקרוב.', retry: 'ניתן לנסות שוב בעוד מספר דקות.', tryAgain: 'נסה שוב', home: 'עמוד הבית' },
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const c = isEn ? CONTENT.en : CONTENT.he;

  return (
    <html lang={c.lang} dir={c.dir}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔧</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            {c.title}
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#aaa', maxWidth: 420, lineHeight: 1.7, marginBottom: 28 }}>
            {c.body}
            <br />
            <span style={{ fontSize: '0.85rem' }}>{c.retry}</span>
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '11px 28px', borderRadius: 999,
                background: '#e63946', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              }}
            >
              {c.tryAgain}
            </button>
            <a
              href="/"
              style={{
                padding: '11px 28px', borderRadius: 999,
                background: '#1a1a1a', color: '#ccc',
                border: '1px solid #333', fontWeight: 600,
                fontSize: '0.95rem', textDecoration: 'none',
              }}
            >
              {c.home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
