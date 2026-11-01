/**
 * POST /api/vehicle-lookup/log
 *
 * Records one vehicle-lookup search: plate, whether it was found, and who searched -
 * IP, Cloudflare geolocation (country/region/city/coordinates), device and browser.
 * Called by the lookup page after results are shown, so it captures every search even
 * when the lookup result itself is served from the CDN cache.
 *
 * Personal data: rows are deleted after RETENTION_DAYS (see privacy policy).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 90;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram/i;

function parseUa(ua: string) {
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'mobile' : 'desktop';
  const os = /iphone|ipad|ios/i.test(ua) ? 'iOS'
    : /android/i.test(ua) ? 'Android'
    : /windows/i.test(ua) ? 'Windows'
    : /mac os x|macintosh/i.test(ua) ? 'macOS'
    : /linux/i.test(ua) ? 'Linux' : 'other';
  const browser = /edg\//i.test(ua) ? 'Edge'
    : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
    : /opr\/|opera/i.test(ua) ? 'Opera'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /crios|chrome/i.test(ua) ? 'Chrome'
    : /safari/i.test(ua) ? 'Safari' : 'other';
  return { device, os, browser };
}

interface CfProps {
  country?: string; region?: string; city?: string;
  latitude?: string; longitude?: string; timezone?: string; asOrganization?: string;
}

export async function POST(req: NextRequest) {
  let body: { plate?: unknown; found?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const rawPlate = typeof body.plate === 'string' ? body.plate : '';
  const plate = rawPlate.replace(/[\s-]/g, '').toUpperCase();
  // Israeli plates: 5-8 digits; UK: 2-8 letters/digits. Anything else isn't a real search.
  const kind = /^\d{5,8}$/.test(plate) ? 'il' : /^[A-Z0-9]{2,8}$/.test(plate) ? 'uk' : null;
  if (!kind) return NextResponse.json({ ok: false }, { status: 400 });

  const ua = req.headers.get('user-agent') ?? '';
  if (BOT_UA.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' });

  let cf: CfProps = {};
  try { cf = ((await getCloudflareContext({ async: true })).cf ?? {}) as CfProps; } catch { /* not on Workers (dev) */ }

  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const { device, os, browser } = parseUa(ua);
  const host = req.headers.get('host') ?? '';

  try {
    await dbRun(
      `INSERT INTO vehicle_lookup_log
        (plate, country_kind, found, ip, country, region, city, latitude, longitude, timezone, asn_org,
         device, os, browser, user_agent, referer, lang, site)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plate, kind, body.found === true ? 1 : body.found === false ? 0 : null,
      ip, cf.country ?? req.headers.get('cf-ipcountry'), cf.region ?? null, cf.city ?? null,
      cf.latitude ?? null, cf.longitude ?? null, cf.timezone ?? null, cf.asOrganization ?? null,
      device, os, browser, ua.slice(0, 400), (req.headers.get('referer') ?? '').slice(0, 300) || null,
      (req.headers.get('accept-language') ?? '').slice(0, 40) || null,
      host.includes('carissues.net') ? 'en' : 'he',
    );
    // Retention: occasionally purge rows older than RETENTION_DAYS (cheap, indexed on created_at)
    if (Math.random() < 0.02) {
      await dbRun(`DELETE FROM vehicle_lookup_log WHERE created_at < datetime('now', ?)`, `-${RETENTION_DAYS} days`);
    }
  } catch (err) {
    console.error('[vehicle-lookup/log]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
