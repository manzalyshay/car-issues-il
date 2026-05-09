import type { Metadata } from 'next';
import Link from 'next/link';
import { getServiceClient } from '@/lib/adminAuth';
import { getAllMakes } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'עלויות תיקון ותחזוקה לרכב בישראל — מדריך מחירים',
  description: 'מחירי תיקון ותחזוקה לרכב בישראל: החלפת בלמים, טיפולים תקופתיים, מנוע, חשמל ועוד. טווחי מחירים ריאליים ממוסכים ישראליים — עם אפשרות לדיווח עלויות לפי דגם.',
  alternates: { canonical: 'https://carissues.co.il/repairs' },
  openGraph: {
    title: 'עלויות תיקון רכב בישראל | CarIssues IL',
    description: 'מחירי תיקון ותחזוקה לרכב: בלמים, טיפולים, מנוע ועוד — מבוסס על נתוני מוסכים ישראליים ודיווחי בעלי רכב.',
    url: 'https://carissues.co.il/repairs',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  service: '🔧 שירות תקופתי',
  engine: '⚙️ מנוע',
  brakes: '🛑 בלמים',
  suspension: '🔩 הגה ומתלה',
  electrical: '⚡ חשמל',
};

const CATEGORY_ORDER = ['service', 'brakes', 'engine', 'suspension', 'electrical'];

// Common issues per category — known Israeli market pain points
const COMMON_ISSUES = [
  { issue: 'ממיר קטליטי (קטליזטור)', cost: '₪1,400–₪7,000', category: 'engine', note: 'שחזור: ₪1,400–1,800. מקורי: ₪4,000–7,000' },
  { issue: 'רצועת תזמון', cost: '₪1,100–₪2,800', category: 'engine', note: 'חובה להחליף כל 60-80K ק"מ. כולל פומפת מים' },
  { issue: 'בלמים קדמיים', cost: '₪500–₪1,400', category: 'brakes', note: 'רפידות + צלחות. SUV יקר יותר' },
  { issue: 'טיפול 10,000 ק"מ', cost: '₪450–₪1,400', category: 'service', note: 'שמן + פילטרים. יבואן מורשה יקר יותר' },
  { issue: 'מצבר', cost: '₪500–₪1,900', category: 'electrical', note: 'רגיל: ₪500–1,000. Start-Stop: ₪1,000–1,900' },
  { issue: 'כיוון פרונט', cost: '₪150–₪600', category: 'suspension', note: '2 גלגלים. 4 גלגלים: ₪350–800' },
  { issue: 'מסרק הגה', cost: '₪800–₪3,000', category: 'suspension', note: 'יד שנייה: ₪800–1,200. חדש: ₪2,200–3,000' },
  { issue: 'מזרקי דלק', cost: '₪1,500–₪2,500', category: 'engine', note: 'חלקים + עבודה. ניקוי בלבד: ₪250–400' },
  { issue: 'החלפת שמן', cost: '₪180–₪700', category: 'engine', note: 'כולל פילטר. SUV: יותר נפח שמן' },
  { issue: 'מצתים', cost: '₪200–₪1,200', category: 'engine', note: 'רגיל: ₪200–300. אירידיום (100K): ₪500–1,200' },
];

