'use client';

import Link from 'next/link';
import { useState } from 'react';
import SearchBox from './SearchBox';
import AuthModal from './AuthModal';
import { useAuth, displayName } from '@/lib/authContext';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, isAdmin, signOut, loading } = useAuth();

  return (
    <>
      <header
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="container" style={{ height: 68, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--brand-red), var(--brand-gold-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: 'var(--shadow-red)', flexShrink: 0,
            }}>
              🚗
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                CarIssues<span style={{ color: 'var(--brand-red)' }}>IL</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                בעיות רכב בישראל
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav
            style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
            className="desktop-nav"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '8px 16px', borderRadius: 9999, fontSize: '0.9rem', fontWeight: 500,
                  color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--brand-red)'; (e.target as HTMLElement).style.background = 'rgba(230,57,70,.07)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-secondary)'; (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search — visible on mobile as compact icon */}
          <div className="mobile-search" style={{ display: 'none', position: 'relative', flex: 1, maxWidth: 200 }}><SearchBox compact /></div>

          {/* Search + Auth (desktop only) */}
          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <SearchBox />
            {!loading && (
              user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdmin && (
                    <Link href="/admin" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand-red)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      ניהול
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--brand-red), var(--brand-gold-dark))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', fontWeight: 800, color: '#fff',
                    }}>
                      {displayName(user).charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {displayName(user)}
                    </span>
                  </Link>
                  <button
                    onClick={signOut}
                    className="btn btn-outline"
                    style={{ height: 36, padding: '0 14px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                  >
                    יציאה
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="btn btn-outline"
                  style={{ height: 36, padding: '0 14px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                >
                  התחברות
                </button>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--text-primary)', fontSize: '1.4rem' }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '12px 20px 20px' }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12 }}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      👤 {displayName(user)}
                    </Link>
                    <button onClick={signOut} className="btn btn-outline" style={{ height: 34, padding: '0 12px', fontSize: '0.8125rem' }}>יציאה</button>
                  </div>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-red)', textDecoration: 'none' }}>
                      פאנל ניהול
                    </Link>
                  )}
                </div>
              ) : (
                <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="btn btn-primary" style={{ width: '100%', height: 42 }}>
                  התחברות / הרשמה
                </button>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <SearchBox fullWidth />
            </div>
          </div>
        )}

        <style>{`
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .desktop-auth { display: none !important; }
            .mobile-menu-btn { display: block !important; }
            .mobile-search { display: block !important; }
          }
        `}</style>
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

const NAV_LINKS = [
  { href: '/cars', label: 'כל היצרנים' },
  { href: '/cars#popular', label: 'דגמים פופולריים' },
  { href: '/cars/compare', label: 'השוואה' },
  { href: '/rankings', label: 'דירוגים' },
];
