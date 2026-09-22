'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Days = 7 | 28 | 90;

// ── Data types ────────────────────────────────────────────────────────────────

interface CFData {
  totals: { visits: number; pageViews: number };
  daily: { date: string; visits: number; pageViews: number }[];
  countries: { name: string; visits: number; pageViews: number }[];
  devices: { type: string; visits: number }[];
  browsers: { name: string; visits: number }[];
  topPaths: { path: string; visits: number; pageViews: number }[];
}

interface AnalyticsData {
  days: number;
  cf: CFData | null;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(n: number) { return n.toLocaleString('he-IL'); }
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function pos(v: number) { return v.toFixed(1); }
function dur(secs: number) { return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`; }

function dateLabel(iso: string) {
  const [, m, d] = iso.split('-');
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function countryFlag(name: string): string {
  const map: Record<string, string> = {
    'Israel': '🇮🇱', 'United States': '🇺🇸', 'Germany': '🇩🇪', 'United Kingdom': '🇬🇧',
    'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Poland': '🇵🇱', 'Canada': '🇨🇦',
    'Australia': '🇦🇺', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Brazil': '🇧🇷',
    'India': '🇮🇳', 'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Turkey': '🇹🇷',
    'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Belgium': '🇧🇪', 'Austria': '🇦🇹',
    'Romania': '🇷🇴', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Greece': '🇬🇷',
    'Singapore': '🇸🇬', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'China': '🇨🇳',
    'Mexico': '🇲🇽', 'Argentina': '🇦🇷', 'South Africa': '🇿🇦', 'Egypt': '🇪🇬',
    'Jordan': '🇯🇴', 'Lebanon': '🇱🇧', 'United Arab Emirates': '🇦🇪',
  };
  return map[name] ?? '🌍';
}

function deviceLabel(type: string): string {
  const map: Record<string, string> = {
    desktop: 'מחשב', mobile: 'נייד', tablet: 'טאבלט',
  };
  return map[type?.toLowerCase()] ?? type ?? 'אחר';
}

function deviceIcon(type: string): string {
  const map: Record<string, string> = { desktop: '🖥', mobile: '📱', tablet: '📱' };
  return map[type?.toLowerCase()] ?? '💻';
}

function sourceLabel(src: string): string {
  const map: Record<string, string> = {
    'Organic Search': 'חיפוש אורגני', 'Direct': 'ישיר', 'Organic Social': 'רשתות חברתיות',
    'Referral': 'הפניה', 'Paid Search': 'פרסום ממומן', 'Email': 'אימייל',
    'Display': 'דיספליי', 'Unassigned': 'לא מוגדר',
  };
  return map[src] ?? src;
}

// ── Shared components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 40 }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: '18px 22px', minWidth: 0 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: accent ? 'var(--brand-red)' : 'var(--text)', lineHeight: 1 }}>{typeof value === 'number' ? num(value) : value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function MiniBarChart({ data, getDate, getVal, color = 'var(--brand-red)' }: {
  data: unknown[];
  getDate: (r: unknown) => string;
  getVal: (r: unknown) => number;
  color?: string;
}) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(getVal), 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {data.map((r, i) => {
          const val = getVal(r);
          const date = getDate(r);
          const h = Math.max((val / max) * 100, val > 0 ? 3 : 1);
          const isToday = date === today;
          return (
            <div key={date + i} title={`${dateLabel(date)}: ${num(val)}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: `${h}%`, background: isToday ? color : `${color}66`, borderRadius: '3px 3px 0 0', minHeight: 2 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>
        <span>{dateLabel(getDate(data[0]))}</span>
        <span>{dateLabel(getDate(data[data.length - 1]))}</span>
      </div>
    </div>
  );
}

function EmptySection({ msg }: { msg: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      {msg}
    </div>
  );
}

// ── Cloudflare section ────────────────────────────────────────────────────────

