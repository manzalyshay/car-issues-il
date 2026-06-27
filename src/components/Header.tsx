'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SearchBox from './SearchBox';
import AuthModal from './AuthModal';
import { useAuth, displayName } from '@/lib/authContext';
import { useLocale, EN_SITE, HE_SITE } from '@/lib/localeContext';

/* ── Car SVG icon (for logo-mark) ── */
function CarIcon({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 24 14" fill="none" stroke={color}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9l2-5a2 2 0 0 1 1.9-1.3h10.2a2 2 0 0 1 1.9 1.3L20 9" />
      <path d="M1 9h22a.7.7 0 0 1 .7.7v3a.7.7 0 0 1-.7.7H19v.6a.7.7 0 0 1-.7.7h-1a.7.7 0 0 1-.7-.7v-.6H7.4v.6a.7.7 0 0 1-.7.7h-1a.7.7 0 0 1-.7-.7v-.6H1a.7.7 0 0 1-.7-.7v-3A.7.7 0 0 1 1 9z" />
      <circle cx="6" cy="11" r=".8" />
      <circle cx="18" cy="11" r=".8" />
    </svg>
  );
}

/* ── Gradient logo-mark square ── */
function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'grid', placeItems: 'center',
    }}>
      <CarIcon size={size * 0.55} color="#fff" />
    </span>
  );
}

/* ── Category bar (shown on home + /cars) ── */
const CATEGORIES_HE = [
  { icon: '🚗', label: 'פרטי',   href: '/cars?type=sedan' },
  { icon: '🚐', label: 'SUV',    href: '/cars?type=suv' },
  { icon: '⚡', label: 'חשמלי', href: '/cars?type=electric' },
  { icon: '🏎',  label: 'ספורט', href: '/cars?type=sport' },
  { icon: '👨‍👩‍👧', label: 'משפחתי', href: '/cars?type=mpv' },
  { icon: '🚐', label: 'מסחרי', href: '/cars?type=commercial' },
];
const CATEGORIES_EN = [
  { icon: '🚗', label: 'Sedan',      href: '/cars?type=sedan' },
  { icon: '🚐', label: 'SUV',        href: '/cars?type=suv' },
  { icon: '⚡', label: 'Electric',   href: '/cars?type=electric' },
  { icon: '🏎',  label: 'Sport',      href: '/cars?type=sport' },
  { icon: '👨‍👩‍👧', label: 'Family',    href: '/cars?type=mpv' },
  { icon: '🚐', label: 'Commercial', href: '/cars?type=commercial' },
];

function CategoryBar({ locale }: { locale: 'he' | 'en' }) {
  const cats = locale === 'he' ? CATEGORIES_HE : CATEGORIES_EN;
  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <div className="container" style={{ display: 'flex', gap: 0, height: 40 }}>
        {cats.map((c) => (
          <Link key={c.href} href={c.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px', fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--text-muted)', textDecoration: 'none',
              borderBottom: '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
            className="cat-link"
          >
            <span style={{ fontSize: '0.9rem' }}>{c.icon}</span>
            {c.label}
          </Link>
        ))}
      </div>
      <style>{`.cat-link:hover { color: var(--accent) !important; border-bottom-color: var(--accent) !important; }`}</style>
    </div>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [authOpen, setAuthOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [scrolled, setScrolled]       = useState(false);

  const { user, isAdmin, signOut, loading } = useAuth();
  const { locale, t } = useLocale();
  const pathname = usePathname();

  const isHome    = pathname === '/';
  const isCarsIdx = pathname === '/cars';
  const showCategoryBar = isHome || isCarsIdx;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const NAV_LINKS = [
    { href: '/cars',         label: t.nav.allMakes },
    { href: '/cars/compare', label: t.nav.compare },
    { href: '/rankings',     label: t.nav.rankings },
    { href: '/repairs',      label: t.nav.repairs },
    { href: '/tco',          label: t.nav.tco },
  ];

  const logoText = (
    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <LogoMark size={34} />
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 19,
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
      }}>
        {locale === 'en'
          ? <>Car<b style={{ color: 'var(--accent)' }}>Issues</b><span style={{ color: 'var(--text-faint)', fontWeight: 500, fontSize: '0.78em' }}>.net</span></>
          : <>קאר<b style={{ color: 'var(--accent)' }}>אישוז</b></>
        }
      </span>
    </Link>
  );

  /* ── Main header ── */
  return (
    <>
      <header style={{
        background: '#ffffff',
        borderBottom: showCategoryBar ? 'none' : '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <div className="container header-inner" style={{
          height: 64,
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: 'space-between',
          direction: locale === 'he' ? 'rtl' : 'ltr',
        }}>
          {logoText}

          {/* Desktop nav — underline style */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'stretch', flex: 1, justifyContent: 'center', height: '100%' }}>
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} className="hdr-link"
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 14px', fontSize: '0.875rem', fontWeight: 600,
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    textDecoration: 'none',
                    borderBottom: active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Search toggle (non-home pages inline; home uses hero search) */}
            {!isHome && (
              searchOpen
                ? <div style={{ width: 200 }}><SearchBox compact /></div>
                : <button className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSearchOpen(true)} aria-label="search">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/><path d="M12.5 12.5 L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
            )}

            {!loading && (
              user ? (
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setProfileOpen(true)}
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  {isAdmin && (
                    <Link href="/admin" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginInlineEnd: 8 }}>
                      {t.nav.admin}
                    </Link>
                  )}
                  <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                    }}>
                      {displayName(user).charAt(0).toUpperCase()}
                    </div>
                  </Link>

                  {profileOpen && (
                    <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, paddingTop: 8, zIndex: 200 }}>
                    <div style={{
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
                      minWidth: 160, overflow: 'hidden',
                    }}>
                      <Link href="/profile" style={{ display: 'block', padding: '10px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                        {locale === 'he' ? '👤 פרופיל' : '👤 Profile'}
                      </Link>
                      <button onClick={signOut} style={{ display: 'block', width: '100%', textAlign: 'start', padding: '10px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {t.nav.logout}
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="btn btn-primary" style={{ height: 34, padding: '0 16px', fontSize: '0.8rem' }}>
                  {t.nav.login}
                </button>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: '7px 10px', color: 'var(--text-muted)' }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Category bar (home + /cars only) */}
        {showCategoryBar && (
          <CategoryBar locale={locale as 'he' | 'en'} />
        )}

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '16px 24px 28px' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                style={{ display: 'block', padding: '13px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem' }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              {user ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
                      👤 {displayName(user)}
                    </Link>
                    <button onClick={signOut} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.8rem' }}>{t.nav.logout}</button>
                  </div>
                  {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>{t.nav.admin}</Link>}
                </div>
              ) : (
                <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="btn btn-primary" style={{ flex: 1, height: 42 }}>
                  {t.nav.loginRegister}
                </button>
              )}
            </div>
            {!isHome && <div style={{ marginTop: 14 }}><SearchBox fullWidth /></div>}
          </div>
        )}

        <style>{`
          .hdr-link:hover { color: var(--accent) !important; border-bottom-color: var(--accent) !important; }
          @media (max-width: 768px) {
            .desktop-nav  { display: none !important; }
            .desktop-auth { display: none !important; }
            .mobile-menu-btn { display: block !important; }
          }
        `}</style>
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

