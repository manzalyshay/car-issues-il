'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SearchBox from './SearchBox';
import AuthModal from './AuthModal';
import { useAuth, displayName } from '@/lib/authContext';
import { useLocale, EN_SITE, HE_SITE } from '@/lib/localeContext';

/* ── License plate logo mark (from design) ── */
function LogoMark() {
  return (
    <svg viewBox="0 0 44 30" width="41" height="28" style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <defs>
        <linearGradient id="ciPlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25628f" />
          <stop offset="100%" stopColor="#123a68" />
        </linearGradient>
      </defs>
      <rect x="0.9" y="0.9" width="42.2" height="28.2" rx="5.4" fill="url(#ciPlate)" />
      <path d="M0.9 6.3A5.4 5.4 0 0 1 6.3 0.9H9.4V29.1H6.3A5.4 5.4 0 0 1 0.9 23.7Z" fill="#f7d117" />
      <rect x="13.1" y="13.6" width="5.2" height="2.6" rx="1.3" fill="#ffffff" opacity="0.34" />
      <circle cx="28.4" cy="14.1" r="6.5" fill="none" stroke="#ffffff" strokeWidth="2.3" />
      <path d="M33.3 19.1 36.9 22.6" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Category bar (shown on home + /cars) ── */
const CATEGORIES_HE = [
  { icon: '🚗', label: 'פרטי',    href: '/cars/category/sedan' },
  { icon: '🚐', label: 'SUV',     href: '/cars/category/suv' },
  { icon: '⚡', label: 'חשמלי',  href: '/cars/category/electric' },
  { icon: '🏎',  label: 'ספורט',  href: '/cars/category/sports' },
  { icon: '👨‍👩‍👧', label: 'משפחתי', href: '/cars/category/minivan' },
  { icon: '🚐', label: 'מסחרי',  href: '/cars/category/pickup' },
];
const CATEGORIES_EN = [
  { icon: '🚗', label: 'Sedan',      href: '/cars/category/sedan' },
  { icon: '🚐', label: 'SUV',        href: '/cars/category/suv' },
  { icon: '⚡', label: 'Electric',   href: '/cars/category/electric' },
  { icon: '🏎',  label: 'Sport',      href: '/cars/category/sports' },
  { icon: '👨‍👩‍👧', label: 'Family',    href: '/cars/category/minivan' },
  { icon: '🚐', label: 'Commercial', href: '/cars/category/pickup' },
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
    { href: '/cars',              label: t.nav.allMakes },
    { href: '/cars/compare',      label: t.nav.compare },
    { href: '/rankings',          label: t.nav.rankings },
    { href: '/repairs',           label: t.nav.repairs },
    { href: '/tco',               label: t.nav.tco },
    ...(locale === 'he' ? [{ href: '/vehicle-lookup', label: t.nav.vehicleLookup }] : []),
  ];

  const logoText = (
    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <LogoMark />
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 17.5, fontWeight: 900, letterSpacing: '-0.02em', color: '#12232f', lineHeight: 1 }}>
          {locale === 'en' ? 'Car' : 'קאר'}<span style={{ color: '#1b4f8a' }}>{locale === 'en' ? 'Issues' : 'אישוז'}</span>
        </span>
        <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: locale === 'en' ? '0.12em' : '0.05em', color: '#8595a6', marginTop: 2 }}>
          {locale === 'en' ? 'USED CAR DATA' : 'מדד רכב יד שנייה'}
        </span>
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

