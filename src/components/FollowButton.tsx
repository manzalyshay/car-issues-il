'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import AuthModal from './AuthModal';

interface Props {
  makeSlug: string;
  modelSlug: string;
  isEn: boolean;
}

export default function FollowButton({ makeSlug, modelSlug, isEn }: Props) {
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
        style={{
          border: `1px solid ${following ? '#1b7a4b' : '#1b4f8a'}`,
          background: following ? '#e7f5ed' : '#1b4f8a',
          color: following ? '#1b7a4b' : '#fff',
          borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}
      >
        {following ? '✓' : '🔔'}
        {following
          ? (isEn ? 'Following' : 'עוקב')
          : (isEn ? 'Follow' : 'עקוב')}
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
