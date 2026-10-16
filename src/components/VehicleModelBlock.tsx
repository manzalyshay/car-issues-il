import Link from 'next/link';
import type { ModelInfo } from '@/lib/modelInfo';

/** "About this model" block shown after a successful plate lookup (server- or client-rendered). */
export default function VehicleModelBlock({ info, isHe }: { info: ModelInfo; isHe: boolean }) {
  const hasAnything = info.reviewCount > 0 || info.priceMin || info.problems.length > 0 || info.compares.length > 0;
  return (
    <section className="card" aria-labelledby="vl-model-title" style={{ padding: '16px 18px', marginBottom: 16, display: 'grid', gap: 12 }}>
      <h2 id="vl-model-title" style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
        {isHe ? `על הדגם הזה — ${info.name}` : `About this model — ${info.name}`}
      </h2>

      {(info.reviewCount > 0 || info.priceMin) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.9rem' }}>
          {info.reviewCount > 0 && info.avgRating != null && (
            <span>
              <strong>{info.avgRating.toFixed(1)} / 5</strong>{' '}
              <span style={{ color: 'var(--text-muted)' }}>
                {isHe ? (info.reviewCount === 1 ? '(ביקורת בעלים אחת באתר)' : `(${info.reviewCount} ביקורות בעלים באתר)`) : `(${info.reviewCount} owner review${info.reviewCount > 1 ? 's' : ''})`}
              </span>
            </span>
          )}
          {info.priceMin && (
            <span>
              {isHe ? 'מחיר חדש בישראל החל מ-' : 'New in Israel from '}
              <strong>₪{info.priceMin.toLocaleString('en-US')}</strong>
              <span style={{ color: 'var(--text-muted)' }}>{isHe ? ' (מחירון הגרסאות באתר)' : ' (trim price list)'}</span>
            </span>
          )}
        </div>
      )}

      {info.problems.map((p) => (
        <div key={p.source}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>{isHe ? 'בעיות נפוצות' : 'Common problems'}</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.7, fontSize: '0.875rem' }} lang={p.lang} dir={p.lang === 'en' ? 'ltr' : undefined}>
            {p.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {p.sourceUrl
              ? <>{isHe ? 'מקור: ' : 'Source: '}<a href={p.sourceUrl} target="_blank" rel="noopener nofollow" style={{ color: 'var(--accent)' }}>{p.source}</a></>
              : p.source}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link href={info.modelUrl} style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
          {isHe ? `לדף ${info.name} ←` : `${info.name} page →`}
        </Link>
        {info.problems.length > 0 && (
          <Link href={info.issuesUrl} style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)' }}>
            {isHe ? 'כל הבעיות הנפוצות' : 'All common problems'}
          </Link>
        )}
        {info.compares.map((c) => (
          <Link key={c.path} href={c.path} style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)' }}>
            {c.label}
          </Link>
        ))}
      </div>
      {!hasAnything && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isHe ? 'עדיין אין לנו ביקורות או נתוני מחיר על הדגם הזה.' : "We don't have reviews or price data for this model yet."}
        </div>
      )}
    </section>
  );
}
