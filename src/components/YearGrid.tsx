'use client';

import Link from 'next/link';

interface YearEntry {
  year: number;
  reviewCount: number;
  href: string;
}

export default function YearGrid({ years }: { years: YearEntry[] }) {
  return (
    <>
      <style>{`
        .year-card {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 90px; border-radius: 12px; border: 1.5px solid var(--border);
          background: var(--bg-card); text-decoration: none;
          font-weight: 700; font-size: 1.2rem; color: var(--text-primary);
          transition: all 0.2s ease; box-shadow: var(--shadow-sm); gap: 4px;
        }
        .year-card:hover {
          border-color: var(--brand-red); color: var(--brand-red);
          box-shadow: var(--shadow-red); transform: translateY(-2px);
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {years.map(({ year, reviewCount, href }) => (
          <Link key={year} href={href} className="year-card">
            {year}
            {reviewCount > 0 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--brand-red)', background: 'rgba(230,57,70,.1)', borderRadius: 9999, padding: '2px 8px' }}>
                {reviewCount} ביקורות
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
