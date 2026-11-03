import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun, dbBatch } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';
import { getIsraeliRecalls, buildWindowOverlaps } from '@/lib/israeliRecallsDb';
import { NHTSA_ALIASES, formatNhtsaDate, extractYear, dateSortKey, type NhtsaRecall } from '@/lib/nhtsaRecalls';

export interface Recall {
  id: string;
  year: number | null;
  date: string;
  component: string;
  componentEn?: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
  /** Set when merged with Israeli recall data (recalls_il) elsewhere; absent for NHTSA rows. */
  source?: 'il' | 'us';
  importer?: string | null;
  website?: string | null;
  /** Israeli notices only: notice year (SHNAT_RECALL), production window and notice type. */
  ilRecallYear?: number | null;
  buildBegin?: string | null;
  buildEnd?: string | null;
  recallType?: string | null;
}

// ── Date formatting ───────────────────────────────────────────────────────────

const formatDate = formatNhtsaDate;

// Format raw NHTSA component strings like "ENGINE AND ENGINE COOLING:ENGINE:COOLING FAN"
// into readable title case: "Cooling Fan"
function formatComponent(raw: string | null | undefined): string {
  if (!raw) return '';
  // Take the last segment after the last colon (most specific)
  const parts = raw.split(':');
  const label = parts[parts.length - 1].trim();
  return label.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Same cleanup for Hebrew — AI translates the full NHTSA path, take last colon-segment
function formatHeComponent(raw: string | null | undefined): string {
  if (!raw) return '';
  const parts = raw.split(':');
  return parts[parts.length - 1].trim();
}

// ── Translation via Cloudflare Workers AI ───────────────────────────────────

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

interface RecallCacheRow {
  id: string;
  date?: string | null;
  component_en?: string | null;
  summary_en?: string | null;
  consequence_en?: string | null;
  remedy_en?: string | null;
  component_he?: string | null;
  summary_he?: string | null;
  consequence_he?: string | null;
  remedy_he?: string | null;
  make?: string;
  model?: string;
  manufacturer?: string;
  recall_year?: number | null;
}

async function translateRecalls(recalls: RecallFields[]): Promise<RecallFields[]> {
  if (recalls.length === 0) return recalls;

  const input = recalls.map((r, i) =>
    `[${i + 1}]\ncomponent: ${r.component}\nsummary: ${r.summary}\nconsequence: ${r.consequence}\nremedy: ${r.remedy}`
  ).join('\n\n');

  const content = await runWorkersAI(
    [
      { role: 'system', content: 'Translate each numbered recall from English to Hebrew. Keep technical automotive terms accurate. Reply ONLY in this exact format:\n[N]\ncomponent: ...\nsummary: ...\nconsequence: ...\nremedy: ...' },
      { role: 'user', content: input },
    ],
    { max_tokens: 4000, temperature: 0 },
  );
  if (!content) return recalls;

  const out = recalls.map(r => ({ ...r }));
  const blocks = content.split(/\n(?=\[\d+\])/);
  for (const block of blocks) {
    const idxMatch = block.match(/^\[(\d+)\]/);
    if (!idxMatch) continue;
    const idx = parseInt(idxMatch[1]) - 1;
    if (idx < 0 || idx >= out.length) continue;
    const get = (field: string) => {
      const m = block.match(new RegExp(`${field}:\\s*([\\s\\S]*?)(?=\\n(?:component|summary|consequence|remedy):|$)`));
      return m?.[1]?.trim() || '';
    };
    const c = get('component'), s = get('summary'), con = get('consequence'), rem = get('remedy');
    if (c)   out[idx].component   = c;
    if (s)   out[idx].summary     = s;
    if (con) out[idx].consequence = con;
    if (rem) out[idx].remedy      = rem;
  }
  return out;
}

// ── Main handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/recalls?make=&model=&years=|year=&locale=[&il=1]
 * US (NHTSA) recalls for the model; with il=1 (Hebrew site only) the Israeli
 * manufacturer notices from data.gov.il are added first, each row tagged with
 * `source` so the UI can label them separately. Israeli rows are limited to
 * notices whose production window overlaps the requested model year(s).
 */
export async function GET(req: NextRequest) {
  const res = await getUsRecalls(req);
  const sp = new URL(req.url).searchParams;
  if (sp.get('il') !== '1' || (sp.get('locale') ?? 'he') === 'en') return res;

  const body = await res.json().catch(() => null) as { recalls?: Recall[] } | null;
  const us = (body?.recalls ?? []).map(r => ({ ...r, source: 'us' as const }));
  const make = sp.get('make') ?? '';
  const model = sp.get('model') ?? '';
  const yearParam = sp.get('year');
  const years = yearParam
    ? [parseInt(yearParam)]
    : (sp.get('years') ?? '').split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
  const il = await getIsraeliRecalls(make, model).catch(() => []);
  const ilInRange = years.length
    ? il.filter(r => buildWindowOverlaps(r, Math.min(...years), Math.max(...years)))
    : il;
  const ilRows: Recall[] = ilInRange.map(r => ({
    id: r.id,
    year: null,
    date: '',
    component: r.faultType ?? '',
    componentEn: '',
    summary: r.faultDescription ?? '',
    consequence: '',
    remedy: r.fixMethod ?? '',
    manufacturer: r.manufacturer,
    source: 'il',
    importer: r.importer,
    website: r.website,
    ilRecallYear: r.year,
    buildBegin: r.buildBegin,
    buildEnd: r.buildEnd,
    recallType: r.recallType,
  }));
  const headers = new Headers();
  const cc = res.headers.get('Cache-Control');
  if (cc) headers.set('Cache-Control', cc);
  // Israeli rows come from our own table, so they're still worth returning when the US lookup failed.
  const status = !res.ok && ilRows.length > 0 ? 200 : res.status;
  if (status !== res.status) headers.set('Cache-Control', 'no-store');
  return NextResponse.json({ recalls: [...ilRows, ...us] }, { status, headers });
}

async function getUsRecalls(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const make       = searchParams.get('make');
  const model      = searchParams.get('model');
  const yearParam  = searchParams.get('year');
  const yearsParam = searchParams.get('years');
  const locale     = searchParams.get('locale') ?? 'he'; // 'he' = translate to Hebrew, 'en' = return English

  if (!make || !model) {
    return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });
  }

  try {
    const currentYear = new Date().getFullYear();

    // Resolve NHTSA alias (EU models like Qashqai → Rogue Sport)
    const aliasKey = `${make.toLowerCase()}|${model.toLowerCase()}`;
    const alias = NHTSA_ALIASES[aliasKey];
    const nhtsaMake  = alias?.make  ?? make;
    const nhtsaModel = alias?.model ?? model;

    // 1. Fetch raw recalls from NHTSA
    let rawRecalls: NhtsaRecall[] = [];
    if (yearParam) {
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(nhtsaMake)}&model=${encodeURIComponent(nhtsaModel)}&modelYear=${yearParam}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) rawRecalls = ((await res.json()) as { results?: NhtsaRecall[] }).results ?? [];
    } else {
      const years = yearsParam
        ? yearsParam.split(',').map(y => y.trim()).filter(Boolean)
        : Array.from({ length: 10 }, (_, i) => String(currentYear - i));
      const batches = await Promise.all(
        years.map(async (y) => {
          try {
            const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(nhtsaMake)}&model=${encodeURIComponent(nhtsaModel)}&modelYear=${y}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return [];
            return ((await res.json()) as { results?: NhtsaRecall[] }).results ?? [];
          } catch { return []; }
        })
      );
      rawRecalls = batches.flat();
    }

    // Deduplicate + sort newest first
    const seen = new Set<string>();
    const unique: NhtsaRecall[] = [];
    for (const r of rawRecalls) {
      const id = r.NHTSACampaignNumber;
      if (!id) continue;
      if (!seen.has(id)) { seen.add(id); unique.push(r); }
    }
    // ReportReceivedDate is DD/MM/YYYY - sort on a YYYYMMDD key, not new Date().
    unique.sort((a, b) =>
      dateSortKey(formatDate(b.ReportReceivedDate ?? '')).localeCompare(dateSortKey(formatDate(a.ReportReceivedDate ?? '')))
    );

    if (unique.length === 0) {
      // NHTSA returned nothing (or failed). Fall back to our own recalls_cache so the
      // tab stays consistent with the rest of the page, and never CDN-cache an empty result.
      const yearFilter = yearParam
        ? [parseInt(yearParam)]
        : yearsParam ? yearsParam.split(',').map(y => parseInt(y.trim())).filter(Boolean) : [];
      const fallback = await dbAll<RecallCacheRow>(
        `SELECT c.* FROM recalls_cache c
         WHERE c.id IN (SELECT id FROM recalls_cache_models WHERE make = ? AND model = ?)
            OR (c.make = ? AND c.model = ?)
         ORDER BY c.date DESC`,
        make.toLowerCase(), model.toLowerCase(), make.toLowerCase(), model.toLowerCase(),
      ).catch(() => [] as RecallCacheRow[]);
      const rows = yearFilter.length
        ? fallback.filter(r => r.recall_year == null || yearFilter.includes(r.recall_year))
        : fallback;
      const recalls: Recall[] = rows.map(c => {
        const isEnLoc = locale === 'en';
        const compEn = c.component_en || '';
        return {
          id:           c.id,
          year:         c.recall_year ?? null,
          date:         c.date || '',
          component:    isEnLoc ? compEn : (formatHeComponent(c.component_he) || compEn),
          componentEn:  compEn,
          summary:      (isEnLoc ? c.summary_en : (c.summary_he || c.summary_en)) || '',
          consequence:  (isEnLoc ? c.consequence_en : (c.consequence_he || c.consequence_en)) || '',
          remedy:       (isEnLoc ? c.remedy_en : (c.remedy_he || c.remedy_en)) || '',
          manufacturer: c.manufacturer ?? '',
        };
      });
      return NextResponse.json({ recalls }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Link every campaign NHTSA listed for this model to it, so campaigns shared by
    // several models (stored once in recalls_cache) still count for each of them.
    {
      const linkStmts = unique.map(r => ({
        sql: 'INSERT OR IGNORE INTO recalls_cache_models (id, make, model) VALUES (?, ?, ?)',
        params: [r.NHTSACampaignNumber, make.toLowerCase(), model.toLowerCase()] as (string | number | null)[],
      }));
      for (let i = 0; i < linkStmts.length; i += 50) {
        await dbBatch(linkStmts.slice(i, i + 50)).catch(err => console.error('[Recalls link upsert]', err));
      }
    }

    // 2. Load cached records for all locales
    const ids = unique.map(r => r.NHTSACampaignNumber);
    const allCached = ids.length > 0
      ? await dbAll<RecallCacheRow>(`SELECT * FROM recalls_cache WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids).catch(() => [])
      : [];

    const cacheMap = new Map<string, RecallCacheRow>();
    for (const row of allCached) cacheMap.set(row.id, row);

    // For English locale — serve from cache (English fields) or fall back to formatted NHTSA data
    if (locale === 'en') {
      // Identify which recalls are missing English in cache — store them
      const missingEn = unique.filter(r => {
        const cached = cacheMap.get(r.NHTSACampaignNumber);
        return !cached?.component_en;
      });
      if (missingEn.length > 0) {
        await Promise.all(missingEn.map(r =>
          dbRun(
            `INSERT INTO recalls_cache (id, make, model, date, component_en, summary_en, consequence_en, remedy_en, manufacturer, recall_year)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET component_en=excluded.component_en, summary_en=excluded.summary_en,
               consequence_en=excluded.consequence_en, remedy_en=excluded.remedy_en`,
            r.NHTSACampaignNumber, make.toLowerCase(), model.toLowerCase(),
            formatDate(r.ReportReceivedDate ?? ''),
            formatComponent(r.Component ?? ''), r.Summary ?? '', r.Consequence ?? '', r.Remedy ?? '',
            r.Manufacturer ?? '',
            r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          ).catch(() => {})
        ));
        // Update local map
        for (const r of missingEn) {
          const id = r.NHTSACampaignNumber;
          const existing = cacheMap.get(id) ?? { id };
          cacheMap.set(id, {
            ...existing,
            component_en: formatComponent(r.Component ?? ''),
            summary_en: r.Summary ?? '',
            consequence_en: r.Consequence ?? '',
            remedy_en: r.Remedy ?? '',
          });
        }
      }
      const recalls: Recall[] = unique.map(r => {
        const c = cacheMap.get(r.NHTSACampaignNumber);
        const compEn = c?.component_en || formatComponent(r.Component ?? '');
        return {
          id:           r.NHTSACampaignNumber ?? '',
          year:         r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          date:         formatDate(r.ReportReceivedDate ?? '') || c?.date || '',
          component:    compEn,
          componentEn:  compEn,
          summary:      c?.summary_en   || (r.Summary     ?? ''),
          consequence:  c?.consequence_en || (r.Consequence ?? ''),
          remedy:       c?.remedy_en    || (r.Remedy      ?? ''),
          manufacturer: r.Manufacturer  ?? '',
        };
      });
      return NextResponse.json({ recalls }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      });
    }

    // 3. Hebrew locale — translate only truly uncached recalls (not in DB at all)
    const toTranslate = unique.filter(r => {
      return !cacheMap.has(r.NHTSACampaignNumber);
    });

    // 4. Translate new ones in chunks of 6 and save to DB (with English fields too)
    if (toTranslate.length > 0) {
      const CHUNK = 6;
      const rows: RecallCacheRow[] = [];

      for (let i = 0; i < toTranslate.length; i += CHUNK) {
        const chunk = toTranslate.slice(i, i + CHUNK);
        const fields: RecallFields[] = chunk.map(r => ({
          component:   formatComponent(r.Component ?? ''),  // send formatted (short) form
          summary:     r.Summary     ?? '',
          consequence: r.Consequence ?? '',
          remedy:      r.Remedy      ?? '',
        }));
        const translated = await translateRecalls(fields);

        for (let j = 0; j < chunk.length; j++) {
          const r = chunk[j];
          const t = translated[j];
          const row = {
            id:            r.NHTSACampaignNumber,
            make:          make.toLowerCase(),
            model:         model.toLowerCase(),
            date:          formatDate(r.ReportReceivedDate ?? ''),
            component_he:  t.component   || fields[j].component,
            summary_he:    t.summary     || fields[j].summary,
            consequence_he:t.consequence || fields[j].consequence,
            remedy_he:     t.remedy      || fields[j].remedy,
            component_en:  formatComponent(fields[j].component),
            summary_en:    fields[j].summary,
            consequence_en:fields[j].consequence,
            remedy_en:     fields[j].remedy,
            manufacturer:  r.Manufacturer ?? '',
            recall_year:   r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          };
          // Always cache — even if translation failed (stores English as fallback)
          // This prevents retrying failed translations on every request
          rows.push(row);
          cacheMap.set(row.id, row);
        }
      }

      // Upsert new rows — preserve existing summary_he if already present
      await Promise.all(rows.map(row =>
        dbRun(
          `INSERT INTO recalls_cache
           (id, make, model, date, component_he, summary_he, consequence_he, remedy_he,
            component_en, summary_en, consequence_en, remedy_en, manufacturer, recall_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             component_he=excluded.component_he,
             summary_he=CASE WHEN excluded.summary_he != '' THEN excluded.summary_he ELSE summary_he END,
             consequence_he=CASE WHEN excluded.consequence_he != '' THEN excluded.consequence_he ELSE consequence_he END,
             remedy_he=CASE WHEN excluded.remedy_he != '' THEN excluded.remedy_he ELSE remedy_he END,
             component_en=excluded.component_en, summary_en=excluded.summary_en,
             consequence_en=excluded.consequence_en, remedy_en=excluded.remedy_en`,
          row.id, row.make ?? make.toLowerCase(), row.model ?? model.toLowerCase(), row.date ?? '',
          row.component_he ?? '', row.summary_he ?? '', row.consequence_he ?? '', row.remedy_he ?? '',
          row.component_en ?? '', row.summary_en ?? '', row.consequence_en ?? '', row.remedy_en ?? '',
          row.manufacturer ?? '', row.recall_year ?? null,
        ).catch(err => console.error('[Recalls cache upsert]', err))
      ));
    }

    // 5. Build final Hebrew response from cache
    const recalls: Recall[] = unique
      .map(r => {
        const cached = cacheMap.get(r.NHTSACampaignNumber);
        return {
          id:          r.NHTSACampaignNumber,
          year:        r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          date:        formatDate(r.ReportReceivedDate ?? '') || cached?.date || '',
          component:   formatHeComponent(cached?.component_he) || formatComponent(r.Component ?? ''),
          componentEn: cached?.component_en || formatComponent(r.Component ?? ''),
          summary:     cached?.summary_he    || r.Summary     || '',
          consequence: cached?.consequence_he || r.Consequence || '',
          remedy:      cached?.remedy_he     || r.Remedy      || '',
          manufacturer:r.Manufacturer ?? '',
        };
      });

    return NextResponse.json({ recalls }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    console.error('[Recalls API]', err);
    return NextResponse.json({ recalls: [] }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
