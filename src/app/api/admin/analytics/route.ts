/**
 * GET /api/admin/analytics?days=7|28|90
 *
 * Combined analytics from:
 *   1. Cloudflare Zone Analytics (real HTTP traffic via GraphQL API)
 *   2. Google Analytics 4 (behavioral metrics via Data API)
 *   3. Google Search Console (organic search via Search Analytics API)
 *
 * Protected by admin auth.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';


// ── Date helpers ──────────────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Cloudflare Analytics (GraphQL) ────────────────────────────────────────────

async function getCFData(token: string, zoneTag: string, since: string, until: string) {
  const query = `{
    viewer {
      zones(filter: { zoneTag: "${zoneTag}" }) {
        daily: httpRequestsAdaptiveGroups(
          filter: { date_geq: "${since}", date_leq: "${until}" }
          limit: 90
          orderBy: [date_ASC]
        ) {
          sum { visits pageViews }
          dimensions { date }
        }
        byCountry: httpRequestsAdaptiveGroups(
          filter: { date_geq: "${since}", date_leq: "${until}" }
          limit: 15
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits pageViews }
          dimensions { clientCountryName }
        }
        byDevice: httpRequestsAdaptiveGroups(
          filter: { date_geq: "${since}", date_leq: "${until}" }
          limit: 5
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { deviceType }
        }
        byBrowser: httpRequestsAdaptiveGroups(
          filter: { date_geq: "${since}", date_leq: "${until}" }
          limit: 6
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { userAgentBrowser }
        }
        topPaths: httpRequestsAdaptiveGroups(
          filter: { date_geq: "${since}", date_leq: "${until}" }
          limit: 20
          orderBy: [sum_pageViews_DESC]
        ) {
          sum { visits pageViews }
          dimensions { clientRequestPath }
        }
      }
    }
  }`;

  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      data?: {
        viewer?: {
          zones?: {
            daily: { sum: { visits: number; pageViews: number }; dimensions: { date: string } }[];
            byCountry: { sum: { visits: number; pageViews: number }; dimensions: { clientCountryName: string } }[];
            byDevice: { sum: { visits: number }; dimensions: { deviceType: string } }[];
            byBrowser: { sum: { visits: number }; dimensions: { userAgentBrowser: string } }[];
            topPaths: { sum: { visits: number; pageViews: number }; dimensions: { clientRequestPath: string } }[];
          }[];
        };
      };
      errors?: { message: string }[];
    };
    const zone = json.data?.viewer?.zones?.[0];
    if (!zone) return null;

    const totalVisits = zone.daily.reduce((s, r) => s + r.sum.visits, 0);
    const totalPageViews = zone.daily.reduce((s, r) => s + r.sum.pageViews, 0);

    return {
      totals: { visits: totalVisits, pageViews: totalPageViews },
      daily: zone.daily.map(r => ({ date: r.dimensions.date, visits: r.sum.visits, pageViews: r.sum.pageViews })),
      countries: zone.byCountry.map(r => ({ name: r.dimensions.clientCountryName, visits: r.sum.visits, pageViews: r.sum.pageViews })),
      devices: zone.byDevice.map(r => ({ type: r.dimensions.deviceType, visits: r.sum.visits })),
      browsers: zone.byBrowser.map(r => ({ name: r.dimensions.userAgentBrowser, visits: r.sum.visits })),
      topPaths: zone.topPaths
        .filter(r => !r.dimensions.clientRequestPath.startsWith('/api') && !r.dimensions.clientRequestPath.startsWith('/_next'))
        .map(r => ({ path: r.dimensions.clientRequestPath, visits: r.sum.visits, pageViews: r.sum.pageViews })),
    };
  } catch {
    return null;
  }
}

// ── GA4 ───────────────────────────────────────────────────────────────────────

async function getGA4Token(): Promise<string | null> {
  const pem = process.env.GA4_PRIVATE_KEY;
  const email = process.env.GA4_CLIENT_EMAIL;
  if (!pem || !email) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const b64u = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64u(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
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

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '28')));
  const since = dateStr(days - 1);
  const until = dateStr(0);

  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneTag = process.env.CLOUDFLARE_ZONE_ID;
  const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '543980467';
  const GSC_SITE = 'sc-domain:carissues.co.il';

  const [ga4Token, gscToken] = await Promise.all([getGA4Token(), getGSCToken()]);

  async function ga4(body: object) {
    if (!ga4Token) return null;
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ga4Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }], ...body }),
    });
    return res.ok ? res.json() : null;
  }

  async function gsc(body: object) {
    if (!gscToken) return null;
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
      { method: 'POST', headers: { Authorization: `Bearer ${gscToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    return res.ok ? res.json() : null;
  }

  const gscStart = dateStr(28);
  const gscEnd = dateStr(1);

  const [cf, overview, pages, sources, daily, gscOverall, gscPages, gscQueries, gscOpps] = await Promise.all([
    cfToken && zoneTag ? getCFData(cfToken, zoneTag, since, until) : Promise.resolve(null),
    ga4({ metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }] }),
    ga4({ dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 }),
    ga4({ dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
    ga4({ dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 90 }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: [], rowLimit: 1 }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['page'], rowLimit: 20, orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }] }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['query'], rowLimit: 20, orderBy: [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }] }),
    gsc({ startDate: gscStart, endDate: gscEnd, dimensions: ['page'], rowLimit: 500 }),
  ]);

  const opps = ((gscOpps as { rows?: { keys: string[]; impressions: number; clicks: number; ctr: number; position: number }[] })?.rows ?? [])
    .filter(r => r.impressions > 50 && r.ctr < 0.04)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(r => ({ page: r.keys[0].replace('https://carissues.co.il', ''), impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position }));

  return NextResponse.json({
    days,
    cf,
    ga4: { overview, pages, sources, daily },
    gsc: { overall: gscOverall, pages: gscPages, queries: gscQueries, opportunities: opps },
  });
}
