import type { ProReviewScoreSet } from '@/lib/proReviewScoreLabels';
import { labelForScoreSet } from '@/lib/proReviewScoreLabels';
import type { SynthesisRow } from '@/lib/modelSynthesis';

interface Props {
  sets: ProReviewScoreSet[] | null;
  synthesisRows: SynthesisRow[];
  isHe: boolean;
}

const L = {
  he: {
    heading: 'סיכום', strengths: 'חוזקות', weaknesses: 'חולשות',
    known: 'מה ידוע', notKnown: 'מה לא ידוע',
    noScore: 'לא נמצא ציון מבחנים מאומת לדגם זה - אין מספיק מקורות שעמדו באימות.',
    reliabilityCaveat: 'אמינות ארוכת-טווח וחוויית בעלות אינן נמדדות על ידי מבחני הרכב הללו.',
    notCovered: 'לא מכוסה בציון זה:',
    sourcesSummary: (n: number, markets: string) => `${n} ${n === 1 ? 'מבחן' : 'מבחנים'}${markets ? ` (${markets})` : ''}`,
    dateRange: (from: string, to: string) => from === to ? `מתאריך ${from}` : `בין ${from} ל-${to}`,
  },
  en: {
    heading: 'Summary', strengths: 'Strengths', weaknesses: 'Weaknesses',
    known: 'What is known', notKnown: 'What is not known',
    noScore: 'No verified test score was found for this model - not enough sources passed verification.',
    reliabilityCaveat: 'Long-term reliability and ownership experience are not measured by these car tests.',
    notCovered: 'Not covered by this score:',
    sourcesSummary: (n: number, markets: string) => `${n} ${n === 1 ? 'test' : 'tests'}${markets ? ` (${markets})` : ''}`,
    dateRange: (from: string, to: string) => from === to ? `dated ${from}` : `between ${from} and ${to}`,
  },
};

const MARKET_LABELS: Record<string, { he: string; en: string }> = {
  IL: { he: 'ישראל', en: 'Israel' },
  UK: { he: 'בריטניה', en: 'UK' },
  US: { he: 'ארה"ב', en: 'US' },
  AU: { he: 'אוסטרליה', en: 'Australia' },
};

function marketsSummary(set: ProReviewScoreSet, isHe: boolean): string {
  const counts = new Map<string, number>();
  for (const s of set.sources) {
    const m = s.market ?? '?';
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([m, c]) => `${c} ${isHe ? (MARKET_LABELS[m]?.he ?? m) : (MARKET_LABELS[m]?.en ?? m)}`)
    .join(isHe ? ', ' : ', ');
}

function dateSpan(set: ProReviewScoreSet): [string, string] | null {
  const dates = set.sources.map((s) => s.date).filter((d): d is string => !!d).sort();
  if (dates.length === 0) return null;
  return [dates[0], dates[dates.length - 1]];
}

function SynthesisBlock({ set, label, row, isHe }: { set: ProReviewScoreSet; label: string | null; row: SynthesisRow | undefined; isHe: boolean }) {
  const t = isHe ? L.he : L.en;
  const span = dateSpan(set);
  const markets = marketsSummary(set, isHe);
  const notApplicable = isHe ? set.notApplicable : (set.notApplicableEn.length ? set.notApplicableEn : set.notApplicable);
  const strengths = row?.strengths ?? [];
  const weaknesses = row?.weaknesses ?? [];

  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid #eef1f5' }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8595a6', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          {label}
        </div>
      )}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="vc-syn-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 12 }}>
          {strengths.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1b7a4b', marginBottom: 6 }}>{isHe ? `+ ${t.strengths}` : `+ ${t.strengths}`}</div>
              {strengths.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#3d4c5c', padding: '4px 0', lineHeight: 1.45 }}>
                  <span style={{ color: '#1b9e5f', flexShrink: 0, fontWeight: 700 }}>+</span>
                  <span>
                    {isHe ? p.text_he : p.text_en}{' '}
                    <a href={p.source_url} target="_blank" rel="noopener nofollow" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none' }}>
                      ({p.source_site})
                    </a>
                  </span>
                </div>
              ))}
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#b23b2e', marginBottom: 6 }}>{isHe ? `− ${t.weaknesses}` : `− ${t.weaknesses}`}</div>
              {weaknesses.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#3d4c5c', padding: '4px 0', lineHeight: 1.45 }}>
                  <span style={{ color: '#d1503f', flexShrink: 0, fontWeight: 700 }}>−</span>
                  <span>
                    {isHe ? p.text_he : p.text_en}{' '}
                    <a href={p.source_url} target="_blank" rel="noopener nofollow" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none' }}>
                      ({p.source_site})
                    </a>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12.5, color: '#66788c', lineHeight: 1.6 }}>
        <strong style={{ color: '#4a5b6d' }}>{t.known}: </strong>
        {t.sourcesSummary(set.n, markets)}
        {span && ` · ${t.dateRange(span[0], span[1])}`}
      </div>
      <div style={{ fontSize: 12.5, color: '#66788c', lineHeight: 1.6, marginTop: 4 }}>
        <strong style={{ color: '#4a5b6d' }}>{t.notKnown}: </strong>
        {t.reliabilityCaveat}
        {notApplicable.length > 0 && ` ${t.notCovered} ${notApplicable.join('; ')}.`}
      </div>
    </div>
  );
}

export default function ModelSynthesis({ sets, synthesisRows, isHe }: Props) {
  const t = isHe ? L.he : L.en;

  if (!sets || sets.length === 0) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 18, padding: '16px clamp(16px,3vw,28px)', marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1c2733', marginBottom: 8 }}>{t.heading}</div>
        <div style={{ fontSize: 13.5, color: '#4a5b6d', lineHeight: 1.6 }}>{t.noScore}</div>
      </section>
    );
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 18, padding: '16px clamp(16px,3vw,28px) 4px', marginBottom: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#1c2733', marginBottom: 2 }}>{t.heading}</div>
      {sets.map((set) => {
        const row = synthesisRows.find((r) => r.scoreKey === set.scoreKey && r.setIndex === set.setIndex);
        return (
          <SynthesisBlock
            key={`${set.scoreKey}-${set.setIndex}`}
            set={set}
            label={labelForScoreSet(set, sets, isHe)}
            row={row}
            isHe={isHe}
          />
        );
      })}
    </section>
  );
}
