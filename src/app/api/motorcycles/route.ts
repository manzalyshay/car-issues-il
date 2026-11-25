import { NextResponse } from 'next/server';
import { getAllMotoMakes } from '@/lib/motoDb';

export const dynamic = 'force-dynamic';

/** Motorcycle brands and models for the site search boxes (Hebrew site only shows bikes). */
export async function GET() {
  try {
    const makes = await getAllMotoMakes();
    return NextResponse.json(
      makes.map((m) => ({
        slug: m.slug, nameHe: m.nameHe, nameEn: m.nameEn, logoUrl: m.logoUrl,
        models: m.models.map((mo) => ({ slug: mo.slug, nameHe: mo.nameHe, nameEn: mo.nameEn })),
      })),
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (err) {
    console.error('[/api/motorcycles]', err);
    return NextResponse.json([], { status: 500 });
  }
}
