/**
 * D1 database accessor for Cloudflare Workers.
 * Uses getCloudflareContext() from @opennextjs/cloudflare to get the D1 binding.
 * Falls back to the D1 REST API when running via `next dev` (uses CLOUDFLARE_API_TOKEN).
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface D1Env {
  DB: D1Database;
}

const CF_ACCOUNT_ID = 'da4220321e156152ca7f02ca93059557';
const CF_DATABASE_ID = '090762ad-b029-4883-b827-9376cdee1ed2';

/** Wrap the D1 REST API to look like a D1Database (used in `next dev`) */
function makeRemoteDB(): D1Database {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;

  async function d1Query(sql: string, params: unknown[]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    const data = await res.json() as {
      success: boolean;
      result: { results: Record<string, unknown>[]; success: boolean; meta: D1Meta }[];
      errors: { message: string }[];
    };
    if (!data.success) throw new Error(data.errors?.[0]?.message ?? 'D1 query failed');
    return data.result[0];
  }

  const wrap = (sql: string, params: unknown[]): D1PreparedStatement => ({
    bind: (...args) => wrap(sql, args),
    all: async () => {
      const { results, meta } = await d1Query(sql, params);
      return { results, meta, success: true };
    },
    first: async <T = unknown>() => {
      const { results } = await d1Query(sql, params);
      return (results[0] ?? null) as T;
    },
    run: async () => {
      const { meta } = await d1Query(sql, params);
      return { success: true, meta };
    },
    raw: async () => {
      const { results } = await d1Query(sql, params);
      return results.map(row => Object.values(row)) as unknown[][];
    },
  });

  return {
    prepare: (sql: string) => wrap(sql, []),
    batch: async (statements) => Promise.all(statements.map(s => (s as ReturnType<typeof wrap>).run())),
    exec: async (sql) => { await d1Query(sql, []); return { count: 0, duration: 0 }; },
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

let _db: D1Database | null = null;

export async function getDB(): Promise<D1Database> {
  if (_db) return _db;
  // Skip during next build — pages handle the error via try/catch
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('D1 not available at build time');
  }
  // In dev, use D1 REST API directly to get real production data
  if (process.env.NODE_ENV === 'development') {
    _db = makeRemoteDB();
    return _db;
  }
  try {
    const ctx = await getCloudflareContext({ async: true });
    _db = (ctx.env as D1Env).DB;
    return _db;
  } catch {
    _db = makeRemoteDB();
    return _db;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run a query returning multiple rows. */
export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null)[]
): Promise<T[]> {
  const db = await getDB();
  const { results } = await db.prepare(sql).bind(...params).all();
  return (results ?? []) as T[];
}

/** Run a query returning a single row or null. */
export async function dbFirst<T = Record<string, unknown>>(
  sql: string,
  ...params: (string | number | null)[]
): Promise<T | null> {
  const db = await getDB();
  const result = await db.prepare(sql).bind(...params).first<T>();
  return result ?? null;
}

/** Run an INSERT/UPDATE/DELETE. */
export async function dbRun(
  sql: string,
  ...params: (string | number | null)[]
): Promise<D1Result> {
  const db = await getDB();
  return db.prepare(sql).bind(...params).run();
}

/** Run multiple statements in a batch (single round-trip). */
export async function dbBatch(
  statements: { sql: string; params?: (string | number | null)[] }[],
): Promise<void> {
  const db = await getDB();
  await db.batch(statements.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
}
