'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SearchBox from './SearchBox';
import AuthModal from './AuthModal';
import { useAuth, displayName } from '@/lib/authContext';
import { useLocale } from '@/lib/localeContext';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen]     = useState(false);
  const { user, isAdmin, signOut, loading } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const pathname = usePathname();
  const isHome = pathname === '/';

  const NAV_LINKS = [
    { href: '/cars',         label: t.nav.allMakes },
    { href: '/cars/compare', label: t.nav.compare },
    { href: '/rankings',     label: t.nav.rankings },
    { href: '/repairs',      label: t.nav.repairs },
    { href: '/tco',          label: t.nav.tco },
  ];

  return (
    <>
      <header style={{
        background: 'rgba(13,13,18,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="container header-inner" style={{
          height: 68,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          justifyContent: 'space-between',
          direction: 'rtl',
        }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Red dot accent */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--brand-red)',
              boxShadow: '0 0 12px var(--brand-red-glow)',
              flexShrink: 0,
            }} />
            <div style={{
              fontFamily: "'Syne', var(--font-body)",
              fontSize: 19,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              CarIssues
              <span style={{ color: 'var(--brand-red)', opacity: 0.9 }}>.co.il</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 2 }} className="desktop-nav">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hdr-link"
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.18s, background 0.18s',
                  whiteSpace: 'nowrap',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {!isHome && (
            <div className="mobile-search" style={{ display: 'none', flex: 1, maxWidth: 200 }}>
              <SearchBox compact />
            </div>
          )}

          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isHome && <SearchBox />}

            {/* Lang toggle */}
            <button
              onClick={() => setLocale(locale === 'he' ? 'en' : 'he')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '0 10px',
                height: 30,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {locale === 'he' ? 'EN' : 'עב'}
            </button>

            {!loading && (
              user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdmin && (
                    <Link href="/admin" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-red)', letterSpacing: '0.04em' }}>
                      {t.nav.admin}
                    </Link>
                  )}
                  <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--brand-red), var(--brand-red-dark))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', fontWeight: 800, color: '#fff',
                      boxShadow: '0 0 12px rgba(220,26,44,.4)',
                    }}>
                      {displayName(user).charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{displayName(user)}</span>
                  </Link>
                  <button onClick={signOut} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.8rem' }}>
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="btn btn-outline" style={{ height: 32, padding: '0 16px', fontSize: '0.8rem' }}>
                  {t.nav.login}
                </button>
              )
            )}
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none', background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)', borderRadius: 8,
              cursor: 'pointer', padding: '7px 10px',
              color: 'var(--text-primary)', fontSize: '1rem',
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {mobileOpen && (
          <div style={{
            background: 'rgba(13,13,18,0.97)',
            backdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,.06)',
            padding: '16px 24px 28px',
          }}>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block', padding: '13px 0',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  color: 'var(--text-secondary)', textDecoration: 'none',
                  fontWeight: 600, fontSize: '0.9375rem',
                }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              {user ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      👤 {displayName(user)}
                    </Link>
                    <button onClick={signOut} className="btn btn-outline" style={{ height: 32, padding: '0 10px', fontSize: '0.8rem' }}>{t.nav.logout}</button>
                  </div>
                  {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-red)' }}>{t.nav.admin}</Link>}
                </div>
              ) : (
                <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="btn btn-primary" style={{ flex: 1, height: 42 }}>
                  {t.nav.loginRegister}
                </button>
              )}
              <button onClick={() => setLocale(locale === 'he' ? 'en' : 'he')}
                style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '7px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {locale === 'he' ? 'EN' : 'עב'}
              </button>
            </div>
            {!isHome && <div style={{ marginTop: 14 }}><SearchBox fullWidth /></div>}
          </div>
        )}

        <style>{`
          .hdr-link:hover { color: var(--text-primary) !important; background: rgba(255,255,255,0.06) !important; }
          @media (max-width: 768px) {
            .desktop-nav  { display: none !important; }
            .desktop-auth { display: none !important; }
            .mobile-menu-btn { display: block !important; }
            .mobile-search   { display: block !important; }
          }
        `}</style>
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
