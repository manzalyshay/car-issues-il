import Link from 'next/link';

interface Props {
  years: number[];
  makeSlug: string;
  modelSlug: string;
  /** The year page being viewed; undefined = the all-years model page. */
  selected?: number;
  /** 'hero' = segmented control inside the dark hero (desktop); 'strip' = scrolling pills under the hero (mobile). */
  variant: 'hero' | 'strip';
  locale: string;
}

const LABELS: Record<string, { title: string; all: string; allShort: string; hintAll: string; hintYear: string }> = {
  he: { title: 'שנת דגם', all: 'כל השנים', allShort: 'הכל', hintAll: 'מציג נתונים לכל הדורות', hintYear: 'מציג נתונים לשנת' },
  en: { title: 'Model year', all: 'All years', allShort: 'All', hintAll: 'Showing data for all generations', hintYear: 'Showing data for' },
  ru: { title: 'Год выпуска', all: 'Все годы', allShort: 'Все', hintAll: 'Данные по всем поколениям', hintYear: 'Данные за' },
};

/** Model-year picker. Real links (not buttons) so crawlers reach every year page. */
export default function HeroYearPicker({ years, makeSlug, modelSlug, selected, variant, locale }: Props) {
  const l = LABELS[locale] ?? LABELS.he;
  const sorted = [...new Set(years)].sort((a, b) => b - a);
  const items: { key: string; label: string; href: string; on: boolean }[] = [
    { key: 'all', label: variant === 'hero' ? l.allShort : l.all, href: `/cars/${makeSlug}/${modelSlug}`, on: selected === undefined },
    ...sorted.map((y) => ({ key: String(y), label: String(y), href: `/cars/${makeSlug}/${modelSlug}/${y}`, on: selected === y })),
  ];

  if (variant === 'hero') {
    return (
      <div className="hero-years-desktop" style={{ flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#c3cde3' }}>{l.title}</span>
        <nav aria-label={l.title} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: '#182a54', padding: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              aria-current={it.on ? 'page' : undefined}
              style={{
                height: 40, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 9,
                fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                background: it.on ? '#ffffff' : 'transparent', color: it.on ? '#0f1d3d' : '#dbe2f1',
              }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <section className="hero-years-mobile" aria-label={l.title} style={{ padding: '20px 0 8px', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '0 16px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{l.title}</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected === undefined ? l.hintAll : `${l.hintYear} ${selected}`}</span>
      </div>
      <nav aria-label={l.title} className="hero-years-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 16px 6px', scrollbarWidth: 'none' }}>
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            aria-current={it.on ? 'page' : undefined}
            style={{
              flex: 'none', height: 40, padding: '0 16px', display: 'inline-flex', alignItems: 'center', borderRadius: 999,
              fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
              background: it.on ? '#0f1d3d' : 'var(--surface)', color: it.on ? '#ffffff' : 'var(--text)',
              border: `1px solid ${it.on ? '#0f1d3d' : 'var(--border-strong)'}`,
            }}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
