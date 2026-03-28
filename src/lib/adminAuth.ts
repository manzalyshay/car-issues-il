import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;
  const { data: { user } } = await getServiceClient().auth.getUser(token);
  if (!user) return false;
  const { data } = await getServiceClient()
    .from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin === true;
}
