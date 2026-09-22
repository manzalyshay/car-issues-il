import { NextResponse } from 'next/server';

// Metrics are now served by /api/admin/analytics (Cloudflare + GA4 + GSC)
export async function GET() {
  return NextResponse.json({ redirect: '/admin/analytics' }, { status: 308 });
}
