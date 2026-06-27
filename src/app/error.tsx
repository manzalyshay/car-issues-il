'use client';

import { useEffect } from 'react';
import { useLocale } from '@/lib/localeContext';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const { t, dir } = useLocale();
  const ep = t.errorPage;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px', textAlign: 'center',
      direction: dir,
    }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔧</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
        {ep.title}
      </h1>
      <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.7, marginBottom: 28 }}>
        {ep.body}
        <br />
        <span style={{ fontSize: '0.85rem' }}>{ep.retry}</span>
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '11px 28px', borderRadius: 999,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
          }}
        >
          {ep.tryAgain}
        </button>
        <a
          href="/"
          style={{
            padding: '11px 28px', borderRadius: 999,
            background: 'var(--surface)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', fontWeight: 600,
            fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          {ep.home}
        </a>
      </div>
      <p style={{ marginTop: 40, fontSize: '0.75rem', color: 'var(--border-strong)' }}>
        {ep.brand} · {new Date().getFullYear()}
      </p>
    </div>
  );
}
