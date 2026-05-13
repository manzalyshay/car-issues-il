import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/adminAuth';

async function purgeCloudflareAll() {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_CACHE_TOKEN;
  if (!zone || !token) return;
  await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ purge_everything: true }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path } = await req.json().catch(() => ({ path: null }));

  if (path) {
    revalidatePath(path);
  } else {
    // Full purge — bust both Vercel ISR and Cloudflare
    revalidatePath('/', 'layout');
    await purgeCloudflareAll();
  }

  return NextResponse.json({ ok: true, purged: path ?? 'everything' });
}
