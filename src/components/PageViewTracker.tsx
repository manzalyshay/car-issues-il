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

  useEffect(() => {
    if (!pathname || shouldSkip(pathname)) return;
    if (tracked.has(pathname)) return;
    tracked.add(pathname);

    const sessionId = getSessionId();
    supabase.from('page_views').insert({ path: pathname, session_id: sessionId }).then(() => {});
  }, [pathname]);

  return null;
}
