'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Module-level set — survives component remounts (auth re-renders, error boundaries, StrictMode).
// Tracks every path already recorded in this browser session so we never double-insert.
const tracked = new Set<string>();

function getSessionId(): string {
  try {
    let id = localStorage.getItem('_sid');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('_sid', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function shouldSkip(path: string) {
  return path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_next');
}

export default function PageViewTracker() {
  const pathname = usePathname();

  // Strip ?clang=1 from URL after middleware has set the cookie —
  // we serve the page normally (no redirect) so the param needs client-side cleanup.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('clang')) {
      params.delete('clang');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    if (!pathname || shouldSkip(pathname)) return;
    if (tracked.has(pathname)) return;
    tracked.add(pathname);

    const sessionId = getSessionId();
    supabase.from('page_views').insert({ path: pathname, session_id: sessionId }).then(() => {});
  }, [pathname]);

  return null;
}
