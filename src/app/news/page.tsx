import type { Metadata } from 'next';
import Link from 'next/link';
import { getCachedNews, CATEGORY_LABELS } from '@/lib/newsScraper';
import type { NewsArticle } from '@/lib/newsScraper';

export const metadata: Metadata = {
  title: 'חדשות וביקורות רכב',
  description: 'ביקורות רכב, השקות ועדכוני שוק מאתרי הרכב המובילים בישראל ובעולם.',
  openGraph: { title: 'חדשות רכב | CarIssues IL' },
};

export const revalidate = 3600;

const CATEGORY_COLORS: Record<string, string> = {
  recall:   'badge-red',
  safety:   'badge-red',
  electric: 'badge-blue',
  test:     'badge-blue',
  launch:   'badge-blue',
  market:   'badge-gray',
  tips:     'badge-green',
  general:  'badge-gray',
};

export default async function NewsPage() {
  const allNews = await getCachedNews();
  const heNews = allNews.filter((a) => a.sourceLang === 'he');
  const enNews = allNews.filter((a) => a.sourceLang === 'en');

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
            ביקורות וחדשות רכב
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            מאתרי הרכב המובילים בישראל ובעולם · מעודכן אוטומטית
          </p>
        </div>

        {/* Hebrew / Israeli section */}
        {heNews.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-red)', flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>🇮🇱 ביקורות ישראליות</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
                {heNews.length} מאמרים
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {heNews.slice(0, 6).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* Global section */}
        {enNews.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 4, height: 24, borderRadius: 2, background: '#8b5cf6', flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>🌍 ביקורות בינלאומיות</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
                {enNews.length} מאמרים
              </span>
            </div>
            {/* Hero row — first 2 as big cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 20 }}>
              {enNews.slice(0, 2).map((article) => (
                <HeroCard key={article.id} article={article} />
              ))}
            </div>
            {/* Rest as small cards */}
            {enNews.length > 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {enNews.slice(2, 20).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>
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
          <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, opacity: 0.2 }}>🚗</div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className={`badge ${CATEGORY_COLORS[article.category]}`}>{CATEGORY_LABELS[article.category]}</span>
        </div>
      </div>
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.45, marginBottom: 10, color: 'var(--text-primary)' }}>
          {article.title}
        </h3>
        {article.summary && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, flex: 1 }}>
            {article.summary.slice(0, 160)}{article.summary.length > 160 ? '…' : ''}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{article.source}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(article.publishedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    </a>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url === '#' ? undefined : article.url}
      target={article.url === '#' ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="card"
      style={{ textDecoration: 'none', display: 'flex', gap: 14, padding: '16px', alignItems: 'flex-start' }}
    >
      <div style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-muted)' }}>
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, opacity: 0.3 }}>🚗</div>
        )}
      </div>
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
