/**
 * Shared NHTSA recall helpers used by both the on-demand /api/recalls route and
 * the scheduled /api/cron/refresh-recalls job, so the two always agree on
 * model-name aliases and date handling.
 */

// ── NHTSA model aliases (EU/non-US models → US-market equivalents) ───────────
// Keyed by lowercase "make|model" (English names from our DB).
export const NHTSA_ALIASES: Record<string, { make: string; model: string }> = {
  'nissan|qashqai':           { make: 'Nissan',     model: 'Rogue Sport' },
  'nissan|x-trail':           { make: 'Nissan',     model: 'Rogue' },
  'nissan|navara':            { make: 'Nissan',     model: 'Frontier' },
  'nissan|note':              { make: 'Nissan',     model: 'Versa Note' },
  'honda|jazz':               { make: 'Honda',      model: 'Fit' },
  'honda|hr-v':               { make: 'Honda',      model: 'HR-V' },
  'ford|kuga':                { make: 'Ford',       model: 'Escape' },
  'ford|puma':                { make: 'Ford',       model: 'Bronco Sport' },
  'ford|mondeo':              { make: 'Ford',       model: 'Fusion' },
  'mitsubishi|asx':           { make: 'Mitsubishi', model: 'Outlander Sport' },
  'mitsubishi|eclipse cross': { make: 'Mitsubishi', model: 'Eclipse Cross' },
  'mitsubishi|pajero sport':  { make: 'Mitsubishi', model: 'Montero Sport' },
  'toyota|hilux':             { make: 'Toyota',     model: 'Tacoma' },
  'toyota|yaris':             { make: 'Toyota',     model: 'Yaris' },
  'toyota|corolla cross':     { make: 'Toyota',     model: 'Corolla Cross' },
  'mazda|cx-3':               { make: 'Mazda',      model: 'CX-3' },
  'mazda|cx-30':              { make: 'Mazda',      model: 'CX-30' },
};

/** The make/model strings to send to NHTSA for one of our models. */
export function nhtsaName(makeEn: string, modelEn: string): { make: string; model: string } {
  return NHTSA_ALIASES[`${makeEn.toLowerCase()}|${modelEn.toLowerCase()}`] ?? { make: makeEn, model: modelEn };
}

/**
 * NHTSA's recallsByVehicle returns ReportReceivedDate as DD/MM/YYYY
 * (e.g. "19/11/2022"). Our stored/display format is also DD/MM/YYYY, so the
 * slash form is kept as-is (zero-padded). The previous code treated it as
 * MM/DD and swapped day and month. YYYYMMDD and ISO dates are also accepted.
 */
export function formatNhtsaDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = raw.trim();
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length === 8 && Number(digits.slice(0, 4)) > 1900) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

/** Sortable key (YYYYMMDD) for a DD/MM/YYYY string; '' when unparsable. */
export function dateSortKey(ddmmyyyy: string | null | undefined): string {
  const m = (ddmmyyyy ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
}

export function extractYear(raw: string): number | null {
  const m = (raw || '').match(/(\d{4})/);
  if (m) {
    const yr = parseInt(m[1]);
    if (yr > 1980 && yr <= new Date().getFullYear() + 1) return yr;
  }
  return null;
}

export interface NhtsaRecall {
  NHTSACampaignNumber: string;
  ModelYear?: string;
  ReportReceivedDate?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  Manufacturer?: string;
}

export type NhtsaFetchResult =
  | { ok: true; results: NhtsaRecall[] }
  | { ok: false; error: string };

/**
 * Fetch recalls for one make/model/year. NHTSA answers a valid *empty* result
 * with HTTP 400 and `{"Count":0,"Message":"Results returned successfully"}`,
 * so that case is treated as success; anything else non-2xx is a failure and
 * is reported, not silently turned into "no recalls".
 */
export async function fetchNhtsaYear(make: string, model: string, year: number | string, timeoutMs = 10000): Promise<NhtsaFetchResult> {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await r.json().catch(() => null) as { Count?: number; Message?: string; results?: NhtsaRecall[] } | null;
    if (r.ok) return { ok: true, results: body?.results ?? [] };
    if (r.status === 400 && body && body.Count === 0 && /success/i.test(body.Message ?? '')) {
      return { ok: true, results: [] };
    }
    return { ok: false, error: `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name + ': ' + e.message : String(e) };
  }
}

/** Model years to query: the model's own years, or the last 10 when unknown. */
export function modelYearsToQuery(years: number[]): number[] {
  if (years.length) return years;
  const now = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => now - i);
}
