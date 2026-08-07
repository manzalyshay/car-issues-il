import { NextRequest, NextResponse } from 'next/server';
import { lookupVehicle, detectCountry } from '@/lib/vehicleLookup';
import { lookupUkVehicle } from '@/lib/vehicleLookupUk';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('plate') ?? '';
  const country = detectCountry(raw);

  if (country === 'il') {
    const plate = raw.replace(/\D/g, '');
    if (plate.length < 5 || plate.length > 8) {
      return NextResponse.json({ error: 'Invalid plate number' }, { status: 400 });
    }
    try {
      const result = await lookupVehicle(plate);
      if (result.status === 'not_found') return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      if (result.status === 'error')     return NextResponse.json({ error: 'Government API unavailable' }, { status: 502 });
      return NextResponse.json({ vehicle: result.vehicle }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
    } catch (err) {
      console.error('[vehicle-lookup/il]', err);
      return NextResponse.json({ error: 'Failed to fetch vehicle data' }, { status: 500 });
    }
  }

  if (country === 'uk') {
    try {
      const result = await lookupUkVehicle(raw);
      if (result.status === 'not_found') return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      if (result.status === 'error')     return NextResponse.json({ error: 'DVLA API unavailable' }, { status: 502 });
      return NextResponse.json({ vehicle: result.vehicle }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
    } catch (err) {
      console.error('[vehicle-lookup/uk]', err);
      return NextResponse.json({ error: 'Failed to fetch vehicle data' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid plate number' }, { status: 400 });
}
