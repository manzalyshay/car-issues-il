import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton — reused across warm Lambda invocations to avoid exhausting the
// Supabase connection pool (each createClient() opens a new DB connection).
let _serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _serviceClient;
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
