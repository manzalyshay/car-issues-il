'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Generate or retrieve a session ID (persists for the browser session)
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('_sid');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('_sid', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

// Paths we don't want to track
function shouldSkip(path: string) {
  return path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_next');
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>('');

  useEffect(() => {
    if (!pathname || shouldSkip(pathname)) return;
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    const sessionId = getSessionId();
    // Fire and forget — don't block rendering
    supabase.from('page_views').insert({ path: pathname, session_id: sessionId }).then(() => {});
  }, [pathname]);

  return null;
}
