/**
 * D1 database accessor for Cloudflare Workers.
 * Uses getCloudflareContext() from @opennextjs/cloudflare to get the D1 binding.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface D1Env {
  DB: D1Database;
}

let _db: D1Database | null = null;

export async function getDB(): Promise<D1Database> {
  if (_db) return _db;
  try {
    const ctx = await getCloudflareContext({ async: true });
    _db = (ctx.env as D1Env).DB;
    return _db;
  } catch {
    throw new Error('D1 database not available — run via wrangler dev or deploy to CF Workers');
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
