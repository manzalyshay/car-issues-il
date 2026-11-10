import Link from 'next/link';

/**
 * Header for the Russian pilot pages (/ru). Server-rendered, no client state: the pilot
 * has no login or account pages in Russian, so the header only links the Russian pages
 * and the Hebrew site. Styled like the Hebrew header (frosted bar, pill nav, solid CTA).
 */
const LINKS = [
  { href: '/ru', label: 'Главная', title: 'CarIssues на русском' },
  { href: '/ru/vehicle-lookup', label: 'Проверка по номеру', title: 'Проверка авто по номеру' },
  { href: '/ru#compare', label: 'Сравнения', title: 'Сравнение автомобилей' },
];

export default function RuHeader() {
  return (
    <header style={{
      background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '8px clamp(16px,3vw,32px)', minHeight: 64,
        display: 'flex', alignItems: 'center', gap: '8px 18px', justifyContent: 'space-between', direction: 'ltr',
      }}>
        <Link href="/ru" aria-label="CarIssues: главная на русском" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="carissues.co.il" className="ru-logo" style={{ height: 34, width: 'auto', display: 'block' }} />
        </Link>
        <nav aria-label="Разделы" className="ru-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} title={l.title} className="ru-nav-link" style={{
              padding: '8px 12px', fontSize: 14.5, fontWeight: 600, color: 'var(--ink-soft)',
              textDecoration: 'none', borderRadius: 9, whiteSpace: 'nowrap',
            }}>{l.label}</Link>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link href="/" lang="he" hrefLang="he" className="ru-he-link" style={{
            padding: '8px 12px', fontSize: 13.5, fontWeight: 700, color: 'var(--ink-soft)',
            textDecoration: 'none', border: '1.5px solid var(--border)', borderRadius: 10, whiteSpace: 'nowrap',
          }}>עברית</Link>
          <Link href="/ru/vehicle-lookup" className="ru-cta" style={{
            padding: '9px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)',
            textDecoration: 'none', borderRadius: 10, whiteSpace: 'nowrap',
          }}>Проверить авто</Link>
        </div>
      </div>
      <style>{`
        .ru-nav-link:hover { background: var(--accent-soft); color: var(--accent) !important; }
        .ru-he-link:hover { border-color: var(--border-strong) !important; color: var(--text) !important; }
        .ru-cta:hover { background: var(--accent-hover) !important; }
        @media (max-width: 820px) { .ru-nav { display: none !important; } }
        @media (max-width: 480px) { .ru-cta { padding: 8px 12px !important; font-size: 13px !important; } .ru-he-link { padding: 7px 9px !important; } .ru-logo { height: 28px !important; } }
        @media (max-width: 359px) { .ru-cta { display: none; } }
      `}</style>
    </header>
  );
}
