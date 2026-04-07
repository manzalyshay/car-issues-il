'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import type { CarMake } from '@/lib/carsDb';
import { CATEGORY_LABELS } from '@/data/reviews';
import type { Review } from '@/data/reviews';

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
type Tab = 'reviews_ai' | 'user_reviews' | 'reports' | 'metrics' | 'users' | 'social_posts';

interface SocialPostRow {
  id: string;
  platform: 'all' | 'facebook' | 'twitter' | 'telegram' | 'instagram';
  content_he: string;
  content_en: string;
  hashtags: string;
  scheduled_for: string;
  status: 'pending' | 'posted' | 'failed';
  metadata: Record<string, unknown>;
}

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
  const [carsMap, setCarsMap] = useState<Map<string, CarMake>>(new Map());

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

  // ── Deployment status ─────────────────────────────────────────────────────────
  const [deployment, setDeployment] = useState<{ state: string; readyState: string; createdAt: number; meta: { commitMessage: string }; url: string } | null>(null);

  // ── Users tab state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<{ id: string; email: string; display_name: string | null; is_admin: boolean; created_at: string; last_sign_in: string | null; provider: string }[]>([]);
  const [usersFetching, setUsersFetching] = useState(false);

  // ── Social Posts tab state ─────────────────────────────────────────────────────
  const [socialPosts, setSocialPosts] = useState<SocialPostRow[]>([]);
  const [socialFetching, setSocialFetching] = useState(false);
  const [socialGenerating, setSocialGenerating] = useState(false);
  const [socialStatusFilter, setSocialStatusFilter] = useState<'all' | 'pending' | 'posted' | 'failed'>('all');
  const [editSocialPost, setEditSocialPost] = useState<SocialPostRow | null>(null);
  const [socialSaving, setSocialSaving] = useState(false);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ platform: 'all' as SocialPostRow['platform'], content_he: '', content_en: '', hashtags: '#רכב #ישראל #CarIssuesIL', scheduled_for: new Date().toISOString().slice(0, 16) });
  const [generatePostType, setGeneratePostType] = useState<'auto' | 'top_rated' | 'worst_rated' | 'most_reviewed' | 'new_review' | 'comparison' | 'car_3d_summary'>('auto');
  const [promptText, setPromptText] = useState('');
  const [promptGenerating, setPromptGenerating] = useState(false);
  const [includeStory, setIncludeStory] = useState(true);
  const [screenshotting, setScreenshotting] = useState<Record<string, boolean>>({});
  const [screenshotPath, setScreenshotPath] = useState<Record<string, string>>({});
  const [publishingPost, setPublishingPost] = useState<Record<string, boolean>>({});
  const [previewPost, setPreviewPost] = useState<SocialPostRow | null>(null);
  const [igPosts, setIgPosts] = useState<{ id: string; media_url: string; caption?: string; timestamp: string; permalink: string }[]>([]);
  const [fbPosts, setFbPosts] = useState<{ id: string; message?: string; full_picture?: string; created_time: string }[]>([]);
  const [pageManagementOpen, setPageManagementOpen] = useState(false);
  const [pageInfo, setPageInfo] = useState<{ name?: string; about?: string; description?: string; website?: string; picture?: { data: { url: string } }; fan_count?: number } | null>(null);
  const [pageInfoSaving, setPageInfoSaving] = useState(false);
  const [pageInfoForm, setPageInfoForm] = useState({ about: '', description: '', website: '' });
  const [existingPostsTab, setExistingPostsTab] = useState<'instagram' | 'facebook'>('instagram');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ daysLeft: number | null; expiresAt: string | null } | null>(null);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [pasteToken, setPasteToken] = useState('');


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
    fetch('/api/cars').then(r => r.json()).then((makes: CarMake[]) =>
      setCarsMap(new Map(makes.map(m => [m.slug, m]))));
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStatus();
  }, [isAdmin, fetchStatus]);

  useEffect(() => {
    if (!isAdmin) return;
    getToken().then((token) => {
      fetch('/api/admin/deployment', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.deployments?.[0]) setDeployment(data.deployments[0]); })
        .catch(() => {});
    });
  }, [isAdmin, getToken]);

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

  const fetchUsers = useCallback(async () => {
    setUsersFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch { /* ignore */ } finally {
      setUsersFetching(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAdmin && tab === 'users') fetchUsers();
  }, [isAdmin, tab, fetchUsers]);

  const fetchSocialPosts = useCallback(async () => {
    setSocialFetching(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/social-posts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSocialPosts(await res.json());
    } catch { /* ignore */ } finally {
      setSocialFetching(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAdmin && tab === 'social_posts') {
      fetchSocialPosts();
      getToken().then(t => fetch('/api/admin/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ action: 'get_token_status' }),
      }).then(r => r.json()).then(d => setTokenStatus(d)).catch(() => {}));
    }
  }, [isAdmin, tab, fetchSocialPosts, getToken]);

  const refreshFbToken = async () => {
    setTokenRefreshing(true);
    try {
      const t = await getToken();
      const res = await fetch('/api/admin/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ action: 'refresh_token', newToken: pasteToken || undefined }),
      });
      const data = await res.json();
      if (data.ok) { setTokenStatus({ daysLeft: data.daysLeft, expiresAt: data.expiresAt }); setPasteToken(''); }
      else alert(data.error);
    } catch { /* ignore */ } finally {
      setTokenRefreshing(false);
    }
  };

  const generateSocialPost = async () => {
    setSocialGenerating(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'generate', postType: generatePostType === 'auto' ? undefined : generatePostType }),
      });
      if (res.ok) await fetchSocialPosts();
    } catch { /* ignore */ } finally {
      setSocialGenerating(false);
    }
  };

  const generateFromPrompt = async () => {
    if (!promptText.trim()) return;
    setPromptGenerating(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'generate_from_prompt', prompt: promptText }),
      });
      if (!res.ok) return;
      const { post, screenshot_path } = await res.json();
      await fetchSocialPosts();
      setPromptText('');
      // Auto-capture screenshot
      if (post?.id && screenshot_path) {
        setScreenshotting(s => ({ ...s, [post.id]: true }));
        await fetch('/api/admin/social-posts/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ postId: post.id, path: screenshot_path }),
        });
        await fetchSocialPosts();
        setScreenshotting(s => ({ ...s, [post.id]: false }));
      }
    } catch { /* ignore */ } finally {
      setPromptGenerating(false);
    }
  };

  const saveSocialPost = async () => {
    if (!editSocialPost) return;
    setSocialSaving(true);
    try {
      const token = await getToken();
      await fetch('/api/admin/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'update', ...editSocialPost }),
      });
      setEditSocialPost(null);
      await fetchSocialPosts();
    } catch { /* ignore */ } finally {
      setSocialSaving(false);
    }
  };

  const deleteSocialPost = async (id: string) => {
    const token = await getToken();
    await fetch('/api/admin/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete', id }),
    });
    await fetchSocialPosts();
  };

  const createSocialPost = async () => {
    setSocialSaving(true);
    try {
      const token = await getToken();
      await fetch('/api/admin/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create', ...newPost, scheduled_for: new Date(newPost.scheduled_for).toISOString() }),
      });
      setShowNewPostForm(false);
      setNewPost({ platform: 'all', content_he: '', content_en: '', hashtags: '#רכב #ישראל #CarIssuesIL', scheduled_for: new Date().toISOString().slice(0, 16) });
      await fetchSocialPosts();
    } catch { /* ignore */ } finally {
      setSocialSaving(false);
    }
  };

  const deletePostScreenshot = async (id: string) => {
    const token = await getToken();
    await fetch('/api/admin/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete_screenshot', id }),
    });
    await fetchSocialPosts();
  };

  const toggleSocialStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'pending' ? 'posted' : 'pending';
    const token = await getToken();
    await fetch('/api/admin/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'update', id, status: next }),
    });
    await fetchSocialPosts();
  };

  const captureScreenshot = async (postId: string) => {
    // Only send path if user explicitly typed one; otherwise let the API infer it
    const path = screenshotPath[postId];
    setScreenshotting(s => ({ ...s, [postId]: true }));
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/social-posts/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId, ...(path !== undefined && { path }) }),
      });
      if (res.ok) await fetchSocialPosts();
    } catch { /* ignore */ } finally {
      setScreenshotting(s => ({ ...s, [postId]: false }));
    }
  };

  const publishPost = async (post: SocialPostRow) => {
    const meta = post.metadata as Record<string, unknown> | null;
    const imageUrl = meta?.image_url as string | undefined;
    if (!imageUrl) return;
    setPublishingPost(s => ({ ...s, [post.id]: true }));
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'publish', imageUrl, caption: post.content_he, hashtags: post.hashtags, postId: post.id, includeStory }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetch('/api/admin/social-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'delete_screenshot', id: post.id }),
        });
      } else {
        alert(`שגיאה בפרסום:\n${data.error || JSON.stringify(data)}`);
      }
      await fetchSocialPosts();
    } catch { /* ignore */ } finally {
      setPublishingPost(s => ({ ...s, [post.id]: false }));
    }
  };

  const loadExistingPosts = async () => {
    setLoadingExisting(true);
    try {
      const token = await getToken();
      const [igRes, fbRes] = await Promise.all([
        fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'get_ig_posts' }) }),
        fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'get_fb_posts' }) }),
      ]);
      const igData = await igRes.json();
      const fbData = await fbRes.json();
      setIgPosts(igData.data ?? []);
      setFbPosts(fbData.data ?? []);
    } catch { /* ignore */ } finally {
      setLoadingExisting(false);
    }
  };

  const deleteIgPost = async (mediaId: string) => {
    const token = await getToken();
    await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete_ig_post', mediaId }) });
    setIgPosts(p => p.filter(x => x.id !== mediaId));
  };

  const deleteFbPost = async (fbPostId: string) => {
    const token = await getToken();
    await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete_fb_post', fbPostId }) });
    setFbPosts(p => p.filter(x => x.id !== fbPostId));
  };

  const loadPageInfo = async () => {
    const token = await getToken();
    const res = await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'get_page_info' }) });
    const data = await res.json();
    setPageInfo(data);
    setPageInfoForm({ about: data.about ?? '', description: data.description ?? '', website: data.website ?? '' });
  };

  const savePageInfo = async () => {
    setPageInfoSaving(true);
    try {
      const token = await getToken();
      await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'update_page_info', ...pageInfoForm }) });
      await loadPageInfo();
    } catch { /* ignore */ } finally {
      setPageInfoSaving(false);
    }
  };

  const updateProfilePicture = async (imageUrl: string) => {
    const token = await getToken();
    await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'update_profile_picture', imageUrl }) });
    await loadPageInfo();
  };

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const token = await getToken();
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, is_admin: !currentIsAdmin }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
    }
  };


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

        {/* Deployment status bar */}
        {deployment && (() => {
          const state = deployment.readyState || deployment.state;
          const isBuilding = state === 'BUILDING' || state === 'INITIALIZING' || state === 'QUEUED';
          const isReady = state === 'READY';
          const isError = state === 'ERROR' || state === 'CANCELED';
          const color = isBuilding ? '#f59e0b' : isError ? 'var(--brand-red)' : '#16a34a';
          const dot = isBuilding ? '🟡' : isError ? '🔴' : '🟢';
          const label = isBuilding ? 'בפריסה...' : isError ? 'פריסה נכשלה' : 'פרוס';
          const ago = deployment.createdAt ? Math.round((Date.now() - deployment.createdAt) / 60000) : null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, background: isBuilding ? 'rgba(245,158,11,0.08)' : isError ? 'rgba(230,57,70,0.08)' : 'rgba(22,163,74,0.08)', border: `1px solid ${color}40`, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem' }}>{dot}</span>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color }}>{label}</span>
              {deployment.meta?.commitMessage && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deployment.meta.commitMessage}</span>
              )}
              {ago !== null && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>לפני {ago < 1 ? 'פחות מדקה' : `${ago} דק׳`}</span>
              )}
              {isReady && (
                <a href={`https://${deployment.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color, textDecoration: 'none', whiteSpace: 'nowrap' }}>↗ פתח</a>
              )}
            </div>
          );
        })()}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 32, borderBottom: '2px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
          {([
            ['user_reviews', 'ביקורות'],
            ['reports', `דיווחים${reports.length ? ` (${reports.length})` : ''}`],
            ['metrics', 'מדדים'],
            ['users', 'משתמשים'],
            ['social_posts', 'רשתות חברתיות'],
            ['reviews_ai', 'סיכומי AI'],
          ] as [Tab, string][]).map(([t, label]) => (
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
          <button
            onClick={() => router.push('/admin/scrape')}
            style={{
              padding: '10px 14px', border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: '0.875rem', background: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              color: 'var(--text-muted)',
              borderBottom: '2px solid transparent',
              marginBottom: -2,
            }}
          >
            פוסטים שנסרקו ↗
          </button>
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
                  const make = carsMap.get(review.makeSlug);
                  const model = make?.models.find(m => m.slug === review.modelSlug);
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

        {/* ── Users Tab ───────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {users.length} משתמשים רשומים
              </p>
              <button onClick={fetchUsers} disabled={usersFetching} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {usersFetching ? 'טוען...' : 'רענן'}
              </button>
            </div>
            {usersFetching ? (
              <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>טוען...</div>
            ) : users.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>אין משתמשים</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['אימייל', 'שם תצוגה', 'ספק', 'הצטרף', 'כניסה אחרונה', 'אדמין'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{u.display_name ?? '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.provider}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('he-IL') : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {u.is_admin ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-red)' }}>אדמין ✓</span>
                              <button
                                onClick={() => toggleAdmin(u.id, true)}
                                style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                              >
                                הסר
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleAdmin(u.id, false)}
                              style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                            >
                              הגדר אדמין
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Social Posts Tab ────────────────────────────────────────────────── */}
        {tab === 'social_posts' && (() => {
          const filtered = socialStatusFilter === 'all' ? socialPosts : socialPosts.filter(p => p.status === socialStatusFilter);
          const platformLabel: Record<string, string> = { all: 'כל הפלטפורמות', facebook: 'פייסבוק', twitter: 'טוויטר/X', telegram: 'טלגרם', instagram: 'אינסטגרם' };
          const statusColor: Record<string, string> = { pending: '#f59e0b', posted: '#22c55e', failed: '#ef4444' };
          const statusLabel: Record<string, string> = { pending: 'ממתין', posted: 'פורסם', failed: 'נכשל' };
          return (
            <>
              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {([
                  [socialPosts.filter(p => p.status === 'pending').length, 'ממתינים', '#f59e0b'],
                  [socialPosts.filter(p => p.status === 'posted').length, 'פורסמו', '#22c55e'],
                  [socialPosts.filter(p => p.status === 'failed').length, 'נכשלו', '#ef4444'],
                  [socialPosts.length, 'סה"כ', 'var(--text-primary)'],
                ] as [number, string, string][]).map(([val, label, color]) => (
                  <div key={label} className="card" style={{ padding: '16px 24px', flex: '1 1 120px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color }}>{val}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* FB Token status */}
              {tokenStatus && (
                <div className="card" style={{ padding: '16px 20px', marginBottom: 16, borderRight: `4px solid ${tokenStatus.daysLeft !== null && tokenStatus.daysLeft <= 7 ? '#e63946' : tokenStatus.daysLeft !== null && tokenStatus.daysLeft <= 20 ? '#f4a261' : '#2a9d8f'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>🔑 טוקן Facebook: </span>
                      <span style={{ fontSize: '0.875rem', color: tokenStatus.daysLeft !== null && tokenStatus.daysLeft <= 7 ? '#e63946' : 'var(--text-secondary)' }}>
                        {tokenStatus.daysLeft !== null ? `${tokenStatus.daysLeft} ימים נותרו` : 'מ-env vars'}
                        {tokenStatus.expiresAt ? ` (עד ${new Date(tokenStatus.expiresAt).toLocaleDateString('he-IL')})` : ''}
                      </span>
                    </div>
                    <input
                      value={pasteToken}
                      onChange={e => setPasteToken(e.target.value)}
                      placeholder="הדבק טוקן חדש"
                      style={{ flex: 2, minWidth: 160, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8125rem', direction: 'ltr' }}
                    />
                    <button onClick={refreshFbToken} disabled={tokenRefreshing} className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {tokenRefreshing ? '⏳...' : '🔄 חדש טוקן'}
                    </button>
                  </div>
                  {/* Instructions */}
                  <details style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>איך מקבלים טוקן חדש? ⬇</summary>
                    <ol style={{ margin: '10px 0 0 0', paddingRight: 18, lineHeight: 2, direction: 'rtl' }}>
                      <li>פתח: <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-red)' }}>developers.facebook.com/tools/explorer</a></li>
                      <li>בחר את האפליקציה שלך בתפריט הנפתח למעלה מימין</li>
                      <li>לחץ <strong>Generate Access Token</strong> והתחבר אם נדרש</li>
                      <li>הוסף הרשאות: <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 4 }}>pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish</code></li>
                      <li>העתק את הטוקן שנוצר</li>
                      <li>הדבק אותו בשדה למעלה ולחץ <strong>🔄 חדש טוקן</strong></li>
                    </ol>
                  </details>
                </div>
              )}

              {/* AI Prompt generator */}
              <div className="card" style={{ padding: 20, marginBottom: 20, border: '1.5px solid var(--brand-red)', background: 'rgba(230,57,70,0.03)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10 }}>✨ צור פוסט מפרומפט</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <textarea
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    placeholder='לדוגמה: "קדם את הכתיבת ביקורת על הרכב שלך" או "הצג את 3 הרכבים המדורגים הגבוה ביותר"'
                    rows={2}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'rtl' }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateFromPrompt(); }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={generateFromPrompt}
                    disabled={promptGenerating || !promptText.trim()}
                    style={{ whiteSpace: 'nowrap', minWidth: 130 }}
                  >
                    {promptGenerating ? '⏳ מייצר + מצלם...' : '✨ צור וצלם'}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  AI יכתוב כיתוב, האשטגים ויצלם את הדף המתאים אוטומטית
                </div>
              </div>

              {/* Post type selector + generate */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>סוג פוסט:</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    ['auto',            '🔀 אוטומטי'],
                    ['top_rated',       '🏆 הכי מדורגים'],
                    ['worst_rated',     '⚠️ הכי גרועים'],
                    ['most_reviewed',   '📊 הכי מדוברים'],
                    ['new_review',      '⭐ ביקורת'],
                    ['comparison',      '⚖️ השוואה'],
                    ['car_3d_summary',  '🚗 AI + תלת מימד'],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setGeneratePostType(val)}
                      style={{ padding: '7px 14px', borderRadius: 9999, border: `1.5px solid ${generatePostType === val ? 'var(--brand-red)' : 'var(--border)'}`, background: generatePostType === val ? 'var(--brand-red)' : 'transparent', color: generatePostType === val ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={generateSocialPost} disabled={socialGenerating}>
                  {socialGenerating ? 'מייצר...' : '✨ צור פוסט'}
                </button>
                <button onClick={() => setShowNewPostForm(v => !v)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {showNewPostForm ? 'ביטול' : '+ פוסט ידני'}
                </button>
                <button onClick={fetchSocialPosts} disabled={socialFetching} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {socialFetching ? 'טוען...' : 'רענן'}
                </button>
              </div>

              {/* New post form */}
              {showNewPostForm && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 800, marginBottom: 16 }}>פוסט חדש</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>פלטפורמה</label>
                        <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value as SocialPostRow['platform'] }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {Object.entries(platformLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תזמון</label>
                        <input type="datetime-local" value={newPost.scheduled_for} onChange={e => setNewPost(p => ({ ...p, scheduled_for: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תוכן בעברית</label>
                      <textarea value={newPost.content_he} onChange={e => setNewPost(p => ({ ...p, content_he: e.target.value }))} rows={4} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'rtl' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תוכן באנגלית</label>
                      <textarea value={newPost.content_en} onChange={e => setNewPost(p => ({ ...p, content_en: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'ltr', textAlign: 'left' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>האשטגים</label>
                      <input value={newPost.hashtags} onChange={e => setNewPost(p => ({ ...p, hashtags: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', direction: 'ltr', textAlign: 'left' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={createSocialPost} disabled={socialSaving || !newPost.content_he}>
                        {socialSaving ? 'שומר...' : 'שמור פוסט'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status filter */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {(['all', 'pending', 'posted', 'failed'] as const).map(f => (
                  <button key={f} onClick={() => setSocialStatusFilter(f)} style={{ padding: '6px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: socialStatusFilter === f ? 'var(--brand-red)' : 'var(--bg-muted)', color: socialStatusFilter === f ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {f === 'all' ? 'הכל' : statusLabel[f]}
                  </button>
                ))}
              </div>

              {/* Edit modal */}
              {editSocialPost && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <div className="card" style={{ padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ fontWeight: 800, marginBottom: 16 }}>עריכת פוסט</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>פלטפורמה</label>
                          <select value={editSocialPost.platform} onChange={e => setEditSocialPost(p => p && ({ ...p, platform: e.target.value as SocialPostRow['platform'] }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {Object.entries(platformLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>סטטוס</label>
                          <select value={editSocialPost.status} onChange={e => setEditSocialPost(p => p && ({ ...p, status: e.target.value as SocialPostRow['status'] }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            <option value="pending">ממתין</option>
                            <option value="posted">פורסם</option>
                            <option value="failed">נכשל</option>
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תזמון</label>
                          <input type="datetime-local" value={editSocialPost.scheduled_for?.slice(0, 16) ?? ''} onChange={e => setEditSocialPost(p => p && ({ ...p, scheduled_for: new Date(e.target.value).toISOString() }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תוכן בעברית</label>
                        <textarea value={editSocialPost.content_he} onChange={e => setEditSocialPost(p => p && ({ ...p, content_he: e.target.value }))} rows={5} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'rtl' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תוכן באנגלית</label>
                        <textarea value={editSocialPost.content_en} onChange={e => setEditSocialPost(p => p && ({ ...p, content_en: e.target.value }))} rows={4} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'ltr', textAlign: 'left' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>האשטגים</label>
                        <input value={editSocialPost.hashtags} onChange={e => setEditSocialPost(p => p && ({ ...p, hashtags: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', direction: 'ltr', textAlign: 'left' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={saveSocialPost} disabled={socialSaving}>{socialSaving ? 'שומר...' : 'שמור'}</button>
                        <button onClick={() => setEditSocialPost(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>ביטול</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Posts list */}
              {socialFetching ? (
                <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>טוען...</div>
              ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>אין פוסטים עדיין</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filtered.map(post => (
                    <div key={post.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                            {platformLabel[post.platform] ?? post.platform}
                          </span>
                          <button
                            onClick={() => toggleSocialStatus(post.id, post.status)}
                            style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: `${statusColor[post.status]}22`, color: statusColor[post.status] }}
                          >
                            {statusLabel[post.status] ?? post.status}
                          </button>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(post.scheduled_for).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!!(post.metadata as Record<string,unknown>)?.image_url && (
                            <button onClick={() => setPreviewPost(post)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>👁 תצוגה מקדימה</button>
                          )}
                          {!!(post.metadata as Record<string,unknown>)?.image_url && post.status !== 'posted' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={includeStory} onChange={e => setIncludeStory(e.target.checked)} style={{ accentColor: 'var(--brand-red)' }} />
                                סטורי
                              </label>
                              <button onClick={() => publishPost(post)} disabled={publishingPost[post.id]} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#1877f2', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                {publishingPost[post.id] ? 'מפרסם...' : '🚀 פרסם'}
                              </button>
                            </div>
                          )}
                          {!!(post.metadata as Record<string,unknown>)?.image_url && (
                            <button onClick={() => deletePostScreenshot(post.id)} title="מחק צילום מסך" style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>🗑</button>
                          )}
                          <button onClick={() => setEditSocialPost(post)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ערוך</button>
                          <button onClick={() => deleteSocialPost(post.id)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--brand-red)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-red)' }}>מחק</button>
                        </div>
                      </div>
                      {/* Screenshot preview */}
                      {(() => {
                        const meta = post.metadata as Record<string, unknown> | null;
                        const postType = meta?.postType as string | undefined;
                        const inferredPath =
                          postType === 'top_rated' || postType === 'most_reviewed' ? '/api/og/top-ranked'
                          : postType === 'worst_rated' && meta?.carSlug ? `/api/og/ai-review/${meta.carSlug}`
                          : postType === 'new_review' && meta?.carSlug ? `/api/og/ai-review/${meta.carSlug}`
                          : postType === 'car_3d_summary' && meta?.carSlug ? `/api/og/car-3d/${meta.carSlug}`
                          : postType === 'comparison' && typeof meta?.compareUrl === 'string' ? meta.compareUrl
                          : meta?.carSlug ? `/api/og/ai-review/${meta.carSlug}`
                          : '/api/og/top-ranked';
                        const activePath = screenshotPath[post.id] !== undefined ? screenshotPath[post.id] : inferredPath;
                        const presets: [string, string][] = [
                          ['🏆', '/api/og/top-ranked'],
                          ...(meta?.carSlug ? [['🤖', `/api/og/ai-review/${meta.carSlug}`] as [string, string]] : []),
                          ['🏠', '/'],
                          ['📊', '/rankings'],
                        ];
                        return (
                          <div style={{ marginBottom: 12 }}>
                            {!!meta?.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={meta.image_url as string}
                                alt="screenshot"
                                style={{ width: '100%', borderRadius: 10, display: 'block', border: '1px solid var(--border)', maxHeight: 340, objectFit: 'cover', objectPosition: 'top', marginBottom: 8 }}
                              />
                            )}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {presets.map(([icon, p]) => (
                                <button
                                  key={p}
                                  onClick={() => setScreenshotPath(s => ({ ...s, [post.id]: p }))}
                                  title={p}
                                  style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${activePath === p ? 'var(--brand-red)' : 'var(--border)'}`, background: activePath === p ? 'rgba(230,57,70,0.1)' : 'var(--bg-muted)', cursor: 'pointer', fontSize: '0.8125rem', color: activePath === p ? 'var(--brand-red)' : 'var(--text-muted)', fontWeight: 600 }}
                                >
                                  {icon}
                                </button>
                              ))}
                              <input
                                value={activePath}
                                onChange={e => setScreenshotPath(s => ({ ...s, [post.id]: e.target.value }))}
                                style={{ flex: 1, minWidth: 160, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontSize: '0.8125rem', direction: 'ltr' }}
                              />
                              <button
                                onClick={() => captureScreenshot(post.id)}
                                disabled={screenshotting[post.id]}
                                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: meta?.image_url ? 'var(--bg-muted)' : 'var(--brand-red)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: meta?.image_url ? 'var(--text-secondary)' : '#fff', whiteSpace: 'nowrap' }}
                              >
                                {screenshotting[post.id] ? '📸 מצלם...' : meta?.image_url ? '🔄 עדכן' : '📸 צלם'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', direction: 'rtl', marginBottom: 6, lineHeight: 1.6 }}>{post.content_he}</div>
                      {post.content_en && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', marginBottom: 6 }}>{post.content_en}</div>
                      )}
                      {post.hashtags && (
                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', direction: 'ltr', textAlign: 'left' }}>{post.hashtags}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Page Management ─────────────────────────────────────────── */}
              <div className="card" style={{ marginTop: 32, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: pageManagementOpen ? 20 : 0 }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>⚙️ ניהול דף — Instagram & Facebook</h3>
                  <button
                    onClick={() => { setPageManagementOpen(v => !v); if (!pageInfo) loadPageInfo(); }}
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                  >
                    {pageManagementOpen ? 'סגור' : 'פתח'}
                  </button>
                </div>
                {pageManagementOpen && (
                  <>
                    {pageInfo && (
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)' }}>
                        {pageInfo.picture?.data?.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pageInfo.picture.data.url} alt="profile" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{pageInfo.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{pageInfo.fan_count?.toLocaleString()} עוקבים</div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>עדכן תמונת פרופיל (הדבק URL של תמונה)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            placeholder="https://..."
                            id="profile-pic-url"
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontSize: '0.875rem', direction: 'ltr' }}
                          />
                          <button
                            onClick={() => { const el = document.getElementById('profile-pic-url') as HTMLInputElement; if (el?.value) updateProfilePicture(el.value); }}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                          >
                            עדכן תמונה
                          </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>* Facebook בלבד — Instagram לא תומך בעדכון תמונת פרופיל דרך API</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תיאור קצר (About)</label>
                        <input value={pageInfoForm.about} onChange={e => setPageInfoForm(f => ({ ...f, about: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontSize: '0.875rem', direction: 'rtl' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>תיאור מלא</label>
                        <textarea value={pageInfoForm.description} onChange={e => setPageInfoForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', direction: 'rtl' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>אתר</label>
                        <input value={pageInfoForm.website} onChange={e => setPageInfoForm(f => ({ ...f, website: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontSize: '0.875rem', direction: 'ltr' }} />
                      </div>
                      <button onClick={savePageInfo} disabled={pageInfoSaving} className="btn btn-primary" style={{ width: 'fit-content' }}>
                        {pageInfoSaving ? 'שומר...' : 'שמור פרטי דף'}
                      </button>
                    </div>

                    {/* Existing posts */}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <h4 style={{ fontWeight: 800, fontSize: '0.9375rem', margin: 0 }}>פוסטים קיימים</h4>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(['instagram', 'facebook'] as const).map(pl => (
                            <button key={pl} onClick={() => setExistingPostsTab(pl)} style={{ padding: '5px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: existingPostsTab === pl ? 'var(--brand-red)' : 'var(--bg-muted)', color: existingPostsTab === pl ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8125rem' }}>
                              {pl === 'instagram' ? 'Instagram' : 'Facebook'}
                            </button>
                          ))}
                          <button onClick={loadExistingPosts} disabled={loadingExisting} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {loadingExisting ? 'טוען...' : 'טען'}
                          </button>
                        </div>
                      </div>
                      {existingPostsTab === 'instagram' && igPosts.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                          {igPosts.map(p => (
                            <div key={p.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.media_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }} />
                              <button
                                onClick={() => deleteIgPost(p.id)}
                                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(230,57,70,0.9)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >×</button>
                              <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: 4, left: 4, fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 6px', borderRadius: 4, textDecoration: 'none' }}>↗</a>
                            </div>
                          ))}
                        </div>
                      )}
                      {existingPostsTab === 'facebook' && fbPosts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {fbPosts.map(p => (
                            <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                              {p.full_picture && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.full_picture} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', direction: 'rtl', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.message ?? '—'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(p.created_time).toLocaleDateString('he-IL')}</div>
                              </div>
                              <button onClick={() => deleteFbPost(p.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brand-red)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--brand-red)', fontWeight: 600, flexShrink: 0 }}>מחק</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {((existingPostsTab === 'instagram' && igPosts.length === 0) || (existingPostsTab === 'facebook' && fbPosts.length === 0)) && !loadingExisting && (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.875rem' }}>לחץ "טען" כדי לראות פוסטים קיימים</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        })()}

        {/* ── Post Preview Modal ───────────────────────────────────────────────── */}
        {previewPost && (() => {
          const meta = previewPost.metadata as Record<string, unknown> | null;
          const imageUrl = meta?.image_url as string | undefined;
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setPreviewPost(null)}>
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Instagram preview */}
                <div style={{ background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid #262626', marginBottom: 16 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.75rem', flexShrink: 0 }}>CI</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8125rem' }}>carissuesil</div>
                      <div style={{ color: '#a8a8a8', fontSize: '0.7rem' }}>ממומן</div>
                    </div>
                    <div style={{ marginRight: 'auto', color: '#a8a8a8', fontSize: '1.2rem' }}>···</div>
                  </div>
                  {/* Image */}
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="post" style={{ width: '100%', display: 'block', aspectRatio: '1.91', objectFit: 'cover' }} />
                  )}
                  {/* Actions */}
                  <div style={{ padding: '10px 14px 4px' }}>
                    <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>🤍</span>
                      <span style={{ fontSize: '1.4rem' }}>💬</span>
                      <span style={{ fontSize: '1.4rem' }}>📤</span>
                      <span style={{ marginRight: 'auto', fontSize: '1.4rem' }}>🔖</span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 700, marginBottom: 4 }}>0 לייקים</div>
                    <div style={{ color: '#fff', fontSize: '0.8125rem', direction: 'rtl', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700 }}>carissuesil </span>
                      {previewPost.content_he.slice(0, 120)}{previewPost.content_he.length > 120 ? '... ' : ' '}
                      {previewPost.content_he.length > 120 && <span style={{ color: '#a8a8a8' }}>עוד</span>}
                    </div>
                    <div style={{ color: '#3897f0', fontSize: '0.8125rem', marginTop: 4, direction: 'ltr', textAlign: 'left' }}>{previewPost.hashtags}</div>
                    <div style={{ color: '#a8a8a8', fontSize: '0.7rem', marginTop: 6 }}>עכשיו</div>
                  </div>
                </div>

                {/* Facebook preview */}
                <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.875rem', flexShrink: 0 }}>CI</div>
                    <div>
                      <div style={{ color: '#050505', fontWeight: 700, fontSize: '0.875rem' }}>CarIssues IL</div>
                      <div style={{ color: '#65676b', fontSize: '0.75rem' }}>עכשיו · 🌐</div>
                    </div>
                    <div style={{ marginRight: 'auto', color: '#65676b', fontSize: '1.2rem' }}>···</div>
                  </div>
                  <div style={{ padding: '0 16px 10px', color: '#050505', fontSize: '0.9375rem', direction: 'rtl', lineHeight: 1.6 }}>
                    {previewPost.content_he}
                    <div style={{ color: '#1877f2', marginTop: 4, fontSize: '0.875rem' }}>{previewPost.hashtags}</div>
                  </div>
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="post" style={{ width: '100%', display: 'block' }} />
                  )}
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #e4e6eb', display: 'flex', gap: 4 }}>
                    {['👍 לייק', '💬 תגובה', '↗ שיתוף'].map(a => (
                      <div key={a} style={{ flex: 1, textAlign: 'center', padding: '6px', borderRadius: 6, color: '#65676b', fontSize: '0.8125rem', fontWeight: 600 }}>{a}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={includeStory} onChange={e => setIncludeStory(e.target.checked)} style={{ accentColor: '#dc2743', width: 16, height: 16 }} />
                    + סטורי
                  </label>
                  <button
                    onClick={() => { publishPost(previewPost); setPreviewPost(null); }}
                    disabled={publishingPost[previewPost.id]}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)', cursor: 'pointer', fontWeight: 800, color: '#fff', fontSize: '0.9375rem' }}
                  >
                    {publishingPost[previewPost.id] ? 'מפרסם...' : `🚀 פרסם${includeStory ? ' + סטורי' : ''}`}
                  </button>
                  <button onClick={() => setPreviewPost(null)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>סגור</button>
                </div>
              </div>
            </div>
          );
        })()}

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
                  const make = report.reviews ? carsMap.get(report.reviews.make_slug) : null;
                  const model = make?.models.find(m => m.slug === (report.reviews?.model_slug ?? ''));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        {/* Vercel Analytics link */}
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textDecoration: 'none' }}
        >
          <span>▲</span>
          <span>Vercel Analytics</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(מדויק יותר · מדינות · מכשירים)</span>
        </a>
        <button onClick={onRefresh} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          רענן
        </button>
      </div>

      {/* Note about session count */}
      <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-primary)' }}>מבקרים ייחודיים</strong> — מחושב לפי session ID מטבלת page_views שלנו. הספירה כוללת גם בוטים, סורקי גוגל ועכביש-אינטרנט. לנתונים מסוננים עם מדינות ומכשירים, השתמש ב-Vercel Analytics ↗
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
