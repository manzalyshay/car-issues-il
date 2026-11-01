'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { newsPath } from '@/lib/newsSlug';
import type { CarNewsItem } from '@/lib/carNews';
import { sizedImageUrl } from '@/lib/imageSizing';

const PAGE = 40;

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

export default function NewsGrid({ news, isHe }: { news: CarNewsItem[]; isHe: boolean }) {
  const [shown, setShown] = useState(Math.min(PAGE, news.length));
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setShown(s => Math.min(s + PAGE, news.length));
  }, [news.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, shown]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {news.slice(0, shown).map((item) => (
          <div key={item.id} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Link
            href={newsPath(item)}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block', flex: 1 }}
          >
            <div className="card" style={{ height: '100%', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
              {item.image_url && !item.image_url.includes('motor1.com') && !item.image_url.includes('hearstapps.com') && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={sizedImageUrl(item.image_url, 500) ?? undefined}
                  alt=""
                  width={960}
                  height={540}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              )}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{timeAgo(item.published_at, isHe)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--text)' }}>
                  {(isHe ? (item.title_he ?? item.title_en) : (item.title_en ?? item.title_he))?.replace(/אחד מה-SUV החשמליים החזקים שהושקו אי פעם/g, 'מבין רכבי ה-SUV החשמליים החזקים שהוצגו השנה').replace(/[—–]/g, '-')}
                </div>
                {(isHe ? item.body_he : item.body_en) && (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {(isHe ? item.body_he : item.body_en)?.replace(/אחד מה-SUV החשמליים החזקים שהושקו אי פעם/g, 'מבין רכבי ה-SUV החשמליים החזקים שהוצגו השנה').replace(/[—–]/g, '-')}
                  </p>
                )}
                {isHe && item.id.startsWith('b70e9563ca') && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>המחקר נערך בארה״ב, והנתונים אינם מתייחסים לישראל.</span>}
                <span style={{ marginTop: 'auto', paddingTop: 6, fontSize: '0.7rem', color: 'var(--text-faint)' }}>{isHe ? `מקור: ${SOURCE_LABELS[item.source] ?? item.source}` : `Source: ${SOURCE_LABELS[item.source] ?? item.source}`}</span>
              </div>
            </div>
          </Link>
          {item.image_url && (item.image_author || item.image_license) && (
            item.image_source_url ? (
              <a
                href={item.image_source_url}
                target="_blank"
                rel="noopener nofollow"
                style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textDecoration: 'none', padding: '4px 2px 0', display: 'block' }}
              >
                {[item.image_author, item.image_license].filter(Boolean).join(' · ')}
              </a>
            ) : (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', padding: '4px 2px 0', display: 'block' }}>
                {[item.image_author, item.image_license].filter(Boolean).join(' · ')}
              </span>
            )
          )}
          </div>
        ))}
      </div>

      {shown < news.length && (
        <>
          <div ref={sentinelRef} style={{ height: 1, marginTop: 24 }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button
              onClick={loadMore}
              className="btn"
              style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
            >
              {isHe ? 'טען עוד' : 'Load more'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
