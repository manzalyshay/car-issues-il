import Link from 'next/link';
import { ru } from '@/lib/translations.ru';

/** Footer for the Russian pilot pages (/ru). Legal pages exist in Hebrew only, and say so. */
export default function RuFooter() {
  const f = ru.footer;
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: '#0d1b2f', color: '#c8d4e6', marginTop: 48, direction: 'ltr' }}>
      <div className="container" style={{ paddingBlock: '32px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 48px', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', marginBottom: 6 }}>CarIssues</div>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>{f.about}</p>
          </div>
          <nav aria-label="Ссылки" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem' }}>
            <Link href="/ru/vehicle-lookup" style={{ color: '#fff', textDecoration: 'none' }}>Проверка авто по номеру</Link>
            <Link href="/ru#compare" style={{ color: '#fff', textDecoration: 'none' }}>Сравнение автомобилей</Link>
            <Link href="/" lang="he" style={{ color: '#fff', textDecoration: 'none' }}>Сайт на иврите (עברית)</Link>
            <Link href="/contact" style={{ color: '#c8d4e6', textDecoration: 'none' }}>{f.links.find((l) => l.href === '/contact')?.label} (на иврите)</Link>
            <Link href="/privacy" style={{ color: '#c8d4e6', textDecoration: 'none' }}>{f.links.find((l) => l.href === '/privacy')?.label} (на иврите)</Link>
            <Link href="/terms" style={{ color: '#c8d4e6', textDecoration: 'none' }}>{f.links.find((l) => l.href === '/terms')?.label} (на иврите)</Link>
          </nav>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.6, color: '#9db1d4' }}>
          <strong style={{ color: '#c8d4e6' }}>{f.disclaimer}:</strong> {f.disclaimerText}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#7f93b5' }}>© {year} {f.copyright}</p>
      </div>
    </footer>
  );
}
