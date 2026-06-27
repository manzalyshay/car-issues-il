'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function CompareError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚖️</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
        Comparison Unavailable
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.7, marginBottom: 28, fontSize: '0.9375rem' }}>
        We couldn&apos;t load this comparison right now. Please try again or choose a different pair.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', borderRadius: 999,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9375rem',
          }}
        >
          Try Again
        </button>
        <Link
          href="/cars/compare"
          style={{
            padding: '10px 24px', borderRadius: 999,
            background: 'var(--surface)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', fontWeight: 600,
            fontSize: '0.9375rem', textDecoration: 'none',
          }}
        >
          All Comparisons
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 24px', borderRadius: 999,
            background: 'var(--surface)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', fontWeight: 600,
            fontSize: '0.9375rem', textDecoration: 'none',
          }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}
