/**
 * GET /api/cron/sync-israeli-recalls
 *
 * Daily sync of Israeli manufacturer recall notices ("הודעות יצרני הרכב RECALL",
 * data.gov.il resource 2c33523f-87aa-44ec-a736-edbb0a82975e) into D1 `recalls_il`.
 * Called by the Cloudflare Cron Trigger (worker-entry.js). Protected by CRON_SECRET.
 *
 * Safety checks before anything is written:
 *  - every CKAN page must report success and the expected field set,
 *  - the rows fetched must equal the source's own `total`, with unique RECALL_IDs,
 *  - the source must not have shrunk by more than 5% versus what we hold.
 * Only new or changed rows are written; rows missing from the source are counted
 * and reported, never deleted. Every run is recorded in `cron_runs`.
 *
 * Query param: dryRun=1 → fetch + compare only, no writes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch } from '@/lib/db';
import { normalizeForMatch } from '@/lib/israeliRecallsDb';
import { startRun, finishRun, runTrigger } from '@/lib/cronRuns';

const JOB = 'sync-israeli-recalls';
const RESOURCE_ID = '2c33523f-87aa-44ec-a736-edbb0a82975e';
const PAGE = 1000;
const REQUIRED_FIELDS = ['RECALL_ID', 'TOZAR_TEUR', 'DEGEM', 'SHNAT_RECALL', 'BUILD_BEGIN_A', 'BUILD_END_A',
  'SUG_RECALL', 'SUG_TAKALA', 'TEUR_TAKALA', 'OFEN_TIKUN', 'YEVUAN_TEUR', 'TELEPHONE', 'WEBSITE'];

interface CkanRecord {
  RECALL_ID: number; TOZAR_TEUR: string | null; DEGEM: string | null; SHNAT_RECALL: number | null;
  BUILD_BEGIN_A: string | null; BUILD_END_A: string | null; SUG_RECALL: string | null; SUG_TAKALA: string | null;
  TEUR_TAKALA: string | null; OFEN_TIKUN: string | null; YEVUAN_TEUR: string | null; TELEPHONE: string | null; WEBSITE: string | null;
}

type Row = {
  id: string; recall_id: number; make: string; make_raw: string | null; degem: string | null; recall_year: number | null;
  build_begin: string | null; build_end: string | null; recall_type: string | null; fault_type: string | null;
  fault_description: string | null; fix_method: string | null; importer: string | null; phone: string | null; website: string | null;
};
const COLS: (keyof Row)[] = ['id', 'recall_id', 'make', 'make_raw', 'degem', 'recall_year', 'build_begin', 'build_end',
  'recall_type', 'fault_type', 'fault_description', 'fix_method', 'importer', 'phone', 'website'];

const trimOrNull = (v: unknown) => (v == null ? null : String(v).trim() || null);
const dateOnly = (v: unknown) => { const s = trimOrNull(v); return s ? s.slice(0, 10) : null; };

function toRow(r: CkanRecord): Row {
  return {
    id: `IL-${r.RECALL_ID}`,
    recall_id: Number(r.RECALL_ID),
    make: normalizeForMatch(r.TOZAR_TEUR ?? ''),
    make_raw: trimOrNull(r.TOZAR_TEUR),
    degem: trimOrNull(r.DEGEM),
    recall_year: r.SHNAT_RECALL == null ? null : Number(r.SHNAT_RECALL),
    build_begin: dateOnly(r.BUILD_BEGIN_A),
    build_end: dateOnly(r.BUILD_END_A),
    recall_type: trimOrNull(r.SUG_RECALL),
    fault_type: trimOrNull(r.SUG_TAKALA),
    fault_description: trimOrNull(r.TEUR_TAKALA),
    fix_method: trimOrNull(r.OFEN_TIKUN),
    importer: trimOrNull(r.YEVUAN_TEUR),
    phone: trimOrNull(r.TELEPHONE),
    website: trimOrNull(r.WEBSITE),
  };
}

async function fetchAll(): Promise<{ total: number; records: CkanRecord[] }> {
  const records: CkanRecord[] = [];
  let total = -1;
  for (let offset = 0; offset < 200000; offset += PAGE) {
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`CKAN HTTP ${res.status} at offset ${offset}`);
    const body = await res.json() as { success?: boolean; result?: { total?: number; fields?: { id: string }[]; records?: CkanRecord[] } };
    if (!body.success || !body.result) throw new Error(`CKAN success=false at offset ${offset}`);
    const fields = new Set((body.result.fields ?? []).map(f => f.id));
    const missing = REQUIRED_FIELDS.filter(f => !fields.has(f));
    if (missing.length) throw new Error(`CKAN schema changed: missing ${missing.join(', ')}`);
    if (typeof body.result.total !== 'number') throw new Error('CKAN response has no total');
    total = body.result.total;
    const page = body.result.records ?? [];
    records.push(...page);
    if (page.length === 0 || records.length >= total) break;
  }
  return { total, records };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const started = Date.now();
  const runId = dryRun ? null : await startRun(JOB, runTrigger(req));
  const detail: Record<string, unknown> = { dryRun };

  try {
    const { total, records } = await fetchAll();
    const ids = new Set(records.map(r => r.RECALL_ID));
    detail.sourceTotal = total;
    detail.fetched = records.length;
    detail.uniqueIds = ids.size;
    if (records.length !== total) throw new Error(`incomplete fetch: got ${records.length} of ${total}`);
    if (ids.size !== records.length) throw new Error(`duplicate RECALL_IDs in source (${records.length - ids.size})`);

    const existing = await dbAll<Row>(`SELECT ${COLS.join(', ')} FROM recalls_il`);
    detail.storedBefore = existing.length;
    if (existing.length > 0 && total < existing.length * 0.95) {
      throw new Error(`source shrank from ${existing.length} to ${total} rows; refusing to sync`);
    }

    const byId = new Map(existing.map(r => [r.id, r]));
    const incoming = records.map(toRow);
    const changed: Row[] = [];
    let added = 0;
    for (const row of incoming) {
      const cur = byId.get(row.id);
      if (!cur) { changed.push(row); added++; continue; }
      if (COLS.some(c => (cur[c] ?? null) !== (row[c] ?? null))) changed.push(row);
    }
    const incomingIds = new Set(incoming.map(r => r.id));
    const missingFromSource = existing.filter(r => !incomingIds.has(r.id)).map(r => r.id);
    const byYear: Record<string, number> = {};
    for (const r of incoming) byYear[String(r.recall_year ?? 'null')] = (byYear[String(r.recall_year ?? 'null')] ?? 0) + 1;

    Object.assign(detail, {
      added, updated: changed.length - added, missingFromSource: missingFromSource.slice(0, 50),
      missingFromSourceCount: missingFromSource.length,
      maxRecallId: Math.max(...incoming.map(r => r.recall_id)),
      newestYearCounts: Object.fromEntries(Object.entries(byYear).sort().slice(-3)),
      changedIds: changed.slice(0, 50).map(r => r.id),
    });

    if (!dryRun) {
      const placeholders = COLS.map(() => '?').join(', ');
      const updates = COLS.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
      const stmts = changed.map(r => ({
        sql: `INSERT INTO recalls_il (${COLS.join(', ')}, synced_at) VALUES (${placeholders}, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET ${updates}, synced_at = excluded.synced_at`,
        params: COLS.map(c => r[c] as string | number | null),
      }));
      for (let i = 0; i < stmts.length; i += 50) await dbBatch(stmts.slice(i, i + 50));
      // Stamp the whole confirmed set in one statement so freshness is visible per row.
      await dbBatch([{ sql: `UPDATE recalls_il SET synced_at = datetime('now') WHERE synced_at IS NULL OR synced_at < datetime('now', '-1 hour')`, params: [] }]);
    }

    detail.elapsedMs = Date.now() - started;
    const status = missingFromSource.length ? 'partial' : 'ok';
    await finishRun(runId, status, detail);
    return NextResponse.json({ ok: true, status, ...detail });
  } catch (err) {
    detail.error = String(err);
    detail.elapsedMs = Date.now() - started;
    await finishRun(runId, 'failed', detail);
    console.error('[sync-israeli-recalls]', err);
    return NextResponse.json({ ok: false, ...detail }, { status: 500 });
  }
}
