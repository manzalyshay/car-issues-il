import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cookie-based storage adapter for Supabase auth.
 * Safari's ITP (Intelligent Tracking Prevention) wipes localStorage when
 * navigating to a third-party domain (like Google OAuth) and back, destroying
 * the PKCE code verifier. Cookies are first-party and survive these navigations.
 */
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const enc = encodeURIComponent(key);
    const match = document.cookie.match(
      new RegExp('(?:^|;)\\s*' + enc + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    const enc = encodeURIComponent(key);
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${enc}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(key)}=;path=/;max-age=0`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storage: cookieStorage,
  },
});

export type Database = {
  reviews: {
    id: string;
    make_slug: string;
    model_slug: string;
    year: number;
    rating: number;
    title: string;
    body: string;
    category: string;
    mileage: number | null;
    author: string;
    user_id: string | null;
    helpful: number;
    images: string[];
    created_at: string;
  };
  review_likes: {
    review_id: string;
    user_id: string;
  };
  news_cache: {
    id: string;
    title: string;
    url: string;
    summary: string;
    image_url: string;
    source: string;
    category: string;
    published_at: string;
    scraped_at: string;
  };
};
