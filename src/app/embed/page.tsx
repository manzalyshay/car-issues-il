import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free NHTSA Recall Widget — Embed on Your Website | CarIssues',
  description: 'Embed a free NHTSA recall lookup widget on your car blog or website. Shows live recall data for any make, model and year. Powered by CarIssues.net.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://carissues.net/embed',
    languages: { en: 'https://carissues.net/embed', 'x-default': 'https://carissues.net/embed' },
  },
};

const EXAMPLES = [
  { make: 'Toyota', model: 'RAV4', year: 2019 },
  { make: 'Volkswagen', model: 'Golf', year: 2018 },
  { make: 'Kia', model: 'Sportage', year: 2020 },
];

function iframeUrl(make: string, model: string, year?: number, lang = 'en') {
  const base = 'https://carissues.net/embed/recalls';
  const p = new URLSearchParams({ make, model, lang });
  if (year) p.set('year', String(year));
  return `${base}?${p}`;
}

function snippetCode(make: string, model: string, year?: number) {
  const src = iframeUrl(make, model, year);
  return `<iframe\n  src="${src}"\n  width="100%"\n  height="360"\n  frameborder="0"\n  loading="lazy"\n  style="border-radius:8px;border:1px solid #e5e7eb"\n  title="NHTSA Recalls — ${make} ${model}${year ? ` ${year}` : ''}"\n></iframe>`;
}

export default function EmbedDocsPage() {
  const [ex] = EXAMPLES;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#111' }}>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Free Embed Widget
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px' }}>
          NHTSA Recall Widget
        </h1>
        <p style={{ fontSize: 16, color: '#4b5563', lineHeight: 1.7, maxWidth: 600 }}>
          Add live NHTSA recall data to any car blog or website — no API key, no sign-up, always free.
          Just paste one line of HTML.
        </p>
      </div>

      {/* Live preview */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Live Preview</h2>
        <iframe
          src={iframeUrl(ex.make, ex.model, ex.year)}
          width="100%"
          height="360"
          frameBorder="0"
          loading="lazy"
          style={{ borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
          title={`NHTSA Recalls — ${ex.make} ${ex.model} ${ex.year}`}
        />
      </section>

      {/* Embed code */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Embed Code</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
          Copy and paste into any page. Replace <code>make</code>, <code>model</code>, and optionally <code>year</code>.
        </p>
        <pre style={{
          background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8,
          padding: '16px 20px', overflowX: 'auto', fontSize: 13, lineHeight: 1.7,
          color: '#1e293b',
        }}>
          {snippetCode(ex.make, ex.model, ex.year)}
        </pre>
      </section>

      {/* Parameters */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Parameters</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['Parameter', 'Required', 'Example', 'Description'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { p: 'make', req: 'Yes', ex: 'Toyota', desc: 'Car manufacturer name' },
              { p: 'model', req: 'Yes', ex: 'RAV4', desc: 'Model name' },
              { p: 'year', req: 'No', ex: '2019', desc: 'Filter to a specific model year' },
              { p: 'lang', req: 'No', ex: 'he', desc: 'Language: en (default) or he (Hebrew)' },
            ].map(row => (
              <tr key={row.p} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px' }}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{row.p}</code></td>
                <td style={{ padding: '10px 12px', color: row.req === 'Yes' ? '#dc2626' : '#6b7280' }}>{row.req}</td>
                <td style={{ padding: '10px 12px', color: '#2563eb' }}><code>{row.ex}</code></td>
                <td style={{ padding: '10px 12px', color: '#4b5563' }}>{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* More examples */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>More Examples</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {EXAMPLES.slice(1).map(({ make, model, year }) => (
            <div key={`${make}/${model}`} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{year} {make} {model}</div>
              <code style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>
                {`<iframe src="${iframeUrl(make, model, year)}" width="100%" height="360" frameborder="0" loading="lazy"></iframe>`}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Hebrew example */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Hebrew Version (עברית)</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
          Add <code>lang=he</code> for Hebrew output:
        </p>
        <iframe
          src={iframeUrl(ex.make, ex.model, ex.year, 'he')}
          width="100%"
          height="320"
          frameBorder="0"
          loading="lazy"
          style={{ borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
          title={`NHTSA Recalls HE — ${ex.make} ${ex.model} ${ex.year}`}
        />
      </section>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 24, fontSize: 13, color: '#9ca3af' }}>
        Recall data sourced from the{' '}
        <a href="https://api.nhtsa.gov" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
          NHTSA public API
        </a>
        . Full car reviews and reliability data at{' '}
        <a href="https://carissues.net" style={{ color: '#2563eb' }}>carissues.net</a>.
      </div>
    </div>
  );
}
