'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = params.get('next') ?? '/';

    // Google/Supabase can return an error param (e.g. access_denied)
    const oauthError = params.get('error');
    const oauthErrorDesc = params.get('error_description');
    if (oauthError) {
      setError(`${oauthError}${oauthErrorDesc ? ': ' + oauthErrorDesc : ''}`);
      return;
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error: exchangeError }) => {
          if (exchangeError) {
            setError(exchangeError.message);
          } else if (!data.session) {
            setError('ההחלפה הצליחה אך לא נוצרה סשן — ייתכן שה-cookie נחסם. נסה לאפשר cookies עבור האתר.');
          } else {
            router.replace(next);
          }
        })
        .catch((e) => setError(String(e)));
    } else {
      // No code — check if session already exists (implicit flow / second load)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) router.replace(next);
        else setError('לא נמצא קוד אימות. נסה להתחבר שוב.');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16, padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>שגיאה בהתחברות</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 400 }}>
          {error}
        </p>
        <a href="/" style={{ marginTop: 8, color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9375rem' }}>
          חזרה לדף הבית
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>מתחבר...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
