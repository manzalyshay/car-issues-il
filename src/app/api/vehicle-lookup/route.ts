import { NextRequest, NextResponse } from 'next/server';
import { lookupVehicle } from '@/lib/vehicleLookup';

export async function GET(req: NextRequest) {
  const plate = req.nextUrl.searchParams.get('plate')?.replace(/\D/g, '');
  if (!plate || plate.length < 5 || plate.length > 8) {
    return NextResponse.json({ error: 'Invalid plate number' }, { status: 400 });
  }

  try {
    const result = await lookupVehicle(plate);
    if (result.status === 'not_found') return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (result.status === 'error')     return NextResponse.json({ error: 'Government API unavailable' }, { status: 502 });
    return NextResponse.json({ vehicle: result.vehicle }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (err) {
    console.error('[vehicle-lookup]', err);
    return NextResponse.json({ error: 'Failed to fetch vehicle data' }, { status: 500 });
  }
}
