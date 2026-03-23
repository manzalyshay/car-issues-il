export default function Loading() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        <div style={{ marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 240, height: 16, borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: 300, height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 8 }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 100, height: 24, borderRadius: 8, marginBottom: 16 }} />
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
