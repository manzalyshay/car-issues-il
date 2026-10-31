<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Data source of truth

The production database is **Cloudflare D1** (`src/lib/db.ts`); read and write data there (e.g. `car_3d_models`). Ignore Supabase for now — it is not the source of truth.
