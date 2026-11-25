import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getValidatedRepairReports } from '@/lib/repairReports';
import { REPAIR_PRICES, REPAIR_PRICE_CATEGORY_ORDER, REPAIR_PRICE_CATEGORY_LABELS, GARAGE_RATES, REPAIR_PRICES_NOTES, type DistSegment } from '@/data/repairPrices';

export const revalidate = 3600; // cache 1 hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en' ? {
    title: 'Car Repair & Maintenance Costs',
    description: 'Real repair and maintenance prices for cars: brakes, service, engine, electrical and more - based on owner reports and forum data.',
    alternates: { canonical: `${base}/repairs`, languages: { he: 'https://carissues.co.il/repairs', en: 'https://carissues.net/repairs', 'x-default': 'https://carissues.net/repairs' } },
  } : {
    title: 'עלויות תיקון ותחזוקה לרכב בישראל - מדריך מחירים',
    description: 'מחירי תיקון ותחזוקה לרכב בישראל: החלפת בלמים, טיפולים תקופתיים, מנוע, חשמל ועוד.',
    alternates: { canonical: `${base}/repairs`, languages: { he: 'https://carissues.co.il/repairs', en: 'https://carissues.net/repairs', 'x-default': 'https://carissues.net/repairs' } },
  };
}

