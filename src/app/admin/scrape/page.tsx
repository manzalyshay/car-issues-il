'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';

interface ModelRow {
  makeSlug:    string;
  makeNameHe:  string;
  modelSlug:   string;
  modelNameHe: string;
  localPosts:  number;
  globalPosts: number;
  clonedPosts: number;
  scrapedAt:   string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export default function ScrapePage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [models, setModels]   = useState<ModelRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter]   = useState<'all' | 'has' | 'empty'>('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [loading, user, isAdmin, router]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, []);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/scrape-status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setModels(await res.json());
    } catch { /* ignore */ } finally { setFetching(false); }
  }, [getToken]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (loading || !isAdmin) return null;

  const hasPostsCount  = models.filter(m => m.localPosts + m.globalPosts > 0).length;
  const emptyCount     = models.length - hasPostsCount;

  const filtered = models.filter(m => {
    if (filter === 'has'   && m.localPosts + m.globalPosts === 0) return false;
    if (filter === 'empty' && m.localPosts + m.globalPosts > 0)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.makeNameHe.includes(q) && !m.modelNameHe.includes(q) &&
          !m.makeSlug.includes(q)   && !m.modelSlug.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <button onClick={() => router.push('/admin')} style={{ marginBottom: 24, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          ← חזרה לפאנל
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>פוסטים שנסרקו</h1>
          <button onClick={load} disabled={fetching}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {fetching ? 'טוען...' : 'רענן'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            [hasPostsCount,        'עם פוסטים',  'var(--brand-red)'],
            [emptyCount,           'ריקים',       'var(--text-primary)'],
            [models.length,        'סה"כ דגמים', 'var(--text-primary)'],
          ].map(([val, label, color]) => (
            <div key={label as string} className="card" style={{ padding: '16px 24px', flex: '1 1 120px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: color as string }}>{val}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['all', 'הכל'], ['has', 'עם פוסטים'], ['empty', 'ריקים']] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: filter === f ? 'var(--brand-red)' : 'var(--bg-muted)', color: filter === f ? '#fff' : 'var(--text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש דגם..."
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', minWidth: 160 }}
          />
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>דגם</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>🇮🇱 ישראלי</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>🌍 בינלאומי</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>שוכפלו</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>נסרק</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const total = m.localPosts + m.globalPosts;
                  return (
                    <tr key={`${m.makeSlug}/${m.modelSlug}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700 }}>{m.makeNameHe} {m.modelNameHe}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.makeSlug}/{m.modelSlug}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: m.localPosts > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {m.localPosts || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: m.globalPosts > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {m.globalPosts || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {m.clonedPosts > 0
                          ? <span style={{ color: '#16a34a', fontWeight: 700 }}>{m.clonedPosts} ✓</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.scrapedAt ? timeAgo(m.scrapedAt) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => router.push(`/admin/preview/${m.makeSlug}/${m.modelSlug}`)}
                          style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: total > 0 ? 'var(--brand-red)' : 'transparent', color: total > 0 ? '#fff' : 'var(--text-secondary)' }}>
                          {total > 0 ? `👁 ${total} פוסטים` : '🔍 סרוק'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
