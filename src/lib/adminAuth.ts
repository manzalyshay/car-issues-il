import { NextRequest } from 'next/server';
import { dbFirst } from './db';

/**
 * Admin auth via Supabase JWT verification + D1 profiles table.
 * Falls back to ADMIN_SECRET env var for simple secret-based access.
 */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;

  // Simple secret-based admin (set ADMIN_SECRET in CF dashboard)
  const secret = process.env.ADMIN_SECRET;
  if (secret && token === secret) return true;

  // Supabase JWT-based admin (for logged-in users)
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return false;
    const profile = await dbFirst<{ is_admin: number }>(
      'SELECT is_admin FROM profiles WHERE id = ?', user.id,
    );
    return profile?.is_admin === 1;
  } catch {
    return false;
  }
}

/**
 * Returns the D1 database — kept for backwards compat with any code that
 * imports getServiceClient() expecting a query interface. Use dbAll/dbFirst
 * directly in new code instead.
 */
export function getServiceClient() {
  throw new Error('getServiceClient() removed — import dbAll/dbFirst from @/lib/db instead');
}
