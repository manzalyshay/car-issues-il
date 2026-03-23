import type { Metadata } from 'next';
import Link from 'next/link';
import { getCachedNews, CATEGORY_LABELS } from '@/lib/newsScraper';
import type { NewsArticle } from '@/lib/newsScraper';

export const metadata: Metadata = {
  title: 'חדשות רכב בישראל',
  description: 'כל חדשות הרכב בעברית — ריקולים, מבחני דרך, עדכוני שוק, ורכבים חשמליים.',
  openGraph: { title: 'חדשות רכב | CarIssues IL' },
};

export const revalidate = 3600; // revalidate every hour

const CATEGORY_ORDER = ['recall', 'safety', 'electric', 'test', 'market', 'tips', 'general'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  recall:  'badge-red',
  safety:  'badge-red',
  electric: 'badge-blue',
  test:    'badge-blue',
  market:  'badge-gray',
  tips:    'badge-green',
  general: 'badge-gray',
};

export default function NewsPage() {
  const allNews = getCachedNews();

  // Separate hero and grid
  const hero = allNews.slice(0, 2);
  const grid = allNews.slice(2);

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>חדשות רכב</span>
        </div>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 8 }}>
            חדשות רכב בישראל
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            {allNews.length} מאמרים · מעודכן אוטומטית
          </p>
        </div>

        {/* Category filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {CATEGORY_ORDER.map((cat) => (
            <span key={cat} className={`badge ${CATEGORY_COLORS[cat]}`} style={{ height: 28, fontSize: '0.8rem', padding: '0 12px' }}>
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>

        {/* Hero articles */}
        {hero.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
            {hero.map((article) => (
              <HeroCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Grid */}
        {grid.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>עוד מאמרים</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {grid.map((article) => (
                <SmallCard key={article.id} article={article} />
              ))}
            </div>
          </>
        )}

        {allNews.length === 0 && (
          <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
            <p>אין חדשות כרגע. נסה שוב מאוחר יותר.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url === '#' ? undefined : article.url}
      target={article.url === '#' ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="card"
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ height: 200, background: 'var(--bg-muted)', position: 'relative', overflow: 'hidden', borderRadius: '14px 14px 0 0' }}>
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.3 }}>
            🚗
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className={`badge ${CATEGORY_COLORS[article.category]}`}>{CATEGORY_LABELS[article.category]}</span>
        </div>
      </div>
      <div style={{ padding: '20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.45, marginBottom: 10, color: 'var(--text-primary)' }}>
          {article.title}
        </h2>
        {article.summary && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, flex: 1 }}>
            {article.summary.slice(0, 180)}{article.summary.length > 180 ? '…' : ''}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span className="badge badge-gray">{article.source}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(article.publishedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    </a>
  );
}

function SmallCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url === '#' ? undefined : article.url}
      target={article.url === '#' ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="card"
      style={{ textDecoration: 'none', display: 'flex', gap: 14, padding: '16px 16px', alignItems: 'flex-start' }}
    >
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt=""
          style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: 8, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, opacity: 0.5 }}>
          🚗
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 6 }}>
          <span className={`badge ${CATEGORY_COLORS[article.category]}`} style={{ fontSize: '0.65rem' }}>
            {CATEGORY_LABELS[article.category]}
          </span>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.4, color: 'var(--text-primary)', marginBottom: 6 }}>
          {article.title}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>{article.source}</span>
          <span>{new Date(article.publishedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </a>
  );
}
