/**
 * Car repair loading animation — used on page loading states.
 * Pure CSS/SVG, no JS required.
 */
export default function CarRepairLoader({ text = 'טוען נתונים...' }: { text?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', gap: 24,
    }}>
      {/* Animation stage */}
      <div style={{ position: 'relative', width: 160, height: 80 }}>

        {/* Car body */}
        <div className="car-loader-car" style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
          <svg width="90" height="44" viewBox="0 0 90 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body */}
            <rect x="4" y="18" width="82" height="20" rx="4" fill="var(--brand-red)" />
            {/* Cabin */}
            <path d="M20 18 L28 4 L62 4 L70 18 Z" fill="#c1121f" />
            {/* Windows */}
            <path d="M30 16 L35 6 L55 6 L60 16 Z" fill="#bde0f7" opacity="0.9" />
            {/* Wheels */}
            <circle cx="22" cy="38" r="8" fill="#1a1a2e" />
            <circle cx="22" cy="38" r="3.5" fill="#868e96" />
            <circle cx="68" cy="38" r="8" fill="#1a1a2e" />
            <circle cx="68" cy="38" r="3.5" fill="#868e96" />
            {/* Headlight */}
            <rect x="82" y="24" width="6" height="6" rx="2" fill="#ffd166" />
          </svg>
        </div>

        {/* Wrench above the car */}
        <div className="car-loader-wrench" style={{ position: 'absolute', top: 0, left: '68%' }}>
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M7 2C4.5 2 2 4 2 7c0 2 1 3.5 2.5 4.5L14 22l2-2-9-9.5C8.2 9.8 8 9 8 8c0-2 1.5-3.5 3.5-3.5.5 0 1 .1 1.4.3L9.5 8.2 11.8 10.5l3.8-3.8C15.9 7.3 16 8 16 8.5c0 2-1.5 3.5-3.5 3.5-.4 0-.8-.1-1.1-.2l8.5 8.2-2 2-1-1v2l-2 2-5-5c-1 .5-2.2.8-3.4.8C4 20.8 2 18 2 15c0-1.5.5-2.8 1.4-3.8"
              fill="none" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" />
            {/* Simple wrench */}
            <path d="M9 3 Q6 1 4 4 Q2 7 5 9 L16 20 Q18 23 21 21 Q24 19 22 16 Z"
              fill="#adb5bd" />
            <circle cx="5.5" cy="6" r="2.5" fill="none" stroke="#868e96" strokeWidth="1.2" />
            <circle cx="20" cy="19" r="2" fill="none" stroke="#868e96" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Sparks */}
        <div style={{ position: 'absolute', top: 10, left: '72%' }}>
          <span className="car-loader-spark" style={{ display: 'block', fontSize: '10px', color: '#ffd166' }}>✦</span>
          <span className="car-loader-spark" style={{ display: 'block', fontSize: '8px', color: '#f4a261', marginTop: 2 }}>✦</span>
          <span className="car-loader-spark" style={{ display: 'block', fontSize: '6px', color: '#e76f51', marginTop: 2 }}>✦</span>
        </div>

        {/* Ground line */}
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          height: 2, background: 'var(--border)', borderRadius: 2,
        }} />
      </div>

      {/* Loading text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', fontWeight: 500 }}>{text}</span>
        <span className="car-loader-dot" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>.</span>
        <span className="car-loader-dot" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>.</span>
        <span className="car-loader-dot" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>.</span>
      </div>
    </div>
  );
}
