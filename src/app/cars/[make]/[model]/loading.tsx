import CarRepairLoader from '@/components/CarRepairLoader';
import { getHostLocale } from '@/lib/hostLocale';

export default async function Loading() {
  const locale = await getHostLocale();
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[80, 60, 90, 80].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 14, borderRadius: 6 }} />
          ))}
        </div>

        {/* Car repair animation */}
        <CarRepairLoader text={locale === 'en' ? 'Loading model details' : 'טוען פרטי הדגם'} />

        {/* Content skeleton below */}
        <div style={{ marginTop: 24 }}>
          <div className="skeleton" style={{ width: 180, height: 22, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