const toUsd = (ils: number) => Math.round(ils / 3.65);
const fmtMoney = (ils: number, isEn: boolean) => isEn ? `$${toUsd(ils).toLocaleString('en-US')}` : `₪${ils.toLocaleString('en-US')}`;
const fmtRange = (min: number, max: number, isEn: boolean) => `${fmtMoney(min, isEn)}-${fmtMoney(max, isEn)}`;
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${Number(d)}/${Number(m)}/${y}`; };

function distText(seg: DistSegment, isEn: boolean): string {
  const share = isEn && seg.share === 'שליש' ? 'A third' : seg.share;
  if (seg.kind === 'between') return isEn ? `${share} of cases: ${fmtRange(seg.low, seg.high, true)}` : `${share} מהמקרים ${seg.low.toLocaleString('en-US')} עד ${seg.high.toLocaleString('en-US')} ₪`;
  if (seg.kind === 'above') return isEn ? `${share} of cases paid over ${fmtMoney(seg.value, true)}` : `${share} מהמקרים שילמו מעל ${seg.value.toLocaleString('en-US')} ₪`;
  return isEn ? `${share} of cases under ${fmtMoney(seg.value, true)}` : `${share} מהמקרים פחות מ-${seg.value.toLocaleString('en-US')} ₪`;
}

export default async function RepairsPage() {
  const locale = await getHostLocale();
  const rp = translations[locale].repairsPage;
  const isEn = locale === 'en';
  // Fetch recent user submissions
  const recentSubmissions = await getValidatedRepairReports(12).catch(() => []);

  // Fetch submission count per model for leaderboard
  const topModels = await getValidatedRepairReports(1000).catch(() => []);

  const modelCounts: Record<string, number> = {};
  for (const r of topModels) {
    const k = `${r.make_slug}/${r.model_slug}`;
    modelCounts[k] = (modelCounts[k] ?? 0) + 1;
  }

  const makes = await getAllMakes().catch(() => [] as Awaited<ReturnType<typeof getAllMakes>>);
  const makeMap: Record<string, { nameHe: string; nameEn: string; models: Record<string, { he: string; en: string }> }> = {};
  for (const make of makes) {
    makeMap[make.slug] = {
      nameHe: make.nameHe,
      nameEn: make.nameEn,
      models: Object.fromEntries(make.models.map(m => [m.slug, { he: m.nameHe, en: m.nameEn }])),
    };
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: REPAIR_PRICES.map(item => isEn ? ({
      '@type': 'Question',
      name: `How much does ${item.nameEn.toLowerCase()} cost in Israel?`,
      acceptedAnswer: { '@type': 'Answer', text: `Average about ${fmtMoney(item.avg, true)}, typical range ${fmtRange(item.min, item.max, true)} (incl. VAT). ${item.dist.map(d => distText(d, true)).join('; ')}.` },
    }) : ({
      '@type': 'Question',
      name: `כמה עולה ${item.nameHe} בישראל?`,
      acceptedAnswer: { '@type': 'Answer', text: `ממוצע ${item.avg.toLocaleString('en-US')} ₪, טווח ${item.min.toLocaleString('en-US')} עד ${item.max.toLocaleString('en-US')} ₪ (כולל מע״מ). ${item.dist.map(d => distText(d, false)).join(', ')}.` },
    })),
  };

  return (
    <div className="page-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{rp.home}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{rp.breadcrumb}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900, marginBottom: 8 }}>{rp.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.9375rem' }}>{rp.subtitle}</p>

        {/* Market repair prices */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>{rp.commonTitle}</h2>
          {REPAIR_PRICE_CATEGORY_ORDER.map(cat => {
            const items = REPAIR_PRICES.filter(p => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
                  {isEn ? REPAIR_PRICE_CATEGORY_LABELS[cat].en : REPAIR_PRICE_CATEGORY_LABELS[cat].he}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{isEn ? item.nameEn : item.nameHe}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)' }}>{fmtMoney(item.avg, isEn)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isEn ? 'average' : 'ממוצע'}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {isEn ? 'Range: ' : 'טווח: '}{fmtRange(item.min, item.max, isEn)}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {item.dist.map(d => distText(d, isEn)).join(isEn ? '; ' : ', ')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 4 }}>
                        {isEn ? 'Source data date: ' : 'תאריך נתוני מקור: '}{fmtDate(item.sourceDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 12px' }}>{isEn ? 'Rates published by garages' : 'תעריפים שפורסמו בידי מוסכים'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {GARAGE_RATES.map(r => (
              <div key={r.he} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{isEn ? r.en : r.he}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent)' }}>{fmtRange(r.min, r.max, isEn)}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isEn ? REPAIR_PRICES_NOTES.footerEn : REPAIR_PRICES_NOTES.footerHe}</p>
        </section>

        {/* Recent community reports */}
        {recentSubmissions.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>{rp.recentTitle}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSubmissions.map((r, i) => {
                const makeInfo = makeMap[r.make_slug];
                const modelNames = makeInfo?.models[r.model_slug];
                const modelName = (isEn ? modelNames?.en : modelNames?.he) ?? r.model_slug;
                const makeName = (isEn ? makeInfo?.nameEn : makeInfo?.nameHe) ?? r.make_slug;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '10px 14px', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <Link href={`/cars/${r.make_slug}/${r.model_slug}`}
                      style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}>
                      {makeName} {modelName}
                    </Link>
                    {!isEn && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.repair_name_he}</span>}
                    <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>
                      {isEn ? `$${Math.round(r.cost_ils / 3.65).toLocaleString()}` : `₪${r.cost_ils.toLocaleString()}`}
                    </span>
                    {r.workshop_type && (
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 20 }}>
                        {(rp.workshopTypes as Record<string, string>)[r.workshop_type] ?? r.workshop_type}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA - find your car */}
        <div className="card" style={{ padding: '24px 28px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>{rp.ctaTitle}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>{rp.ctaBody}</p>
          <Link href="/cars" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 24px', fontSize: '0.9375rem' }}>
            {rp.ctaBtn}
          </Link>
        </div>

        {/* Sources note */}
        <div style={{ marginTop: 32, padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>{rp.laborNote}</strong>
        </div>

        {/* Price data disclaimer */}
        <ul style={{ margin: '16px 0 0', paddingInlineStart: 18, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {(isEn ? REPAIR_PRICES_NOTES.en : REPAIR_PRICES_NOTES.he).map(n => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}
