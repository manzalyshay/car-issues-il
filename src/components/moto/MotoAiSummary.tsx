import { dbFirst } from '@/lib/db';
import { motoKey } from '@/lib/motoDb';

interface Data {
  ownerRating: number | null;
  ownerCount: number;
  expertRating: number | null;
  areas: { label: string; score: number }[];
  generatedAt?: string;
}

const parse = <T,>(s: string | null | undefined, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

/**
 * AI summary for a bike, written from MCN's expert road tests and owners' reviews
 * (expert_reviews row under make key 'moto-<make>', loaded by scripts/moto/load_summaries.py).
 * Renders nothing when the model has no summary.
 */
export default async function MotoAiSummary({ makeSlug, modelSlug, name }: { makeSlug: string; modelSlug: string; name: string }) {
  const row = await dbFirst<{ summary_he: string; pros: string; cons: string; sources_list: string | null; model_data_json: string | null }>(
    'SELECT summary_he, pros, cons, sources_list, model_data_json FROM expert_reviews WHERE make_slug = ? AND model_slug = ? AND year IS NULL LIMIT 1',
    motoKey(makeSlug), modelSlug,
  ).catch(() => null);
  if (!row?.summary_he) return null;
  const pros = parse<string[]>(row.pros, []);
  const cons = parse<string[]>(row.cons, []);
  const sources = parse<{ name: string; url: string }[]>(row.sources_list, []);
  const d = parse<Data>(row.model_data_json, { ownerRating: null, ownerCount: 0, expertRating: null, areas: [] });

  const pill = { display: 'flex', flexDirection: 'column' as const, gap: 2, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-muted)', minWidth: 120 };

  return (
    <section id="ai-summary" className="card" style={{ padding: '20px 20px 16px', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>מה אומרים הבעלים: סיכום AI</h2>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6d28d9', background: 'rgba(109,40,217,.1)', padding: '2px 9px', borderRadius: 999 }}>✨ סיכום AI</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {d.ownerRating != null && (
          <div style={pill}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>דירוג בעלים</span>
            <span style={{ fontWeight: 800, fontSize: 20 }}>{(d.ownerRating * 2).toFixed(1)}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/10</span></span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{d.ownerCount} ביקורות בעלים</span>
          </div>
        )}
        {d.expertRating != null && (
          <div style={pill}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>מבחני MCN</span>
            <span style={{ fontWeight: 800, fontSize: 20 }}>{(d.expertRating * 2).toFixed(1)}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/10</span></span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sources.length} {sources.length === 1 ? 'מבחן' : 'מבחנים'}</span>
          </div>
        )}
      </div>

      <p style={{ lineHeight: 1.75, margin: '0 0 16px', fontSize: '0.97rem' }}>{row.summary_he}</p>

      {d.areas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px 18px', marginBottom: 16 }}>
          {d.areas.map((a) => (
            <div key={a.label} style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>{a.label}</span><strong>{(a.score * 2).toFixed(1)}</strong>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                <div style={{ width: `${(a.score / 5) * 100}%`, height: '100%', background: a.score >= 4.5 ? '#16a34a' : a.score >= 4 ? '#65a30d' : a.score >= 3.5 ? '#d97706' : '#dc2626' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
        {pros.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, color: '#15803d', marginBottom: 6, fontSize: 14 }}>👍 יתרונות</div>
            <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.7, fontSize: 14 }}>{pros.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        {cons.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, color: '#b91c1c', marginBottom: 6, fontSize: 14 }}>👎 חסרונות ותקלות שדווחו</div>
            <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.7, fontSize: 14 }}>{cons.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
        הסיכום נכתב על ידי AI על סמך {d.ownerCount} ביקורות בעלים ומבחני מומחים באתר MCN (Motorcycle News, בריטניה) על {name}, בלי להעתיק טקסט.
        {sources.length > 0 && ' מקורות: '}
        {sources.map((s, i) => (
          <span key={s.url}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener nofollow" dir="ltr" style={{ color: 'var(--text-muted)' }}>{s.name.replace(/^MCN - /, '')}</a></span>
        ))}
      </p>
    </section>
  );
}
