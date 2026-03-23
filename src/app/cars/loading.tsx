export default function Loading() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: 280, height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 180, height: 20, borderRadius: 8 }} />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            <div className="skeleton" style={{ width: 100, height: 24, borderRadius: 8, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {[...Array(6)].map((_, j) => (
                <div key={j} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
