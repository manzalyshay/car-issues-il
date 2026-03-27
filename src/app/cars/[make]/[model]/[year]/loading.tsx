import CarRepairLoader from '@/components/CarRepairLoader';

export default function Loading() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[80, 60, 90, 80, 50].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 14, borderRadius: 6 }} />
          ))}
        </div>

        {/* Car repair animation — main focus for year pages */}
        <CarRepairLoader text="טוען ביקורות ונתונים" />

        {/* Score skeleton */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24, marginBottom: 24 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 120, height: 80, borderRadius: 12 }} />
          ))}
        </div>

        {/* Review cards skeleton */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="skeleton" style={{ width: 140, height: 18, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 8 }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '75%', height: 14, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
