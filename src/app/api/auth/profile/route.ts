import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ is_admin: false });

  const { data: { user } } = await getServiceClient().auth.getUser(token);
  if (!user) return NextResponse.json({ is_admin: false });

  const { data } = await getServiceClient()
    .from('profiles').select('is_admin').eq('id', user.id).single();

  return NextResponse.json({ is_admin: data?.is_admin ?? false });
}
