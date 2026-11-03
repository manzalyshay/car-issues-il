/**
 * GET /api/cron/refresh-recalls
 *
 * Incremental NHTSA (and optional UK DVSA) recall sync into recalls_cache.
 * Called hourly by the Cloudflare Cron Trigger (worker-entry.js). Protected by CRON_SECRET.
 *
 * Each run processes models starting from a saved cursor until a fetch/time
 * budget is used up, then saves the cursor so the next run continues. A full
 * pass over all models therefore takes several runs instead of one oversized
 * request that never finishes. Every run is recorded in `cron_runs`.
 *
 * Per model it:
 *  - queries NHTSA per model year using the same aliases as /api/recalls (Kuga → Escape),
 *  - distinguishes "no recalls" from a failed request (failures are counted, not hidden),
 *  - links every campaign to the model in recalls_cache_models (shared campaigns),
 *  - inserts new campaigns (translated to Hebrew),
 *  - repairs stored dates that were saved day/month-swapped, and stamps last_seen_at.
 *
 * Query params (manual use): dryRun=1 (no writes; returns the diff),
 *   models=make-slug/model-slug,... (only these; cursor untouched),
 *   maxFetches=N, budgetMs=N.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';
import { nhtsaName, fetchNhtsaYear, formatNhtsaDate, extractYear, modelYearsToQuery, type NhtsaRecall } from '@/lib/nhtsaRecalls';
import { startRun, finishRun, getState, setState, runTrigger } from '@/lib/cronRuns';

const JOB = 'refresh-recalls';
const CURSOR_KEY = 'refresh-recalls.cursor';

interface RecallFields { component: string; summary: string; consequence: string; remedy: string; }

interface DvsaRecall {
  recallNumber?: string; recallId?: string; defectType?: string; component?: string;
  concernDescription?: string; defectDescription?: string; summary?: string;
  safetyRisk?: string; consequence?: string; remedy?: string; launchDate?: string; recallDate?: string;
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
  ).catch(() => null);
  if (!content) return recalls;

  const out = recalls.map(r => ({ ...r }));
  for (const block of content.split(/\n(?=\[\d+\])/)) {
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

function formatComponent(raw: string | null | undefined): string {
  if (!raw) return '';
  const parts = raw.split(':');
  return parts[parts.length - 1].trim().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

interface ModelRow { make_slug: string; slug: string; name_en: string; years: string }

interface ModelDiff {
  model: string;
  nhtsa: string;
  yearsQueried: number;
  yearsFailed: number[];
  uniqueCampaigns: number;
  newCampaigns: string[];
  newLinks: number;
  dateRepairs: Array<{ id: string; stored: string; correct: string }>;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get('dryRun') === '1';
  const onlyModels = (sp.get('models') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const maxFetches = Math.max(1, parseInt(sp.get('maxFetches') ?? process.env.RECALLS_MAX_FETCHES ?? '300'));
  const budgetMs = Math.max(5000, parseInt(sp.get('budgetMs') ?? process.env.RECALLS_BUDGET_MS ?? '60000'));
  const started = Date.now();

  const runId = dryRun ? null : await startRun(JOB, runTrigger(req));
  const detail: Record<string, unknown> = { dryRun, maxFetches, budgetMs };

  try {
    const [makes, allModels] = await Promise.all([
      dbAll<{ slug: string; name_en: string }>('SELECT slug, name_en FROM car_makes'),
      dbAll<ModelRow>('SELECT make_slug, slug, name_en, years FROM car_models ORDER BY make_slug, slug'),
    ]);
    const makeNameMap = Object.fromEntries(makes.map(m => [m.slug, m.name_en]));

    let queue: ModelRow[];
    let startIdx = 0;
    if (onlyModels.length) {
      queue = allModels.filter(m => onlyModels.includes(`${m.make_slug}/${m.slug}`));
    } else {
      startIdx = parseInt((await getState(CURSOR_KEY)) ?? '0') || 0;
      if (startIdx >= allModels.length) startIdx = 0;
      queue = [...allModels.slice(startIdx), ...allModels.slice(0, startIdx)];
    }

    let fetches = 0;
    let processed = 0;
    let totalNew = 0;
    let totalLinks = 0;
    let totalDateRepairs = 0;
    const failures: string[] = [];
    const diffs: ModelDiff[] = [];
    const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const model of queue) {
      const years: number[] = (() => { try { return JSON.parse(model.years || '[]'); } catch { return []; } })();
      const queryYears = modelYearsToQuery(years);
      if (processed > 0 && (fetches + queryYears.length > maxFetches || Date.now() - started > budgetMs)) break;

      const makeEn = makeNameMap[model.make_slug] || model.make_slug;
      const modelEn = model.name_en;
      const ours = { make: makeEn.toLowerCase(), model: modelEn.toLowerCase() };
      const nhtsa = nhtsaName(makeEn, modelEn);

      const yearResults = await Promise.all(queryYears.map(async y => ({ y, res: await fetchNhtsaYear(nhtsa.make, nhtsa.model, y) })));
      fetches += queryYears.length;
      processed++;

      const yearsFailed = yearResults.filter(r => !r.res.ok).map(r => r.y);
      if (yearsFailed.length) failures.push(`${model.make_slug}/${model.slug}: years ${yearsFailed.join(',')}`);

      // campaign id → record + model years it was listed under
      const campaigns = new Map<string, { rec: NhtsaRecall; years: Set<string> }>();
      for (const { y, res } of yearResults) {
        if (!res.ok) continue;
        for (const rec of res.results) {
          const id = rec.NHTSACampaignNumber;
          if (!id) continue;
          if (!campaigns.has(id)) campaigns.set(id, { rec, years: new Set() });
          campaigns.get(id)!.years.add(String(rec.ModelYear || y));
        }
      }

      const ids = [...campaigns.keys()];
      const stored = ids.length
        ? await dbAll<{ id: string; date: string }>(`SELECT id, date FROM recalls_cache WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
        : [];
      const storedMap = new Map(stored.map(r => [r.id, r.date]));
      const links = ids.length
        ? await dbAll<{ id: string }>(
            `SELECT id FROM recalls_cache_models WHERE make = ? AND model = ? AND id IN (${ids.map(() => '?').join(',')})`,
            ours.make, ours.model, ...ids,
          )
        : [];
      const linked = new Set(links.map(r => r.id));

      const newOnes = ids.filter(id => !storedMap.has(id));
      const newLinks = ids.filter(id => !linked.has(id));
      const dateRepairs: ModelDiff['dateRepairs'] = [];
      for (const id of ids) {
        if (!storedMap.has(id)) continue;
        const correct = formatNhtsaDate(campaigns.get(id)!.rec.ReportReceivedDate);
        const cur = storedMap.get(id) ?? '';
        if (correct && cur !== correct) dateRepairs.push({ id, stored: cur, correct });
      }

      diffs.push({
        model: `${model.make_slug}/${model.slug}`,
        nhtsa: `${nhtsa.make}/${nhtsa.model}`,
        yearsQueried: queryYears.length,
        yearsFailed,
        uniqueCampaigns: ids.length,
        newCampaigns: newOnes,
        newLinks: newLinks.length,
        dateRepairs,
      });

      if (dryRun) continue;

      // New campaigns: translate + insert.
      const CHUNK = 6;
      for (let i = 0; i < newOnes.length; i += CHUNK) {
        const chunk = newOnes.slice(i, i + CHUNK).map(id => campaigns.get(id)!.rec);
        const fields: RecallFields[] = chunk.map(r => ({
          component: formatComponent(r.Component), summary: r.Summary ?? '',
          consequence: r.Consequence ?? '', remedy: r.Remedy ?? '',
        }));
        const translated = await translateChunk(fields);
        const ts = now();
        await dbBatch(chunk.map((r, j) => ({
          sql: `INSERT INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he,
                  component_en, summary_en, consequence_en, remedy_en, manufacturer, recall_year, first_seen_at, last_seen_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING`,
          params: [
            r.NHTSACampaignNumber, ours.make, ours.model, formatNhtsaDate(r.ReportReceivedDate),
            translated[j].component || fields[j].component, translated[j].summary || fields[j].summary,
            translated[j].consequence || fields[j].consequence, translated[j].remedy || fields[j].remedy,
            fields[j].component, fields[j].summary, fields[j].consequence, fields[j].remedy,
            r.Manufacturer ?? '', r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate ?? ''),
            ts, ts,
          ],
        })));
        totalNew += chunk.length;
      }

      // Links, date repairs and last_seen for every campaign seen this run.
      const ts = now();
      const stmts: { sql: string; params: (string | number | null)[] }[] = [];
      for (const id of ids) {
        stmts.push({
          sql: `INSERT INTO recalls_cache_models (id, make, model, model_years) VALUES (?, ?, ?, ?)
                ON CONFLICT(id, make, model) DO UPDATE SET model_years = excluded.model_years`,
          params: [id, ours.make, ours.model, [...campaigns.get(id)!.years].sort().join(',')],
        });
      }
      for (const d of dateRepairs) {
        stmts.push({ sql: 'UPDATE recalls_cache SET date = ? WHERE id = ?', params: [d.correct, d.id] });
      }
      if (ids.length) {
        stmts.push({
          sql: `UPDATE recalls_cache SET last_seen_at = ?, first_seen_at = COALESCE(first_seen_at, ?) WHERE id IN (${ids.map(() => '?').join(',')})`,
          params: [ts, ts, ...ids],
        });
      }
      for (let i = 0; i < stmts.length; i += 50) await dbBatch(stmts.slice(i, i + 50));
      totalLinks += newLinks.length;
      totalDateRepairs += dateRepairs.length;
    }

    const nextCursor = onlyModels.length ? null : (startIdx + processed) % Math.max(1, allModels.length);
    if (!dryRun && nextCursor != null) await setState(CURSOR_KEY, String(nextCursor));

    // ── UK DVSA (optional; only when DVSA_API_KEY is set) ──────────────────────
    const dvsaKey = process.env.DVSA_API_KEY;
    let dvsaNew = 0;
    if (dvsaKey && !dryRun) {
      const done = queue.slice(0, processed);
      for (const model of done) {
        const makeEn = makeNameMap[model.make_slug] || model.make_slug;
        let recalls: DvsaRecall[] = [];
        try {
          const url = `https://driver-vehicle-licensing.agency.gov.uk/vehicle-recalls-faults/v1/recalls?type=vehicle&make=${encodeURIComponent(makeEn.toUpperCase())}&model=${encodeURIComponent(model.name_en.toUpperCase())}`;
          const r = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': dvsaKey }, signal: AbortSignal.timeout(10000) });
          if (!r.ok) { failures.push(`DVSA ${model.make_slug}/${model.slug}: HTTP ${r.status}`); continue; }
          const data: unknown = await r.json();
          recalls = Array.isArray(data) ? data as DvsaRecall[] : [];
        } catch (e) {
          failures.push(`DVSA ${model.make_slug}/${model.slug}: ${String(e)}`);
          continue;
        }
        const ts = now();
        const stmts = recalls
          .map(rec => ({ rec, id: `DVSA-${rec.recallNumber ?? rec.recallId ?? ''}` }))
          .filter(x => x.id !== 'DVSA-')
          .flatMap(({ rec, id }) => {
            const launch = rec.launchDate ?? rec.recallDate ?? '';
            return [
              {
                sql: `INSERT INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he,
                        manufacturer, recall_year, component_en, summary_en, consequence_en, remedy_en, first_seen_at, last_seen_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DVSA', ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
                params: [id, makeEn.toLowerCase(), model.name_en.toLowerCase(), formatNhtsaDate(launch),
                  rec.defectType ?? rec.component ?? '', rec.concernDescription ?? rec.defectDescription ?? rec.summary ?? '',
                  rec.safetyRisk ?? rec.consequence ?? '', rec.remedy ?? '',
                  launch ? parseInt(launch.slice(0, 4)) || null : null,
                  rec.defectType ?? rec.component ?? '', rec.concernDescription ?? rec.defectDescription ?? rec.summary ?? '',
                  rec.safetyRisk ?? rec.consequence ?? '', rec.remedy ?? '', ts, ts] as (string | number | null)[],
              },
              {
                sql: 'INSERT OR IGNORE INTO recalls_cache_models (id, make, model) VALUES (?, ?, ?)',
                params: [id, makeEn.toLowerCase(), model.name_en.toLowerCase()] as (string | number | null)[],
              },
            ];
          });
        for (let i = 0; i < stmts.length; i += 50) await dbBatch(stmts.slice(i, i + 50));
        dvsaNew += stmts.length / 2;
      }
    }

    const status = failures.length ? 'partial' : 'ok';
    Object.assign(detail, {
      modelsProcessed: processed, totalModels: allModels.length, cursorFrom: startIdx, cursorTo: nextCursor,
      nhtsaFetches: fetches, newCampaigns: totalNew, newLinks: totalLinks, dateRepairs: totalDateRepairs,
      dvsaEnabled: !!dvsaKey, dvsaRows: dvsaNew, failures: failures.slice(0, 50), failureCount: failures.length,
      elapsedMs: Date.now() - started,
    });
    await finishRun(runId, status, detail);
    return NextResponse.json({ ok: true, status, ...detail, ...(dryRun || onlyModels.length ? { diffs } : {}) });
  } catch (err) {
    detail.error = String(err);
    detail.elapsedMs = Date.now() - started;
    await finishRun(runId, 'failed', detail);
    console.error('[refresh-recalls]', err);
    return NextResponse.json({ ok: false, ...detail }, { status: 500 });
  }
}
