import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, postId } = await req.json();
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'makeSlug and modelSlug required' }, { status: 400 });

  const githubPat  = process.env.GITHUB_PAT;
  const githubOwner = process.env.GITHUB_OWNER ?? 'manzalyshay';
  const githubRepo  = process.env.GITHUB_REPO  ?? 'car-issues-il';

  if (!githubPat) {
    return NextResponse.json({ error: 'GITHUB_PAT env var not set — add it in Vercel settings' }, { status: 500 });
  }

  // Trigger the GitHub Actions workflow_dispatch event
  const res = await fetch(
    `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/record-reel.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubPat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          make_slug: makeSlug,
          model_slug: modelSlug,
          post_id: postId ?? '',
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `GitHub API error ${res.status}: ${text}` }, { status: res.status });
  }

  // Mark the post as reel generating
  if (postId) {
    const sb = getServiceClient();
    const { data: post } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
    await sb.from('social_posts').update({
      metadata: { ...(post?.metadata ?? {}), reel_status: 'generating' },
    }).eq('id', postId);
  }

  return NextResponse.json({ ok: true });
}
