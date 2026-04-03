import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Use @supabase/ssr's createBrowserClient so the PKCE code verifier is stored
 * in cookies (not localStorage). Safari's ITP wipes localStorage during
 * cross-origin OAuth redirects, but first-party cookies survive.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

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
