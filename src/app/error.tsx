'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: '24px', textAlign: 'center',
      direction: 'rtl',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔧</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        האתר בתחזוקה זמנית
      </h1>
      <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.7, marginBottom: 28 }}>
        מסד הנתונים אינו זמין כרגע. אנחנו עובדים על זה — נחזור בקרוב.
        <br />
        <span style={{ fontSize: '0.85rem' }}>ניתן לנסות שוב בעוד מספר דקות.</span>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '11px 28px', borderRadius: 999,
            background: 'var(--brand-red)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
          }}
        >
          נסה שוב
        </button>
        <a
          href="/"
          style={{
            padding: '11px 28px', borderRadius: 999,
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', fontWeight: 600,
            fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          עמוד הבית
        </a>
      </div>
      <p style={{ marginTop: 40, fontSize: '0.75rem', color: 'var(--border-strong)' }}>
        CarIssues IL · {new Date().getFullYear()}
      </p>
    </div>
  );
}
