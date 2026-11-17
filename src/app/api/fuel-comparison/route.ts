import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { normEngine } from '@/lib/specSummary';

export const revalidate = 86400;

interface FuelEntry {
  makeSlug: string;
  modelSlug: string;
  nameHe: string;
  nameEn: string;
  fuel: number;
}

const PLUG_IN = /phev|plug|פלאג|נטען|e-hybrid|tfsi e\b|\b\d{2}e\b|\b(?:x|s)drive\d{2}e\b|4xe|\bp\d{3}e\b/i;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const isEn = searchParams.get('locale') === 'en';
  if (!make || !model) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  // Get the category of the requested model
  const cats = await dbAll<{ category: string }>(
    'SELECT category FROM car_models WHERE make_slug = ? AND slug = ? LIMIT 1',
    make, model,
  );
  if (!cats.length) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
  const category = cats[0].category;

  // Every trim in the category. Electric and fuel figures are different units (kWh/100 km
  // vs L/100 km), so each model is ranked only against models of its own kind; plug-in
  // hybrids are left out of the fuel ranking (their official figure is mostly electric).
  const trims = await dbAll<{ make_slug: string; model_slug: string; name_he: string; name_en: string; engine_type: string | null; trim: string; fuel: number }>(
    `SELECT cm.make_slug, cm.slug AS model_slug,
            mk.name_he || ' ' || cm.name_he AS name_he,
            mk.name_en || ' ' || cm.name_en AS name_en,
            ct.engine_type, ct.name AS trim, ct.fuel_consumption AS fuel
     FROM car_models cm
     JOIN car_makes mk ON cm.make_slug = mk.slug
     JOIN car_trims ct ON cm.make_slug = ct.make_slug AND cm.slug = ct.model_slug
     WHERE cm.category = ? AND ct.fuel_consumption > 0`,
    category,
  );
  const byModel = new Map<string, { row: (typeof trims)[number]; fuel: number[]; ev: number[] }>();
  for (const t of trims) {
    const key = `${t.make_slug}/${t.model_slug}`;
    const m = byModel.get(key) ?? { row: t, fuel: [], ev: [] };
    // Many plug-in trims have no engine type, only a name like "xDrive30e ... פלאג אין הייבריד"
    const e = PLUG_IN.test(t.trim) ? 'phev' : normEngine(t.engine_type);
    if (e === 'electric') { if (t.fuel >= 5 && t.fuel <= 40) m.ev.push(t.fuel); }
    else if (e !== 'phev' && t.fuel >= 3 && t.fuel <= 20) m.fuel.push(t.fuel);
    byModel.set(key, m);
  }
  const self = byModel.get(`${make}/${model}`);
  // A model with any combustion trim is ranked on fuel; an all-electric one on energy
  const kind: 'fuel' | 'electric' = self && self.fuel.length === 0 && self.ev.length > 0 ? 'electric' : 'fuel';
  // Hebrew site: fuel in km per litre (higher is better), the Israeli norm. English: L/100 km.
  const unit: 'kml' | 'l100' | 'kwh' = kind === 'electric' ? 'kwh' : isEn ? 'l100' : 'kml';

  const data: FuelEntry[] = [];
  for (const { row, fuel, ev } of byModel.values()) {
    const vals = kind === 'electric' ? ev : fuel;
    if (vals.length === 0) continue;
    const best = Math.min(...vals); // the most efficient trim
    data.push({
      makeSlug: row.make_slug,
      modelSlug: row.model_slug,
      nameHe: isEn ? '' : row.name_he,
      nameEn: row.name_en,
      fuel: unit === 'kml' ? Math.round((100 / best) * 10) / 10 : best,
    });
  }
  // best first
  data.sort((a, b) => (unit === 'kml' ? b.fuel - a.fuel : a.fuel - b.fuel));

  return NextResponse.json({ category, unit, data });
}
