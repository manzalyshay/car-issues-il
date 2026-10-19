import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export const revalidate = 86400;

interface FuelEntry {
  makeSlug: string;
  modelSlug: string;
  nameHe: string;
  nameEn: string;
  fuel: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  // Get the category of the requested model
  const cats = await dbAll<{ category: string }>(
    'SELECT category FROM car_models WHERE make_slug = ? AND slug = ? LIMIT 1',
    make, model,
  );
  if (!cats.length) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
  const category = cats[0].category;

  // Get all models in same category with fuel data.
  // Prefer non-PHEV figures (>= 3.0 L/100km); fall back to MIN if only PHEV data exists.
  const rows = await dbAll<{ make_slug: string; model_slug: string; name_he: string; name_en: string; fuel: number }>(
    `SELECT cm.make_slug, cm.slug AS model_slug,
            mk.name_he || ' ' || cm.name_he AS name_he,
            mk.name_en || ' ' || cm.name_en AS name_en,
            COALESCE(
              MIN(CASE WHEN ct.fuel_consumption >= 3.0 THEN ct.fuel_consumption ELSE NULL END),
              MIN(ct.fuel_consumption)
            ) AS fuel
     FROM car_models cm
     JOIN car_makes mk ON cm.make_slug = mk.slug
     JOIN car_trims ct ON cm.make_slug = ct.make_slug AND cm.slug = ct.model_slug
     WHERE cm.category = ? AND ct.fuel_consumption > 0
     GROUP BY cm.make_slug, cm.slug
     ORDER BY fuel ASC`,
    category,
  );

  const data: FuelEntry[] = rows.map(r => ({
    makeSlug: r.make_slug,
    modelSlug: r.model_slug,
    nameHe: r.name_he,
    nameEn: r.name_en,
    fuel: r.fuel,
  }));

  return NextResponse.json({ category, data });
}
