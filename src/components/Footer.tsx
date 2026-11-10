'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/localeContext';
import { pick } from '@/lib/i18n';


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
      // On production domains - let the href navigate normally
    }
  }

  // Preserve the current page - not just the other domain's homepage - so
  // the switcher works as a real internal link into every deep page on the
  // other domain (crawl/discovery signal, not just a UX nicety).
  const targetOrigin = isEn ? 'https://carissues.co.il' : 'https://carissues.net';
  // ?clang=1 tells the middleware this is an explicit user choice - sets the preference
  // cookie so the geo-redirect doesn't immediately bounce them back to the other domain
  const href = `${targetOrigin}${pathname && pathname !== '/' ? pathname : ''}?clang=1`;

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

const pillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#93a5c0',
  textDecoration: 'none', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '5px 12px',
};

export default function Footer() {
  const { locale, t } = useLocale();
  const isEn = locale === 'en';
  const isRu = locale === 'ru';

  // The Russian site links its own pages (/ru URLs) and labels the Hebrew-only ones.
  const ruCols = [
    {
      head: 'На русском',
      links: [
        { href: '/ru', label: 'Главная' },
        { href: '/ru/vehicle-lookup', label: 'Проверка авто по номеру' },
        { href: '/ru#compare', label: 'Сравнение автомобилей' },
      ],
    },
    {
      head: 'На иврите',
      links: [
        { href: '/cars', label: 'Все марки и модели' },
        { href: '/rankings', label: 'Рейтинги моделей' },
        { href: '/repairs', label: 'Стоимость ремонта' },
      ],
    },
    {
      head: 'Информация',
      links: [
        { href: '/privacy', label: `${t.footer.links.find((l) => l.href === '/privacy')?.label ?? 'Конфиденциальность'} (на иврите)` },
        { href: '/terms', label: `${t.footer.links.find((l) => l.href === '/terms')?.label ?? 'Условия'} (на иврите)` },
        { href: '/contact', label: `${t.footer.links.find((l) => l.href === '/contact')?.label ?? 'Контакты'} (на иврите)` },
      ],
    },
  ];

  const cols = isRu ? ruCols : [
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
        { href: '/checklist',      label: isEn ? 'Buying checklist' : 'צ׳קליסט קנייה' },
        { href: '/repairs',        label: isEn ? 'Repair Costs'     : 'עלויות תיקון' },
      ],
    },
    {
      head: isEn ? 'Info' : 'מידע',
      links: [
        { href: '/privacy', label: isEn ? 'Privacy Policy' : 'מדיניות פרטיות' },
        { href: '/accessibility', label: isEn ? 'Accessibility' : 'הצהרת נגישות' },
        { href: '/news',    label: isEn ? 'News'           : 'חדשות' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#08131f', color: '#93a5c0', padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,32px)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Brand row - compact on mobile */}
        <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '6px 10px', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={isEn ? '/logo-net.png' : '/logo-light.png'} alt={isEn ? 'carissues.net' : 'carissues.co.il'} style={{ height: isEn ? 48 : 28, width: 'auto', display: 'block' }} />
            </span>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, color: '#93a5c0' }} className="footer-tagline">
              {pick(locale, {
                he: 'מידע על דגמי רכב, ביקורות בעלים, ריקולים ועלויות תיקון.',
                en: 'Car model information, owner reviews, recalls and repair costs.',
                ru: t.footer.about,
              })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isRu ? (
              <>
                <Link href="/" lang="he" hrefLang="he" className="lang-switch-dark" style={pillStyle}>עברית</Link>
                <a href="https://carissues.net" lang="en" hrefLang="en" className="lang-switch-dark" style={pillStyle}>🌐 EN</a>
              </>
            ) : <LangSwitch isEn={isEn} />}
            {/* Russian pilot pages exist on the Hebrew site only */}
            {locale === 'he' && (
              <Link href="/ru" lang="ru" hrefLang="ru" className="lang-switch-dark" style={{
                display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#93a5c0',
                textDecoration: 'none', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '5px 12px',
              }}>Русский</Link>
            )}
          </div>
        </div>

        {/* Link columns - 3-col desktop, 2-col mobile */}
        <div className="footer-links">
          {cols.map(col => (
            <div key={col.head}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>{col.head}</div>
              <div style={{ display: 'grid', gap: 7, fontSize: 13.5 }}>
                {col.links.map(l => (
                  <Link key={l.href} href={l.href} hrefLang={isRu && !l.href.startsWith('/ru') ? 'he' : undefined} className="footer-link" style={{ color: '#93a5c0', textDecoration: 'none' }}>
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
