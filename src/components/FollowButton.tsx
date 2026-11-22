'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import AuthModal from './AuthModal';

interface Props {
  makeSlug: string;
  modelSlug: string;
  isEn: boolean;
  dark?: boolean;
}

export default function FollowButton({ makeSlug, modelSlug, isEn, dark }: Props) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingFollow, setPendingFollow] = useState(false);

  const storageKey = `follow:${makeSlug}:${modelSlug}`;

  // Load persisted follow state when user is known
  useEffect(() => {
    if (!user) { setFollowing(false); return; }
    setFollowing(localStorage.getItem(`${storageKey}:${user.id}`) === '1');
  }, [user, storageKey]);

  // When user logs in while a follow was pending, apply it
  useEffect(() => {
    if (!user || !pendingFollow) return;
    setPendingFollow(false);
    setShowAuth(false);
    applyFollow(user.id, user.email ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function applyFollow(userId: string, userEmail: string) {
    setFollowing(true);
    localStorage.setItem(`${storageKey}:${userId}`, '1');
    // Save to D1 via API so email notifications work
    fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, makeSlug, modelSlug }),
    }).catch(() => {});
  }

  function handleClick() {
    if (!user) {
      setPendingFollow(true);
      setShowAuth(true);
      return;
    }
    if (following) {
      setFollowing(false);
      localStorage.removeItem(`${storageKey}:${user.id}`);
      fetch('/api/follow', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, makeSlug, modelSlug }),
      }).catch(() => {});
    } else {
      applyFollow(user.id, user.email ?? '');
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={dark ? 'hero-follow-btn' : undefined}
        style={dark ? {
          border: following ? '1px solid rgba(255,255,255,.4)' : 0,
          background: following ? 'rgba(255,255,255,.15)' : '#2f62e0',
          color: '#fff',
          borderRadius: 12, height: 48, padding: '0 24px', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        } : {
          border: `1px solid ${following ? '#1b7a4b' : '#1b4f8a'}`,
          background: following ? '#e7f5ed' : '#1b4f8a',
          color: following ? '#1b7a4b' : '#fff',
          borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}
      >
        {dark ? (
          following
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        ) : (following ? '✓' : '🔔')}
        {following
          ? (isEn ? 'Following' : 'עוקב')
          : dark ? (isEn ? 'Follow this model' : 'עקוב אחרי הדגם') : (isEn ? 'Follow' : 'עקוב')}
      </button>

      {showAuth && (
        <AuthModal onClose={() => {
          setShowAuth(false);
          setPendingFollow(false);
        }} />
      )}
    </>
  );
}
