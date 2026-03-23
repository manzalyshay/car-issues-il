'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
        padding: '40px 0 24px',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🚗</span>
              <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                CarIssues<span style={{ color: 'var(--brand-red)' }}>IL</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות בעברית וחוות דעת של בעלי רכב.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              ניווט מהיר
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { href: '/cars', label: 'כל היצרנים' },
                { href: '/news', label: 'חדשות רכב' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--brand-red)')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-secondary)')}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              כתב ויתור
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.7 }}>
              המידע באתר מבוסס על חוות דעת של משתמשים ואינו תחליף לייעוץ מקצועי ממוסך מורשה.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span>© {new Date().getFullYear()} CarIssues IL. כל הזכויות שמורות.</span>
          <span>בנוי עם ♥ לרווחת נהגי ישראל</span>
        </div>
      </div>
    </footer>
  );
}
