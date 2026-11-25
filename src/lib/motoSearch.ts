'use client';
import { useEffect, useState } from 'react';

export interface MotoSearchMake {
  slug: string; nameHe: string; nameEn: string; logoUrl: string;
  models: { slug: string; nameHe: string; nameEn: string }[];
}

/** Motorcycle brands and models for the search boxes; empty on the English site (no bike pages there). */
export function useMotoSearchIndex(locale: string): MotoSearchMake[] {
  const [makes, setMakes] = useState<MotoSearchMake[]>([]);
  useEffect(() => {
    if (locale === 'en') return;
    fetch('/api/motorcycles').then((r) => (r.ok ? r.json() : [])).then(setMakes).catch(() => {});
  }, [locale]);
  return makes;
}
