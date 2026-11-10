import Link from 'next/link';
import MakeLogo from '@/components/MakeLogo';
import type { ResolvedPair } from '@/lib/comparePairs';

/**
 * Shared building blocks for the Russian pilot pages (/ru), so they use the same visual
 * language as the Hebrew site: dark gradient hero with radial glows, Heebo-weight
 * headings, white 16px-radius cards, brand logos on the comparison cards.
 */

export const RU_GUTTER = 'clamp(16px,3vw,32px)';
export const RU_MAXW = 1180;

/** Dark hero background matching the Hebrew home page (gradient + radial glows). */
export function RuHero({ children, center = false, padding }: { children: React.ReactNode; center?: boolean; padding?: string }) {
  return (
    <section style={{
      position: 'relative', background: 'linear-gradient(180deg,#0d1b2f 0%,#12294a 62%,#12294a 100%)', color: '#fff',
      padding: padding ?? `clamp(32px,4vw,56px) ${RU_GUTTER} clamp(36px,4vw,56px)`, overflowX: 'clip', textAlign: center ? 'center' : undefined,
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(70% 60% at 88% 8%,rgba(23,64,143,.85),transparent 70%),radial-gradient(50% 50% at 10% 90%,rgba(18,161,80,.28),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: RU_MAXW, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

/** Small uppercase-ish label above a hero title. */
export function RuEyebrow({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', fontSize: 14, color: '#7a9cc8', letterSpacing: '0.04em', fontWeight: 600 }}>{children}</span>;
}

/** Section heading in the Hebrew site's style: heavy title + muted subtitle, optional link on the right. */
export function RuSectionHead({ id, title, sub, link }: { id?: string; title: string; sub?: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <h2 id={id} style={{ fontWeight: 900, fontSize: 'clamp(22px,2.4vw,30px)', letterSpacing: '-.03em', lineHeight: 1.15, margin: sub ? '0 0 6px' : 0 }}>{title}</h2>
        {sub && <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 720 }}>{sub}</p>}
      </div>
      {link && <Link href={link.href} style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{link.label}</Link>}
    </div>
  );
}

/** Head-to-head comparison card: both brand logos, model names, VS. `compact` is a one-line row. */
export function RuVsCard({ pair, compact = false }: { pair: ResolvedPair; compact?: boolean }) {
  if (compact) {
    return (
      <Link href={`/ru${pair.path}`} className="ru-vs-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--text)' }}>
        <span style={{ display: 'flex', flexShrink: 0 }}>
          <MakeLogo logoUrl={pair.a.make.logoUrl} nameEn={pair.a.make.nameEn} size={28} />
          <span style={{ marginLeft: -7 }}><MakeLogo logoUrl={pair.b.make.logoUrl} nameEn={pair.b.make.nameEn} size={28} /></span>
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
          {pair.a.make.nameEn} {pair.a.model.nameEn} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>или</span> {pair.b.make.nameEn} {pair.b.model.nameEn}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>→</span>
      </Link>
    );
  }
  const side = (p: ResolvedPair['a'], align: 'start' | 'end') => (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: align === 'start' ? 'flex-start' : 'flex-end', gap: 8, textAlign: align }}>
      <MakeLogo logoUrl={p.make.logoUrl} nameEn={p.make.nameEn} size={38} />
      <span style={{ display: 'block', lineHeight: 1.25 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>{p.make.nameEn}</span>
        <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: 'var(--text)' }}>{p.model.nameEn}</span>
      </span>
    </span>
  );
  return (
    <Link href={`/ru${pair.path}`} className="ru-vs-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'block', textDecoration: 'none' }}>
      <span style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
        {side(pair.a, 'start')}
        <span aria-label="или" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: 'var(--text-faint)', background: 'var(--bg)', borderRadius: 999, padding: '6px 8px' }}>VS</span>
        {side(pair.b, 'end')}
      </span>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', marginTop: 14 }}>Сравнить →</span>
    </Link>
  );
}

export function RuVsGrid({ pairs, compact = false, min = 260 }: { pairs: ResolvedPair[]; compact?: boolean; min?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(min(100%,${min}px),1fr))`, gap: compact ? 10 : 16 }}>
      {pairs.map((p) => <RuVsCard key={p.path} pair={p} compact={compact} />)}
    </div>
  );
}

/** Hover styles shared by the Russian pages (rendered once per page). */
export function RuStyles() {
  return (
    <style>{`
      .ru-vs-card { transition: transform .25s cubic-bezier(.23,1,.32,1), border-color .2s, box-shadow .25s; }
      .ru-vs-card:hover { border-color: #17408f !important; transform: translateY(-3px); box-shadow: var(--shadow-hover); }
      .ru-chip:hover { border-color: #fff !important; color: #fff !important; }
      .ru-link-card { transition: border-color .2s; }
      .ru-link-card:hover { border-color: #17408f !important; }
      @media (prefers-reduced-motion: reduce) { .ru-vs-card, .ru-vs-card:hover { transition: none; transform: none; } }
    `}</style>
  );
}
