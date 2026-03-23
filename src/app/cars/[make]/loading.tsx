export default function Loading() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        <div style={{ marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 180, height: 16, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
            <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 12 }} />
            <div>
              <div className="skeleton" style={{ width: 200, height: 36, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 8 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
