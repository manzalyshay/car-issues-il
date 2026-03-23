'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let err: string | null = null;
    if (mode === 'login') {
      err = await signIn(email, password);
    } else {
      if (!displayName.trim()) { setError('אנא הזן שם תצוגה'); setLoading(false); return; }
      err = await signUp(email, password, displayName.trim());
    }

    setLoading(false);
    if (err) {
      setError(err.includes('Invalid') ? 'אימייל או סיסמה שגויים' : err);
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>
            {mode === 'login' ? 'התחברות' : 'הרשמה'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>שם תצוגה</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="השם שיוצג בביקורות"
                maxLength={50}
                style={inputStyle}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              minLength={6}
              style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--brand-red)', fontSize: '0.875rem', marginBottom: 12 }}>
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: 46, fontSize: '1rem' }}
          >
            {loading ? '...' : mode === 'login' ? 'התחבר' : 'צור חשבון'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          style={{
            width: '100%', height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: '1.5px solid var(--border)', borderRadius: 10,
            background: 'var(--bg-base)', color: 'var(--text-primary)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 500,
          }}
        >
          {GOOGLE_ICON}
          המשך עם Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? 'אין לך חשבון? ' : 'יש לך כבר חשבון? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-red)', fontWeight: 600, fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {mode === 'login' ? 'הירשם' : 'התחבר'}
          </button>
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 12px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  background: 'var(--bg-base)', color: 'var(--text-primary)',
  fontSize: '0.9375rem', fontFamily: 'inherit', outline: 'none',
  direction: 'rtl',
};
