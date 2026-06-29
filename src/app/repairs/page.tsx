import type { Metadata } from 'next';
import Link from 'next/link';
import { dbAll } from '@/lib/db';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en' ? {
    title: 'Car Repair & Maintenance Costs | CarIssues',
    description: 'Real repair and maintenance prices for cars: brakes, service, engine, electrical and more — based on owner reports and forum data.',
    alternates: { canonical: `${base}/repairs` },
  } : {
    title: 'עלויות תיקון ותחזוקה לרכב בישראל — מדריך מחירים',
    description: 'מחירי תיקון ותחזוקה לרכב בישראל: החלפת בלמים, טיפולים תקופתיים, מנוע, חשמל ועוד.',
    alternates: { canonical: `${base}/repairs` },
  };
}

const CATEGORY_ORDER = ['service', 'brakes', 'engine', 'suspension', 'electrical'];

// Common issues per category — known Israeli market pain points
const COMMON_ISSUES = [
  { issue: 'ממיר קטליטי (קטליזטור)', issueEn: 'Catalytic Converter', minIls: 1400, maxIls: 7000, category: 'engine', note: 'שחזור: ₪1,400–1,800. מקורי: ₪4,000–7,000', noteEn: 'Rebuilt: $380–$490. OEM: $1,100–$1,920' },
  { issue: 'רצועת תזמון', issueEn: 'Timing Belt', minIls: 1100, maxIls: 2800, category: 'engine', note: 'חובה להחליף כל 60-80K ק"מ. כולל פומפת מים', noteEn: 'Replace every 60–80K km. Includes water pump' },
  { issue: 'בלמים קדמיים', issueEn: 'Front Brakes', minIls: 500, maxIls: 1400, category: 'brakes', note: 'רפידות + צלחות. SUV יקר יותר', noteEn: 'Pads + rotors. SUV costs more' },
  { issue: 'טיפול 10,000 ק"מ', issueEn: '10,000 km Service', minIls: 450, maxIls: 1400, category: 'service', note: 'שמן + פילטרים. יבואן מורשה יקר יותר', noteEn: 'Oil + filters. Authorized dealer costs more' },
  { issue: 'מצבר', issueEn: 'Battery', minIls: 500, maxIls: 1900, category: 'electrical', note: 'רגיל: ₪500–1,000. Start-Stop: ₪1,000–1,900', noteEn: 'Standard: $140–$275. Start-Stop: $275–$520' },
  { issue: 'כיוון פרונט', issueEn: 'Wheel Alignment', minIls: 150, maxIls: 600, category: 'suspension', note: '2 גלגלים. 4 גלגלים: ₪350–800', noteEn: '2 wheels. 4 wheels: $95–$220' },
  { issue: 'מסרק הגה', issueEn: 'Steering Rack', minIls: 800, maxIls: 3000, category: 'suspension', note: 'יד שנייה: ₪800–1,200. חדש: ₪2,200–3,000', noteEn: 'Used: $220–$330. New: $600–$820' },
  { issue: 'מזרקי דלק', issueEn: 'Fuel Injectors', minIls: 1500, maxIls: 2500, category: 'engine', note: 'חלקים + עבודה. ניקוי בלבד: ₪250–400', noteEn: 'Parts + labor. Cleaning only: $70–$110' },
  { issue: 'החלפת שמן', issueEn: 'Oil Change', minIls: 180, maxIls: 700, category: 'engine', note: 'כולל פילטר. SUV: יותר נפח שמן', noteEn: 'Includes filter. SUV: larger oil capacity' },
  { issue: 'מצתים', issueEn: 'Spark Plugs', minIls: 200, maxIls: 1200, category: 'engine', note: 'רגיל: ₪200–300. אירידיום (100K): ₪500–1,200', noteEn: 'Standard: $55–$82. Iridium (100K km): $140–$330' },
];

export default async function RepairsPage() {
  const locale = await getHostLocale();
  const rp = translations[locale].repairsPage;
  const isEn = locale === 'en';
  // Fetch all repair cost records
  const allCosts = await dbAll<{
    repair_key: string; repair_name_he: string; repair_name_en?: string; cost_min_ils: number; cost_max_ils: number;
    category: string; applies_to: string; notes?: string;
  }>('SELECT * FROM repair_costs ORDER BY category, repair_key').catch(() => []);

  // Fetch recent user submissions
  const recentSubmissions = await dbAll<{
    make_slug: string; model_slug: string; repair_name_he: string;
    cost_ils: number; workshop_type: string | null; created_at: string;
  }>('SELECT make_slug, model_slug, repair_name_he, cost_ils, workshop_type, created_at FROM user_repair_costs ORDER BY created_at DESC LIMIT 12').catch(() => []);

  // Fetch submission count per model for leaderboard
  const topModels = await dbAll<{ make_slug: string; model_slug: string }>(
    'SELECT make_slug, model_slug FROM user_repair_costs LIMIT 200',
  ).catch(() => []);

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

  // Group costs by category, prefer 'family' tier when both exist
  const seen = new Set<string>();
  const grouped: Record<string, typeof allCosts> = {};
  for (const cost of allCosts) {
    const key = cost.repair_key;
    if (seen.has(key) && cost.applies_to !== 'family') continue;
    if (!seen.has(key)) seen.add(key);
    if (!grouped[cost.category]) grouped[cost.category] = [];
    const existing = grouped[cost.category]!.findIndex(c => c.repair_key === key);
    if (existing >= 0) grouped[cost.category]![existing] = cost;
    else grouped[cost.category]!.push(cost);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: COMMON_ISSUES.map(issue => ({
      '@type': 'Question',
      name: `כמה עולה ${issue.issue} בישראל?`,
      acceptedAnswer: { '@type': 'Answer', text: `${issue.issue} עולה ₪${issue.minIls.toLocaleString()}–₪${issue.maxIls.toLocaleString()} בישראל. ${issue.note}.` },
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

        {/* Common issues quick-reference */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>{rp.commonTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {COMMON_ISSUES.map(item => (
              <div key={item.issue} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{isEn ? item.issueEn : item.issue}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
                  {isEn
                    ? `$${Math.round(item.minIls / 3.65).toLocaleString()}–$${Math.round(item.maxIls / 3.65).toLocaleString()}`
                    : `₪${item.minIls.toLocaleString()}–₪${item.maxIls.toLocaleString()}`}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{isEn ? item.noteEn : item.note}</div>
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
                {rp.categories[cat] ?? cat}
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
                        ? `$${Math.round(cost.cost_min_ils / 3.65).toLocaleString()}–$${Math.round(cost.cost_max_ils / 3.65).toLocaleString()}`
                        : `₪${cost.cost_min_ils.toLocaleString()}–₪${cost.cost_max_ils.toLocaleString()}`}
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
                        {rp.workshopTypes[r.workshop_type] ?? r.workshop_type}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA — find your car */}
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
      </div>
    </div>
  );
}
