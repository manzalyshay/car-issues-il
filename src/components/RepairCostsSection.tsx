import { getRepairCosts, type RepairCost } from '@/lib/repairCostsDb';
import RepairCostSubmit from './RepairCostSubmit';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  service: '🔧 שירות תקופתי',
  engine: '⚙️ מנוע',
  brakes: '🛑 בלמים',
  suspension: '🔩 הגה ומתלה',
  electrical: '⚡ חשמל',
};

const SOURCE_LABELS: Record<string, string> = {
  'midrag.co.il': 'מדרג',
  'carsforum': 'פורום רכב ישראל',
};

export default async function RepairCostsSection({ makeSlug, modelSlug, makeNameHe, modelNameHe, category }: Props) {
  const costs = await getRepairCosts(category);
  if (costs.length === 0) return null;

  const grouped = costs.reduce<Record<string, RepairCost[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const repairOptions = [...new Map(costs.map(c => [c.repair_key, { repair_key: c.repair_key, repair_name_he: c.repair_name_he }])).values()];

  return (
    <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          🔧 עלויות תחזוקה ותיקונים
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="https://www.midrag.co.il" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>מדרג</a>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
          <a href="https://carsforum.co.il" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>פורום רכב</a>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>דיווחי בעלים</span>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        טווחי מחירים מייצגים לישראל{category === 'suv' ? ' (SUV — יקר יותר מרכב משפחתי)' : ''} — תלוי ביבואן מורשה לעומת מוסך עצמאי.
      </p>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
            {items.map(item => (
              <div key={item.repair_key + item.applies_to} style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{item.repair_name_he}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-red)', marginBottom: 4 }}>
                  ₪{item.min_ils.toLocaleString('he-IL')}–₪{item.max_ils.toLocaleString('he-IL')}
                </div>
                {item.notes_he && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{item.notes_he}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Client island: user-submitted data + submission form */}
      <RepairCostSubmit
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={makeNameHe}
        modelNameHe={modelNameHe}
        repairOptions={repairOptions}
      />
    </section>
  );
}
