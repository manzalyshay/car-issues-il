/**
 * One-time Google Search Console OAuth2 authentication.
 * Run: node scripts/gsc-auth.mjs
 * Saves refresh token to scripts/gsc-token.json for future API calls.
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(readFileSync(resolve(__dir, 'gsc-oauth-client.json'), 'utf8')).installed;

const { client_id, client_secret } = creds;
const REDIRECT = 'http://localhost:4242';
const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly';

const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
  `client_id=${client_id}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n🔐 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for redirect...\n');

// Listen for the redirect and capture the code
const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get('code');
  if (!code) { res.end('No code found'); return; }

  res.end('<h2>✅ Authenticated! You can close this tab.</h2>');
  server.close();

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    console.error('❌ No refresh token received:', tokens);
    process.exit(1);
  }

  const tokenFile = resolve(__dir, 'gsc-token.json');
  writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));
  console.log('✅ Token saved to scripts/gsc-token.json');
  console.log('   You can now run: node scripts/gsc-report.mjs');
});

server.listen(4242);
