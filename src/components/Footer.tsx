'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/localeContext';


function LangSwitch({ isEn }: { isEn: boolean }) {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';
      if (isLocalhost) {
        e.preventDefault();
        const next = isEn ? 'he' : 'en';
        document.cookie = `clang=${next};path=/;max-age=31536000;samesite=lax`;
        try { localStorage.setItem('locale', next); } catch {}
        window.location.reload();
      }
      // On production domains — let the href navigate normally
    }
  }

  // Preserve the current page — not just the other domain's homepage — so
  // the switcher works as a real internal link into every deep page on the
  // other domain (crawl/discovery signal, not just a UX nicety).
  const targetOrigin = isEn ? 'https://carissues.co.il' : 'https://carissues.net';
  const href = `${targetOrigin}${pathname && pathname !== '/' ? pathname : ''}`;

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: '0.75rem', fontWeight: 700,
        color: '#93a5c0', textDecoration: 'none',
        border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 8,
        padding: '5px 12px', transition: 'all 0.15s',
      }}
      className="lang-switch-dark"
    >
      🌐 {isEn ? 'עב' : 'EN'}
    </a>
  );
}

export default function Footer() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const cols = [
    {
      head: isEn ? 'Explore' : 'עיון',
      links: [
        { href: '/cars',         label: isEn ? 'All Makes'    : 'כל היצרנים' },
        { href: '/rankings',     label: isEn ? 'Rankings'     : 'דירוגי דגמים' },
        { href: '/cars/compare', label: isEn ? 'Compare'      : 'השוואות' },
      ],
    },
    {
      head: isEn ? 'Tools' : 'כלים',
      links: [
        { href: '/tco',            label: isEn ? 'TCO Calculator'  : 'מחשבון TCO' },
        { href: '/vehicle-lookup', label: isEn ? 'Car Check'       : 'צ׳קליסט קנייה' },
        { href: '/repairs',        label: isEn ? 'Repair Costs'    : 'בדיקת ריקולים' },
      ],
    },
    {
      head: isEn ? 'Info' : 'מידע',
      links: [
        { href: '/privacy', label: isEn ? 'Privacy Policy' : 'מדיניות פרטיות' },
        { href: '/news',    label: isEn ? 'News'           : 'חדשות' },
        { href: '/sales',   label: isEn ? 'Deals'          : 'מבצעים' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#08131f', color: '#93a5c0', padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,32px)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Brand row — compact on mobile */}
        <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '6px 10px', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={isEn ? '/logo-net.png' : '/logo-light.png'} alt={isEn ? 'carissues.net' : 'carissues.co.il'} style={{ height: isEn ? 48 : 28, width: 'auto', display: 'block' }} />
            </span>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, color: '#93a5c0' }} className="footer-tagline">
              {isEn
                ? 'Israel\'s largest database for car problems, recalls & repair costs.'
                : 'המאגר הגדול ביותר בישראל לבעיות רכב, ריקולים ועלויות תיקון.'}
            </p>
          </div>
          <LangSwitch isEn={isEn} />
        </div>

        {/* Link columns — 3-col desktop, 2-col mobile */}
        <div className="footer-links">
          {cols.map(col => (
            <div key={col.head}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>{col.head}</div>
              <div style={{ display: 'grid', gap: 7, fontSize: 13.5 }}>
                {col.links.map(l => (
                  <Link key={l.href} href={l.href} className="footer-link" style={{ color: '#93a5c0', textDecoration: 'none' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .footer-link:hover { color: #fff !important; }
        .lang-switch-dark { border-color: rgba(255,255,255,.2) !important; }
        .lang-switch-dark:hover { border-color: #fff !important; color: #fff !important; }
        @media (max-width: 600px) {
          .footer-links { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .footer-tagline { display: none; }
        }
      `}</style>
    </footer>
  );
}