export default async function RepairsPage() {
  const db = getServiceClient();

  // Fetch all repair cost records
  const { data: allCosts } = await db
    .from('repair_costs')
    .select('*')
    .order('category')
    .order('repair_key');

  // Fetch recent user submissions
  const { data: recentSubmissions } = await db
    .from('user_repair_costs')
    .select('make_slug, model_slug, repair_name_he, cost_ils, workshop_type, created_at')
    .order('created_at', { ascending: false })
    .limit(12);

  // Fetch submission count per model for leaderboard
  const { data: topModels } = await db
    .from('user_repair_costs')
    .select('make_slug, model_slug')
    .limit(200);

  const modelCounts: Record<string, number> = {};
  for (const r of topModels ?? []) {
    const k = `${r.make_slug}/${r.model_slug}`;
    modelCounts[k] = (modelCounts[k] ?? 0) + 1;
  }

  const makes = await getAllMakes();
  const makeMap: Record<string, { nameHe: string; models: Record<string, string> }> = {};
  for (const make of makes) {
    makeMap[make.slug] = { nameHe: make.nameHe, models: Object.fromEntries(make.models.map(m => [m.slug, m.nameHe])) };
  }

  // Group costs by category, prefer 'family' tier when both exist
  const seen = new Set<string>();
  const grouped: Record<string, typeof allCosts> = {};
  for (const cost of allCosts ?? []) {
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
      acceptedAnswer: { '@type': 'Answer', text: `${issue.issue} עולה ${issue.cost} בישראל. ${issue.note}.` },
    })),
  };

  return (
    <div className="page-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>עלויות תיקון</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900, marginBottom: 8 }}>
          עלויות תיקון ותחזוקה לרכב בישראל
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.9375rem' }}>
          מחירים ריאליים ממוסכים ישראליים — מדרג, פורום רכב ישראל, ודיווחי בעלי רכב. עדכון שוטף.
        </p>

        {/* Common issues quick-reference */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>תיקונים נפוצים — מחירון מהיר</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {COMMON_ISSUES.map(item => (
              <div key={item.issue} style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{item.issue}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-red)', marginBottom: 4 }}>
                  {item.cost}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed breakdown by category */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>פירוט מלא לפי קטגוריה</h2>
          {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {grouped[cat]!.map(cost => (
                  <div key={cost.repair_key} style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cost.repair_name_he}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {cost.applies_to === 'suv' ? 'SUV' : cost.applies_to === 'all' ? 'כל הרכבים' : 'רכב משפחתי'}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-red)', marginBottom: 6 }}>
                      ₪{cost.min_ils.toLocaleString('he-IL')}–₪{cost.max_ils.toLocaleString('he-IL')}
                    </div>
                    {cost.notes_he && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{cost.notes_he}</div>
                    )}
                    {cost.source_url && (
                      <a href={cost.source_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'inline-block', marginTop: 6, textDecoration: 'none' }}>
                        מקור: {new URL(cost.source_url).hostname.replace('www.', '')} ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Recent community reports */}
        {(recentSubmissions ?? []).length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>דיווחי בעלי רכב אחרונים</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(recentSubmissions ?? []).map((r, i) => {
                const makeInfo = makeMap[r.make_slug];
                const modelName = makeInfo?.models[r.model_slug] ?? r.model_slug;
                const makeName = makeInfo?.nameHe ?? r.make_slug;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '10px 14px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <Link href={`/cars/${r.make_slug}/${r.model_slug}`}
                      style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}>
                      {makeName} {modelName}
                    </Link>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.repair_name_he}</span>
                    <span style={{ fontWeight: 700, color: 'var(--brand-red)', fontSize: '0.9rem' }}>
                      ₪{r.cost_ils.toLocaleString('he-IL')}
                    </span>
                    {r.workshop_type && (
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 20 }}>
                        {r.workshop_type === 'dealer' ? 'יבואן מורשה' : r.workshop_type === 'chain' ? 'רשת מוסכים' : 'מוסך עצמאי'}
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
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>
            רוצה לראות עלויות ספציפיות לרכב שלך?
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
            בחר את דגם הרכב שלך וראה עלויות תחזוקה מותאמות לקטגוריה, בעיות נפוצות וביקורות בעלים.
          </p>
          <Link href="/cars" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 24px', fontSize: '0.9375rem' }}>
            🚗 לכל הרכבים
          </Link>
        </div>

        {/* Sources note */}
        <div style={{ marginTop: 32, padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>מקורות:</strong> המחירים מבוססים על נתונים ממדרג.co.il, carcheck.co.il, פורום רכב ישראל ודיווחי בעלי רכב.
          המחירים הם הערכות לשוק הישראלי ועשויים להשתנות בהתאם לאזור, גיל הרכב וסוג המוסך.
          <strong> עלות עבודה בישראל: ₪250–350 לשעה</strong> (מוסך עצמאי עד יבואן מורשה).
        </div>
      </div>
    </div>
  );
}
