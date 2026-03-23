export default function Loading() {
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        <div style={{ marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 200, height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 280, height: 20, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              <div className="skeleton" style={{ width: '100%', height: 180 }} />
              <div style={{ padding: 20 }}>
                <div className="skeleton" style={{ width: '90%', height: 20, borderRadius: 8, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '70%', height: 20, borderRadius: 8, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 8, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '85%', height: 14, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
