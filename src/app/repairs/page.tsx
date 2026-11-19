import type { Metadata } from 'next';
import Link from 'next/link';
import { dbAll } from '@/lib/db';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getValidatedRepairReports } from '@/lib/repairReports';
import { MIDRAG_PRICES, MIDRAG_GROUPS, MIDRAG_GARAGE_RATES, MIDRAG_CHECKED_ON } from '@/data/midrag-repair-prices';

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

const CATEGORY_ORDER = ['service', 'brakes', 'engine', 'suspension', 'electrical'];
interface RepairCostRow {
  repair_key: string; repair_name_he: string; repair_name_en?: string; cost_min_ils: number; cost_max_ils: number;
  category: string; applies_to: string; notes?: string;
}

export default async function RepairsPage() {
  const locale = await getHostLocale();
  const rp = translations[locale].repairsPage;
  const isEn = locale === 'en';
  // Fetch all repair cost records
  const allCosts = await dbAll<RepairCostRow>('SELECT * FROM repair_costs ORDER BY category, repair_key').catch(() => [] as RepairCostRow[]);

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

  // Group costs by category, prefer 'family' tier when both exist; skip rows with null costs
  const seen = new Set<string>();
  const grouped: Record<string, typeof allCosts> = {};
  for (const cost of allCosts) {
    if (cost.cost_min_ils == null || cost.cost_max_ils == null) continue;
    const key = cost.repair_key;
    if (seen.has(key) && cost.applies_to !== 'family') continue;
    if (!seen.has(key)) seen.add(key);
    if (!grouped[cost.category]) grouped[cost.category] = [];
    const existing = grouped[cost.category]!.findIndex(c => c.repair_key === key);
    if (existing >= 0) grouped[cost.category]![existing] = cost;
    else grouped[cost.category]!.push(cost);
  }

  const fmtIls = (n: number) => isEn ? `$${Math.round(n / 3.65).toLocaleString('en-US')}` : `₪${n.toLocaleString('he-IL')}`;
  const fmtMonth = (d: string) => { const [y, m] = d.split('-'); return `${Number(m)}/${y}`; };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: MIDRAG_PRICES.filter(p => p.group !== 'brand').slice(0, 15).map(p => ({
      '@type': 'Question',
      name: `כמה עולה ${p.he}?`,
      acceptedAnswer: { '@type': 'Answer', text: `לפי דיווחי לקוחות במידרג (עודכן ${fmtMonth(p.updated)}), הממוצע ששולם הוא ₪${p.avg.toLocaleString('he-IL')} כולל מע״מ, ושולמו בין ₪${p.min.toLocaleString('he-IL')} ל-₪${p.max.toLocaleString('he-IL')}.` },
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

        {/* Prices customers reported paying on Midrag, grouped; every card links to its source page */}
        {MIDRAG_GROUPS.map(g => {
          const items = MIDRAG_PRICES.filter(p => p.group === g.key);
          if (!items.length) return null;
          return (
            <section key={g.key} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: g.note ? 4 : 10 }}>{isEn ? g.en : g.he}</h2>
              {g.note && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>{isEn ? g.note.en : g.note.he}</p>}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((p, i) => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.35 }}>{isEn ? p.en : p.he}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {isEn ? `Paid ${fmtIls(p.min)} to ${fmtIls(p.max)}` : `שולם ${fmtIls(p.min)} עד ${fmtIls(p.max)}`}
                        {' · '}{fmtMonth(p.updated)}{' · '}
                        <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{isEn ? 'Midrag' : 'מידרג'}</a>
                      </div>
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>{fmtIls(p.avg)}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isEn ? 'average' : 'ממוצע'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Garage-published rates (not customer payments) */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 4 }}>{isEn ? 'Garage rates' : 'תעריפי מוסכים'}</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            {isEn ? 'Average of the rates garages publish on Midrag - not prices customers paid.' : 'ממוצע המחירונים שהמוסכים עצמם מפרסמים במידרג - לא מחירים שלקוחות שילמו.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {MIDRAG_GARAGE_RATES.map(r => (
              <div key={r.he} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.85rem' }}>
                <span>{isEn ? r.en : r.he}</span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isEn ? `${fmtIls(r.min)}–${fmtIls(r.max)}` : `${fmtIls(r.min)} עד ${fmtIls(r.max)}`}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed breakdown by category */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>{rp.fullTitle}</h2>
          {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {(rp.categories as Record<string, string>)[cat] ?? cat}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {grouped[cat]!.map(cost => (
                  <div key={cost.repair_key} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{isEn ? (cost.repair_name_en ?? cost.repair_name_he) : cost.repair_name_he}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {cost.applies_to === 'suv' ? rp.appliesSuv : cost.applies_to === 'all' ? rp.appliesAll : rp.appliesFamily}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>
                      {isEn
                        ? `$${Math.round(cost.cost_min_ils / 3.65).toLocaleString()}-$${Math.round(cost.cost_max_ils / 3.65).toLocaleString()}`
                        : `₪${cost.cost_min_ils.toLocaleString()}-₪${cost.cost_max_ils.toLocaleString()}`}
                    </div>
                    {cost.notes && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{cost.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          {isEn ? (
            <>Prices are what Midrag (midrag.co.il) members reported actually paying, incl. VAT: the average and the lowest and highest payment. Midrag doesn&apos;t publish how many reports each price is based on. The pages were updated between January and July 2025 (checked {MIDRAG_CHECKED_ON}). Every garage sets its own rates, so these are not a quote for your car.</>
          ) : (
            <>המחירים הם מה שחברי מידרג (midrag.co.il) דיווחו ששילמו בפועל, כולל מע״מ: הממוצע, והתשלום הנמוך והגבוה ביותר שדווח. מידרג לא מפרסמת על כמה דיווחים מבוסס כל מחיר. הדפים עודכנו בין ינואר ליולי 2025 (נבדק ב-{MIDRAG_CHECKED_ON.split('-').reverse().join('.')}). כל מוסך קובע את המחיר שלו, ולכן זו לא הצעת מחיר לרכב שלכם.</>
          )}
        </div>
      </div>
    </div>
  );
}
