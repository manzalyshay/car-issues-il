import { NextResponse } from 'next/server';
import { getAllMakes } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const makes = await getAllMakes();
    return NextResponse.json(makes);
  } catch (err) {
    console.error('[/api/cars]', err);
    return NextResponse.json([], { status: 500 });
  }
}
