/**
 * Type definitions for car makes and models.
 * All actual data now lives in Supabase (car_makes + car_models tables).
 * Use src/lib/carsDb.ts to fetch car data.
 */

export interface CarModel {
  slug: string;
  nameHe: string;
  nameEn: string;
  years: number[];
  category: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'electric';
  trims?: string[];
}

export interface CarMake {
  slug: string;
  nameHe: string;
  nameEn: string;
  country: string;
  logoUrl: string;
  popular: boolean;
  models: CarModel[];
}

export function getCategoryLabel(cat: CarModel['category']): string {
  const MAP: Record<CarModel['category'], string> = {
    sedan: 'סדאן', suv: 'SUV', hatchback: "האצ'בק", pickup: 'פיקאפ',
    van: 'ואן', coupe: 'קופה', electric: 'חשמלי',
  };
  return MAP[cat] ?? cat;
}
