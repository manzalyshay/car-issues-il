import Link from 'next/link';

/**
 * Header for the Russian pilot pages (/ru). Server-rendered, no client state: the pilot
 * has no login or account pages in Russian, so the header only links the Russian pages
 * and the Hebrew site.
 */
const LINKS = [
  { href: '/ru/vehicle-lookup', label: 'Проверка по номеру', title: 'Проверка авто по номеру' },
  { href: '/ru#compare', label: 'Сравнения', title: 'Сравнение автомобилей' },
];

export default function RuHeader() {
  return (
    <header style={{
      background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div className="container" style={{
        minHeight: 62, display: 'flex', alignItems: 'center', gap: '8px 18px', flexWrap: 'wrap',
        justifyContent: 'space-between', direction: 'ltr', paddingBlock: 8,
      }}>
        <Link href="/ru" aria-label="CarIssues: главная на русском" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="carissues.co.il" style={{ height: 32, width: 'auto', display: 'block' }} />
        </Link>
        <nav aria-label="Разделы" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} title={l.title} style={{
              padding: '8px 10px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
              textDecoration: 'none', borderRadius: 9, whiteSpace: 'nowrap',
            }}>{l.label}</Link>
          ))}
          <Link href="/" lang="he" hrefLang="he" style={{
            padding: '6px 10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)',
            textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 999, whiteSpace: 'nowrap',
          }}>עברית</Link>
        </nav>
      </div>
    </header>
  );
}
