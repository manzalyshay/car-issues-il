import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';

export interface Recall {
  id: string;
  year: number | null;
  date: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return raw;
}

// Format raw NHTSA component strings like "ENGINE AND ENGINE COOLING:ENGINE:COOLING FAN"
// into readable title case: "Cooling Fan"
function formatComponent(raw: string): string {
  if (!raw) return '';
  // Take the last segment after the last colon (most specific)
  const parts = raw.split(':');
  const label = parts[parts.length - 1].trim();
  return label.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Same cleanup for Hebrew — AI translates the full NHTSA path, take last colon-segment
function formatHeComponent(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(':');
  return parts[parts.length - 1].trim();
}

function extractYear(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) {
    const yr = parseInt(digits.slice(0, 4));
    if (yr > 1980 && yr <= new Date().getFullYear() + 1) return yr;
  }
  return null;
}

// ── Translation via Cloudflare Workers AI ───────────────────────────────────

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

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

export async function GET(req: NextRequest) {
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

    // 1. Fetch raw recalls from NHTSA
    let rawRecalls: any[] = [];
    if (yearParam) {
      const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${yearParam}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) rawRecalls = (await res.json()).results ?? [];
    } else {
      const years = yearsParam
        ? yearsParam.split(',').map(y => y.trim()).filter(Boolean)
        : Array.from({ length: 10 }, (_, i) => String(currentYear - i));
      const batches = await Promise.all(
        years.map(async (y) => {
          try {
            const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${y}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return [];
            return (await res.json()).results ?? [];
          } catch { return []; }
        })
      );
      rawRecalls = batches.flat();
    }

    // Deduplicate + sort newest first
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const r of rawRecalls) {
      const id = r.NHTSACampaignNumber ?? `${r.ReportReceivedDate}-${r.Component}`;
      if (!seen.has(id)) { seen.add(id); unique.push(r); }
    }
    unique.sort((a, b) =>
      new Date(b.ReportReceivedDate ?? '').getTime() - new Date(a.ReportReceivedDate ?? '').getTime()
    );

    if (unique.length === 0) return NextResponse.json({ recalls: [] });

    // 2. Load cached records for all locales
    const ids = unique.map(r => r.NHTSACampaignNumber ?? '').filter(Boolean);
    const allCached = ids.length > 0
      ? await dbAll(`SELECT * FROM recalls_cache WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids).catch(() => [])
      : [];

    const hasHebrew = (s: string) => /[\u0590-\u05FF]/.test(s ?? '');
    const cacheMap = new Map<string, any>();
    for (const row of allCached) cacheMap.set(row.id as string, row);

    // For English locale — serve from cache (English fields) or fall back to formatted NHTSA data
    if (locale === 'en') {
      // Identify which recalls are missing English in cache — store them
      const missingEn = unique.filter(r => {
        const id = r.NHTSACampaignNumber ?? '';
        const cached = id ? cacheMap.get(id) : null;
        return id && !cached?.component_en;
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
          const existing = cacheMap.get(r.NHTSACampaignNumber) ?? {};
          cacheMap.set(r.NHTSACampaignNumber, {
            ...existing,
            component_en: formatComponent(r.Component ?? ''),
            summary_en: r.Summary ?? '',
            consequence_en: r.Consequence ?? '',
            remedy_en: r.Remedy ?? '',
          });
        }
      }
      const recalls: Recall[] = unique.map(r => {
        const c = cacheMap.get(r.NHTSACampaignNumber ?? '');
        return {
          id:           r.NHTSACampaignNumber ?? '',
          year:         r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          date:         c?.date || formatDate(r.ReportReceivedDate ?? ''),
          component:    c?.component_en || formatComponent(r.Component ?? ''),
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
      const id = r.NHTSACampaignNumber ?? '';
      return id && !cacheMap.has(id);
    });

    // 4. Translate new ones in chunks of 6 and save to DB (with English fields too)
    if (toTranslate.length > 0) {
      const CHUNK = 6;
      const rows: any[] = [];

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
          row.id, row.make, row.model, row.date,
          row.component_he, row.summary_he, row.consequence_he, row.remedy_he,
          row.component_en, row.summary_en, row.consequence_en, row.remedy_en,
          row.manufacturer, row.recall_year,
        ).catch(err => console.error('[Recalls cache upsert]', err))
      ));
    }

    // 5. Build final Hebrew response from cache
    const recalls: Recall[] = unique
      .filter(r => r.NHTSACampaignNumber)
      .map(r => {
        const cached = cacheMap.get(r.NHTSACampaignNumber);
        return {
          id:          r.NHTSACampaignNumber,
          year:        r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
          date:        cached?.date || formatDate(r.ReportReceivedDate ?? ''),
          component:   formatHeComponent(cached?.component_he) || formatComponent(r.Component ?? ''),
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
    return NextResponse.json({ recalls: [] });
  }
}
