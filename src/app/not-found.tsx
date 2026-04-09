import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'דף לא נמצא — CarIssues',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div className="container">
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🚗</div>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 900, marginBottom: 12 }}>
          404 — הדף לא נמצא
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1.0625rem' }}>
          הדף שחיפשת לא קיים או הוסר.
        </p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none', padding: '12px 28px' }}>
          חזרה לעמוד הבית
        </Link>
      </div>
    </div>
  );
}
