'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { RaceCar } from '@/lib/dragRace';

// The game (canvas renderer + physics) is a large client bundle. It is only fetched
// when the visitor asks for it, so compare pages don't ship it to everyone.
const DragRace = dynamic(() => import('./DragRace'), {
  ssr: false,
  loading: () => <Frame><span style={{ fontSize: 14, opacity: 0.8 }}>…</span></Frame>,
});

interface Props { a: RaceCar; b: RaceCar; isEn: boolean }

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: 140, borderRadius: 16, background: '#020617', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {children}
    </div>
  );
}

export default function DragRaceLazy({ a, b, isEn }: Props) {
  const [open, setOpen] = useState(false);
  if (open) return <DragRace a={a} b={b} isEn={isEn} />;
  return (
    <Frame>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Start fetching the game as soon as the visitor shows intent
        onPointerEnter={() => { void import('./DragRace'); }}
        onFocus={() => { void import('./DragRace'); }}
        style={{
          padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 6px 20px rgba(34,197,94,0.35)',
          fontWeight: 800, fontSize: 16,
        }}
      >
        🏁 {isEn ? 'Race them' : 'למרוץ'}
      </button>
    </Frame>
  );
}
