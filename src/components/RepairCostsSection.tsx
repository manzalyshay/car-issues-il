import { getModelRepairCosts, getRepairCosts, type RepairCost } from '@/lib/repairCostsDb';
import RepairCostSubmit from './RepairCostSubmit';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  category: string;
}

const WORKSHOP_LABELS: Record<string, string> = {
  dealer: 'יבואן מורשה',
  independent: 'מוסך עצמאי',
  chain: 'רשת מוסכים',
};

export default async function RepairCostsSection({ makeSlug, modelSlug, makeNameHe, modelNameHe, category }: Props) {
  const [modelCosts, genericCosts] = await Promise.all([
    getModelRepairCosts(makeSlug, modelSlug),
    getRepairCosts(category),
  ]);

  const repairOptions = [...new Map(genericCosts.map(c => [c.repair_key, { repair_key: c.repair_key, repair_name_he: c.repair_name_he }])).values()];

  // Group model-specific costs by repair type and compute median
  const grouped = new Map<string, { name: string; costs: number[]; notes: string[] }>();
  for (const c of modelCosts) {
    if (!grouped.has(c.repair_key)) grouped.set(c.repair_key, { name: c.repair_name_he, costs: [], notes: [] });
    const g = grouped.get(c.repair_key)!;
    g.costs.push(c.cost_ils);
    if (c.notes) g.notes.push(c.notes);
  }

  const hasModelData = grouped.size > 0;

  return (
    <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          🔧 עלויות תיקון — {makeNameHe} {modelNameHe}
        </h2>
        {hasModelData && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            מבוסס על {modelCosts.length} דיווחי בעלים · פורום רכב ישראל
          </span>
        )}
      </div>

      {hasModelData ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 20 }}>
            {[...grouped.entries()].map(([key, { name, costs }]) => {
              const sorted = [...costs].sort((a, b) => a - b);
              const min = sorted[0];
              const max = sorted[sorted.length - 1];
              const median = sorted[Math.floor(sorted.length / 2)];
              return (
                <div key={key} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>{name}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-red)' }}>
                    ₪{min.toLocaleString('he-IL')}{min !== max ? `–₪${max.toLocaleString('he-IL')}` : ''}
                  </div>
                  {costs.length > 1 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      חציון: ₪{median.toLocaleString('he-IL')} · {costs.length} דיווחים
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            המחירים מבוססים על דיווחים מהפורום — ייתכנו הבדלים בין מוסכים ושנות ייצור.
          </p>
        </>
      ) : (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          אין עדיין נתוני עלויות ספציפיים ל{makeNameHe} {modelNameHe}. אם תיקנת רכב זה — שתף את העלות!
        </p>
      )}

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
