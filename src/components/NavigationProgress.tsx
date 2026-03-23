'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    // Page arrived — complete the bar
    setWidth(100);
    const done = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 400);
    return () => clearTimeout(done);
  }, [pathname]);

  // Start the bar on link click (before navigation resolves)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(true);
      setWidth(0);

      // Animate to ~70% while waiting for the page
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setWidth(70));
      });

      // Safety: clear if navigation takes too long
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 8000);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible && width === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, var(--brand-red), #ff6b6b)',
          borderRadius: '0 2px 2px 0',
          transition: width === 100
            ? 'width 0.3s ease-out'
            : 'width 0.6s cubic-bezier(0.1, 0.7, 0.3, 1)',
          boxShadow: '0 0 8px rgba(230,57,70,0.6)',
          opacity: visible || width > 0 ? 1 : 0,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
