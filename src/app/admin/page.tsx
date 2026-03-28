'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { CATEGORY_LABELS } from '@/data/reviews';
import type { Review } from '@/data/reviews';
import AdminNav from '@/components/AdminNav';

interface ModelRow {
  makeSlug: string;
  makeNameHe: string;
  modelSlug: string;
  modelNameHe: string;
  scraped: boolean;
  localScore: number | null;
  globalScore: number | null;
  topScore: number | null;
  localPosts: number;
  globalPosts: number;
  scrapedAt: string | null;
  hasLocalSummary: boolean;
  hasGlobalSummary: boolean;
}

type ScrapeState = 'idle' | 'loading' | 'ok' | 'error';
type Tab = 'reviews_ai' | 'user_reviews' | 'reports' | 'metrics';

interface MetricsData {
  totals: {
    views1: number; views7: number; views30: number;
    sessions1: number; sessions7: number; sessions30: number;
  };
  dailyChart: { date: string; views: number; sessions: number }[];
  topPages: { path: string; views: number; sessions: number }[];
}

interface ReportRow {
  id: number;
  review_id: string;
  reason: string;
  ip: string;
  created_at: string;
  reviews?: {
    make_slug: string;
    model_slug: string;
    year: number;
    title: string;
    author: string;
    body: string;
  };
}

function dbToReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    makeSlug: String(row.make_slug),
    modelSlug: String(row.model_slug),
    year: Number(row.year),
    rating: Number(row.rating),
    title: String(row.title),
    body: String(row.body),
    category: row.category as Review['category'],
    mileage: row.mileage != null ? Number(row.mileage) : undefined,
    authorName: String(row.author),
    userId: row.user_id ? String(row.user_id) : undefined,
    helpful: Number(row.helpful ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    createdAt: String(row.created_at),
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}


