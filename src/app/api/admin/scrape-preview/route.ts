import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeRawPosts } from '@/lib/expertReviews';

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;
  const { data: { user } } = await getServiceClient().auth.getUser(token);
  if (!user) return false;
  const { data } = await getServiceClient().from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin === true;
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug } = await req.json();
  const make  = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const posts = await scrapeRawPosts(make.nameHe, model.nameHe, make.nameEn, model.nameEn);
  return NextResponse.json({ posts });
}
