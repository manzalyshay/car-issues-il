import Link from 'next/link';
import { carDatabase, getPopularMakes } from '@/data/cars';
import { getCachedNews, CATEGORY_LABELS } from '@/lib/newsScraper';

export default function HomePage() {
  const popularMakes = getPopularMakes();
  const news = getCachedNews().slice(0, 6);

  return (
    <>
      {/* ── Hero ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 50%, #1a1d3b 100%)',
          padding: '80px 0 90px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% -20%, rgba(230,57,70,.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 32,
              padding: '0 16px',
              borderRadius: 9999,
              background: 'rgba(230,57,70,.15)',
              border: '1px solid rgba(230,57,70,.3)',
              color: '#ff9999',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            🇮🇱 הקהילה הגדולה ביותר לבעלי רכב בישראל
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            גלה בעיות ברכב שלך<br />
            <span style={{ color: 'var(--brand-red)' }}>לפני שיגדלו</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600,
              margin: '0 auto 40px',
              lineHeight: 1.7,
            }}
          >
            אלפי ביקורות של בעלי רכב בישראל. מצא בעיות נפוצות לפי יצרן, דגם ושנה — בעברית.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/cars" className="btn btn-primary" style={{ fontSize: '1rem', height: 52, padding: '0 32px' }}>
              🔍 חפש לפי יצרן
            </Link>
            <Link href="/news"
              className="btn"
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '1rem', height: 52, padding: '0 32px', border: '1px solid rgba(255,255,255,.2)' }}
            >
              📰 חדשות רכב
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 56, flexWrap: 'wrap' }}>
            {[
              { num: `${carDatabase.length}+`, label: 'יצרנים' },
              { num: `${carDatabase.reduce((s, m) => s + m.models.length, 0)}+`, label: 'דגמים' },
              { num: '1,000+', label: 'ביקורות' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Makes ── */}
      <section id="popular" style={{ padding: '64px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>יצרנים פופולריים</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>הדגמים הנפוצים ביותר בישראל</p>
            </div>
            <Link href="/cars" style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}>
              כל היצרנים ←
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 16 }}>
            {popularMakes.map((make) => (
              <Link
                key={make.slug}
                href={`/cars/${make.slug}`}
                className="card"
                style={{ padding: '24px 16px', textAlign: 'center', textDecoration: 'none', display: 'block' }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>{make.logoEmoji}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{make.nameHe}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{make.models.length} דגמים</div>
                <div style={{ marginTop: 12, height: 24, borderRadius: 9999, background: 'rgba(230,57,70,.08)', color: 'var(--brand-red)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {make.country}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'var(--bg-card)', padding: '64px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>איך זה עובד?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {HOW_STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-red), var(--brand-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: 'var(--shadow-red)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest News ── */}
      <section style={{ padding: '64px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>חדשות רכב</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>עדכונים, ריקולים וחדשות מהשוק בישראל</p>
            </div>
            <Link href="/news" style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}>
              כל החדשות ←
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {news.map((article) => (
              <a
                key={article.id}
                href={article.url === '#' ? undefined : article.url}
                target={article.url === '#' ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="card"
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', padding: 20 }}
              >
                {article.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span className="badge badge-red">{CATEGORY_LABELS[article.category]}</span>
                  <span className="badge badge-gray">{article.source}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.45, marginBottom: 8, color: 'var(--text-primary)' }}>
                  {article.title}
                </h3>
                {article.summary && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.6, flex: 1 }}>
                    {article.summary.slice(0, 120)}{article.summary.length > 120 ? '…' : ''}
                  </p>
                )}
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(article.publishedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const HOW_STEPS = [
  { icon: '🔍', title: 'בחר את הרכב שלך', desc: 'חפש לפי יצרן, דגם ושנת ייצור.' },
  { icon: '📋', title: 'קרא ביקורות אמיתיות', desc: 'ראה בעיות נפוצות שדיווחו בעלי רכב כמוך.' },
  { icon: '✏️', title: 'שתף את הניסיון שלך', desc: 'כתב ביקורת ועזור לאחרים להתמודד עם אותן בעיות.' },
];