export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('reviews_ai');

  // ── AI Reviews tab state ─────────────────────────────────────────────────────
  const [models, setModels] = useState<ModelRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [scraping, setScraping] = useState<Record<string, ScrapeState>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<'all' | 'scraped' | 'missing' | 'no_global' | 'no_local'>('all');

  // ── User Reviews tab state ───────────────────────────────────────────────────
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [reviewsFetching, setReviewsFetching] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // ── Reports tab state ────────────────────────────────────────────────────────
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsFetching, setReportsFetching] = useState(false);

  // ── Metrics tab state ─────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsFetching, setMetricsFetching] = useState(false);


  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, []);

  const fetchStatus = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setModels(await res.json());
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [getToken]);

  const fetchUserReviews = useCallback(async () => {
    setReviewsFetching(true);
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setUserReviews((data ?? []).map(dbToReview));
    } catch { /* ignore */ } finally {
      setReviewsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStatus();
  }, [isAdmin, fetchStatus]);

  useEffect(() => {
    if (isAdmin && tab === 'user_reviews') fetchUserReviews();
  }, [isAdmin, tab, fetchUserReviews]);

  const fetchReports = useCallback(async () => {
    setReportsFetching(true);
    try {
      const { data } = await supabase
        .from('review_reports')
        .select('*, reviews(make_slug,model_slug,year,title,author,body)')
        .order('created_at', { ascending: false })
        .limit(200);
      setReports((data ?? []) as ReportRow[]);
    } catch { /* ignore */ } finally {
      setReportsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && tab === 'reports') fetchReports();
  }, [isAdmin, tab, fetchReports]);

  const fetchMetrics = useCallback(async () => {
    setMetricsFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMetrics(await res.json());
    } catch { /* ignore */ } finally {
      setMetricsFetching(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAdmin && tab === 'metrics') fetchMetrics();
  }, [isAdmin, tab, fetchMetrics]);


  const scrapeOne = async (makeSlug: string, modelSlug: string) => {
    const key = `${makeSlug}/${modelSlug}`;
    setScraping((s) => ({ ...s, [key]: 'loading' }));
    const token = await getToken();
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'scrape', makeSlug, modelSlug }),
    });
    setScraping((s) => ({ ...s, [key]: res.ok ? 'ok' : 'error' }));
    if (res.ok) fetchStatus();
  };

  const deleteOne = async (makeSlug: string, modelSlug: string) => {
    const token = await getToken();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete', makeSlug, modelSlug }),
    });
    fetchStatus();
  };

  const deleteAll = async () => {
    if (!confirm('מחק את כל הסיכומים?')) return;
    const token = await getToken();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete_all' }),
    });
    fetchStatus();
  };

  const bulkScrape = async (targets: ModelRow[]) => {
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: targets.length });
    const token = await getToken();
    for (let i = 0; i < targets.length; i++) {
      const { makeSlug, modelSlug } = targets[i];
      const key = `${makeSlug}/${modelSlug}`;
      setScraping((s) => ({ ...s, [key]: 'loading' }));
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'scrape', makeSlug, modelSlug }),
      });
      setScraping((s) => ({ ...s, [key]: res.ok ? 'ok' : 'error' }));
      setBulkProgress({ done: i + 1, total: targets.length });
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setBulkRunning(false);
    fetchStatus();
  };

  const deleteReview = async (id: string) => {
    const token = await getToken();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete_review', reviewId: id }),
    });
    setUserReviews((prev) => prev.filter((r) => r.id !== id));
    setSelectedReviews((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const bulkDeleteReviews = async () => {
    if (!confirm(`מחק ${selectedReviews.size} ביקורות?`)) return;
    const ids = [...selectedReviews];
    const token = await getToken();
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'bulk_delete_reviews', ids }),
    });
    setUserReviews((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelectedReviews(new Set());
  };

  const saveEditReview = async () => {
    if (!editReview) return;
    setEditSaving(true);
    const token = await getToken();
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'edit_review', reviewId: editReview.id, title: editReview.title, body: editReview.body, rating: editReview.rating }),
    });
    setEditSaving(false);
    if (res.ok) {
      setUserReviews((prev) => prev.map((r) => r.id === editReview.id ? editReview : r));
      setEditReview(null);
    } else {
      alert('שגיאה בשמירה');
    }
  };

  if (loading || !isAdmin) return null;

  const filtered = models.filter((m) => {
    if (filter === 'scraped') return m.scraped;
    if (filter === 'missing') return !m.scraped;
    if (filter === 'no_global') return m.scraped && !m.hasGlobalSummary;
    if (filter === 'no_local') return m.scraped && !m.hasLocalSummary;
    return true;
  });
  const missingModels = models.filter((m) => !m.scraped);
  const missingGlobal = models.filter((m) => !m.hasGlobalSummary);
  const missingLocal  = models.filter((m) => !m.hasLocalSummary);
  const scrapedCount = models.filter((m) => m.scraped).length;

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 24 }}>פאנל ניהול</h1>
        <AdminNav active="summaries" />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 32, borderBottom: '2px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {([['reviews_ai', 'סיכומי AI'], ['user_reviews', 'ביקורות'], ['reports', `דיווחים${reports.length ? ` (${reports.length})` : ''}`], ['metrics', 'מדדים']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px', border: 'none', cursor: 'pointer', fontWeight: 700,
                fontSize: '0.875rem', background: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                color: tab === t ? 'var(--brand-red)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--brand-red)' : '2px solid transparent',
                marginBottom: -2,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── AI Reviews Tab ──────────────────────────────────────────────────── */}
        {tab === 'reviews_ai' && (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              {scrapedCount}/{models.length} דגמים עם סיכום AI
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              {[
                [scrapedCount, 'סוכמו', 'var(--brand-red)'],
                [models.length - scrapedCount, 'חסרים', 'var(--text-primary)'],
                [models.length, 'סה"כ', 'var(--text-primary)'],
              ].map(([val, label, color]) => (
                <div key={label as string} className="card" style={{ padding: '16px 24px', flex: '1 1 140px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: color as string }}>{val}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <button className="btn btn-primary" onClick={() => bulkScrape(missingModels)} disabled={bulkRunning || missingModels.length === 0}>
                {bulkRunning ? `מייצר... ${bulkProgress.done}/${bulkProgress.total}` : `✨ צור חסרים (${missingModels.length})`}
              </button>
              <button className="btn btn-primary" onClick={() => bulkScrape(missingGlobal)} disabled={bulkRunning || missingGlobal.length === 0} style={{ background: '#7c3aed' }}>
                🌍 צור חסרי גלובלי ({missingGlobal.length})
              </button>
              <button className="btn btn-primary" onClick={() => bulkScrape(missingLocal)} disabled={bulkRunning || missingLocal.length === 0} style={{ background: '#0284c7' }}>
                🇮🇱 צור חסרי ישראלי ({missingLocal.length})
              </button>
              <button className="btn btn-primary" onClick={() => bulkScrape(models)} disabled={bulkRunning} style={{ background: 'var(--text-secondary)' }}>
                🔄 צור הכל ({models.length})
              </button>
              <button onClick={deleteAll} disabled={bulkRunning} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--brand-red)', color: 'var(--brand-red)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                מחק הכל
              </button>
              <button onClick={fetchStatus} disabled={fetching} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {fetching ? 'טוען...' : 'רענן'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {([
                ['all',       'הכל'],
                ['scraped',   'סוכמו'],
                ['missing',   'חסרים'],
                ['no_global', '🌍 חסר גלובלי'],
                ['no_local',  '🇮🇱 חסר ישראלי'],
              ] as const).map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: filter === f ? 'var(--brand-red)' : 'var(--bg-muted)', color: filter === f ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: 540 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>דגם</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>ציון</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>סיכומים</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>פוסטים 🇮🇱/🌍</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>נוצר</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const key = `${m.makeSlug}/${m.modelSlug}`;
                    const state = scraping[key] ?? 'idle';
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700 }}>{m.makeNameHe} {m.modelNameHe}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {m.topScore != null ? (
                            <span style={{ fontWeight: 900, color: m.topScore >= 7 ? '#16a34a' : m.topScore >= 5 ? '#ca8a04' : 'var(--brand-red)' }}>
                              {m.topScore.toFixed(1)}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {m.scraped ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <span title="ישראלי" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: m.hasLocalSummary ? '#dbeafe' : 'var(--bg-muted)', color: m.hasLocalSummary ? '#1d4ed8' : 'var(--text-muted)', fontWeight: 700 }}>
                                🇮🇱 {m.hasLocalSummary ? '✓' : '✗'}
                              </span>
                              <span title="גלובלי" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: m.hasGlobalSummary ? '#ede9fe' : 'var(--bg-muted)', color: m.hasGlobalSummary ? '#7c3aed' : 'var(--text-muted)', fontWeight: 700 }}>
                                🌍 {m.hasGlobalSummary ? '✓' : '✗'}
                              </span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {m.scraped ? `${m.localPosts} / ${m.globalPosts}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {m.scrapedAt ? new Date(m.scrapedAt).toLocaleDateString('he-IL') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button
                              onClick={() => scrapeOne(m.makeSlug, m.modelSlug)}
                              disabled={state === 'loading' || bulkRunning}
                              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: state === 'ok' ? '#16a34a' : 'var(--brand-red)', color: '#fff', opacity: state === 'loading' ? 0.6 : 1, whiteSpace: 'nowrap' }}
                            >
                              {state === 'loading' ? '...' : state === 'ok' ? '✓' : state === 'error' ? '✗' : m.scraped ? '🔄 צור מחדש' : '✨ צור'}
                            </button>
                            {m.scraped && (
                              <button onClick={() => deleteOne(m.makeSlug, m.modelSlug)} disabled={bulkRunning} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: 'transparent', color: 'var(--text-muted)' }}>
                                מחק
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

          </>
        )}

        {/* ── User Reviews Tab ────────────────────────────────────────────────── */}
        {tab === 'user_reviews' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {userReviews.length} ביקורות סה"כ
              </p>
              <button onClick={fetchUserReviews} disabled={reviewsFetching} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {reviewsFetching ? 'טוען...' : 'רענן'}
              </button>
            </div>

            {selectedReviews.size > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedReviews.size} נבחרו</span>
                <button onClick={bulkDeleteReviews} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem' }}>
                  מחק נבחרות
                </button>
                <button onClick={() => setSelectedReviews(new Set())} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  בטל בחירה
                </button>
              </div>
            )}

            {reviewsFetching ? (
              <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>טוען...</div>
            ) : userReviews.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                אין ביקורות עדיין
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {userReviews.map((review) => {
                  const make = getMakeBySlug(review.makeSlug);
                  const model = make ? getModelBySlug(make, review.modelSlug) : null;
                  const carLabel = make && model
                    ? `${make.nameHe} ${model.nameHe} ${review.year}`
                    : `${review.makeSlug} ${review.modelSlug} ${review.year}`;
                  const isSelected = selectedReviews.has(review.id);
                  const isEditing = editReview?.id === review.id;

                  return (
                    <div key={review.id} className="card" style={{ padding: '16px 20px', border: isSelected ? '2px solid var(--brand-red)' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => setSelectedReviews((prev) => { const n = new Set(prev); e.target.checked ? n.add(review.id) : n.delete(review.id); return n; })}
                            style={{ marginTop: 4, flexShrink: 0, width: 15, height: 15 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--brand-red)', fontWeight: 700, marginBottom: 2 }}>{carLabel}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{review.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {review.authorName} · {review.userId ? '👤' : '🌐'} · {'★'.repeat(review.rating)} · {new Date(review.createdAt).toLocaleDateString('he-IL')}
                            </div>
                          </div>
                        </label>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <span className="badge badge-gray" style={{ fontSize: '0.7rem', alignSelf: 'center' }}>{CATEGORY_LABELS[review.category]}</span>
                          <button
                            onClick={() => setEditReview(isEditing ? null : { ...review })}
                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: isEditing ? 'var(--bg-muted)' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                          >
                            {isEditing ? 'ביטול' : 'ערוך'}
                          </button>
                          <button
                            onClick={() => { if (confirm('מחק ביקורת?')) deleteReview(review.id); }}
                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'rgba(230,57,70,0.12)', color: 'var(--brand-red)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                          >
                            מחק
                          </button>
                        </div>
                      </div>

                      {!isEditing && (
                        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '10px 0 0 25px' }}>
                          {review.body}
                        </p>
                      )}

                      {isEditing && editReview && (
                        <div style={{ marginTop: 14, padding: '16px', background: 'var(--bg-muted)', borderRadius: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>כותרת</label>
                              <input value={editReview.title} onChange={(e) => setEditReview({ ...editReview, title: e.target.value })}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box' as const }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>דירוג</label>
                              <select value={editReview.rating} onChange={(e) => setEditReview({ ...editReview, rating: Number(e.target.value) })}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                {[5,4,3,2,1].map((r) => <option key={r} value={r}>{'★'.repeat(r)} ({r})</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>תוכן</label>
                            <textarea value={editReview.body} onChange={(e) => setEditReview({ ...editReview, body: e.target.value })} rows={4}
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                          </div>
                          <button onClick={saveEditReview} disabled={editSaving} className="btn btn-primary" style={{ opacity: editSaving ? 0.6 : 1 }}>
                            {editSaving ? 'שומר...' : 'שמור שינויים'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Metrics Tab ─────────────────────────────────────────────────────── */}
        {tab === 'metrics' && (
          <MetricsTab metrics={metrics} fetching={metricsFetching} onRefresh={fetchMetrics} />
        )}

        {/* ── Reports Tab ─────────────────────────────────────────────────────── */}
        {tab === 'reports' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {reports.length} דיווחים סה&quot;כ
              </p>
              <button onClick={fetchReports} disabled={reportsFetching} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {reportsFetching ? 'טוען...' : 'רענן'}
              </button>
            </div>

            {reportsFetching ? (
              <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>טוען...</div>
            ) : reports.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                אין דיווחים עדיין
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map((report) => {
                  const make = report.reviews ? getMakeBySlug(report.reviews.make_slug) : null;
                  const model = make ? getModelBySlug(make, report.reviews?.model_slug ?? '') : null;
                  const carLabel = make && model
                    ? `${make.nameHe} ${model.nameHe} ${report.reviews?.year}`
                    : `${report.reviews?.make_slug ?? '?'} ${report.reviews?.model_slug ?? '?'}`;
                  return (
                    <div key={report.id} className="card" style={{ padding: '16px 20px', borderRight: '3px solid var(--brand-red)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--brand-red)', fontWeight: 700 }}>{carLabel}</span>
                          <span style={{ marginRight: 12, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {report.reviews?.title ?? '—'}
                          </span>
                          <span style={{ marginRight: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {report.reviews?.author ?? ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{REASON_LABELS[report.reason] ?? report.reason}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(report.created_at).toLocaleDateString('he-IL')}
                          </span>
                          <button
                            onClick={async () => {
                              await supabase.from('review_reports').delete().eq('id', report.id);
                              setReports((prev) => prev.filter((r) => r.id !== report.id));
                            }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                          >
                            בטל דיווח
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('מחק את הביקורת לצמיתות?')) return;
                              await supabase.from('reviews').delete().eq('id', report.review_id);
                              await supabase.from('review_reports').delete().eq('review_id', report.review_id);
                              setReports((prev) => prev.filter((r) => r.review_id !== report.review_id));
                            }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            מחק ביקורת
                          </button>
                        </div>
                      </div>
                      {report.reviews?.body && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                          {report.reviews.body.slice(0, 200)}{report.reviews.body.length > 200 ? '…' : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


const REASON_LABELS: Record<string, string> = {
  spam: 'ספאם',
  fake: 'ביקורת מזויפת',
  offensive: 'תוכן פוגעני',
  wrong_car: 'רכב שגוי',
  other: 'אחר',
};

function MetricsTab({ metrics, fetching, onRefresh }: { metrics: MetricsData | null; fetching: boolean; onRefresh: () => void }) {
  if (fetching) return <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>טוען נתונים...</div>;
  if (!metrics) return <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>לא נטענו נתונים</div>;

  const { totals, dailyChart, topPages } = metrics;
  const maxViews = Math.max(...dailyChart.map((d) => d.views), 1);

  const dateLabel = (iso: string) => {
    const [, , day] = iso.split('-');
    const months = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];
    const m = parseInt(iso.split('-')[1]) - 1;
    return `${parseInt(day)} ${months[m]}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button onClick={onRefresh} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          רענן
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'צפיות היום',    views: totals.views1,   sessions: totals.sessions1 },
          { label: 'צפיות 7 ימים', views: totals.views7,   sessions: totals.sessions7 },
          { label: 'צפיות 30 ימים', views: totals.views30, sessions: totals.sessions30 },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-red)', lineHeight: 1 }}>{kpi.views.toLocaleString()}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 6 }}>{kpi.sessions.toLocaleString()} מבקרים ייחודיים</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>צפיות יומיות — 14 ימים אחרונים</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {dailyChart.map((d) => {
            const heightPct = (d.views / maxViews) * 100;
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {d.views > 0 ? d.views : ''}
                </div>
                <div
                  title={`${dateLabel(d.date)}: ${d.views} צפיות, ${d.sessions} מבקרים`}
                  style={{
                    width: '100%',
                    height: `${Math.max(heightPct, d.views > 0 ? 4 : 2)}%`,
                    minHeight: 2,
                    borderRadius: '4px 4px 0 0',
                    background: isToday ? 'var(--brand-red)' : 'rgba(230,57,70,0.4)',
                    transition: 'height 0.3s',
                    cursor: 'default',
                  }}
                />
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 36 }}>
                  {dateLabel(d.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top pages */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>עמודים פופולריים — 30 ימים</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topPages.map((p, i) => {
            const pct = (p.views / (topPages[0]?.views || 1)) * 100;
            return (
              <div key={p.path} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 60px 60px', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</div>
                <div style={{ position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-muted)' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(230,57,70,0.15)', borderRadius: 6 }} />
                  <div style={{ position: 'relative', padding: '0 10px', lineHeight: '28px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', direction: 'ltr', textAlign: 'left' }}>
                    {p.path}
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.views}</div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.sessions} מב׳</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 60px 60px', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingRight: 10 }}>עמוד</div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>צפיות</div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>מבקרים</div>
        </div>
      </div>
    </div>
  );
}
