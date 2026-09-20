'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AuthModal from './AuthModal';
import { useAuth, displayName } from '@/lib/authContext';
import { useLocale, EN_SITE, HE_SITE } from '@/lib/localeContext';

/* ── Real brand logo ── */
function Logo() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={isEn ? '/logo-net.png' : '/logo-light.png'}
      alt={isEn ? 'carissues.net' : 'carissues.co.il'}
      style={{ height: isEn ? 56 : 34, width: 'auto', display: 'block' }}
    />
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
  const [scrolled, setScrolled]       = useState(false);

  const { user, isAdmin, signOut, loading } = useAuth();
  const { locale, t } = useLocale();
  const pathname = usePathname();

  const isHome    = pathname === '/';
  const isCarsIdx = pathname === '/cars';
  const showCategoryBar = isCarsIdx; // only on /cars, not homepage

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const NAV_LINKS = locale === 'he' ? [
    { href: '/news',           label: 'חדשות' },
    { href: '/rankings',       label: 'דירוגים' },
    { href: '/cars/compare',   label: 'השוואה' },
    { href: '/cars',           label: 'ביקורות' },
    { href: '/repairs',        label: 'עלויות תיקון' },
    { href: '/vehicle-lookup', label: 'בדיקת רכב' },
  ] : [
    { href: '/news',           label: t.nav.news },
    { href: '/rankings',       label: t.nav.rankings },
    { href: '/cars/compare',   label: t.nav.compare },
    { href: '/cars',           label: t.nav.allMakes },
    { href: '/repairs',        label: t.nav.repairs },
    { href: '/vehicle-lookup', label: t.nav.vehicleLookup },
  ];

  const logoEl = (
    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <Logo />
    </Link>
  );

  /* ── Main header ── */
  return (
    <>
      <header style={{
        background: 'rgba(255,255,255,.86)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <div className="container header-inner" style={{
          height: 66,
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: 'space-between',
          direction: locale === 'he' ? 'rtl' : 'ltr',
        }}>
          {logoEl}

          {/* Desktop nav — pill style */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} className="hdr-link"
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 9px', fontSize: '0.875rem', fontWeight: active ? 700 : 600,
                    color: active ? 'var(--accent)' : 'var(--text)',
                    textDecoration: 'none',
                    borderRadius: 9,
                    background: active ? '#eef2f9' : 'transparent',
                    transition: 'color 0.15s, background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Left: CTA + avatar/login */}
          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link href="/cars" className="btn-check-model" style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 18px', fontSize: '0.875rem', fontWeight: 700,
              background: 'var(--accent)', color: '#fff',
              textDecoration: 'none', borderRadius: 10,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}>
              {locale === 'he' ? 'בדקו דגם' : 'Check Model'}
            </Link>
            {/* Login button when logged out */}
            {!loading && !user && (
              <button
                onClick={() => setAuthOpen(true)}
                style={{
                  padding: '8px 16px', fontSize: '0.875rem', fontWeight: 700,
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
                }}
                className="login-btn"
              >
                {locale === 'he' ? 'התחברות' : 'Login'}
              </button>
            )}
            {/* Avatar (only when logged in) */}
            {!loading && user && (
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
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                  }}>
                    {displayName(user).charAt(0).toUpperCase()}
                  </div>
                </Link>
                {profileOpen && (
                  <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, paddingTop: 8, zIndex: 200 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden' }}>
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
            )}
          </div>

          {/* Mobile: login/avatar + hamburger */}
          <div className="mobile-menu-btn" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            {!loading && !user && (
              <button
                onClick={() => setAuthOpen(true)}
                style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {locale === 'he' ? 'התחברות' : 'Login'}
              </button>
            )}
            {!loading && user && (
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
                  {displayName(user).charAt(0).toUpperCase()}
                </div>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: '7px 10px', color: 'var(--text-muted)' }}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
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
            <div style={{ marginTop: 16 }}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>
                      👤 {displayName(user)}
                    </Link>
                    <button onClick={signOut} style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)' }}>{t.nav.logout}</button>
                  </div>
                  {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>{t.nav.admin}</Link>}
                </div>
              ) : (
                <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} style={{ width: '100%', height: 42, background: 'var(--accent)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {t.nav.loginRegister}
                </button>
              )}
            </div>
          </div>
        )}

        <style>{`
          .hdr-link:hover { color: var(--accent) !important; background: #eef2f9 !important; }
          .btn-check-model:hover { background: #0f2b63 !important; }
          .login-btn:hover { color: var(--accent) !important; border-color: var(--accent) !important; }
          @media (max-width: 768px) {
            .desktop-nav  { display: none !important; }
            .desktop-auth { display: none !important; }
            .mobile-menu-btn { display: flex !important; }
          }
        `}</style>
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

