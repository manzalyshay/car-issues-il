import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
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
