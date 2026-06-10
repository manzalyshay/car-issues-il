'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/localeContext';

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer style={{
      background: 'var(--bg-card)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      marginTop: 'auto',
      padding: '52px 0 28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmospheric glow */}
      <div aria-hidden style={{ position:'absolute', bottom:-60, right:-40, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(220,26,44,.07) 0%, transparent 65%)', pointerEvents:'none' }} />

      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:40, marginBottom:44 }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--brand-red)', boxShadow:'0 0 10px var(--brand-red-glow)', flexShrink:0 }} />
              <div style={{ fontFamily:"'Syne', var(--font-body)", fontSize:17, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
                CarIssues<span style={{ color:'var(--brand-red)' }}>.co.il</span>
              </div>
            </div>
            <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', lineHeight:1.75 }}>{t.footer.about}</p>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:16 }}>
              {t.footer.quickNav}
            </h4>
            <ul style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:10 }}>
              {t.footer.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="footer-link"
                    style={{ color:'var(--text-secondary)', textDecoration:'none', fontSize:'0.875rem', transition:'color 0.15s', display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--brand-red)', display:'inline-block', opacity:0.5, flexShrink:0 }} />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:16 }}>
              {t.footer.disclaimer}
            </h4>
            <p style={{ color:'var(--text-muted)', fontSize:'0.8125rem', lineHeight:1.75 }}>{t.footer.disclaimerText}</p>
          </div>
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:20, display:'flex', flexDirection:'column', gap:8, fontSize:'0.75rem', color:'var(--text-muted)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <span>© {new Date().getFullYear()} {t.footer.copyright}</span>
            <span style={{ color:'var(--brand-red)', opacity:0.6 }}>{t.footer.builtWith}</span>
          </div>
          <p style={{ margin:0, fontSize:'0.68rem', opacity:0.45, lineHeight:1.65 }}>{t.footer.legal}</p>
        </div>
      </div>

      <style>{`.footer-link:hover { color: var(--brand-red) !important; }`}</style>
    </footer>
  );
}
