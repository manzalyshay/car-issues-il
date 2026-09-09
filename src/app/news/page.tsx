import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getLatestNews, ensureNewsTable } from '@/lib/carNews';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'he' ? {
    title: 'חדשות רכב | CarIssues',
    description: 'חדשות רכב עדכניות מהעולם — עיבוד ותרגום AI, מתעדכן יומית',
    alternates: { canonical: `${base}/news` },
  } : {
    title: 'Car News | CarIssues',
    description: 'Latest car news from around the world — AI-rewritten daily',
    alternates: { canonical: `${base}/news` },
  };
}

const SOURCE_LABELS: Record<string, string> = {
  motor1: 'Motor1',
  caranddriver: 'Car and Driver',
  cartube: 'CarTube',
};

function timeAgo(iso: string | null, isHe: boolean): string {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return isHe ? 'לפני פחות משעה' : 'less than an hour ago';
  if (h < 24) return isHe ? `לפני ${h} שעות` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return isHe ? `לפני ${d} ימים` : `${d}d ago`;
}

export default async function NewsPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  await ensureNewsTable().catch(() => {});
  const news = await getLatestNews(40).catch(() => []);

  return (
    <div className="page-section" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{isHe ? 'חדשות רכב' : 'Car News'}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {isHe ? '🗞️ חדשות רכב' : '🗞️ Car News'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isHe
              ? 'חדשות מהעולם, עיבוד מחדש בידי AI — מתעדכן יומית'
              : 'World automotive news, AI-rewritten — updated daily'}
          </p>
        </div>

        {news.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <p style={{ margin: 0, fontWeight: 600 }}>{isHe ? 'החדשות הראשונות בדרך — חזור מחר' : 'First articles on the way — check back tomorrow'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {news.map((item) => (
              <a
                key={item.id}
                href={item.original_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="card" style={{ height: '100%', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
                  {item.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.image_url}
                      alt={item.title_he ?? item.title_en ?? ''}
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  )}
                  <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        {SOURCE_LABELS[item.source] ?? item.source}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{timeAgo(item.published_at, isHe)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--text)' }}>
                      {isHe ? (item.title_he ?? item.title_en) : (item.title_en ?? item.title_he)}
                    </div>
                    {(isHe ? item.body_he : item.body_en) && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {isHe ? item.body_he : item.body_en}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
