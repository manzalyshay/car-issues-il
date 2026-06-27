import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { translations } from '@/lib/translations';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  const isEn = host.includes('.net') || host.startsWith('en.');
  return {
    title: isEn ? 'Page Not Found — CarIssues' : 'דף לא נמצא — CarIssues',
    robots: { index: false },
  };
}

export default async function NotFound() {
  const host = (await headers()).get('host') ?? '';
  const isEn = host.includes('.net') || host.startsWith('en.');
  const nf = translations[isEn ? 'en' : 'he'].notFound;

  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div className="container">
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🚗</div>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 900, marginBottom: 12 }}>
          404 — {nf.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1.0625rem' }}>
          {nf.body}
        </p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none', padding: '12px 28px' }}>
          {nf.home}
        </Link>
      </div>
    </div>
  );
}