function CFSection({ cf, days }: { cf: CFData | null; days: number }) {
  if (!cf) return <EmptySection msg="נתוני Cloudflare לא זמינים — וודא ש-CLOUDFLARE_API_TOKEN ו-CLOUDFLARE_ZONE_ID מוגדרים" />;

  const totalVisits = cf.totals.visits;
  const totalPageViews = cf.totals.pageViews;
  const avgPerVisit = totalVisits ? +(totalPageViews / totalVisits).toFixed(1) : 0;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="צפיות דפים" value={totalPageViews} accent />
        <KpiCard label="ביקורים" value={totalVisits} sub={`${days} ימים אחרונים`} />
        <KpiCard label="עמודים לביקור" value={avgPerVisit} />
      </div>

      {/* Daily chart */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>גרף יומי — צפיות דפים</div>
        <MiniBarChart
          data={cf.daily}
          getDate={r => (r as { date: string }).date}
          getVal={r => (r as { pageViews: number }).pageViews}
        />
      </div>

      {/* Countries + Devices side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>מדינות מובילות</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {cf.countries.slice(0, 8).map((c, i) => {
              const pctVal = totalVisits ? Math.round((c.visits / totalVisits) * 100) : 0;
              return (
                <div key={c.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem', width: 22, flexShrink: 0 }}>{countryFlag(c.name)}</span>
                  <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                    <div style={{ width: `${pctVal}%`, height: '100%', background: 'var(--brand-red)', borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 40, textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{num(c.visits)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>מכשירים ודפדפנים</div>
          {cf.devices.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>מכשירים</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {cf.devices.map((d, i) => {
                  const pctVal = totalVisits ? Math.round((d.visits / totalVisits) * 100) : 0;
                  return (
                    <div key={d.type + i} style={{ textAlign: 'center', minWidth: 64 }}>
                      <div style={{ fontSize: '1.5rem' }}>{deviceIcon(d.type)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{deviceLabel(d.type)}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{pctVal}%</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {cf.browsers.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>דפדפנים</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cf.browsers.slice(0, 5).map((b, i) => {
                  const pctVal = totalVisits ? Math.round((b.visits / totalVisits) * 100) : 0;
                  return (
                    <div key={b.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                      <div style={{ width: 50, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ width: `${pctVal}%`, height: '100%', background: 'var(--brand-red)', borderRadius: 3 }} />
                      </div>
                      <div style={{ width: 36, textAlign: 'left', fontWeight: 700, fontSize: '0.75rem' }}>{pctVal}%</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top pages */}
      {cf.topPaths.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>עמודים מובילים — Cloudflare</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'right', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600 }}>נתיב</th>
                <th style={{ textAlign: 'left', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600, width: 80 }}>צפיות</th>
                <th style={{ textAlign: 'left', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600, width: 80 }}>ביקורים</th>
              </tr>
            </thead>
            <tbody>
              {cf.topPaths.slice(0, 15).map((p, i) => (
                <tr key={p.path + i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={`https://carissues.co.il${p.path}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}>{p.path}</a>
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'left', fontWeight: 700 }}>{num(p.pageViews)}</td>
                  <td style={{ padding: '6px 0', textAlign: 'left', color: 'var(--text-muted)' }}>{num(p.visits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── GA4 section ───────────────────────────────────────────────────────────────

function GA4Section({ ga4, days }: { ga4: AnalyticsData['ga4']; days: number }) {
  const m = ga4.overview?.rows?.[0]?.metricValues;
  if (!m) return <EmptySection msg="נתוני Google Analytics לא זמינים — GA4_PRIVATE_KEY ו-GA4_CLIENT_EMAIL לא מוגדרים" />;

  const users = parseInt(m[0].value);
  const sessions = parseInt(m[1].value);
  const pageViews = parseInt(m[2].value);
  const bounceRate = parseFloat(m[3].value);
  const avgDuration = parseFloat(m[4].value);

  const ga4Daily = ga4.daily?.rows ?? [];
  const ga4DailyForChart = ga4Daily.map(r => ({
    date: `${r.dimensionValues[0].value.slice(0, 4)}-${r.dimensionValues[0].value.slice(4, 6)}-${r.dimensionValues[0].value.slice(6, 8)}`,
    val: parseInt(r.metricValues[0].value),
  }));

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="משתמשים פעילים" value={users} accent sub={`${days} ימים`} />
        <KpiCard label="סשנים" value={sessions} />
        <KpiCard label="צפיות עמוד" value={pageViews} />
        <KpiCard label="שיעור נטישה" value={pct(bounceRate)} sub="נמוך = טוב יותר" />
        <KpiCard label="משך ממוצע" value={dur(avgDuration)} sub="דקות:שניות" />
      </div>

      {/* Chart + sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>משתמשים פעילים יומיים</div>
          <MiniBarChart
            data={ga4DailyForChart}
            getDate={r => (r as { date: string }).date}
            getVal={r => (r as { val: number }).val}
            color="var(--accent)"
          />
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>מקורות תנועה</div>
          {ga4.sources?.rows?.map((r, i) => {
            const name = r.dimensionValues[0].value;
            const sessions2 = parseInt(r.metricValues[0].value);
            const total = ga4.sources?.rows?.reduce((s, x) => s + parseInt(x.metricValues[0].value), 0) ?? 1;
            const pctVal = Math.round((sessions2 / total) * 100);
            return (
              <div key={name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sourceLabel(name)}
                </div>
                <div style={{ width: 70, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${pctVal}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                </div>
                <div style={{ width: 36, fontWeight: 700, fontSize: '0.75rem', textAlign: 'left' }}>{sessions2}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top pages */}
      {ga4.pages?.rows && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>עמודים מובילים — Google Analytics</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'right', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600 }}>עמוד</th>
                <th style={{ textAlign: 'left', padding: '0 0 8px', color: 'var(--text-muted)', fontWeight: 600, width: 80 }}>צפיות</th>
              </tr>
            </thead>
            <tbody>
              {ga4.pages.rows.map((r, i) => {
                const path = r.dimensionValues[0].value;
                return (
                  <tr key={path + i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={`https://carissues.co.il${path}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}>{path}</a>
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'left', fontWeight: 700 }}>{r.metricValues[0].value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── GSC section ───────────────────────────────────────────────────────────────

function GSCSection({ gsc }: { gsc: AnalyticsData['gsc'] }) {
  const tot = gsc.overall?.rows?.[0];
  if (!tot) return <EmptySection msg="נתוני Google Search Console לא זמינים — GSC_CLIENT_ID, GSC_CLIENT_SECRET ו-GSC_REFRESH_TOKEN לא מוגדרים" />;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="קליקים" value={tot.clicks} accent sub="28 ימים" />
        <KpiCard label="חשיפות" value={tot.impressions} sub="הופעות בחיפוש" />
        <KpiCard label="CTR" value={pct(tot.ctr)} sub="שיעור לחיצה" />
        <KpiCard label="דירוג ממוצע" value={pos(tot.position)} sub="מיקום בגוגל" />
      </div>

      {/* Pages + Queries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>עמודים מובילים — לפי קליקים</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>עמוד</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 48 }}>קליקים</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 40 }}>דירוג</th>
              </tr>
            </thead>
            <tbody>
              {gsc.pages?.rows?.map((r, i) => (
                <tr key={r.keys[0] + i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={r.keys[0]} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {r.keys[0].replace('https://carissues.co.il', '') || '/'}
                    </a>
                  </td>
                  <td style={{ padding: '5px 0', textAlign: 'left', fontWeight: 700 }}>{r.clicks}</td>
                  <td style={{ padding: '5px 0', textAlign: 'left', color: r.position <= 3 ? '#16a34a' : r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>
                    {pos(r.position)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 14 }}>שאילתות חיפוש מובילות</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>שאילתה</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 48 }}>חשיפות</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 40 }}>דירוג</th>
              </tr>
            </thead>
            <tbody>
              {gsc.queries?.rows?.map((r, i) => (
                <tr key={r.keys[0] + i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', direction: 'rtl', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.keys[0]}
                  </td>
                  <td style={{ padding: '5px 0', textAlign: 'left', fontWeight: 700 }}>{r.impressions}</td>
                  <td style={{ padding: '5px 0', textAlign: 'left', color: r.position <= 3 ? '#16a34a' : r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>
                    {pos(r.position)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEO opportunities */}
      {(gsc.opportunities?.length ?? 0) > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>הזדמנויות SEO</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            חשיפות גבוהות, CTR נמוך — עמודים שיכולים לקבל יותר קליקים עם כותרות/תוכן משופרים
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'right', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>עמוד</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 60 }}>חשיפות</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 52 }}>CTR</th>
                <th style={{ textAlign: 'left', padding: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600, width: 48 }}>דירוג</th>
              </tr>
            </thead>
            <tbody>
              {gsc.opportunities.map((r, i) => (
                <tr key={r.page + i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', overflow: 'hidden', maxWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={`https://carissues.co.il${r.page}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}>{r.page}</a>
                  </td>
                  <td style={{ padding: '5px 0', textAlign: 'left', fontWeight: 700 }}>{r.impressions}</td>
                  <td style={{ padding: '5px 0', textAlign: 'left', color: '#dc2626' }}>{pct(r.ctr)}</td>
                  <td style={{ padding: '5px 0', textAlign: 'left', color: r.position <= 10 ? '#ca8a04' : 'var(--text-muted)' }}>{pos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, isAdmin, loading } = useAuth();
  const [days, setDays] = useState<Days>(28);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: Days) => {
    setFetching(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`/api/admin/analytics?days=${d}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`שגיאה ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) load(days);
  }, [loading, isAdmin, days, load]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        בודק הרשאות...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>נדרשת גישת מנהל</div>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>← עמוד הבית</Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>ניהול</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>לוח בקרה אנליטיקה</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {([7, 28, 90] as Days[]).map(d => (
              <button key={d}
                onClick={() => setDays(d)}
                disabled={fetching}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: days === d ? 'var(--brand-red)' : 'var(--surface)',
                  color: days === d ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                {d === 7 ? '7 ימים' : d === 28 ? '28 ימים' : '90 ימים'}
              </button>
            ))}
            <button
              onClick={() => load(days)}
              disabled={fetching}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {fetching ? '...' : '↻ רענן'}
            </button>
            <Link href="/admin" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
              ← ניהול
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>

        {/* Loading overlay */}
        {fetching && !data && (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>⏳</div>
            <div>טוען נתונים מ-Cloudflare, Google Analytics ו-Search Console...</div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', marginBottom: 24, fontSize: '0.875rem' }}>
            שגיאה: {error}
          </div>
        )}

        {data && (
          <>
            {/* ── Cloudflare ── */}
            <SectionHeader
              icon="☁️"
              title="Cloudflare Analytics"
              sub={`תנועה אמיתית לאתר — ${days} ימים אחרונים`}
            />
            <CFSection cf={data.cf} days={days} />

            {/* ── GA4 ── */}
            <SectionHeader
              icon="📊"
              title="Google Analytics"
              sub={`נתוני התנהגות משתמשים — ${days} ימים אחרונים`}
            />
            <GA4Section ga4={data.ga4} days={days} />

            {/* ── GSC ── */}
            <SectionHeader
              icon="🔍"
              title="Google Search Console"
              sub="ביצועי חיפוש אורגני — 28 ימים אחרונים"
            />
            <GSCSection gsc={data.gsc} />
          </>
        )}

      </div>
    </div>
  );
}
