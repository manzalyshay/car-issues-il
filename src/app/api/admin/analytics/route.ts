/**
 * GET /api/admin/analytics?days=7
 * Returns GA4 + GSC data for the admin analytics dashboard.
 * Protected by admin auth (Supabase JWT or ADMIN_SECRET).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';

async function getGA4Token(): Promise<string | null> {
  const pem = process.env.GA4_PRIVATE_KEY;
  const email = process.env.GA4_CLIENT_EMAIL;
  if (!pem || !email) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const b64u = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64u(JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    }));
    const sigInput = `${header}.${claim}`;
    const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${sigInput}.${sigB64}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch { return null; }
}

async function getGSCToken(): Promise<string | null> {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refreshToken = process.env.GSC_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch { return null; }
}

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '7')));
  const [ga4Token, gscToken] = await Promise.all([getGA4Token(), getGSCToken()]);

  const PROPERTY = process.env.GA4_PROPERTY_ID ?? '543980467';
  const SITE = 'sc-domain:carissues.co.il';

  async function ga4(body: object) {
    if (!ga4Token) return null;
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ga4Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }], ...body }),
    });
    return res.ok ? res.json() : null;
  }

  async function gsc(body: object) {
    if (!gscToken) return null;
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
      { method: 'POST', headers: { Authorization: `Bearer ${gscToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    return res.ok ? res.json() : null;
  }

  const gscStart = daysAgo(28);
  const gscEnd = daysAgo(1);

  const [overview, pages, sources, daily, gscOverall, gscPages, gscQueries, gscOpps] = await Promise.all([
    ga4({ metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }] }),
    ga4({ dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 }),
    ga4({ dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
    ga4({ dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 90 }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: [], rowLimit: 1 }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['page'], rowLimit: 20, orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }] }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['query'], rowLimit: 20, orderBy: [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }] }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['page'], rowLimit: 500 }),
  ]);

  // Compute opportunities: high impressions, low CTR, not already in top
  const opps = ((gscOpps as { rows?: { keys: string[]; impressions: number; clicks: number; ctr: number; position: number }[] })?.rows ?? [])
    .filter(r => r.impressions > 50 && r.ctr < 0.04)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(r => ({ page: r.keys[0].replace('https://carissues.co.il', ''), impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position }));

  return NextResponse.json({
    days,
    ga4: { overview, pages, sources, daily },
    gsc: { overall: gscOverall, pages: gscPages, queries: gscQueries, opportunities: opps },
  });
}
