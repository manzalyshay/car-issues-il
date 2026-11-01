import { NextRequest, NextResponse } from 'next/server';
import { getAllMakes } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const makes = await getAllMakes();
    const isEn = req.nextUrl.searchParams.get('locale') === 'en';
    // On the English site, never send Hebrew-only or Israel-specific fields over the wire.
    const data = isEn
      ? makes.map((m) => ({ ...m, nameHe: '', country: '', models: m.models.map((mo) => ({ ...mo, nameHe: '', trims: undefined, activeVehiclesIl: undefined })) }))
      : makes;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/cars]', err);
    return NextResponse.json([], { status: 500 });
  }
}
