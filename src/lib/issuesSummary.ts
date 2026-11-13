/**
 * Text for the per-model "common problems" page, built only from stored facts:
 * Israeli Ministry of Transport recall notices, cached US recalls and the model's
 * documented weaknesses. Pure functions - no DB access - so they are unit-testable.
 */
import type { IsraeliRecall } from './israeliRecallsDb';

/** Ministry catch-all category - not informative enough to headline. */
const OTHER_FAULT = 'אחר';

/** Ministry spellings tidied for display. */
const FAULT_LABELS: Record<string, string> = {
  'חשמל אליקטרוניקה ומיזוג': 'חשמל, אלקטרוניקה ומיזוג',
  'מרכב ושילדה': 'מרכב ושלדה',
};

export function faultLabel(faultType: string | null | undefined): string {
  const f = (faultType ?? '').trim();
  return FAULT_LABELS[f] ?? f;
}

/** "2015–2020", "2019" or "" when the production window is unknown. */
export function buildYearsLabel(r: Pick<IsraeliRecall, 'buildBegin' | 'buildEnd'>): string {
  const b = parseInt((r.buildBegin || '').slice(0, 4));
  const e = parseInt((r.buildEnd || '').slice(0, 4));
  if (isNaN(b) && isNaN(e)) return '';
  if (isNaN(b)) return String(e);
  if (isNaN(e) || e === b) return String(b);
  return `${b}–${e}`;
}

export interface IlRecallSummary {
  total: number;
  /** Notices typed as a safety defect (as opposed to a technical service campaign). */
  safety: number;
  latestYear: number | null;
  /** Named systems by number of notices, most frequent first ("other" excluded). */
  systems: { label: string; count: number }[];
}

export function summarizeIlRecalls(recalls: Pick<IsraeliRecall, 'year' | 'faultType' | 'recallType'>[]): IlRecallSummary {
  const counts = new Map<string, number>();
  let latestYear: number | null = null;
  let safety = 0;
  for (const r of recalls) {
    if (r.year != null && (latestYear == null || r.year > latestYear)) latestYear = r.year;
    if ((r.recallType ?? '').includes('בטיחות')) safety++;
    const f = (r.faultType ?? '').trim();
    if (f && f !== OTHER_FAULT) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const systems = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he'))
    .map(([f, count]) => ({ label: faultLabel(f), count }));
  return { total: recalls.length, safety, latestYear, systems };
}

const heRecallCount = (n: number) => (n === 1 ? 'קריאת שירות אחת' : `${n} קריאות שירות`);

export interface IssuesFacts {
  makeName: string;
  modelName: string;
  il: IlRecallSummary;
  usRecallCount: number;
  cons: string[];
}

/** Opening paragraph: answers "what goes wrong with this model" from the data on the page. */
export function buildIssuesIntro(f: IssuesFacts, locale: 'he' | 'en'): string {
  const name = `${f.makeName} ${f.modelName}`;
  const parts: string[] = [];
  if (locale === 'en') {
    if (f.usRecallCount > 0) {
      parts.push(`${f.usRecallCount} US safety recall${f.usRecallCount === 1 ? ' has' : 's have'} been recorded for the ${name}.`);
    }
    if (f.cons.length > 0) {
      parts.push(`The weaknesses raised most often: ${f.cons.slice(0, 3).join('; ')}.`);
    }
    return parts.join(' ');
  }
  if (f.il.total > 0) {
    let s = `ל${name} פורסמו בישראל ${heRecallCount(f.il.total)} (ריקול) רשמיות במאגר משרד התחבורה`;
    if (f.il.latestYear) s += `, האחרונה בשנת ${f.il.latestYear}`;
    parts.push(`${s}.`);
    if (f.il.safety > 0) {
      parts.push(f.il.safety === f.il.total
        ? (f.il.total === 1 ? 'היא סווגה כתקלה סדרתית בטיחותית.' : 'כולן סווגו כתקלה סדרתית בטיחותית.')
        : `${f.il.safety} מהן סווגו כתקלה סדרתית בטיחותית.`);
    }
    if (f.il.systems.length > 0) {
      const top = f.il.systems.slice(0, 3).map((x) => (f.il.total > 1 ? `${x.label} (${x.count})` : x.label));
      parts.push(`${f.il.systems.length === 1 ? 'המערכת שבה נמצאה התקלה' : 'המערכות שחזרו הכי הרבה'}: ${top.join(', ')}.`);
    }
  } else {
    parts.push(`ל${name} לא נמצאו קריאות שירות (ריקול) במאגר משרד התחבורה.`);
  }
  if (f.usRecallCount > 0) {
    parts.push(`בארה״ב ${f.usRecallCount === 1 ? 'תועד ריקול אחד' : `תועדו ${f.usRecallCount} ריקולים`} לדגם.`);
  }
  if (f.cons.length > 0) {
    parts.push(`החולשות שעולות בביקורות: ${f.cons.slice(0, 3).join('; ')}.`);
  }
  return parts.join(' ');
}

/** Search-result description stating the page's actual numbers; null when there is nothing specific to say. */
export function buildIssuesDescription(f: IssuesFacts, locale: 'he' | 'en'): string | null {
  const name = `${f.makeName} ${f.modelName}`;
  if (locale === 'en') {
    if (f.usRecallCount === 0) return null;
    return `${name} problems: ${f.usRecallCount} US recall${f.usRecallCount === 1 ? '' : 's'}, reported weaknesses, common complaints and typical repair costs.`;
  }
  if (f.il.total === 0) return null;
  const systems = f.il.systems.slice(0, 3).map((x) => x.label).join(', ');
  let s = `${heRecallCount(f.il.total)} (ריקול) בישראל ל${name}`;
  if (f.il.latestYear) s += `, האחרונה ב-${f.il.latestYear}`;
  if (systems) s += `: ${systems}`;
  return `${s}. חסרונות מדווחים, עלויות תיקון ומה לבדוק לפני קנייה.`;
}
