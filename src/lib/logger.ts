import { dbRun } from './db';
import { randomUUID } from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';

export async function adminLog(
  level: LogLevel,
  source: string,
  message: string,
  details?: unknown,
): Promise<void> {
  // Never throw — logging must never break the calling request
  try {
    await dbRun(
      'INSERT INTO admin_logs (id, level, source, message, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      randomUUID(), level, source, message,
      details != null ? JSON.stringify(details) : null,
      new Date().toISOString(),
    );
  } catch {
    // Swallow silently
  }
}
