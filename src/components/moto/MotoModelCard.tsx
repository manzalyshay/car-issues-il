import Link from 'next/link';
import { ccLabel, motoCategoryLabel, type MotoMake, type MotoModel } from '@/lib/motoDb';

export const MOTO_ICON: Record<string, string> = { scooter: '🛵', electric: '⚡' };

interface Props {
  make: Pick<MotoMake, 'slug' | 'nameHe'>;
  model: MotoModel;
  stats?: { n: number; avg: number };
  /** Show the brand name before the model (lists mixing brands). */
  showMake?: boolean;
}

/** Card linking to a motorcycle model page, used on /motorcycles and brand pages. */
export default function MotoModelCard({ make, model, stats, showMake }: Props) {
  const cc = ccLabel(model);
  const years = model.years.length ? `${model.years[model.years.length - 1]}–${model.years[0]}` : '';
  return (
    <Link
      href={`/motorcycles/${make.slug}/${model.slug}`}
      className="card ci-card-hover"
      style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{MOTO_ICON[model.category] ?? '🏍️'}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>
            {showMake && `${make.nameHe} `}{model.nameHe}
          </div>
          {model.nameEn !== model.nameHe && (
            <div dir="ltr" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>{model.nameEn}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.75rem' }}>
        <span style={{ background: 'var(--bg-muted)', borderRadius: 999, padding: '2px 9px', fontWeight: 700 }}>{motoCategoryLabel(model.category)}</span>
        {cc && <span style={{ color: 'var(--text-muted)' }}>{cc}</span>}
        {years && <span dir="ltr" style={{ color: 'var(--text-muted)' }}>{years}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
        <span>{model.activeVehiclesIl ? `${model.activeVehiclesIl.toLocaleString('he-IL')} על הכביש` : ''}</span>
        {stats
          ? <span style={{ color: '#e8a33d', fontWeight: 700 }}>★ {stats.avg.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({stats.n})</span></span>
          : <span>אין ביקורות עדיין</span>}
      </div>
    </Link>
  );
}
