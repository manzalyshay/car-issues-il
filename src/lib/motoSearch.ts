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

/** A bike brand shaped for searchCars: slug 'moto-<make>' keeps it apart from the car brand of the same name. */
export interface MotoSearchable {
  slug: string; nameHe: string; nameEn: string; motoSlug: string; logoUrl: string;
  models: { slug: string; nameHe: string; nameEn: string }[];
}

export const toSearchable = (makes: MotoSearchMake[]): MotoSearchable[] =>
  makes.map((m) => ({ slug: `moto-${m.slug}`, nameHe: m.nameHe, nameEn: m.nameEn, motoSlug: m.slug, logoUrl: m.logoUrl, models: m.models }));

/** Page for a search hit: /motorcycles/... for bikes, /cars/... for cars. */
export function searchHitHref(make: { slug: string; motoSlug?: string }, modelSlug?: string): string {
  const base = make.motoSlug ? `/motorcycles/${make.motoSlug}` : `/cars/${make.slug}`;
  return modelSlug ? `${base}/${modelSlug}` : base;
}
