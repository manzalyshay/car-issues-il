'use client';
import { useState, useEffect } from 'react';

interface Props {
  make1: string; model1: string;
  make2: string; model2: string;
  nameAhe: string; nameBhe: string;
  nameAen: string; nameBen: string;
  locale: 'he' | 'en';
}

export default function CarComparisonAI({ make1, model1, make2, model2, nameAhe, nameBhe, nameAen, nameBen, locale }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `/api/car-comparison?make1=${make1}&model1=${model1}&make2=${make2}&model2=${model2}&locale=${locale}` +
      `&nameAhe=${encodeURIComponent(nameAhe)}&nameBhe=${encodeURIComponent(nameBhe)}` +
      `&nameAen=${encodeURIComponent(nameAen)}&nameBen=${encodeURIComponent(nameBen)}`;

    fetch(url)
      .then(r => r.json())
      .then((d: { comparison: string | null }) => { setText(d.comparison ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [make1, model1, make2, model2, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 28 }}>
        {header(locale)}
        <div style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {locale === 'he' ? 'מייצר השוואה...' : 'Generating comparison...'}
        </div>
      </div>
    );
  }

  if (!text) return null;

  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

  return (
    <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 28 }}>
      {header(locale)}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--text-muted)' }}>{p}</p>
        ))}
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {locale === 'he' ? 'נוצר ע"י AI · CarIssues' : 'AI-generated · CarIssues'}
        </div>
      </div>
    </div>
  );
}

function header(locale: 'he' | 'en') {
  return (
    <div style={{
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: '1.1rem' }}>🤖</span>
      <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
        {locale === 'he' ? 'השוואה מבוססת AI' : 'AI-Powered Comparison'}
      </h2>
    </div>
  );
}
