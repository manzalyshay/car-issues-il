import Link from 'next/link';
import { ru } from '@/lib/translations.ru';

/**
 * Footer for the Russian pilot pages (/ru), laid out like the Hebrew footer: brand row
 * with language switches, then link columns. Legal pages exist in Hebrew only, and say so.
 */
export default function RuFooter() {
  const f = ru.footer;
  const year = new Date().getFullYear();
  const label = (href: string) => f.links.find((l) => l.href === href)?.label ?? href;

  const cols: { head: string; links: { href: string; label: string; he?: boolean }[] }[] = [
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
        { href: '/cars', label: 'Все марки и модели', he: true },
        { href: '/rankings', label: 'Рейтинги моделей', he: true },
        { href: '/repairs', label: 'Стоимость ремонта', he: true },
      ],
    },
    {
      head: 'Информация',
      links: [
        { href: '/contact', label: `${label('/contact')} (на иврите)`, he: true },
        { href: '/privacy', label: `${label('/privacy')} (на иврите)`, he: true },
        { href: '/terms', label: `${label('/terms')} (на иврите)`, he: true },
      ],
    },
  ];

  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#93a5c0',
    textDecoration: 'none', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '5px 12px',
  };

  return (
    <footer style={{ background: '#08131f', color: '#93a5c0', padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,32px)', direction: 'ltr' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '6px 10px', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-light.png" alt="carissues.co.il" style={{ height: 28, width: 'auto', display: 'block' }} />
            </span>
            <p className="ru-footer-tagline" style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, maxWidth: 420 }}>{f.about}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/" lang="he" hrefLang="he" className="ru-lang-pill" style={pill}>עברית</Link>
            <a href="https://carissues.net" lang="en" hrefLang="en" className="ru-lang-pill" style={pill}>🌐 EN</a>
          </div>
        </div>

        <div className="ru-footer-links">
          {cols.map((col) => (
            <div key={col.head}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>{col.head}</div>
              <div style={{ display: 'grid', gap: 7, fontSize: 13.5 }}>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} hrefLang={l.he ? 'he' : undefined} className="ru-footer-link" style={{ color: '#93a5c0', textDecoration: 'none' }}>{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#7f93b5' }}>
            <strong style={{ color: '#c8d4e6' }}>{f.disclaimer}:</strong> {f.disclaimerText}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7f9f' }}>© {year} {f.copyright}</p>
        </div>
      </div>
      <style>{`
        .ru-footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .ru-footer-link:hover { color: #fff !important; }
        .ru-lang-pill:hover { border-color: #fff !important; color: #fff !important; }
        @media (max-width: 600px) {
          .ru-footer-links { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .ru-footer-tagline { display: none; }
        }
      `}</style>
    </footer>
  );
}
