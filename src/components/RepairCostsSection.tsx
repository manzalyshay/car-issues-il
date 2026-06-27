import { getModelRepairCosts, getRepairCosts, type RepairCost } from '@/lib/repairCostsDb';
import RepairCostSubmit from './RepairCostSubmit';
import { getHostLocale } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn?: string;
  modelNameEn?: string;
  category: string;
}

export default async function RepairCostsSection({ makeSlug, modelSlug, makeNameHe, modelNameHe, makeNameEn, modelNameEn, category }: Props) {
  const locale = await getHostLocale();
  const rp = translations[locale].repairCosts;
  const carName = locale === 'en'
    ? `${makeNameEn ?? makeNameHe} ${modelNameEn ?? modelNameHe}`
    : `${makeNameHe} ${modelNameHe}`;
  const [modelCosts, genericCosts] = await Promise.all([
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getRepairCosts(category).catch(() => []),
  ]);

  const isEn = locale === 'en';

  const repairOptions = [...new Map(genericCosts.map(c => [c.repair_key, { repair_key: c.repair_key, repair_name_he: c.repair_name_he }])).values()];

  // Build a lookup for EN repair names from the generic costs table
  const enNameMap = new Map<string, string>(
    genericCosts.map(c => [c.repair_key, c.repair_name_en ?? c.repair_name_he])
  );

  // Group model-specific costs by repair type and compute median
  const grouped = new Map<string, { nameHe: string; nameEn: string; costs: number[]; notes: string[] }>();
  for (const c of modelCosts) {
    if (!grouped.has(c.repair_key)) grouped.set(c.repair_key, {
      nameHe: c.repair_name_he,
      nameEn: enNameMap.get(c.repair_key) ?? c.repair_name_he,
      costs: [], notes: [],
    });
    const g = grouped.get(c.repair_key)!;
    g.costs.push(c.cost_ils);
    if (c.notes) g.notes.push(c.notes);
  }

  const hasModelData = grouped.size > 0;

  return (
    <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          🔧 {rp.title} — {carName}
        </h2>
        {hasModelData && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {rp.basedOn} {modelCosts.length} {rp.ownerReports}
          </span>
        )}
      </div>

      {hasModelData ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 20 }}>
            {[...grouped.entries()].map(([key, { nameHe, nameEn, costs }]) => {
              const sorted = [...costs].sort((a, b) => a - b);
              const min = sorted[0];
              const max = sorted[sorted.length - 1];
              const median = sorted[Math.floor(sorted.length / 2)];
              const fmt = (ils: number) => isEn
                ? `$${Math.round(ils / 3.65).toLocaleString()}`
                : `₪${ils.toLocaleString('he-IL')}`;
              return (
                <div key={key} style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>{isEn ? nameEn : nameHe}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {fmt(min)}{min !== max ? `–${fmt(max)}` : ''}
                  </div>
                  {costs.length > 1 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {rp.median}: {fmt(median)} · {costs.length} {rp.reports}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {rp.disclaimer}
          </p>
        </>
      ) : (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          {rp.noData} {carName}{rp.noDataSuffix}
        </p>
      )}

      <RepairCostSubmit
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={makeNameHe}
        modelNameHe={modelNameHe}
        makeNameEn={makeNameEn}
        modelNameEn={modelNameEn}
        repairOptions={repairOptions}
      />
    </section>
  );
}
