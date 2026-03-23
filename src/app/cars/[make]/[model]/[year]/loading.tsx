export default function Loading() {
  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 300, height: 16, borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: 360, height: 40, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 20, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 150, height: 80, borderRadius: 12 }} />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="skeleton" style={{ width: 140, height: 20, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 8 }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 16, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '60%', height: 16, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
