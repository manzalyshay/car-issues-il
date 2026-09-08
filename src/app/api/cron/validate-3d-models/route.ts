/**
 * GET /api/cron/validate-3d-models
 *
 * Checks each entry in car_3d_models against the Sketchfab public API.
 * Marks deleted/private models as hidden=1.
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';

const BATCH_DELAY_MS = 200; // polite delay between Sketchfab requests
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function checkModel(uid: string): Promise<'ok' | 'deleted' | 'error'> {
  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}`, {
      headers: { 'User-Agent': 'CarIssues-Bot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404 || res.status === 410) return 'deleted';
    if (res.ok) return 'ok';
    return 'error';
  } catch {
    return 'error';
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const models = await dbAll<{ make_slug: string; model_slug: string; sketchfab_uid: string }>(
    'SELECT make_slug, model_slug, sketchfab_uid FROM car_3d_models WHERE hidden IS NOT 1',
  );

  const results = { checked: 0, hidden: 0, errors: 0, deleted: [] as string[] };

  for (const m of models) {
    const status = await checkModel(m.sketchfab_uid);
    results.checked++;
    if (status === 'deleted') {
      await dbRun(
        'UPDATE car_3d_models SET hidden=1 WHERE make_slug=? AND model_slug=?',
        m.make_slug, m.model_slug,
      );
      results.hidden++;
      results.deleted.push(`${m.make_slug}/${m.model_slug}`);
    } else if (status === 'error') {
      results.errors++;
    }
    await sleep(BATCH_DELAY_MS);
  }

  return NextResponse.json({ ok: true, ...results });
}
