import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST() {
  revalidateTag('car-data', 'default');
  revalidateTag('car-data', 'max');
  return NextResponse.json({ ok: true, revalidated: true });
}
