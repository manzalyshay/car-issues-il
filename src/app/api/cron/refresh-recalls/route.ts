/**
 * GET /api/cron/refresh-recalls
 *
 * Checks for NHTSA recalls not yet in recalls_cache and translates + saves them.
 * Called by Vercel Cron (daily) or GitHub Actions.
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';

function formatDate(raw: string): string {
  if (!raw) return '';
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8 && Number(digits.slice(0, 4)) > 1900) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return raw;
}

function extractYear(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) {
    const yr = parseInt(digits.slice(0, 4));
    if (yr > 1980 && yr <= new Date().getFullYear() + 1) return yr;
  }
  return null;
}

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

interface NhtsaRecall {
  NHTSACampaignNumber: string;
  ModelYear?: string;
  ReportReceivedDate?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  Manufacturer?: string;
}

interface DvsaRecall {
  recallNumber?: string;
  recallId?: string;
  defectType?: string;
  component?: string;
  concernDescription?: string;
  defectDescription?: string;
  summary?: string;
  safetyRisk?: string;
  consequence?: string;
  remedy?: string;
  launchDate?: string;
  recallDate?: string;
}

async function translateChunk(recalls: RecallFields[]): Promise<RecallFields[]> {
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

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [makes, models, existing] = await Promise.all([
    dbAll<{ slug: string; name_en: string }>('SELECT slug, name_en FROM car_makes'),
    dbAll<{ make_slug: string; name_en: string; years: string }>('SELECT make_slug, name_en, years FROM car_models'),
    dbAll<{ id: string }>('SELECT id FROM recalls_cache'),
  ]);

  const makeNameMap = Object.fromEntries(makes.map((m) => [m.slug, m.name_en]));
  const cachedIds = new Set(existing.map((r) => r.id));

  let totalNew = 0;

  for (const model of models) {
    const makeEn  = makeNameMap[model.make_slug] || model.make_slug;
    const modelEn = model.name_en;
    const years: number[] = (() => { try { return JSON.parse(model.years || '[]'); } catch { return []; } })();

    const batches = await Promise.all(
      years.map(async (y: number) => {
        try {
          const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}&modelYear=${y}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) return [];
          return ((await r.json()) as { results?: NhtsaRecall[] }).results ?? [];
        } catch { return []; }
      })
    );

    const seen = new Set<string>();
    const toTranslate: NhtsaRecall[] = [];
    for (const r of batches.flat()) {
      const id = r.NHTSACampaignNumber;
      if (!id || seen.has(id) || cachedIds.has(id)) continue;
      seen.add(id);
      toTranslate.push(r);
    }

    if (toTranslate.length === 0) continue;

    const CHUNK = 6;
    const rows: Array<{
      id: string; make: string; model: string; date: string;
      component_he: string; summary_he: string; consequence_he: string; remedy_he: string;
      manufacturer: string; recall_year: number | null;
    }> = [];
    for (let i = 0; i < toTranslate.length; i += CHUNK) {
      const chunk = toTranslate.slice(i, i + CHUNK);
      const fields: RecallFields[] = chunk.map(r => ({
        component: r.Component ?? '', summary: r.Summary ?? '',
        consequence: r.Consequence ?? '', remedy: r.Remedy ?? '',
      }));
      const translated = await translateChunk(fields);
      for (let j = 0; j < chunk.length; j++) {
        const r = chunk[j]; const t = translated[j];
          const campaignId = r.NHTSACampaignNumber;
          if (!campaignId) continue;
        rows.push({
          id: campaignId, make: makeEn.toLowerCase(), model: modelEn.toLowerCase(),
          date: formatDate(r.ReportReceivedDate ?? ''),
          component_he: t.component || fields[j].component,
          summary_he: t.summary || fields[j].summary,
          consequence_he: t.consequence || fields[j].consequence,
          remedy_he: t.remedy || fields[j].remedy,
          manufacturer: r.Manufacturer ?? '',
          recall_year: r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
        });
        if (r.NHTSACampaignNumber) cachedIds.add(r.NHTSACampaignNumber);
      }
    }

    if (rows.length > 0) {
      for (const row of rows) {
        await dbRun(
          `INSERT INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he, manufacturer, recall_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             component_he = excluded.component_he, summary_he = excluded.summary_he,
             consequence_he = excluded.consequence_he, remedy_he = excluded.remedy_he`,
          row.id, row.make, row.model, row.date,
          row.component_he, row.summary_he, row.consequence_he, row.remedy_he,
          row.manufacturer, row.recall_year ?? null,
        );
      }
      totalNew += rows.length;
    }
  }

  // ── UK DVSA recalls ──────────────────────────────────────────────────────────
  // Covers European/non-US models missing from NHTSA (e.g. Qashqai, MG, Duster)
  // Requires DVSA_API_KEY from https://developer-portal.driver-vehicle-licensing.agency.gov.uk/
  const dvsaKey = process.env.DVSA_API_KEY;
  let dvsaNew = 0;

  if (dvsaKey) {
    // Deduplicate to unique make/model pairs (DVSA doesn't filter by year)
    const uniquePairs = Array.from(
      new Map(models.map(m => [`${m.make_slug}|${m.name_en}`, m])).values()
    );

    for (const model of uniquePairs) {
      const makeEn  = (makeNameMap[model.make_slug] || model.make_slug).toUpperCase();
      const modelEn = model.name_en.toUpperCase();

      let recalls: DvsaRecall[] = [];
      try {
        const url = `https://driver-vehicle-licensing.agency.gov.uk/vehicle-recalls-faults/v1/recalls?type=vehicle&make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}`;
        const r = await fetch(url, {
          headers: { 'Ocp-Apim-Subscription-Key': dvsaKey },
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          const data: unknown = await r.json();
          recalls = Array.isArray(data) ? data as DvsaRecall[] : [];
        }
      } catch { /* skip */ }

      const toTranslate: Array<DvsaRecall & { _id: string }> = [];
      for (const rec of recalls) {
        const id = `DVSA-${rec.recallNumber ?? rec.recallId ?? ''}`;
        if (!id || id === 'DVSA-' || cachedIds.has(id)) continue;
        toTranslate.push({ ...rec, _id: id });
      }

      if (toTranslate.length === 0) continue;

      const CHUNK = 6;
      for (let i = 0; i < toTranslate.length; i += CHUNK) {
        const chunk = toTranslate.slice(i, i + CHUNK);
        const fields: RecallFields[] = chunk.map(r => ({
          component: r.defectType ?? r.component ?? '',
          summary:   r.concernDescription ?? r.defectDescription ?? r.summary ?? '',
          consequence: r.safetyRisk ?? r.consequence ?? '',
          remedy: r.remedy ?? '',
        }));
        const translated = await translateChunk(fields);
        for (let j = 0; j < chunk.length; j++) {
          const rec = chunk[j]; const t = translated[j];
          const launchDate = rec.launchDate ?? rec.recallDate ?? '';
          const recYear = launchDate ? parseInt(launchDate.slice(0, 4)) : null;
          await dbRun(
            `INSERT INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he, manufacturer, recall_year, component_en, summary_en, consequence_en, remedy_en)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               component_he = excluded.component_he, summary_he = excluded.summary_he,
               consequence_he = excluded.consequence_he, remedy_he = excluded.remedy_he`,
            rec._id,
            model.make_slug,
            model.name_en.toLowerCase(),
            launchDate ? formatDate(launchDate) : '',
            t.component || fields[j].component,
            t.summary    || fields[j].summary,
            t.consequence|| fields[j].consequence,
            t.remedy     || fields[j].remedy,
            'DVSA',
            recYear ?? null,
            fields[j].component,
            fields[j].summary,
            fields[j].consequence,
            fields[j].remedy,
          ).catch(() => null);
          cachedIds.add(rec._id);
          dvsaNew++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, newRecalls: totalNew, dvsaNew, dvsaEnabled: !!dvsaKey });
}
