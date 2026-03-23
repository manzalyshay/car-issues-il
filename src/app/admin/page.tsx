'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';

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
}

type ScrapeState = 'idle' | 'loading' | 'ok' | 'error';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [models, setModels] = useState<ModelRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [scraping, setScraping] = useState<Record<string, ScrapeState>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<'all' | 'scraped' | 'missing'>('all');

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, []);

  const fetchStatus = useCallback(async () => {
    setFetching(true);
    const token = await getToken();
    const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setModels(await res.json());
    setFetching(false);
  }, [getToken]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) fetchStatus();
  }, [isAdmin, fetchStatus]);

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
      // Small delay to avoid rate limiting
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setBulkRunning(false);
    fetchStatus();
  };

  if (loading || !isAdmin) return null;

  const filtered = models.filter((m) => {
    if (filter === 'scraped') return m.scraped;
    if (filter === 'missing') return !m.scraped;
    return true;
  });

  const missingModels = models.filter((m) => !m.scraped);
  const scrapedCount = models.filter((m) => m.scraped).length;

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 8 }}>ניהול — פאנל מנהל</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {scrapedCount}/{models.length} דגמים עם סיכום AI
        </p>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          <div className="card" style={{ padding: '16px 24px', flex: '1 1 140px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-red)' }}>{scrapedCount}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>סוכמו</div>
          </div>
          <div className="card" style={{ padding: '16px 24px', flex: '1 1 140px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{models.length - scrapedCount}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>חסרים</div>
          </div>
          <div className="card" style={{ padding: '16px 24px', flex: '1 1 140px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{models.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>סה"כ דגמים</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            className="btn btn-primary"
            onClick={() => bulkScrape(missingModels)}
            disabled={bulkRunning || missingModels.length === 0}
          >
            {bulkRunning
              ? `סורק... ${bulkProgress.done}/${bulkProgress.total}`
              : `סרוק דגמים חסרים (${missingModels.length})`}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => bulkScrape(models)}
            disabled={bulkRunning}
            style={{ background: 'var(--text-secondary)' }}
          >
            סרוק הכל מחדש ({models.length})
          </button>
          <button
            onClick={deleteAll}
            disabled={bulkRunning}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--brand-red)', color: 'var(--brand-red)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
          >
            מחק הכל
          </button>
          <button
            onClick={fetchStatus}
            disabled={fetching}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            {fetching ? 'טוען...' : 'רענן'}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['all', 'scraped', 'missing'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                background: filter === f ? 'var(--brand-red)' : 'var(--bg-muted)',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {f === 'all' ? 'הכל' : f === 'scraped' ? 'סוכמו' : 'חסרים'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>דגם</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>ציון</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>פוסטים 🇮🇱/🌍</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>תאריך</th>
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
                        <span style={{
                          fontWeight: 900,
                          color: m.topScore >= 7 ? '#16a34a' : m.topScore >= 5 ? '#ca8a04' : 'var(--brand-red)',
                        }}>
                          {m.topScore.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
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
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.8125rem',
                            background: state === 'ok' ? '#16a34a' : state === 'error' ? 'var(--brand-red)' : 'var(--brand-red)',
                            color: '#fff', opacity: state === 'loading' ? 0.6 : 1,
                          }}
                        >
                          {state === 'loading' ? '...' : state === 'ok' ? '✓' : state === 'error' ? '✗' : 'סרוק'}
                        </button>
                        {m.scraped && (
                          <button
                            onClick={() => deleteOne(m.makeSlug, m.modelSlug)}
                            disabled={bulkRunning}
                            style={{
                              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                              cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
                              background: 'transparent', color: 'var(--text-muted)',
                            }}
                          >
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
    </div>
  );
}
