'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import type { CarMake, CarModel } from '@/lib/carsDb';
import type { RawPost } from '@/lib/expertReviews';

type Post = RawPost & { cloned: boolean };

const DELETE_REASONS = [
  { value: 'year_too_old',  label: 'שנה ישנה מדי לאתר' },
  { value: 'year_mismatch', label: 'שנה לא תואמת לדגם' },
  { value: 'wrong_model',   label: 'לא קשור לדגם הזה' },
  { value: 'wrong_language',label: 'שפה לא מתאימה' },
  { value: 'spam',          label: 'ספאם / פרסומת' },
  { value: 'irrelevant',    label: 'תוכן לא רלוונטי' },
  { value: 'other',         label: 'אחר' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `לפני ${m} דקות`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שעות`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export default function PreviewPage() {
  const { user, isAdmin, loading } = useAuth();
  const router   = useRouter();
  const params   = useParams();
  const makeSlug  = params.makeSlug  as string;
  const modelSlug = params.modelSlug as string;

  const [make, setMake]   = useState<CarMake | null>(null);
  const [model, setModel] = useState<CarModel | null>(null);

  const [posts, setPosts]             = useState<Post[]>([]);
  const [newIds, setNewIds]           = useState<Set<string>>(new Set());
  const [fetching, setFetching]       = useState(false);
  const [fetched, setFetched]         = useState(false);
  const [scrapedAt, setScrapedAt]     = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [clonePost, setClonePost]     = useState<Post | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Delete reason modal state
  const [deleteModal, setDeleteModal]     = useState<Post | null>(null);
  const [deleteReason, setDeleteReason]   = useState('year_too_old');
  const [deleteNote, setDeleteNote]       = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (!makeSlug || !modelSlug) return;
    fetch('/api/cars').then(r => r.json()).then((makes: CarMake[]) => {
      const m = makes.find(x => x.slug === makeSlug) ?? null;
      setMake(m);
      setModel(m?.models.find(x => x.slug === modelSlug) ?? null);
    });
  }, [makeSlug, modelSlug]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }, []);

  // Load cached posts from DB on mount
  useEffect(() => {
    if (loading || !isAdmin) return;
    (async () => {
      setFetching(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/admin/scrape-preview?makeSlug=${makeSlug}&modelSlug=${modelSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { posts: raw, scrapedAt: ts } = await res.json();
          const flat: Post[] = [...(raw.local ?? []), ...(raw.global ?? [])];
          if (flat.length > 0) { setPosts(flat); setScrapedAt(ts); setFetched(true); }
        }
      } catch { /* ignore */ } finally { setFetching(false); }
    })();
  }, [loading, isAdmin, makeSlug, modelSlug, getToken]);

  const scrape = useCallback(async () => {
    if (!make || !model) return;
    setFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/scrape-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ makeSlug, modelSlug }),
      });
      if (res.ok) {
        const { posts: raw, newIds: freshIds, scrapedAt: ts, filteredCount } = await res.json();
        const flat: Post[] = [...(raw.local ?? []), ...(raw.global ?? [])];
        setPosts(flat);
        setNewIds(new Set(freshIds ?? []));
        setScrapedAt(ts ?? null);
        setFetched(true);
        if (filteredCount > 0) {
          console.info(`[scrape] Filtered ${filteredCount} posts with out-of-range years`);
        }
      }
    } catch { /* ignore */ } finally { setFetching(false); }
  }, [make, model, makeSlug, modelSlug, getToken]);

  const markInvalid = useCallback(async (post: Post, reason: string, reasonNote: string) => {
    setDeletingIds(prev => new Set(prev).add(post.id));
    setDeleteModal(null);
    setDeleteNote('');
    try {
      const token = await getToken();
      await fetch('/api/admin/scrape-preview', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ makeSlug, modelSlug, postId: post.id, sourceName: post.sourceName, postUrl: post.url, reason, reasonNote }),
      });
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setNewIds(prev => { const n = new Set(prev); n.delete(post.id); return n; });
    } catch { /* ignore */ } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(post.id); return n; });
    }
  }, [makeSlug, modelSlug, getToken]);

  const markCloned = useCallback(async (postId: string) => {
    try {
      const token = await getToken();
      await fetch('/api/admin/scrape-preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ makeSlug, modelSlug, postId }),
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, cloned: true } : p));
    } catch { /* ignore */ }
  }, [makeSlug, modelSlug, getToken]);

  const summarizeSelected = useCallback(async () => {
    setSummarizing(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'summarize_from_posts',
          makeSlug, modelSlug,
          localPosts:  posts.filter(p => p.scope === 'local'),
          globalPosts: posts.filter(p => p.scope === 'global'),
        }),
      });
      if (res.ok) router.push('/admin');
    } catch { /* ignore */ } finally { setSummarizing(false); }
  }, [posts, makeSlug, modelSlug, getToken, router]);

  if (loading || !isAdmin) return null;

  const localPosts  = posts.filter(p => p.scope === 'local');
  const globalPosts = posts.filter(p => p.scope === 'global');
  const newCount    = newIds.size;
  const carLabel    = make && model ? `${make.nameHe} ${model.nameHe}` : `${makeSlug}/${modelSlug}`;

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">

        {/* Delete reason modal */}
        {deleteModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }} onClick={() => setDeleteModal(null)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>למה מוחקים את הפוסט הזה?</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                זה עוזר לנו לשפר את מנוע הסריקה ולא להביא שוב תוצאות דומות.
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4, padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 8, wordBreak: 'break-all' }}>
                {deleteModal.title}
                {deleteModal.url && (
                  <div style={{ marginTop: 4, opacity: 0.7, fontSize: '0.7rem' }}>{deleteModal.url}</div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>סיבה *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {DELETE_REASONS.map(r => (
                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, background: deleteReason === r.value ? 'rgba(225,29,72,0.08)' : 'transparent', border: `1px solid ${deleteReason === r.value ? 'var(--brand-red)' : 'transparent'}` }}>
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={deleteReason === r.value}
                        onChange={() => setDeleteReason(r.value)}
                        style={{ accentColor: 'var(--brand-red)' }}
                      />
                      <span style={{ fontSize: '0.875rem' }}>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>הערה (אופציונלי)</label>
                <input
                  value={deleteNote}
                  onChange={e => setDeleteNote(e.target.value)}
                  placeholder="למשל: שנת 2002, אבל הקורולה שלנו מ-2014"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteModal(null)}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => markInvalid(deleteModal, deleteReason, deleteNote)}
                  style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#e11d48', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
                >
                  מחק פוסט
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/admin')}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            ← חזרה
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{carLabel}</h1>
          {scrapedAt && !fetching && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
              נסרק {timeAgo(scrapedAt)}
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={scrape} disabled={fetching}>
            {fetching ? '⏳ סורק...' : fetched ? `🔍 חפש פוסטים חדשים${newCount > 0 ? ` · ${newCount} חדשים` : ''}` : '🔍 סרוק פורומים'}
          </button>
          {posts.length > 0 && (
            <button onClick={summarizeSelected} disabled={summarizing || posts.length === 0}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', opacity: summarizing || posts.length === 0 ? 0.6 : 1 }}>
              {summarizing ? 'מסכם...' : `סכם ${posts.length} פוסטים`}
            </button>
          )}
        </div>

        {fetching && (
          <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>{posts.length > 0 ? 'מחפש פוסטים חדשים...' : 'סורק פורומים...'}</div>
            {posts.length === 0 && <div style={{ fontSize: '0.875rem', marginTop: 8 }}>עד 35 שניות</div>}
          </div>
        )}

        {!fetching && fetched && posts.length === 0 && (
          <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>לא נמצאו פוסטים</div>
        )}

        {!fetching && posts.length > 0 && (
          <>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {posts.length} פוסטים · {localPosts.length} ישראלי · {globalPosts.length} בינלאומי
              {newCount > 0 && <span style={{ color: '#2563eb', fontWeight: 700, marginRight: 8 }}> · {newCount} חדשים ✨</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
              {(['local', 'global'] as const).map(scope => {
                const scopePosts = scope === 'local' ? localPosts : globalPosts;
                if (scopePosts.length === 0) return null;
                return (
                  <div key={scope}>
                    <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16, color: scope === 'local' ? '#3b82f6' : '#8b5cf6' }}>
                      {scope === 'local' ? '🇮🇱 ישראלי' : '🌍 בינלאומי'} — {scopePosts.length} פוסטים
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {scopePosts.map(post => {
                        const isDeleting = deletingIds.has(post.id);
                        const isCloning  = clonePost?.id === post.id;
                        const isNew      = newIds.has(post.id);
                        const color      = scope === 'local' ? '#3b82f6' : '#8b5cf6';
                        return (
                          <div key={post.id} className="card" style={{
                            padding: '14px 16px',
                            border: `2px solid ${isNew ? '#f59e0b' : color}`,
                            opacity: isDeleting ? 0.4 : 1,
                            transition: 'opacity 0.2s',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                  {isNew && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>חדש ✨</span>
                                  )}
                                  {post.cloned && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>שוכפל ✓</span>
                                  )}
                                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4 }}>{post.title}</div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {post.sourceName}{post.score != null && post.score > 0 && ` · ${post.score} pts`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => { setDeleteReason('year_too_old'); setDeleteNote(''); setDeleteModal(post); }} disabled={isDeleting}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(230,57,70,0.12)', color: '#e11d48', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {isDeleting ? '...' : '✗'}
                                </button>
                                {post.url && (
                                  <a href={post.url} target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                                    🔗
                                  </a>
                                )}
                                <button onClick={() => setClonePost(isCloning ? null : post)}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: isCloning ? 'var(--bg-muted)' : 'var(--brand-red)', color: isCloning ? 'var(--text-muted)' : '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {isCloning ? '✕' : 'שכפל'}
                                </button>
                              </div>
                            </div>
                            {post.snippet && (
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0 26px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {post.snippet}
                              </p>
                            )}
                            {isCloning && (
                              <CloneFromPostForm
                                post={post}
                                makeSlug={makeSlug}
                                modelSlug={modelSlug}
                                years={model?.years ?? []}
                                onDone={() => { setClonePost(null); markCloned(post.id); }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!fetched && !fetching && (
          <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>לחץ "סרוק פורומים" כדי לטעון פוסטים</div>
            <div style={{ fontSize: '0.875rem' }}>יסרוק 16 מקורות ישראליים ובינלאומיים</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CloneFromPostForm({ post, makeSlug, modelSlug, onDone, years }: {
  post: { title: string; snippet: string; sourceName: string; url: string };
  makeSlug: string;
  modelSlug: string;
  onDone: () => void;
  years: number[];
}) {

  const [author,     setAuthor]     = useState('');
  const [title,      setTitle]      = useState(post.title.slice(0, 120));
  const [body,       setBody]       = useState(post.snippet || post.title);
  const [year,       setYear]       = useState<number>(years[0] ?? new Date().getFullYear());
  const [rating,     setRating]     = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const submit = async () => {
    if (!author.trim()) { alert('נדרש שם'); return; }
    setSubmitting(true);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeSlug, modelSlug, year, rating, title, body, category: 'general', authorName: author.trim(), userId: null }),
    });
    setSubmitting(false);
    if (res.ok) { setDone(true); setTimeout(onDone, 1200); }
    else alert('שגיאה בשמירה');
  };

  if (done) return (
    <div style={{ marginTop: 12, padding: 12, background: 'rgba(22,163,74,0.1)', borderRadius: 8, fontSize: '0.875rem', color: '#16a34a', fontWeight: 700 }}>
      ✓ נשמר בהצלחה
    </div>
  );

  return (
    <div style={{ marginTop: 14, padding: 16, background: 'var(--bg-muted)', borderRadius: 10, borderTop: '2px solid var(--brand-red)' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand-red)', marginBottom: 12 }}>שכפל כביקורת משתמש</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>שם *</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="שם מחבר"
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>שנה</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {years.slice(0, 15).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>דירוג</label>
          <select value={rating} onChange={e => setRating(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{'★'.repeat(r)} ({r})</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>כותרת</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>טקסט</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
      </div>
      <button onClick={submit} disabled={submitting}
        style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', opacity: submitting ? 0.6 : 1 }}>
        {submitting ? 'שומר...' : 'פרסם ביקורת'}
      </button>
    </div>
  );
}
