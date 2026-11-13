'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { ArticleFinding } from '@/lib/modelSynthesis';
import type { Recall } from '@/app/api/recalls/route';
import { useLocale } from '@/lib/localeContext';
import CarDiagramRecalls, { classifyRecall, ZONE_LABELS, type ZoneId } from '@/components/CarDiagramRecalls';

interface Props {
  makeEn: string;
  modelEn: string;
  year?: number;
  years?: number[]; // all model years to query
  /** Recalls already loaded on the server; when given, nothing is fetched in the browser. */
  initialRecalls?: Recall[];
  /** Short summary shown under the heading. */
  intro?: string;
  /** Weaknesses found in published road tests, each with its source. */
  articleFindings?: ArticleFinding[];
}

/** Recall cards shown per page. */
const PAGE_SIZE = 10;

const pageBtn: React.CSSProperties = {
  height: 32, padding: '0 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700,
  background: 'var(--bg-muted)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
};

export default function RecallsSection({ makeEn, modelEn, year, years, initialRecalls, intro, articleFindings }: Props) {
  const { t, locale } = useLocale();
  const rc = t.recalls;
  const isHe = locale === 'he';

  const [recalls, setRecalls]     = useState<Recall[]>(initialRecalls ?? []);
  // Start in loading state so SSR / first paint never shows a false "no recalls" message
  const [loading, setLoading]     = useState(!initialRecalls);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'il' | 'us'>('all');
  const [page, setPage] = useState(1);

  const yearsKey = years?.join(',') ?? '';

  useEffect(() => {
    if (initialRecalls) return;
    let cancelled = false;
    setLoading(true);

    const load = async (loc: string): Promise<Recall[]> => {
      const params = new URLSearchParams({ make: makeEn, model: modelEn, locale: loc });
      // Hebrew site: include Israeli manufacturer notices (data.gov.il) alongside US recalls.
      if (loc !== 'en') params.set('il', '1');
      if (year) params.set('year', String(year));
      else if (yearsKey) params.set('years', yearsKey);
      const res = await fetch(`/api/recalls?${params}`);
      if (!res.ok) throw new Error(`recalls ${res.status}`);
      const d = (await res.json()) as { recalls?: Recall[] };
      return d.recalls ?? [];
    };

    (async () => {
      let list: Recall[] = [];
      try { list = await load(locale); } catch { /* fall through to English */ }
      // The Hebrew path depends on translation; if it fails or returns no US rows,
      // add the English US list (same source the recalls chart uses).
      if (locale !== 'en' && !list.some(r => r.source !== 'il')) {
        try {
          const en = await load('en');
          list = [...list, ...en.map(r => ({ ...r, source: 'us' as const }))];
        } catch { /* keep what we have */ }
      }
      if (!cancelled) { setRecalls(list); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [makeEn, modelEn, year, yearsKey, locale, initialRecalls]);

  // Collect unique years for the filter
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    for (const r of recalls) { if (r.year) ys.add(r.year); }
    return Array.from(ys).sort((a, b) => b - a);
  }, [recalls]);

  const filtered = useMemo(() => recalls.filter(r =>
    (filterYear === 'all' || r.year === filterYear)
    && (filterSource === 'all' || (filterSource === 'il' ? r.source === 'il' : r.source !== 'il'))),
  [recalls, filterYear, filterSource]);

  // Paging: every card stays in the HTML (search engines read the whole list); only
  // the current page is displayed.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const goToPage = (n: number) => {
    setPage(n);
    setExpanded(null);
    document.getElementById('recall-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const ilCount = useMemo(() => recalls.filter(r => r.source === 'il').length, [recalls]);
  const usCount = useMemo(() => recalls.filter(r => r.source === 'us').length, [recalls]);

  // Group by diagram zone (same classification the car diagram uses) so this summary
  // always lists exactly the zones shown below it — no separate, mismatched count.
  const componentCounts = useMemo(() => {
    const map: Partial<Record<ZoneId, number>> = {};
    for (const r of recalls) {
      const zone = classifyRecall(r.component, r.componentEn);
      map[zone] = (map[zone] ?? 0) + 1;
    }
    return (Object.entries(map) as [ZoneId, number][]).sort((a, b) => b[1] - a[1]);
  }, [recalls]);

  return (
    <div id="recalls" style={{ marginBottom: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: loading ? 24 : recalls.length > 0 ? 20 : 24, flexWrap: 'wrap' }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: '#dc2626', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{rc.title}</h2>
        {!loading && recalls.length > 0 && (
          <span style={{
            fontSize: '0.75rem', color: '#fff',
            background: '#dc2626', padding: '2px 10px', borderRadius: 999,
            fontWeight: 700,
          }}>
            {recalls.length}
          </span>
        )}
        {!loading && ilCount > 0 && usCount > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isHe
              ? `${ilCount} ${ilCount === 1 ? 'ישראלי' : 'ישראליים'}, ${usCount} ${usCount === 1 ? 'אמריקאי' : 'אמריקאים'}`
              : `${ilCount} Israeli, ${usCount} US`}
          </span>
        )}
        {!loading && recalls.length > 0 && (
          <a
            href={`/embed?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}${year ? `&year=${year}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginInlineStart: 'auto' }}
          >
            {isHe ? '‹/› הטמע' : '‹/› Embed'}
          </a>
        )}
      </div>

      {intro && (
        <p style={{ margin: '0 0 18px', fontSize: '0.92rem', lineHeight: 1.75 }}>
          {intro}{' '}
          {isHe && (
            <Link href="/vehicle-lookup" style={{ color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              בדיקת רכב לפי מספר רישוי ←
            </Link>
          )}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 80, borderRadius: 12, background: 'var(--bg-muted)',
              animation: 'recalls-pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          background: 'var(--bg-muted)', borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>✅</div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            {year || filterYear !== 'all'
              ? `${rc.noneForYear} ${year ?? filterYear}`
              : rc.noneFound}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {isHe ? 'אין ריקולים רשומים לרכב זה.' : 'No recalls on record for this vehicle.'}
          </p>
        </div>
      )}

      {/* Source filter: Israeli notices vs recalls published abroad */}
      {!loading && ilCount > 0 && usCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {([
            ['all', isHe ? `הכול (${recalls.length})` : `All (${recalls.length})`],
            ['il', isHe ? `בישראל (${ilCount})` : `Israel (${ilCount})`],
            ['us', isHe ? `בחו״ל (${usCount})` : `Abroad (${usCount})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFilterSource(key); setPage(1); if (key === 'il') setFilterYear('all'); }}
              aria-pressed={filterSource === key}
              style={{
                height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700,
                background: filterSource === key ? 'var(--accent)' : 'var(--bg-muted)',
                color: filterSource === key ? '#fff' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Findings from published road tests, each credited to its article */}
      {articleFindings && articleFindings.length > 0 && filterSource === 'all' && (
        <div style={{ margin: '0 0 20px', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-muted)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 800 }}>
            {isHe ? 'חולשות שעלו במבחני דרכים' : 'Weaknesses found in road tests'}
          </h3>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.875rem', lineHeight: 1.6 }}>
            {articleFindings.map((f) => (
              <li key={f.text}>
                {f.text}{' '}
                {f.url
                  ? <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>({f.site})</a>
                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({f.site})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Summary bar */}
          {recalls.length > 1 && componentCounts.length > 0 && filterYear === 'all' && (
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.05em', alignSelf: 'center', marginInlineEnd: 4 }}>
                {isHe ? 'מרוכזים ב:' : 'Top areas:'}
              </span>
              {componentCounts.map(([zone, cnt]) => (
                <span key={zone} style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 999,
                  background: '#fff', border: '1px solid rgba(220,38,38,0.2)', color: '#7f1d1d', fontWeight: 600,
                }}>
                  {ZONE_LABELS[zone][isHe ? 'he' : 'en']} <span style={{ opacity: 0.6 }}>×{cnt}</span>
                </span>
              ))}
            </div>
          )}

          {/* Interactive car diagram */}
          <CarDiagramRecalls recalls={recalls} />

          {/* Year filter tabs */}
          {!year && availableYears.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, marginTop: 16 }}>
              <button
                onClick={() => { setFilterYear('all'); setPage(1); }}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
                  background: filterYear === 'all' ? '#dc2626' : 'var(--bg-muted)',
                  color: filterYear === 'all' ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {rc.allYears}
              </button>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => { setFilterYear(y); setPage(1); }}
                  style={{
                    height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
                    background: filterYear === y ? '#dc2626' : 'var(--bg-muted)',
                    color: filterYear === y ? '#fff' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Recall cards */}
          <div id="recall-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, scrollMarginTop: 120 }}>
            {filtered.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  display: Math.floor(idx / PAGE_SIZE) + 1 === currentPage ? 'block' : 'none',
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: '#fff', overflow: 'hidden',
                  boxShadow: expanded === r.id ? '0 4px 16px rgba(0,0,0,0.07)' : 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Card header */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  {/* Index badge */}
                  <span style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, marginTop: 1,
                  }}>
                    {idx + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                      {r.year && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          background: 'var(--bg-muted)', color: 'var(--text-muted)',
                          padding: '1px 7px', borderRadius: 4,
                        }}>
                          {r.year}
                        </span>
                      )}
                      {r.date && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.date}</span>
                      )}
                      {r.source === 'il' && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          background: 'rgba(37,99,235,0.08)', color: '#1d4ed8',
                          padding: '1px 7px', borderRadius: 4,
                        }}>
                          {isHe ? 'ישראל' : 'Israel'}
                          {r.ilRecallYear ? ` · ${isHe ? 'הודעה' : 'notice'} ${r.ilRecallYear}` : ''}
                          {(r.buildBegin || r.buildEnd)
                            ? ` · ${isHe ? 'ייצור' : 'built'} ${(r.buildBegin ?? '').slice(0, 4)}–${(r.buildEnd ?? '').slice(0, 4)}`
                            : ''}
                        </span>
                      )}
                      {r.source === 'us' && ilCount > 0 && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          background: 'var(--bg-muted)', color: 'var(--text-muted)',
                          padding: '1px 7px', borderRadius: 4,
                        }}>
                          {isHe ? 'ארה״ב' : 'US'}
                        </span>
                      )}
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.5 }}>
                        #{r.id}
                      </span>
                    </div>

                    {/* Component title */}
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.35, marginBottom: 4, color: 'var(--text)' }}>
                      {r.component || rc.component}
                    </div>

                    {/* Summary preview */}
                    {r.summary && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {expanded === r.id ? null : (r.summary.length > 120 ? r.summary.slice(0, 120) + '…' : r.summary)}
                      </div>
                    )}
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, paddingTop: 6, transition: 'transform 0.2s', transform: expanded === r.id ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </div>

                {/* Expanded detail */}
                {expanded === r.id && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    background: 'var(--bg-muted)',
                  }}>
                    {r.summary && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.descLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.summary}</p>
                      </div>
                    )}
                    {r.consequence && (
                      <div style={{ borderInlineStart: '3px solid #dc2626', paddingInlineStart: 10 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.riskLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.consequence}</p>
                      </div>
                    )}
                    {r.remedy && (
                      <div style={{ borderInlineStart: '3px solid #16a34a', paddingInlineStart: 10 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.fixLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.remedy}</p>
                      </div>
                    )}
                    {r.source === 'il' && r.importer && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {isHe ? 'יבואן' : 'Importer'}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.importer}</p>
                      </div>
                    )}
                    {r.source === 'il'
                      ? (r.website && (
                        <a
                          href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {isHe ? 'פרטים נוספים ←' : 'More details ←'}
                        </a>
                      ))
                      : (
                        <a
                          href={`https://www.nhtsa.gov/vehicle-safety/recalls#${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {rc.moreDetails} →
                        </a>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pages */}
          {pageCount > 1 && (
            <nav aria-label={isHe ? 'עמודי ריקולים' : 'Recall pages'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ ...pageBtn, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
              >
                {isHe ? 'הקודם' : 'Previous'}
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  style={{ ...pageBtn, minWidth: 34, background: n === currentPage ? 'var(--accent)' : 'var(--bg-muted)', color: n === currentPage ? '#fff' : 'var(--text-muted)' }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                style={{ ...pageBtn, opacity: currentPage === pageCount ? 0.4 : 1, cursor: currentPage === pageCount ? 'default' : 'pointer' }}
              >
                {isHe ? 'הבא' : 'Next'}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginInlineStart: 6 }}>
                {isHe
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} מתוך ${filtered.length}`
                  : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
            </nav>
          )}
        </>
      )}

      <style>{`
        @keyframes recalls-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
