/**
 * POST /api/car-3d/crash  { uid }
 *
 * Sent by lib/viewer3dGuard when a page load finds that the previous page's tab died
 * while this Sketchfab model was on screen. One report per model per visitor (hashed IP);
 * once CRASH_HIDE_THRESHOLD distinct visitors report the same model within 7 days, the
 * model is hidden site-wide (hidden=1) so it stops crashing pages.
 * Every new report emails the admin (ADMIN_NOTIFY_EMAIL, default contact@carissues.co.il).
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbFirst, dbRun } from '@/lib/db';
import { sendEmail } from '@/lib/sendEmail';

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
  const pages = await dbAll<{ make_slug: string; model_slug: string; sketchfab_name: string }>(
    'SELECT make_slug, model_slug, sketchfab_name FROM car_3d_models WHERE sketchfab_uid = ? AND hidden IS NOT 1', uid,
  );
  if (!pages.length) return NextResponse.json({ ok: true, skipped: 'unknown' });

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = await sha256(`car3d:${ip}:${process.env.CRON_SECRET ?? ''}`);

  try {
    const inserted = await dbRun(
      `INSERT INTO car_3d_crash_reports (sketchfab_uid, ip_hash, user_agent) VALUES (?, ?, ?)
       ON CONFLICT (sketchfab_uid, ip_hash) DO NOTHING`,
      uid, ipHash, ua.slice(0, 300) || null,
    );
    // Same visitor reporting the same model again: refresh the timestamp, no new email.
    if (!inserted.meta?.changes) {
      await dbRun(
        `UPDATE car_3d_crash_reports SET created_at = datetime('now'), user_agent = ? WHERE sketchfab_uid = ? AND ip_hash = ?`,
        ua.slice(0, 300) || null, uid, ipHash,
      );
      return NextResponse.json({ ok: true, repeat: true });
    }
    const reports = await dbFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM car_3d_crash_reports WHERE sketchfab_uid = ? AND created_at >= datetime('now', '-7 days')`,
      uid,
    );
    const count = reports?.n ?? 1;
    const autoHidden = count >= CRASH_HIDE_THRESHOLD;
    if (autoHidden) {
      await dbRun(
        `UPDATE car_3d_models SET hidden = 1, hidden_reason = ? WHERE sketchfab_uid = ? AND hidden IS NOT 1`,
        `auto: tab crash reported by ${count} visitors`, uid,
      );
      const g = globalThis as typeof globalThis & { _3dModelsCache?: unknown };
      delete g._3dModelsCache;
    }
    await notifyAdmin({ uid, pages, count, autoHidden, ua, country: req.headers.get('cf-ipcountry') });
    return NextResponse.json({ ok: true, hidden: autoHidden });
  } catch (err) {
    console.error('[car-3d/crash]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

async function notifyAdmin({ uid, pages, count, autoHidden, ua, country }: {
  uid: string;
  pages: { make_slug: string; model_slug: string; sketchfab_name: string }[];
  count: number; autoHidden: boolean; ua: string; country: string | null;
}) {
  const carList = pages.map(p => {
    const url = `https://carissues.co.il/cars/${p.make_slug}/${p.model_slug}`;
    return `<li><a href="${url}">${esc(`${p.make_slug}/${p.model_slug}`)}</a></li>`;
  }).join('');
  const status = autoHidden
    ? `<p style="color:#b00020;font-weight:bold">The model is now hidden site-wide (${count} visitors reported a crash within 7 days).</p>`
    : `<p>${count} of ${CRASH_HIDE_THRESHOLD} reports needed to hide it automatically. Visitors who crashed won't load it again.</p>`;
  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL || 'contact@carissues.co.il',
    subject: autoHidden
      ? `3D model auto-hidden after crashes: ${pages[0].make_slug}/${pages[0].model_slug}`
      : `3D model crash reported: ${pages[0].make_slug}/${pages[0].model_slug} (${count}/${CRASH_HIDE_THRESHOLD})`,
    html: `<div dir="ltr" style="font-family:Arial,sans-serif">
      <h2>A visitor's browser tab crashed while a 3D model was showing</h2>
      <p><b>Model:</b> <a href="https://sketchfab.com/3d-models/${uid}">${esc(pages[0].sketchfab_name)}</a> (${uid})</p>
      <p><b>Shown on:</b></p><ul>${carList}</ul>
      ${status}
      <p style="color:#666;font-size:12px"><b>Device:</b> ${esc(ua.slice(0, 200) || 'unknown')}${country ? ` · ${esc(country)}` : ''}</p>
      <p style="color:#666;font-size:12px">To hide it now: UPDATE car_3d_models SET hidden = 1 WHERE sketchfab_uid = '${uid}'</p>
    </div>`,
  });
}
