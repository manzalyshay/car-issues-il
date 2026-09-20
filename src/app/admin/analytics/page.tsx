'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Days = 7 | 28 | 90;

interface AnalyticsData {
  days: number;
  ga4: {
    overview: { rows: { metricValues: { value: string }[] }[] } | null;
    pages: { rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] } | null;
    sources: { rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] } | null;
    daily: { rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] } | null;
  };
  gsc: {
    overall: { rows?: { clicks: number; impressions: number; ctr: number; position: number }[] } | null;
    pages: { rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] } | null;
    queries: { rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] } | null;
    opportunities: { page: string; impressions: number; clicks: number; ctr: number; position: number }[];
  };
}

function Card({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', minWidth: 0 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: color ?? 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ rows }: { rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] | undefined }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map(r => parseInt(r.metricValues[0].value)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60, marginTop: 8 }}>
      {rows.map((r, i) => {
        const val = parseInt(r.metricValues[0].value);
        const date = r.dimensionValues[0].value;
        const label = `${date.slice(4, 6)}/${date.slice(6, 8)}`;
        const pct = max ? (val / max) * 100 : 0;
        return (
          <div key={i} title={`${label}: ${val} users`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', height: `${pct}%`, background: 'var(--accent)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
          </div>
        );
      })}
    </div>
  );
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function pos(v: number) { return v.toFixed(1); }
function dur(secs: number) { return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`; }

export default function AnalyticsDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const [days, setDays] = useState<Days>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(d: Days) {
    setFetching(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`/api/admin/analytics?days=${d}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && isAdmin) load(days);
  }, [loading, isAdmin, days]);

  if (loading || fetching) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {fetching ? 'Loading analytics...' : 'Checking auth...'}
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Admin access required</div>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>← Go home</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
        Error: {error}
      </div>
    );
  }

  const ga4m = data?.ga4.overview?.rows?.[0]?.metricValues;
  const gscTot = data?.gsc.overall?.rows?.[0];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Analytics Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {([7, 28, 90] as Days[]).map(d => (
              <button key={d}
                onClick={() => { setDays(d); }}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: days === d ? 'var(--accent)' : 'var(--surface)',
                  color: days === d ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                }}
              >{d === 7 ? '7 days' : d === 28 ? '28 days' : '90 days'}</button>
            ))}
            <button onClick={() => load(days)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>↻ Refresh</button>
            <Link href="/admin" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>← Admin</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>

        {/* ── GA4 Section ── */}
        <div style={{ marginBottom: 10, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Google Analytics — last {days} days
        </div>

        {/* GA4 Overview cards */}
        {ga4m ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Card label="Users" value={parseInt(ga4m[0].value).toLocaleString()} color="var(--accent)" />
            <Card label="Sessions" value={parseInt(ga4m[1].value).toLocaleString()} />
            <Card label="Page Views" value={parseInt(ga4m[2].value).toLocaleString()} />
            <Card label="Bounce Rate" value={pct(parseFloat(ga4m[3].value))} sub="lower is better" />
            <Card label="Avg Session" value={dur(parseFloat(ga4m[4].value))} sub="min:sec" />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.875rem' }}>GA4 data unavailable</div>
        )}

        {/* Daily chart + sources side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Daily users chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>Daily Users</div>
            <MiniBar rows={data?.ga4.daily?.rows} />
            {data?.ga4.daily?.rows && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{data.ga4.daily.rows[0]?.dimensionValues[0].value.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</span>
                <span>{data.ga4.daily.rows[data.ga4.daily.rows.length - 1]?.dimensionValues[0].value.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</span>
              </div>
            )}
          </div>

          {/* Traffic sources */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 12 }}>Traffic Sources</div>
            {data?.ga4.sources?.rows?.map(r => {
              const name = r.dimensionValues[0].value;
              const sessions = parseInt(r.metricValues[0].value);
              const total = data.ga4.sources?.rows?.reduce((s, x) => s + parseInt(x.metricValues[0].value), 0) ?? 1;
              const pctVal = ((sessions / total) * 100).toFixed(0);
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, flexShrink: 0 }}>
                    <div style={{ width: `${pctVal}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', width: 32, textAlign: 'right' }}>{sessions}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GA4 Top pages */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 16 }}>Top Pages (GA4 views)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Page</th>
                <th style={{ textAlign: 'right', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Views</th>
              </tr>
            </thead>
            <tbody>
              {data?.ga4.pages?.rows?.map(r => (
                <tr key={r.dimensionValues[0].value} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 0', color: 'var(--text)', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={`https://carissues.co.il${r.dimensionValues[0].value}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {r.dimensionValues[0].value}
                    </a>
                  </td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 700 }}>{r.metricValues[0].value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── GSC Section ── */}
        <div style={{ marginBottom: 10, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Google Search Console — last 28 days
        </div>

        {gscTot ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Card label="Clicks" value={gscTot.clicks.toLocaleString()} color="var(--accent)" />
            <Card label="Impressions" value={gscTot.impressions.toLocaleString()} />
            <Card label="CTR" value={pct(gscTot.ctr)} sub="click-through rate" />
            <Card label="Avg Position" value={pos(gscTot.position)} sub="lower is better" />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.875rem' }}>GSC data unavailable</div>
        )}

        {/* GSC top pages + queries side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Top pages */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 12 }}>Top Pages by Clicks</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Page</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Clicks</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Pos</th>
                </tr>
              </thead>
              <tbody>
                {data?.gsc.pages?.rows?.map(r => (
                  <tr key={r.keys[0]} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={r.keys[0]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {r.keys[0].replace('https://carissues.co.il', '') || '/'}
                      </a>
                    </td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700 }}>{r.clicks}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: r.position <= 3 ? '#16a34a' : r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>{pos(r.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top queries */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 12 }}>Top Search Queries</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Query</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Impr</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Pos</th>
                </tr>
              </thead>
              <tbody>
                {data?.gsc.queries?.rows?.map(r => (
                  <tr key={r.keys[0]} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl' }}>{r.keys[0]}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700 }}>{r.impressions}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: r.position <= 3 ? '#16a34a' : r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>{pos(r.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEO Opportunities */}
        {(data?.gsc.opportunities?.length ?? 0) > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>SEO Opportunities</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>High impressions, low CTR — pages that could get more clicks with better titles/content</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Page</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Impr</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>CTR</th>
                  <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>Pos</th>
                </tr>
              </thead>
              <tbody>
                {data?.gsc.opportunities?.map(r => (
                  <tr key={r.page} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={`https://carissues.co.il${r.page}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{r.page}</a>
                    </td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700 }}>{r.impressions}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: '#dc2626' }}>{pct(r.ctr)}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', color: r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>{pos(r.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
