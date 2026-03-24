'use client';

import { useState } from 'react';

interface Props {
  logoUrl: string;
  nameEn: string;
  size?: number;
}

export default function MakeLogo({ logoUrl, nameEn, size = 52 }: Props) {
  const [error, setError] = useState(false);
  const radius = Math.round(size * 0.18);

  if (!logoUrl || error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: 'var(--brand-red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 900, color: 'white', flexShrink: 0,
        letterSpacing: '-0.03em',
      }}>
        {nameEn.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'white',
      padding: Math.round(size * 0.14),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={nameEn}
        onError={() => setError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
