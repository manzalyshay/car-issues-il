/**
 * POST /api/car-3d/crash  { uid }
 *
 * Sent by lib/viewer3dGuard when a page load finds that the previous page's tab died
 * while this Sketchfab model was on screen. One report per model per visitor (hashed IP);
 * once CRASH_HIDE_THRESHOLD distinct visitors report the same model within 7 days, the
 * model is hidden site-wide (hidden=1) so it stops crashing pages.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbFirst, dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CRASH_HIDE_THRESHOLD = 3;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  let uid: unknown;
  try { ({ uid } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (typeof uid !== 'string' || !/^[0-9a-f]{32}$/.test(uid)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ua = req.headers.get('user-agent') ?? '';
  if (BOT_UA.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' });

  // Only models we actually show can be reported.
  const known = await dbFirst<{ n: number }>(
    'SELECT COUNT(*) AS n FROM car_3d_models WHERE sketchfab_uid = ? AND hidden IS NOT 1', uid,
  );
  if (!known?.n) return NextResponse.json({ ok: true, skipped: 'unknown' });

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = await sha256(`car3d:${ip}:${process.env.CRON_SECRET ?? ''}`);

  try {
    await dbRun(
      `INSERT INTO car_3d_crash_reports (sketchfab_uid, ip_hash, user_agent) VALUES (?, ?, ?)
       ON CONFLICT (sketchfab_uid, ip_hash) DO UPDATE SET created_at = datetime('now'), user_agent = excluded.user_agent`,
      uid, ipHash, ua.slice(0, 300) || null,
    );
    const reports = await dbFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM car_3d_crash_reports WHERE sketchfab_uid = ? AND created_at >= datetime('now', '-7 days')`,
      uid,
    );
    if ((reports?.n ?? 0) >= CRASH_HIDE_THRESHOLD) {
      await dbRun(
        `UPDATE car_3d_models SET hidden = 1, hidden_reason = ? WHERE sketchfab_uid = ? AND hidden IS NOT 1`,
        `auto: tab crash reported by ${reports!.n} visitors`, uid,
      );
      const g = globalThis as typeof globalThis & { _3dModelsCache?: unknown };
      delete g._3dModelsCache;
      return NextResponse.json({ ok: true, hidden: true });
    }
  } catch (err) {
    console.error('[car-3d/crash]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
