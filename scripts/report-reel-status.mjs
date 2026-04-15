/**
 * Reports reel workflow failure back to Supabase so the admin panel can show it.
 * Called from the GitHub Actions workflow on failure.
 * Usage: node scripts/report-reel-status.mjs failure
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* ignore — env vars already set in CI */ }

const status   = process.argv[2] ?? 'failure'; // 'failure' | 'success'
const makeSlug = process.env.MAKE_SLUG;
const modelSlug = process.env.MODEL_SLUG;
const postId   = process.env.POST_ID || null;
const runId    = process.env.GITHUB_RUN_ID ?? '';
const repoStr  = process.env.GITHUB_REPO ?? 'manzalyshay/car-issues-il';
const logsUrl  = runId ? `https://github.com/${repoStr}/actions/runs/${runId}` : null;

if (!makeSlug || !modelSlug) {
  console.error('MAKE_SLUG / MODEL_SLUG not set');
  process.exit(0); // non-fatal
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

if (postId) {
  const { data: post } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
  const meta = post?.metadata ?? {};
  await sb.from('social_posts').update({
    metadata: {
      ...meta,
      reel_status: status === 'failure' ? 'failed' : 'ready',
      reel_logs_url: logsUrl,
    },
  }).eq('id', postId);
  console.log(`Reported reel status '${status}' for post ${postId}`);
} else {
  // No postId — update car_3d_models with error info
  await sb.from('car_3d_models').update({
    reel_url: null,
    reel_status: status === 'failure' ? 'failed' : null,
    reel_logs_url: logsUrl,
  }).eq('make_slug', makeSlug).eq('model_slug', modelSlug);
  console.log(`Reported reel status '${status}' for ${makeSlug}/${modelSlug}`);
}
