# CarIssues IL — carissues.co.il

Hebrew car review site for the Israeli market. Next.js (OpenNext) on Cloudflare Workers + D1.

## Stack

- **Framework**: Next.js (App Router) via OpenNext on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Workers Paid plan
- **Domains**: carissues.co.il (Hebrew) / carissues.net (English)

## Dev

```bash
npx wrangler dev --config wrangler.toml   # serves on http://localhost:8787
```

## Build & Deploy

```bash
npm run build:cf                                      # build OpenNext bundle
npx wrangler deploy --config wrangler.toml            # deploy to Cloudflare
```

> Always use `--config wrangler.toml` explicitly — there's a `wrangler.jsonc` in the parent `/workspace` dir that will cause conflicts.

## Analytics

Service account key: `/workspace/carissuesil-5264fe9517fb.json`
GA4 Property ID: `543980467`

Pull a quick analytics report:
```bash
node scripts/analytics.mjs        # last 30 days
node scripts/analytics.mjs 7     # last 7 days
```
