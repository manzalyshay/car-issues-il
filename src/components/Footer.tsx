'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/localeContext';

function LogoMark() {
  return (
    <span style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'inline-grid', placeItems: 'center',
    }}>
      <svg width={19} height={11} viewBox="0 0 24 14" fill="none" stroke="#fff"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 9l2-5a2 2 0 0 1 1.9-1.3h10.2a2 2 0 0 1 1.9 1.3L20 9" />
        <path d="M1 9h22a.7.7 0 0 1 .7.7v3a.7.7 0 0 1-.7.7H19v.6a.7.7 0 0 1-.7.7h-1a.7.7 0 0 1-.7-.7v-.6H7.4v.6a.7.7 0 0 1-.7.7h-1a.7.7 0 0 1-.7-.7v-.6H1a.7.7 0 0 1-.7-.7v-3A.7.7 0 0 1 1 9z" />
        <circle cx="6" cy="11" r=".8" />
        <circle cx="18" cy="11" r=".8" />
      </svg>
    </span>
  );
}

export default function Footer() {
  const { t, locale } = useLocale();
  const isEn = locale === 'en';

  const cols = [
    {
      head: isEn ? 'Explore' : 'עיון',
      links: [
        { href: '/cars',         label: isEn ? 'All Makes'      : 'כל היצרנים' },
        { href: '/rankings',     label: isEn ? 'Rankings'       : 'דירוגים' },
        { href: '/cars/compare', label: isEn ? 'Compare Cars'   : 'השוואת רכבים' },
        { href: '/repairs',      label: isEn ? 'Repair Costs'   : 'עלויות תיקון' },
      ],
    },
    {
      head: isEn ? 'Tools' : 'כלים',
      links: [
        { href: '/tco',         label: isEn ? 'TCO Calculator'  : 'מחשבון TCO' },
        { href: '/repairs',     label: isEn ? 'Repair Database' : 'מאגר תיקונים' },
        { href: '/rankings',    label: isEn ? 'Car Rankings'    : 'טבלת דירוגים' },
      ],
    },
    {
      head: isEn ? 'Info' : 'מידע',
      links: [
        { href: '/privacy',  label: isEn ? 'Privacy Policy' : 'מדיניות פרטיות' },
        { href: '/terms',    label: isEn ? 'Terms of Use'   : 'תנאי שימוש' },
        { href: '/contact',  label: isEn ? 'Contact'        : 'צור קשר' },
      ],
    },
  ];

  return (
    <footer style={{
      background: '#ffffff',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '48px 0 28px',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px repeat(3, 1fr)',
          gap: 40,
          marginBottom: 40,
        }} className="footer-grid">

          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <LogoMark />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17, fontWeight: 800,
                color: 'var(--text)', letterSpacing: '-0.01em',
              }}>
                {isEn
                  ? <>Car<b style={{ color: 'var(--accent)' }}>Issues</b><span style={{ color: 'var(--text-faint)', fontWeight: 500, fontSize: '0.78em' }}>.net</span></>
                  : <>קאר<b style={{ color: 'var(--accent)' }}>אישוז</b></>
                }
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: 16 }}>
              {t.footer.about}
            </p>
            {/* Language switcher */}
            <a
              href={isEn ? 'https://carissues.co.il?clang=1' : 'https://carissues.net?clang=1'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-muted)', textDecoration: 'none',
                border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '5px 12px', transition: 'all 0.15s',
              }}
              className="lang-switch"
            >
              🌐 {isEn ? 'עב' : 'EN'}
            </a>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.head}>
              <h4 style={{
                fontSize: '0.68rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: 14,
              }}>
                {col.head}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="footer-link"
                      style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.15s', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
          fontSize: '0.75rem', color: 'var(--text-muted)',
        }}>
          <span>© {new Date().getFullYear()} {t.footer.copyright}</span>
          <span style={{ opacity: 0.5, fontSize: '0.68rem' }}>{t.footer.legal}</span>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--accent) !important; }
        .lang-switch:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
