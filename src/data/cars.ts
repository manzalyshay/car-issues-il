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
  apple_carplay:       { labelHe: 'CarPlay / Android Auto',      labelEn: 'CarPlay / Android Auto',        category: 'tech' },
  wireless_carplay:    { labelHe: 'CarPlay אלחוטי',              labelEn: 'Wireless CarPlay',               category: 'tech' },
  wireless_charging:   { labelHe: 'טעינה אלחוטית',               labelEn: 'Wireless Charging',              category: 'tech' },
  digital_cluster:     { labelHe: 'לוח מחוונים דיגיטלי',        labelEn: 'Digital Instrument Cluster',     category: 'tech' },
  hud:                 { labelHe: 'HUD (מידע על השמשה)',          labelEn: 'HUD (Head-Up Display)',          category: 'tech' },
  premium_audio:       { labelHe: 'מערכת שמע פרמיום',            labelEn: 'Premium Audio System',          category: 'tech' },
  // Safety
  aeb:                 { labelHe: 'בלימת חירום אוטומטית (AEB)',  labelEn: 'Automatic Emergency Braking (AEB)', category: 'safety' },
  adaptive_cruise:     { labelHe: 'קרוז קונטרול אדפטיבי',       labelEn: 'Adaptive Cruise Control',       category: 'safety' },
  lane_keep:           { labelHe: 'שמירת נתיב',                  labelEn: 'Lane Keeping Assist',           category: 'safety' },
  blind_spot:          { labelHe: 'ניטור נקודת עיוורת',          labelEn: 'Blind Spot Monitoring',         category: 'safety' },
  rear_camera:         { labelHe: 'מצלמה אחורית',                labelEn: 'Rear Camera',                   category: 'safety' },
  camera_360:          { labelHe: 'מצלמה 360°',                  labelEn: '360° Camera',                   category: 'safety' },
  parking_sensors:     { labelHe: 'חיישני חניה',                 labelEn: 'Parking Sensors',               category: 'safety' },
  traffic_sign:        { labelHe: 'זיהוי תמרורים',               labelEn: 'Traffic Sign Recognition',      category: 'safety' },
  // Comfort
  heated_seats_front:  { labelHe: 'חימום מושבים קדמיים',         labelEn: 'Heated Front Seats',            category: 'comfort' },
  heated_seats_rear:   { labelHe: 'חימום מושבים אחוריים',        labelEn: 'Heated Rear Seats',             category: 'comfort' },
  ventilated_seats:    { labelHe: 'מושבים מאווררים',             labelEn: 'Ventilated Seats',              category: 'comfort' },
  electric_seats:      { labelHe: 'כיוון חשמלי למושב',           labelEn: 'Electric Seat Adjustment',      category: 'comfort' },
  memory_seats:        { labelHe: 'מושב עם זיכרון',              labelEn: 'Memory Seats',                  category: 'comfort' },
  sunroof:             { labelHe: 'גג שמש',                      labelEn: 'Sunroof',                       category: 'comfort' },
  panoramic_roof:      { labelHe: 'גג פנורמי',                   labelEn: 'Panoramic Roof',                category: 'comfort' },
  keyless_entry:       { labelHe: 'כניסה ללא מפתח',              labelEn: 'Keyless Entry',                 category: 'comfort' },
  push_start:          { labelHe: 'הפעלה בלחצן',                 labelEn: 'Push Button Start',             category: 'comfort' },
  ambient_lighting:    { labelHe: 'תאורת אווירה',                labelEn: 'Ambient Lighting',              category: 'comfort' },
  led_lights:          { labelHe: 'פנסי LED',                    labelEn: 'LED Headlights',                category: 'comfort' },
  auto_lights:         { labelHe: 'פנסים אוטומטיים',             labelEn: 'Automatic Headlights',          category: 'comfort' },
  heated_steering:     { labelHe: 'הגה מחומם',                   labelEn: 'Heated Steering Wheel',         category: 'comfort' },
} as const satisfies Record<string, { labelHe: string; labelEn: string; category: 'tech' | 'safety' | 'comfort' }>;

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

export function getCategoryLabel(cat: CarModel['category'], locale: 'he' | 'en' = 'he'): string {
  const MAP_HE: Record<CarModel['category'], string> = {
    sedan: 'סדאן', suv: 'SUV', hatchback: "האצ'בק", pickup: 'פיקאפ',
    van: 'ואן', coupe: 'קופה', electric: 'חשמלי',
  };
  const MAP_EN: Record<CarModel['category'], string> = {
    sedan: 'Sedan', suv: 'SUV', hatchback: 'Hatchback', pickup: 'Pickup',
    van: 'Van', coupe: 'Coupe', electric: 'Electric',
  };
  return (locale === 'en' ? MAP_EN : MAP_HE)[cat] ?? cat;
}
