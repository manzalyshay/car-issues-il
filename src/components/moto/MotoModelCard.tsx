import Link from 'next/link';
import { ccLabel, motoCategoryLabel, type MotoMake, type MotoModel } from '@/lib/motoDb';
import { sizedImageUrl } from '@/lib/imageSizing';

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
      style={{ padding: '0 0 14px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}
    >
      {model.leadingImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sizedImageUrl(model.leadingImageUrl, 480) ?? model.leadingImageUrl}
          alt={`${make.nameHe} ${model.nameHe}`}
          loading="lazy"
          style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', background: 'var(--bg-muted)' }}
        />
      ) : (
        <div aria-hidden="true" style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
          {MOTO_ICON[model.category] ?? '🏍️'}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>
            {showMake && `${make.nameHe} `}{model.nameHe}
          </div>
          {model.nameEn !== model.nameHe && (
            <div dir="ltr" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>{model.nameEn}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.75rem', padding: '0 16px' }}>
        <span style={{ background: 'var(--bg-muted)', borderRadius: 999, padding: '2px 9px', fontWeight: 700 }}>{motoCategoryLabel(model.category)}</span>
        {cc && <span style={{ color: 'var(--text-muted)' }}>{cc}</span>}
        {years && <span dir="ltr" style={{ color: 'var(--text-muted)' }}>{years}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'auto', padding: '0 16px' }}>
        <span>{model.activeVehiclesIl ? `${model.activeVehiclesIl.toLocaleString('he-IL')} על הכביש` : ''}</span>
        {stats
          ? <span style={{ color: '#e8a33d', fontWeight: 700 }}>★ {stats.avg.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({stats.n})</span></span>
          : <span>אין ביקורות עדיין</span>}
      </div>
    </Link>
  );
}
