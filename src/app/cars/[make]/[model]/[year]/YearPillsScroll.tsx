'use client';
import { useEffect } from 'react';

/** Scrolls the year-pill row so the current year is centred when the row overflows. */
export default function YearPillsScroll() {
  useEffect(() => {
    const row = document.getElementById('year-pills');
    const cur = document.getElementById('year-pill-current');
    if (!row || !cur || row.scrollWidth <= row.clientWidth) return;
    const delta = cur.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - cur.offsetWidth) / 2;
    row.scrollLeft += delta; // works for RTL too: the delta is in screen coordinates
  }, []);
  return null;
}
