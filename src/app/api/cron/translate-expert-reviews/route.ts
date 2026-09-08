/**
 * GET /api/cron/translate-expert-reviews
 * Translates Hebrew pros/cons/summaries to English using Cloudflare Workers AI
 * (no API key needed — covered by the Workers Paid plan). Processes 5 rows
 * per call. Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';

export const dynamic = 'force-dynamic';

async function ai_translate(text: string): Promise<string> {
  const result = await runWorkersAI([
    { role: 'user', content: `Translate the following Hebrew text to natural English. Return only the translated text, nothing else.\n\n${text}` },
  ], { max_tokens: 600, temperature: 0.2 });
  return result?.trim() ?? '';
}

async function translateArray(jsonStr: string | null): Promise<string> {
  if (!jsonStr) return '[]';
  try {
    const arr: string[] = JSON.parse(jsonStr);
    if (!arr.length) return '[]';
    const out = await Promise.all(arr.map(s => ai_translate(s)));
    return JSON.stringify(out);
  } catch { return '[]'; }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await dbAll<{ id: string; pros: string | null; cons: string | null; local_summary_he: string | null; global_summary_he: string | null }>(
    `SELECT id, pros, cons, local_summary_he, global_summary_he FROM expert_reviews
     WHERE year IS NULL AND (local_summary_en IS NULL OR pros_en IS NULL) LIMIT 5`,
  );

  let done = 0;
  for (const row of rows) {
    const [prosEn, consEn, localEn, globalEn] = await Promise.all([
      translateArray(row.pros),
      translateArray(row.cons),
      row.local_summary_he ? ai_translate(row.local_summary_he) : Promise.resolve(null),
      row.global_summary_he ? ai_translate(row.global_summary_he) : Promise.resolve(null),
    ]);
    await dbRun(
      `UPDATE expert_reviews SET pros_en=?, cons_en=?, local_summary_en=?, global_summary_en=? WHERE id=?`,
      prosEn, consEn, localEn, globalEn, row.id,
    );
    done++;
  }

  const [{ c: remaining }] = await dbAll<{ c: number }>(
    `SELECT COUNT(*) as c FROM expert_reviews WHERE year IS NULL AND (local_summary_en IS NULL OR pros_en IS NULL)`,
  );
  return NextResponse.json({ ok: true, translated: done, remaining });
}
