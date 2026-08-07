import { getRecallsFromCache } from '@/lib/recallsDb';

interface Props {
  searchParams: Promise<{ make?: string; model?: string; year?: string; lang?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EmbedRecallsPage({ searchParams }: Props) {
  const { make, model, year, lang } = await searchParams;
  const isHe = lang === 'he';

  if (!make || !model) {
    return (
      <EmbedShell isHe={isHe}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          {isHe ? 'נא לספק make ו-model.' : 'Please provide make and model parameters.'}
        </p>
      </EmbedShell>
    );
  }

  const allRecalls = await getRecallsFromCache(make, model);
  const yearNum = year ? parseInt(year) : null;
  const recalls = yearNum
    ? allRecalls.filter(r => r.recall_year === yearNum || r.recall_year === null)
    : allRecalls;

  const carLabel = yearNum ? `${yearNum} ${make} ${model}` : `${make} ${model}`;

  return (
    <EmbedShell isHe={isHe} carLabel={carLabel} count={recalls.length}>
      {recalls.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
          {isHe ? 'לא נמצאו ריקולים במאגר.' : 'No recalls found in our database.'}
          {' '}
          <a
            href={`https://carissues.net/cars?q=${encodeURIComponent(make)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563eb' }}
          >
            {isHe ? 'חפש ב-CarIssues' : 'Search CarIssues'}
          </a>
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recalls.map(r => {
            const component = isHe ? (r.component_he ?? r.component_en ?? '') : (r.component_en ?? '');
            const summary = isHe ? (r.summary_he ?? r.summary_en ?? '') : (r.summary_en ?? '');
            const dateStr = r.date ? r.date.slice(0, 10) : '';
            return (
              <li key={r.id} style={{ borderLeft: '3px solid #f59e0b', paddingLeft: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: '#111' }}>{component}</strong>
                  {dateStr && <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{dateStr}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{summary}</p>
              </li>
            );
          })}
        </ul>
      )}
    </EmbedShell>
  );
}

function EmbedShell({
  children,
  isHe,
  carLabel,
  count,
}: {
  children: React.ReactNode;
  isHe: boolean;
  carLabel?: string;
  count?: number;
}) {
  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '16px',
        minHeight: '100%',
        boxSizing: 'border-box',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
        <div>
          {carLabel && (
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 2 }}>{carLabel}</div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {count != null
              ? isHe
                ? `${count} ריקול${count !== 1 ? 'ים' : ''} NHTSA`
                : `${count} NHTSA Recall${count !== 1 ? 's' : ''}`
              : isHe ? 'ריקולים NHTSA' : 'NHTSA Recalls'}
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>⚠</span>
      </div>

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
        {children}
      </div>

      {/* Attribution */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6', textAlign: isHe ? 'right' : 'left' }}>
        <a
          href="https://carissues.net"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}
        >
          {isHe ? 'נתונים מאת ' : 'Data by '}
          <strong style={{ color: '#2563eb' }}>CarIssues.net</strong>
        </a>
      </div>
    </div>
  );
}
