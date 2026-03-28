'use client';

import { useRouter } from 'next/navigation';

type AdminPage = 'summaries' | 'scrape';

export default function AdminNav({ active }: { active: AdminPage }) {
  const router = useRouter();

  const links: { page: AdminPage; label: string; href: string }[] = [
    { page: 'summaries', label: 'סיכומי AI',      href: '/admin' },
    { page: 'scrape',    label: 'פוסטים שנסרקו',  href: '/admin/scrape' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
      {links.map(({ page, label, href }) => (
        <button
          key={page}
          onClick={() => router.push(href)}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: active === page ? 'none' : '1px solid var(--border)',
            background: active === page ? 'var(--brand-red)' : 'transparent',
            color: active === page ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
