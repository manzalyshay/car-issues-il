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

export type EngineType = 'petrol' | 'hybrid' | 'phev' | 'electric' | 'diesel';
export type Transmission = 'manual' | 'automatic' | 'cvt' | 'dct';
export type DriveType = 'fwd' | 'rwd' | 'awd';
export type SeatsType = 'fabric' | 'leatherette' | 'leather';

export interface TrimSpec {
  id: string;
  name: string;
  sortOrder: number;
  engineType?: EngineType;
  engineCc?: number;
  engineHp?: number;
  transmission?: Transmission;
  drive?: DriveType;
  seats?: SeatsType;
  seatCount?: number;
  screenSize?: number;
  features: string[];
  priceIls?: number;
}

/** All feature keys used in TrimSpec.features */
export const TRIM_FEATURES = {
  // Tech
  apple_carplay:       { labelHe: 'CarPlay / Android Auto',   category: 'tech' },
  wireless_carplay:    { labelHe: 'CarPlay אלחוטי',           category: 'tech' },
  wireless_charging:   { labelHe: 'טעינה אלחוטית',            category: 'tech' },
  digital_cluster:     { labelHe: 'לוח מחוונים דיגיטלי',     category: 'tech' },
  hud:                 { labelHe: 'HUD (מידע על השמשה)',       category: 'tech' },
  premium_audio:       { labelHe: 'מערכת שמע פרמיום',         category: 'tech' },
  // Safety
  aeb:                 { labelHe: 'בלימת חירום אוטומטית (AEB)', category: 'safety' },
  adaptive_cruise:     { labelHe: 'קרוז קונטרול אדפטיבי',    category: 'safety' },
  lane_keep:           { labelHe: 'שמירת נתיב',               category: 'safety' },
  blind_spot:          { labelHe: 'ניטור נקודת עיוורת',       category: 'safety' },
  rear_camera:         { labelHe: 'מצלמה אחורית',             category: 'safety' },
  camera_360:          { labelHe: 'מצלמה 360°',               category: 'safety' },
  parking_sensors:     { labelHe: 'חיישני חניה',              category: 'safety' },
  traffic_sign:        { labelHe: 'זיהוי תמרורים',            category: 'safety' },
  // Comfort
  heated_seats_front:  { labelHe: 'חימום מושבים קדמיים',      category: 'comfort' },
  heated_seats_rear:   { labelHe: 'חימום מושבים אחוריים',     category: 'comfort' },
  ventilated_seats:    { labelHe: 'מושבים מאווררים',          category: 'comfort' },
  electric_seats:      { labelHe: 'כיוון חשמלי למושב',        category: 'comfort' },
  memory_seats:        { labelHe: 'מושב עם זיכרון',           category: 'comfort' },
  sunroof:             { labelHe: 'גג שמש',                   category: 'comfort' },
  panoramic_roof:      { labelHe: 'גג פנורמי',                category: 'comfort' },
  keyless_entry:       { labelHe: 'כניסה ללא מפתח',           category: 'comfort' },
  push_start:          { labelHe: 'הפעלה בלחצן',              category: 'comfort' },
  ambient_lighting:    { labelHe: 'תאורת אווירה',             category: 'comfort' },
  led_lights:          { labelHe: 'פנסי LED',                 category: 'comfort' },
  auto_lights:         { labelHe: 'פנסים אוטומטיים',          category: 'comfort' },
  heated_steering:     { labelHe: 'הגה מחומם',                category: 'comfort' },
} as const satisfies Record<string, { labelHe: string; category: 'tech' | 'safety' | 'comfort' }>;

export type FeatureKey = keyof typeof TRIM_FEATURES;

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
