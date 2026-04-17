'use client';

import { useEffect, useState, useCallback, useRef, Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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


function AdminPageInner() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const VALID_TABS: Tab[] = ['reviews_ai', 'user_reviews', 'reports', 'metrics', 'users', 'social_posts'];
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [tab, setTabState] = useState<Tab>(VALID_TABS.includes(tabFromUrl as Tab) ? tabFromUrl! : 'user_reviews');

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.pushState({}, '', url.toString());
  }, []);

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
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<SocialPostRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [socialSaving, setSocialSaving] = useState(false);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ platform: 'all' as SocialPostRow['platform'], content_he: '', content_en: '', hashtags: '#רכב #ישראל #CarIssuesIL', scheduled_for: new Date().toISOString().slice(0, 16) });
  const [generatePostType, setGeneratePostType] = useState<'auto' | 'top_rated' | 'worst_rated' | 'most_reviewed' | 'new_review' | 'comparison' | 'car_3d_summary'>('auto');
  const [promptText, setPromptText] = useState('');
  const [promptGenerating, setPromptGenerating] = useState(false);
  const [includeStory, setIncludeStory] = useState(true);
  const [includeReel, setIncludeReel] = useState(false);
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
  const [storyHelper, setStoryHelper] = useState<{ storyImageUrl: string; carUrl: string } | null>(null);
  const [reelHelper, setReelHelper] = useState<{ reelUrl: string; carUrl: string } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ daysLeft: number | null; expiresAt: string | null } | null>(null);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [pasteToken, setPasteToken] = useState('');
  const [reelToast, setReelToast] = useState<string | null>(null);
  const socialPostsRef = useRef<SocialPostRow[]>([]);


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

  // Keep a ref in sync so polling closure can compare without stale state
  useEffect(() => { socialPostsRef.current = socialPosts; }, [socialPosts]);

  // Auto-poll every 15s while any reel is generating
  useEffect(() => {
    if (!isAdmin || tab !== 'social_posts') return;
    const poll = async () => {
      const hasGenerating = socialPostsRef.current.some(p => (p.metadata?.reel_status as string) === 'generating' && !p.metadata?.reel_url);
      if (!hasGenerating) return;
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/social-posts', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const newPosts: SocialPostRow[] = await res.json();
        const newlyReady = newPosts.filter(np => {
          const prev = socialPostsRef.current.find(op => op.id === np.id);
          return prev && (prev.metadata?.reel_status as string) === 'generating' && !prev.metadata?.reel_url && !!np.metadata?.reel_url;
        });
        const newlyFailed = newPosts.filter(np => {
          const prev = socialPostsRef.current.find(op => op.id === np.id);
          return prev && (prev.metadata?.reel_status as string) === 'generating' && (np.metadata?.reel_status as string) === 'failed';
        });
        setSocialPosts(newPosts);
        if (newlyReady.length > 0) {
          setReelToast(`✅ ריל מוכן! לחץ על "שתף ריל / סטורי" כדי לפרסם`);
          setTimeout(() => setReelToast(null), 8000);
        } else if (newlyFailed.length > 0) {
          setReelToast(`❌ יצירת הריל נכשלה — לחץ על "לוגים" לפרטים`);
          setTimeout(() => setReelToast(null), 10000);
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [isAdmin, tab, getToken]);

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

  const clearFbToken = async () => {
    if (!confirm('למחוק את הטוקן השמור? תצטרך להדביק טוקן חדש כדי לפרסם.')) return;
    const t = await getToken();
    await fetch('/api/admin/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ action: 'clear_token' }),
    });
    setTokenStatus(null);
  };

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

  const deleteSocialPost = async (post: SocialPostRow, fromPlatforms: boolean) => {
    setDeleting(true);
    try {
      const token = await getToken();
      const meta = post.metadata as Record<string, unknown> | null;
      if (fromPlatforms) {
        const igId = meta?.ig_post_id as string | undefined;
        const fbId = meta?.fb_post_id as string | undefined;
        if (igId) await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete_ig_post', mediaId: igId }) });
        if (fbId) await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete_fb_post', fbPostId: fbId }) });
      }
      await fetch('/api/admin/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', id: post.id }),
      });
      setDeleteConfirmPost(null);
      await fetchSocialPosts();
    } finally {
      setDeleting(false);
    }
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

  const resetPost = async (id: string) => {
    const token = await getToken();
    await fetch('/api/admin/social-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'reset_post', id }),
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
        body: JSON.stringify({ action: 'publish', imageUrl, storyImageUrl: (meta?.story_image_url as string) ?? undefined, caption: post.content_he, hashtags: post.hashtags, postId: post.id, includeStory, storyLink: meta?.carSlug ? `https://carissues.co.il/cars/${meta.carSlug}` : undefined, reelUrl: (includeReel && meta?.reel_url) ? (meta.reel_url as string) : undefined }),
      });
      const data = await res.json();
      // Build a human-readable per-platform result
      const lines: string[] = [`סטטוס HTTP: ${res.status}`, ''];
      if (data.ig_post_id) {
        lines.push(`📸 Instagram: ✅ פורסם`);
        if (data.ig_permalink) lines.push(`   קישור: ${data.ig_permalink}`);
      } else {
        lines.push(`📸 Instagram: ❌ נכשל`);
        if (data.instagram_error) lines.push(`   שגיאה: ${data.instagram_error}`);
      }
      if (data.fb_post_id) {
        lines.push(`👍 Facebook: ✅ פורסם`);
        if (data.fb_post_url) lines.push(`   קישור: ${data.fb_post_url}`);
      } else {
        lines.push(`👍 Facebook: ❌ נכשל`);
        if (data.facebook_error) lines.push(`   שגיאה: ${data.facebook_error}`);
      }
      if (includeStory) {
        if (data.instagram_story?.id) {
          lines.push(`📖 Instagram סטורי: ✅ פורסם`);
        } else {
          lines.push(`📖 Instagram סטורי: ❌ נכשל`);
          if (data.instagram_story_error) lines.push(`   שגיאה: ${data.instagram_story_error}`);
        }
        if (data.facebook_story?.id) {
          lines.push(`📖 Facebook סטורי: ✅ פורסם`);
        } else {
          lines.push(`📖 Facebook סטורי: ❌ נכשל`);
          if (data.facebook_story_error) lines.push(`   שגיאה: ${data.facebook_story_error}`);
        }
      }
      if (!data.ig_post_id && !data.fb_post_id) {
        lines.push('', '⚠️ שום דבר לא פורסם בפועל');
      }
      alert(lines.join('\n'));
      await fetchSocialPosts();
      // After successful post, show story helper if story was requested
      if (includeStory && (data.ig_post_id || data.fb_post_id)) {
        const storyImageUrl = (meta?.story_image_url as string) ?? (meta?.image_url as string) ?? '';
        const carUrl = meta?.carSlug ? `https://carissues.co.il/cars/${meta.carSlug}` : 'https://carissues.co.il';
        if (storyImageUrl) setStoryHelper({ storyImageUrl, carUrl });
      }
    } catch (err) {
      alert(`שגיאת רשת: ${String(err)}`);
    } finally {
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
      {/* Reel status toast */}
      {reelToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#1a1a2e', border: '1px solid #7c3aed',
          color: '#fff', padding: '12px 24px', borderRadius: 12,
          fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>{reelToast}</span>
          <button onClick={() => setReelToast(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>✕</button>
        </div>
      )}
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
          const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', posted: '#10b981', failed: '#f43f5e' };
          const STATUS_LABEL: Record<string, string> = { pending: 'ממתין לפרסום', posted: 'פורסם', failed: 'נכשל' };
          const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)', fontSize: '0.875rem' };
          const lbl: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };
          return (
            <>
              {/* ═══ HEADER ROW: counters + refresh ══════════════════════════ */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
                {([
                  [socialPosts.filter(p => p.status === 'pending').length, 'ממתינים', '#f59e0b', 'pending'],
                  [socialPosts.filter(p => p.status === 'posted').length,  'פורסמו',  '#10b981', 'posted'],
                  [socialPosts.filter(p => p.status === 'failed').length,  'נכשלו',   '#f43f5e', 'failed'],
                  [socialPosts.length, 'סה״כ', 'var(--text-secondary)', 'all'],
                ] as [number, string, string, typeof socialStatusFilter][]).map(([n, label, color, f]) => (
                  <button key={f} onClick={() => setSocialStatusFilter(f)} style={{
                    flex: '1 1 72px', padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${socialStatusFilter === f ? color : 'var(--border)'}`,
                    background: socialStatusFilter === f ? `${color}15` : 'var(--bg-card)',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1.1 }}>{n}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</div>
                  </button>
                ))}
                <button onClick={fetchSocialPosts} disabled={socialFetching} title="רענן" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                  {socialFetching ? '⏳' : '↻'}
                </button>
              </div>

              {/* ═══ FB TOKEN STATUS ══════════════════════════════════════════ */}
              {tokenStatus && (() => {
                const urgent = tokenStatus.daysLeft !== null && tokenStatus.daysLeft <= 7;
                const warn   = tokenStatus.daysLeft !== null && tokenStatus.daysLeft <= 20;
                const col = urgent ? '#f43f5e' : warn ? '#f59e0b' : '#10b981';
                const icon = urgent ? '🔴' : warn ? '🟡' : '🟢';
                return (
                  <div style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${col}40`, background: `${col}08`, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: col, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {icon} Facebook Token
                        {tokenStatus.daysLeft !== null
                          ? ` · ${tokenStatus.daysLeft} ימים`
                          : ' · env var'}
                        {tokenStatus.expiresAt ? ` (עד ${new Date(tokenStatus.expiresAt).toLocaleDateString('he-IL')})` : ''}
                      </span>
                      <input value={pasteToken} onChange={e => setPasteToken(e.target.value)} placeholder="הדבק טוקן חדש מ-Graph Explorer" style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 7, border: `1px solid ${col}60`, background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8rem', direction: 'ltr' }} />
                      <button onClick={refreshFbToken} disabled={tokenRefreshing} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {tokenRefreshing ? '⏳' : '🔄 חדש'}
                      </button>
                      <button onClick={async () => { const t = await getToken(); try { const r = await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ action: 'debug_publish' }) }); alert(JSON.stringify(await r.json(), null, 2)); } catch(e) { alert(String(e)); } }}
                        style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🔍 בדוק
                      </button>
                      <button onClick={clearFbToken}
                        style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #f43f5e60', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: '#f43f5e', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        🗑️ נקה טוקן
                      </button>
                    </div>
                    <details style={{ borderTop: `1px solid ${col}20` }}>
                      <summary style={{ padding: '7px 14px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', listStyle: 'none' }}>▸ איך מקבלים טוקן חדש?</summary>
                      <ol style={{ margin: 0, padding: '8px 14px 12px 14px', paddingRight: 30, lineHeight: 2, direction: 'rtl', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <li>פתח <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-red)' }}>Graph API Explorer</a></li>
                        <li>בחר את האפליקציה → לחץ <strong>Generate Access Token</strong></li>
                        <li>הוסף הרשאות: <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 3, fontSize: '0.72rem' }}>pages_manage_posts, instagram_content_publish</code></li>
                        <li>העתק → הדבק למעלה → לחץ <strong>🔄 חדש</strong></li>
                      </ol>
                    </details>
                  </div>
                );
              })()}

              {/* ═══ AI GENERATOR ════════════════════════════════════════════ */}
              <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                {/* Prompt row */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✨ יצירת פוסט עם AI</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateFromPrompt(); }}
                      placeholder='תאר את הפוסט — לדוגמה: "3 הרכבים הכי מומלצים" — Ctrl+Enter'
                      rows={2} style={{ flex: 1, ...inp, resize: 'none', direction: 'rtl', fontFamily: 'inherit' }} />
                    <button onClick={generateFromPrompt} disabled={promptGenerating || !promptText.trim()} className="btn btn-primary" style={{ alignSelf: 'stretch', padding: '0 16px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {promptGenerating ? '⏳' : '✨ צור'}
                    </button>
                  </div>
                </div>
                {/* Quick type chips */}
                <div style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}>סוג:</span>
                  {([
                    ['auto','🔀 אוטו'],['top_rated','🏆 מדורגים'],['worst_rated','⚠️ גרועים'],
                    ['most_reviewed','📊 מדוברים'],['new_review','⭐ ביקורת'],['comparison','⚖️ השוואה'],['car_3d_summary','🚗 3D'],
                  ] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setGeneratePostType(val)} style={{
                      padding: '4px 10px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      border: `1.5px solid ${generatePostType === val ? 'var(--brand-red)' : 'var(--border)'}`,
                      background: generatePostType === val ? 'var(--brand-red)' : 'transparent',
                      color: generatePostType === val ? '#fff' : 'var(--text-secondary)',
                    }}>{label}</button>
                  ))}
                  <button onClick={generateSocialPost} disabled={socialGenerating} style={{ padding: '4px 12px', borderRadius: 9999, border: 'none', background: 'var(--bg-muted)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {socialGenerating ? '⏳...' : '→ צור'}
                  </button>
                  <button onClick={() => setShowNewPostForm(v => !v)} style={{ marginRight: 'auto', padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {showNewPostForm ? '✕ ביטול' : '+ ידני'}
                  </button>
                  <button onClick={async () => {
                    if (!confirm('אחזור סרטוני YouTube לכל הרכבים — עשוי לקחת כמה דקות. להמשיך?')) return;
                    const t = await getToken();
                    const r = await fetch('/api/admin/fetch-videos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ all: true }) });
                    const d = await r.json();
                    alert(`סרטונים נוספו: ${d.totalInserted ?? 0}${d.errors?.length ? '\nשגיאות: ' + d.errors.join(', ') : ''}`);
                  }} style={{ padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    🎬 סרטוני YouTube
                  </button>
                </div>
              </div>

              {/* ═══ NEW POST FORM (manual) ══════════════════════════════════ */}
              {showNewPostForm && (
                <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '16px 18px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>פוסט ידני חדש</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 130px' }}>
                        <label style={lbl}>פלטפורמה</label>
                        <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value as SocialPostRow['platform'] }))} style={inp}>
                          {Object.entries(platformLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 170px' }}>
                        <label style={lbl}>תזמון</label>
                        <input type="datetime-local" value={newPost.scheduled_for} onChange={e => setNewPost(p => ({ ...p, scheduled_for: e.target.value }))} style={inp} />
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>תוכן עברית</label>
                      <textarea value={newPost.content_he} onChange={e => setNewPost(p => ({ ...p, content_he: e.target.value }))} rows={4} style={{ ...inp, resize: 'vertical', direction: 'rtl', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={lbl}>האשטגים</label>
                      <input value={newPost.hashtags} onChange={e => setNewPost(p => ({ ...p, hashtags: e.target.value }))} style={{ ...inp, direction: 'ltr' }} />
                    </div>
                    <button className="btn btn-primary" onClick={createSocialPost} disabled={socialSaving || !newPost.content_he} style={{ width: 'fit-content' }}>
                      {socialSaving ? 'שומר...' : 'שמור פוסט'}
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ DELETE CONFIRM DIALOG ═══════════════════════════════════ */}
              {deleteConfirmPost && (() => {
                const m = deleteConfirmPost.metadata as Record<string, unknown> | null;
                const hasIg = !!m?.ig_post_id;
                const hasFb = !!m?.fb_post_id;
                const isPostedAnywhere = hasIg || hasFb;
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 400, border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>🗑️ מחיקת פוסט</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        {isPostedAnywhere
                          ? `פוסט זה פורסם ב-${[hasIg && 'Instagram', hasFb && 'Facebook'].filter(Boolean).join(' + ')}. למחוק גם משם?`
                          : 'פוסט זה לא פורסם בפלטפורמות. למחוק מהמערכת?'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button onClick={() => setDeleteConfirmPost(null)} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.5 : 1 }}>ביטול</button>
                        <button onClick={() => deleteSocialPost(deleteConfirmPost, false)} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--bg-muted)', cursor: deleting ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}>{deleting ? '⏳...' : 'מחק מהמערכת בלבד'}</button>
                        {isPostedAnywhere && (
                          <button onClick={() => deleteSocialPost(deleteConfirmPost, true)} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f43f5e', color: '#fff', cursor: deleting ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}>{deleting ? '⏳ מוחק...' : 'מחק מכל הפלטפורמות'}</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ═══ EDIT MODAL ══════════════════════════════════════════════ */}
              {editSocialPost && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>✏️ עריכת פוסט</span>
                      <button onClick={() => setEditSocialPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 130px' }}>
                          <label style={lbl}>פלטפורמה</label>
                          <select value={editSocialPost.platform} onChange={e => setEditSocialPost(p => p && ({ ...p, platform: e.target.value as SocialPostRow['platform'] }))} style={inp}>
                            {Object.entries(platformLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: '1 1 130px' }}>
                          <label style={lbl}>סטטוס</label>
                          <select value={editSocialPost.status} onChange={e => setEditSocialPost(p => p && ({ ...p, status: e.target.value as SocialPostRow['status'] }))} style={inp}>
                            <option value="pending">ממתין</option><option value="posted">פורסם</option><option value="failed">נכשל</option>
                          </select>
                        </div>
                        <div style={{ flex: '1 1 170px' }}>
                          <label style={lbl}>תזמון</label>
                          <input type="datetime-local" value={editSocialPost.scheduled_for?.slice(0, 16) ?? ''} onChange={e => setEditSocialPost(p => p && ({ ...p, scheduled_for: new Date(e.target.value).toISOString() }))} style={inp} />
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>תוכן עברית</label>
                        <textarea value={editSocialPost.content_he} onChange={e => setEditSocialPost(p => p && ({ ...p, content_he: e.target.value }))} rows={5} style={{ ...inp, resize: 'vertical', direction: 'rtl', fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={lbl}>תוכן אנגלית</label>
                        <textarea value={editSocialPost.content_en} onChange={e => setEditSocialPost(p => p && ({ ...p, content_en: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical', direction: 'ltr', textAlign: 'left', fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={lbl}>האשטגים</label>
                        <input value={editSocialPost.hashtags} onChange={e => setEditSocialPost(p => p && ({ ...p, hashtags: e.target.value }))} style={{ ...inp, direction: 'ltr', textAlign: 'left' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                        <button className="btn btn-primary" onClick={saveSocialPost} disabled={socialSaving}>{socialSaving ? 'שומר...' : 'שמור שינויים'}</button>
                        <button onClick={() => setEditSocialPost(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>ביטול</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ POSTS LIST ══════════════════════════════════════════════ */}
              {socialFetching ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: '0.9rem' }}>טוען פוסטים...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', borderRadius: 10, border: '1px dashed var(--border)' }}>
                  {socialStatusFilter === 'all' ? 'אין פוסטים עדיין — השתמש ב-AI למעלה' : `אין פוסטים עם סטטוס "${STATUS_LABEL[socialStatusFilter] ?? socialStatusFilter}"`}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filtered.map(post => {
                    const meta = post.metadata as Record<string, unknown> | null;
                    const isPosted = post.status === 'posted';
                    const isFailed = post.status === 'failed';
                    const isPending = post.status === 'pending';
                    const thumbUrl = (meta?.ig_media_url || meta?.image_url) as string | undefined;
                    const hasLocalImg = !!meta?.image_url;
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
                    const presets: [string, string][] = [['🏆','/api/og/top-ranked'],['🏠','/'],['📊','/rankings'],...(meta?.carSlug ? [['🤖',`/api/og/ai-review/${meta.carSlug}`] as [string,string]] : [])];
                    const igOk = !!meta?.ig_post_id;
                    const fbOk = !!meta?.fb_post_id;
                    const igStoryOk = !!(meta?.instagram_story as Record<string,unknown>|undefined)?.id;
                    const fbStoryOk = !!(meta?.facebook_story as Record<string,unknown>|undefined)?.id;
                    const hasStoryResult = igStoryOk || fbStoryOk || !!meta?.instagram_story_error || !!meta?.facebook_story_error;
                    const statusC = STATUS_COLOR[post.status] ?? '#888';
                    const isPublishing = !!publishingPost[post.id];
                    const isScreenshotting = !!screenshotting[post.id];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const platformRow = (isPosted || isFailed) ? (
                      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>📸</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>Instagram</span>
                          {igOk ? (
                            <>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981' }}>✓ פורסם</span>
                              <a href={String(meta?.ig_permalink ?? '#')} target="_blank" rel="noreferrer" style={{ marginRight: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textDecoration: 'none', padding: '2px 8px', borderRadius: 5, border: '1px solid #10b98140', whiteSpace: 'nowrap' }}>↗ פתח בIG</a>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f43f5e' }}>✗ נכשל</span>
                              {!!meta?.instagram_error ? (
                                <span style={{ fontSize: '0.68rem', color: '#f43f5e', flex: 1, direction: 'ltr', textAlign: 'left', userSelect: 'text', cursor: 'text', wordBreak: 'break-all' }}>
                                  {String(meta.instagram_error)}
                                  <button onClick={() => navigator.clipboard.writeText(String(meta.instagram_error))} title="העתק שגיאה" style={{ marginRight: 6, padding: '1px 6px', fontSize: '0.65rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #f43f5e80', background: 'transparent', color: '#f43f5e' }}>העתק</button>
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: hasStoryResult ? '1px solid var(--border)' : undefined }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>👍</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>Facebook</span>
                          {fbOk ? (
                            <>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981' }}>✓ פורסם</span>
                              <a href={String(meta?.fb_post_url ?? '#')} target="_blank" rel="noreferrer" style={{ marginRight: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#1877f2', textDecoration: 'none', padding: '2px 8px', borderRadius: 5, border: '1px solid #1877f240', whiteSpace: 'nowrap' }}>↗ פתח בFB</a>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f43f5e' }}>✗ נכשל</span>
                              {!!meta?.facebook_error ? (
                                <span style={{ fontSize: '0.68rem', color: '#f43f5e', flex: 1, direction: 'ltr', textAlign: 'left', userSelect: 'text', cursor: 'text', wordBreak: 'break-all' }}>
                                  {String(meta.facebook_error)}
                                  <button onClick={() => navigator.clipboard.writeText(String(meta.facebook_error))} title="העתק שגיאה" style={{ marginRight: 6, padding: '1px 6px', fontSize: '0.65rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #f43f5e80', background: 'transparent', color: '#f43f5e' }}>העתק</button>
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                        {hasStoryResult ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>🎬</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>Story</span>
                            {(igStoryOk || fbStoryOk)
                              ? <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981' }}>✓ פורסם</span>
                              : <>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f43f5e' }}>✗ נכשל</span>
                                  {!!(meta?.instagram_story_error || meta?.facebook_story_error) ? (
                                    <span style={{ fontSize: '0.68rem', color: '#f43f5e', flex: 1, direction: 'ltr', textAlign: 'left', userSelect: 'text', cursor: 'text', wordBreak: 'break-all' }}>
                                      {String(meta?.instagram_story_error || meta?.facebook_story_error)}
                                      <button onClick={() => navigator.clipboard.writeText(String(meta?.instagram_story_error || meta?.facebook_story_error))} style={{ marginRight: 6, padding: '1px 6px', fontSize: '0.65rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #f43f5e80', background: 'transparent', color: '#f43f5e' }}>העתק</button>
                                    </span>
                                  ) : null}
                                </>
                            }
                          </div>
                        ) : null}
                      </div>
                    ) : null;

                    return (
                      <div key={post.id} style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', borderRight: `4px solid ${statusC}` }}>

                        {/* ── ROW 1: STATUS + META + ACTIONS ──────────────── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                          {/* Status pill */}
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 9999, background: `${statusC}20`, color: statusC, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                            {isPosted ? '✓ פורסם' : isFailed ? '✗ נכשל' : '◎ ממתין'}
                          </span>
                          {/* Platform chip */}
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'var(--bg-muted)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {platformLabel[post.platform] ?? post.platform}
                          </span>
                          {/* Date */}
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                            {new Date(post.scheduled_for).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {(isPosted || isFailed) && (
                              <button onClick={() => resetPost(post.id)} title="אפס לממתין" style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>↺ אפס</button>
                            )}
                            <button onClick={() => setEditSocialPost(post)} title="ערוך" style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>✏️</button>
                            <button onClick={() => setDeleteConfirmPost(post)} title="מחק" style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #f43f5e40', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#f43f5e' }}>🗑</button>
                          </div>
                        </div>

                        {/* ── ROW 2: THUMBNAIL + CONTENT ───────────────────── */}
                        <div style={{ display: 'flex' }}>
                          {/* Thumbnail */}
                          {!!thumbUrl && (
                            <div style={{ flexShrink: 0, width: 100, position: 'relative', background: 'var(--bg-muted)' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 80 }} />
                              {hasLocalImg && (
                                <button onClick={() => setPreviewPost(post)} title="תצוגה מקדימה" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}
                                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                >👁</button>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', direction: 'rtl', lineHeight: 1.65, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {post.content_he}
                            </div>
                            {post.hashtags && (
                              <div style={{ fontSize: '0.72rem', color: '#3b82f6', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {post.hashtags}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── ROW 3A: PLATFORM RESULTS (posted/failed) ─────── */}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {platformRow as any}

                        {/* ── ROW 3C: METRICS (posted only) ───────────────── */}
                        {isPosted && (igOk || fbOk) ? (() => {
                          const m = meta as Record<string, unknown> | null;
                          const hasMetrics = !!(m && Object.keys(m).some(k => k.startsWith('ig_') && !['ig_post_id','ig_permalink','ig_media_url'].includes(k)));
                          return (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>📊</span>
                              {hasMetrics ? (
                                <>
                                  {m?.ig_impressions != null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>👁 {String(m.ig_impressions)}</span> : null}
                                  {m?.ig_reach != null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>📡 {String(m.ig_reach)}</span> : null}
                                  {m?.ig_likes != null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>❤️ {String(m.ig_likes)}</span> : null}
                                  {m?.ig_comments != null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>💬 {String(m.ig_comments)}</span> : null}
                                  {m?.ig_saved != null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>🔖 {String(m.ig_saved)}</span> : null}
                                </>
                              ) : (
                                <button onClick={async () => {
                                  const t = await getToken();
                                  const r = await fetch('/api/admin/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ action: 'get_metrics', igPostId: meta?.ig_post_id, fbPostId: meta?.fb_post_id }) });
                                  const d = await r.json();
                                  const tok = await getToken();
                                  await fetch('/api/admin/social-posts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ action: 'update', id: post.id, metadata: { ...meta, ...d } }) });
                                  await fetchSocialPosts();
                                }} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}>
                                  טען מדדים
                                </button>
                              )}
                            </div>
                          );
                        })() : null}

                        {/* ── ROW 3B: SCREENSHOT TOOLS (pending/failed) ────── */}
                        {(isPending || isFailed) && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg-muted)' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                              {hasLocalImg ? '📸 תמונה מוכנה' : '📸 בחר תמונה לפרסום'}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {/* Path preset buttons */}
                              {presets.map(([icon, p]) => (
                                <button key={p} onClick={() => setScreenshotPath(s => ({ ...s, [post.id]: p }))} title={p} style={{
                                  padding: '5px 9px', borderRadius: 7, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                                  border: `1.5px solid ${activePath === p ? 'var(--brand-red)' : 'var(--border)'}`,
                                  background: activePath === p ? 'rgba(230,57,70,0.1)' : 'var(--bg-card)',
                                  color: activePath === p ? 'var(--brand-red)' : 'var(--text-muted)',
                                }}>{icon}</button>
                              ))}
                              {/* Custom path input */}
                              <input value={activePath} onChange={e => setScreenshotPath(s => ({ ...s, [post.id]: e.target.value }))}
                                style={{ flex: 1, minWidth: 110, padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.72rem', direction: 'ltr' }} />
                              {/* Capture button */}
                              <button onClick={() => captureScreenshot(post.id)} disabled={isScreenshotting} style={{
                                padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
                                background: isScreenshotting ? 'var(--bg-muted)' : hasLocalImg ? 'var(--bg-muted)' : 'var(--brand-red)',
                                color: isScreenshotting ? 'var(--text-muted)' : hasLocalImg ? 'var(--text-secondary)' : '#fff',
                                border: hasLocalImg && !isScreenshotting ? '1px solid var(--border)' : 'none',
                              }}>
                                {isScreenshotting ? '📸...' : hasLocalImg ? '↻ עדכן' : '📸 צלם'}
                              </button>
                              {hasLocalImg && (
                                <button onClick={() => deletePostScreenshot(post.id)} title="מחק תמונה" style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>✕</button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── ROW 3D: REEL (car_3d_summary only) ─────────── */}
                        {postType === 'car_3d_summary' && meta?.carSlug && (() => {
                          const reelUrl = meta?.reel_url as string | undefined;
                          const reelStatus = meta?.reel_status as string | undefined;
                          const reelLogsUrl = meta?.reel_logs_url as string | undefined;
                          const isGenerating = reelStatus === 'generating';
                          const isFailed = reelStatus === 'failed';
                          const slugParts = (meta.carSlug as string).split('/');
                          const [mkSlug, mdSlug] = slugParts;
                          const carUrl = `https://carissues.co.il/cars/${meta.carSlug}`;
                          return (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🎬 ריל</span>
                              {reelUrl ? (
                                <>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>✓ מוכן</span>
                                  <button onClick={() => setReelHelper({ reelUrl: reelUrl!, carUrl })}
                                    style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    📤 שתף
                                  </button>
                                  <a href={reelUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>↗ פתח</a>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('מחק את הריל מהאחסון ואפשר יצירה מחדש?')) return;
                                      const t = await getToken();
                                      await fetch('/api/admin/trigger-reel', {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                        body: JSON.stringify({ makeSlug: mkSlug, modelSlug: mdSlug, postId: post.id }),
                                      });
                                      await fetchSocialPosts();
                                    }}
                                    title="מחק ריל מהאחסון"
                                    style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #f43f5e40', background: 'transparent', color: '#f43f5e', cursor: 'pointer', fontSize: '0.68rem', marginRight: 'auto' }}>
                                    🗑
                                  </button>
                                </>
                              ) : isFailed ? (
                                <>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-red)' }}>✗ נכשל</span>
                                  {reelLogsUrl && (
                                    <a href={reelLogsUrl} target="_blank" rel="noreferrer"
                                      style={{ fontSize: '0.72rem', color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>
                                      📋 לוגים
                                    </a>
                                  )}
                                  <button
                                    onClick={async () => {
                                      const t = await getToken();
                                      const r = await fetch('/api/admin/trigger-reel', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                        body: JSON.stringify({ makeSlug: mkSlug, modelSlug: mdSlug, postId: post.id }),
                                      });
                                      const d = await r.json();
                                      if (d.ok) { await fetchSocialPosts(); setReelToast('⏳ ריל בהכנה (~5 דק׳)... הדף יתעדכן אוטומטית'); setTimeout(() => setReelToast(null), 6000); }
                                      else alert('שגיאה: ' + d.error);
                                    }}
                                    style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: 'var(--brand-red)', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    ↺ נסה שוב
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled={isGenerating}
                                  onClick={async () => {
                                    const t = await getToken();
                                    const r = await fetch('/api/admin/trigger-reel', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                      body: JSON.stringify({ makeSlug: mkSlug, modelSlug: mdSlug, postId: post.id }),
                                    });
                                    const d = await r.json();
                                    if (d.ok) { await fetchSocialPosts(); setReelToast('⏳ ריל בהכנה (~5 דק׳)... הדף יתעדכן אוטומטית'); setTimeout(() => setReelToast(null), 6000); }
                                    else alert('שגיאה: ' + d.error);
                                  }}
                                  style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: isGenerating ? 'var(--bg-muted)' : '#7c3aed', color: isGenerating ? 'var(--text-muted)' : '#fff', cursor: isGenerating ? 'default' : 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: isGenerating ? 0.7 : 1 }}>
                                  {isGenerating ? '⏳ בהכנה...' : '🎬 צור ריל'}
                                </button>
                              )}
                              {isGenerating && (
                                <button
                                  onClick={async () => {
                                    const t = await getToken();
                                    await fetch('/api/admin/social-posts', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                      body: JSON.stringify({ action: 'reset_reel_status', id: post.id }),
                                    });
                                    await fetchSocialPosts();
                                  }}
                                  title="איפוס סטטוס תקוע"
                                  style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.68rem' }}>
                                  ✕ איפוס
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* ── ROW 4: PUBLISH BAR (pending + has image) ─────── */}
                        {isPending && hasLocalImg && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', flexShrink: 0, fontWeight: 600 }}>
                              <input type="checkbox" checked={includeStory} onChange={e => setIncludeStory(e.target.checked)} style={{ accentColor: 'var(--brand-red)', width: 13, height: 13 }} />
                              + סטורי
                            </label>
                            {!!meta?.reel_url && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: includeReel ? '#7c3aed' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', flexShrink: 0, fontWeight: 600 }}>
                                <input type="checkbox" checked={includeReel} onChange={e => setIncludeReel(e.target.checked)} style={{ accentColor: '#7c3aed', width: 13, height: 13 }} />
                                🎬 + ריל (קרוסלה)
                              </label>
                            )}
                            <button onClick={() => publishPost(post)} disabled={isPublishing} style={{
                              flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, color: '#fff', fontSize: '0.875rem', whiteSpace: 'nowrap',
                              background: isPublishing ? '#555' : 'linear-gradient(90deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d)',
                            }}>
                              {isPublishing ? '⏳ מפרסם...' : `🚀 פרסם${includeReel ? ' (קרוסלה 🖼+🎬)' : ''}${includeStory ? ' + סטורי' : ''}`}
                            </button>
                          </div>
                        )}
                        {isPending && !hasLocalImg && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            ↑ צלם תמונה לפני הפרסום
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══ PAGE MANAGEMENT ════════════════════════════════════════ */}
              <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                <button onClick={() => { setPageManagementOpen(v => !v); if (!pageInfo) loadPageInfo(); }}
                  style={{ width: '100%', padding: '13px 18px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  <span>⚙️ ניהול דף Instagram & Facebook</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pageManagementOpen ? '▲' : '▼'}</span>
                </button>
                {pageManagementOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                    {pageInfo && (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-muted)' }}>
                        {pageInfo.picture?.data?.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pageInfo.picture.data.url} alt="profile" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{pageInfo.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 1 }}>{pageInfo.fan_count?.toLocaleString()} עוקבים</div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div>
                        <label style={lbl}>עדכן תמונת פרופיל — URL</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input placeholder="https://..." id="profile-pic-url" style={{ ...inp, flex: 1, direction: 'ltr' }} />
                          <button onClick={() => { const el = document.getElementById('profile-pic-url') as HTMLInputElement; if (el?.value) updateProfilePicture(el.value); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>עדכן</button>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>Facebook בלבד — Instagram לא תומך ב-API</div>
                      </div>
                      <div>
                        <label style={lbl}>תיאור קצר</label>
                        <input value={pageInfoForm.about} onChange={e => setPageInfoForm(f => ({ ...f, about: e.target.value }))} style={{ ...inp, direction: 'rtl' }} />
                      </div>
                      <div>
                        <label style={lbl}>תיאור מלא</label>
                        <textarea value={pageInfoForm.description} onChange={e => setPageInfoForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical', direction: 'rtl', fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={lbl}>אתר</label>
                        <input value={pageInfoForm.website} onChange={e => setPageInfoForm(f => ({ ...f, website: e.target.value }))} style={{ ...inp, direction: 'ltr' }} />
                      </div>
                      <button onClick={savePageInfo} disabled={pageInfoSaving} className="btn btn-primary" style={{ width: 'fit-content' }}>
                        {pageInfoSaving ? 'שומר...' : 'שמור פרטי דף'}
                      </button>
                    </div>

                    {/* Live posts viewer */}
<div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>פוסטים קיימים בדף</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {(['instagram', 'facebook'] as const).map(pl => (
                            <button key={pl} onClick={() => setExistingPostsTab(pl)} style={{ padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: existingPostsTab === pl ? 'var(--brand-red)' : 'var(--bg-muted)', color: existingPostsTab === pl ? '#fff' : 'var(--text-secondary)' }}>
                              {pl === 'instagram' ? '📸 IG' : '👍 FB'}
                            </button>
                          ))}
                          <button onClick={loadExistingPosts} disabled={loadingExisting} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {loadingExisting ? '⏳' : '↻ טען'}
                          </button>
                        </div>
                      </div>
                      {existingPostsTab === 'instagram' && igPosts.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
                          {igPosts.map(p => (
                            <div key={p.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              <button onClick={() => deleteIgPost(p.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(230,57,70,0.9)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                              <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: 4, left: 4, fontSize: '0.62rem', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 5px', borderRadius: 3, textDecoration: 'none' }}>↗</a>
                            </div>
                          ))}
                        </div>
                      )}
                      {existingPostsTab === 'facebook' && fbPosts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {fbPosts.map(p => (
                            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                              {p.full_picture && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.full_picture} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', direction: 'rtl', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.message ?? '—'}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(p.created_time).toLocaleDateString('he-IL')}</div>
                              </div>
                              <button onClick={() => deleteFbPost(p.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #f43f5e40', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', color: '#f43f5e', fontWeight: 700, flexShrink: 0 }}>מחק</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {((existingPostsTab === 'instagram' && igPosts.length === 0) || (existingPostsTab === 'facebook' && fbPosts.length === 0)) && !loadingExisting && (
                        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>לחץ ↻ טען כדי לטעון פוסטים קיימים</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* ── Post Preview Modal ───────────────────────────────────────────────── */}
        {/* ── STORY HELPER MODAL ──────────────────────────────────────────── */}
        {storyHelper && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setStoryHelper(null)}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, maxWidth: 460, width: '100%', direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>📖 פרסום סטורי</h3>
                <button onClick={() => setStoryHelper(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: 16, fontWeight: 700 }}>✅ הפוסטים עלו בהצלחה!</p>

              {/* Story image preview — 9:16 aspect */}
              <div style={{ margin: '0 auto 16px', maxWidth: 180, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)', aspectRatio: '9/16', position: 'relative', background: '#000' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={storyHelper.storyImageUrl} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              {/* Car URL to copy */}
              <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{storyHelper.carUrl}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(storyHelper.carUrl); }}
                  style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                >
                  📋 העתק
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                {/* Mobile: native share. Desktop: download */}
                <button
                  onClick={async () => {
                    const canShare = typeof navigator.share === 'function' && navigator.canShare;
                    if (canShare) {
                      try {
                        const imgRes = await fetch(storyHelper.storyImageUrl);
                        const blob = await imgRes.blob();
                        const file = new File([blob], 'story.jpg', { type: blob.type });
                        if (navigator.canShare({ files: [file] })) {
                          await navigator.share({ files: [file], title: 'CarIssues Story' });
                          return;
                        }
                      } catch { /* fall through to download */ }
                    }
                    // Desktop fallback: trigger download
                    const a = document.createElement('a');
                    a.href = storyHelper.storyImageUrl;
                    a.download = 'story.jpg';
                    a.click();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', height: 44, fontSize: '0.9rem', fontWeight: 700 }}
                >
                  📱 שתף / הורד סטורי
                </button>

                {/* Desktop instructions */}
                <details style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <summary style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', listStyle: 'none', background: 'var(--bg-muted)' }}>
                    💻 הוראות מהמחשב
                  </summary>
                  <ol style={{ margin: 0, padding: '10px 14px 12px 14px', paddingRight: 30, lineHeight: 2.1, fontSize: '0.8rem', color: 'var(--text-secondary)', direction: 'rtl' }}>
                    <li>לחץ <strong>שתף / הורד סטורי</strong> כדי להוריד את התמונה</li>
                    <li>פתח את <a href="https://www.instagram.com" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-red)' }}>Instagram.com</a> בדפדפן (או באפליקציה בטלפון)</li>
                    <li>לחץ <strong>+ פוסט חדש → Stories</strong> ובחר את התמונה שהורדת</li>
                    <li>הוסף סטיקר <strong>Link</strong> והדבק את הכתובת שהעתקת למעלה</li>
                    <li>שלח!</li>
                  </ol>
                </details>

                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  <span style={{ fontSize: '1.1rem' }}>📸</span> פתח Instagram
                </a>
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                לחץ מחוץ לחלון לסגירה
              </p>
            </div>
          </div>
        )}

        {/* ── REEL HELPER MODAL ───────────────────────────────────────────── */}
        {reelHelper && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setReelHelper(null)}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, maxWidth: 460, width: '100%', direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>🎬 שיתוף ריל / סטורי</h3>
                <button onClick={() => setReelHelper(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>

              {/* Video preview */}
              <div style={{ margin: '0 auto 16px', maxWidth: 180, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)', aspectRatio: '9/16', background: '#000' }}>
                <video src={reelHelper.reelUrl} muted autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              {/* Car URL */}
              <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{reelHelper.carUrl}</span>
                <button onClick={() => navigator.clipboard.writeText(reelHelper.carUrl)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  📋 העתק
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Download / Native share */}
                <button
                  onClick={async () => {
                    const canShare = typeof navigator.share === 'function';
                    if (canShare) {
                      try {
                        const res = await fetch(reelHelper.reelUrl);
                        const blob = await res.blob();
                        const file = new File([blob], 'reel.mp4', { type: 'video/mp4' });
                        if (navigator.canShare?.({ files: [file] })) {
                          await navigator.share({ files: [file], title: 'CarIssues Reel' });
                          return;
                        }
                      } catch { /* fall through */ }
                    }
                    const a = document.createElement('a');
                    a.href = reelHelper.reelUrl;
                    a.download = 'reel.mp4';
                    a.click();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', height: 44, fontSize: '0.9rem', fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }}
                >
                  🎬 הורד / שתף לריל
                </button>

                <a href="https://www.instagram.com/reels/" target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                  <span style={{ fontSize: '1.1rem' }}>📸</span> פתח Instagram Reels
                </a>

                {/* Desktop instructions */}
                <details style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <summary style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', listStyle: 'none', background: 'var(--bg-muted)' }}>
                    💻 הוראות מהמחשב
                  </summary>
                  <ol style={{ margin: 0, padding: '10px 14px 12px 14px', paddingRight: 30, lineHeight: 2.1, fontSize: '0.8rem', color: 'var(--text-secondary)', direction: 'rtl' }}>
                    <li>לחץ <strong>הורד / שתף לריל</strong> כדי להוריד את הסרטון</li>
                    <li>פתח <a href="https://www.instagram.com" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-red)' }}>Instagram.com</a> או האפליקציה בטלפון</li>
                    <li>לחץ <strong>+ → Reel</strong>, העלה את הסרטון</li>
                    <li>אפשר להוסיף מוזיקה, טקסט וסטיקר לינק בתוך האפליקציה</li>
                    <li>פרסם!</li>
                  </ol>
                </details>
              </div>

              {/* Delete reel to free storage */}
              <button
                onClick={async () => {
                  if (!confirm('מחק את קובץ הריל מהאחסון? תצטרך ליצור אותו מחדש בפעם הבאה.')) return;
                  const slugParts = reelHelper.carUrl.replace('https://carissues.co.il/cars/', '').split('/');
                  const [mkSlug, mdSlug] = slugParts;
                  const t = await getToken();
                  const matchPost = socialPosts.find(p => {
                    const m = p.metadata as Record<string, unknown> | null;
                    return m?.reel_url === reelHelper.reelUrl;
                  });
                  await fetch('/api/admin/trigger-reel', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                    body: JSON.stringify({ makeSlug: mkSlug, modelSlug: mdSlug, postId: matchPost?.id }),
                  });
                  setReelHelper(null);
                  await fetchSocialPosts();
                }}
                style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #f43f5e40', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#f43f5e' }}
              >
                🗑 מחק ריל מהאחסון (לאחר פרסום)
              </button>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                לחץ מחוץ לחלון לסגירה
              </p>
            </div>
          </div>
        )}

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

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageInner />
    </Suspense>
  );
}
