'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * OAuth callback page — handles PKCE code exchange after Google sign-in.
 * Supabase redirects here after OAuth with ?code=xxx, we exchange it for
 * a session and redirect the user back to the home page (or wherever they came from).
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = params.get('next') ?? '/';

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .catch(() => {/* verifier mismatch — session may still be set via cookie */})
        .finally(() => router.replace(next));
    } else {
      // Hash-based implicit flow — Supabase detects it automatically via detectSessionInUrl
      router.replace(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>מתחבר...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
