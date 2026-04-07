'use client';

import Link from 'next/link';
import Image from 'next/image';

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
            <div style={{ marginBottom: 12 }}>
              <Image
                src="/logo-transparent.png"
                alt="CarIssues IL"
                width={160}
                height={80}
                style={{ objectFit: 'contain' }}
              />
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
                { href: '/terms', label: 'תנאי שימוש' },
                { href: '/privacy', label: 'מדיניות פרטיות' },
                { href: '/contact', label: 'צור קשר' },
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
            flexDirection: 'column',
            gap: 8,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>© {new Date().getFullYear()} CarIssues IL. כל הזכויות שמורות.</span>
            <span>בנוי עם ♥ לרווחת נהגי ישראל</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.7 }}>
            סמלי היצרנים הם סימני מסחר רשומים של בעליהם בהתאמה. האתר אינו קשור ליצרנים. מודלים תלת-ממדיים ב-Sketchfab מוצגים לפי רישיון CC BY 4.0 עם קרדיט ליוצרים.
            האתר משתמש בעוגיות לצורך פונקציונליות בסיסית (התחברות). אין שימוש בעוגיות פרסומיות.
          </p>
        </div>
      </div>
    </footer>
  );
}
