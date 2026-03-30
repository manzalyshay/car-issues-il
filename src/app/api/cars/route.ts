import { NextResponse } from 'next/server';
import { getAllMakes } from '@/lib/carsDb';

export const revalidate = 3600;

export async function GET() {
  try {
    const makes = await getAllMakes();
    return NextResponse.json(makes);
  } catch (err) {
    console.error('[/api/cars]', err);
    return NextResponse.json([], { status: 500 });
  }
}
