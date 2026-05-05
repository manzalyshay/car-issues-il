import { getServiceClient } from './adminAuth';

export type LogLevel = 'info' | 'warn' | 'error';

export async function adminLog(
  level: LogLevel,
  source: string,
  message: string,
  details?: unknown,
): Promise<void> {
  // Never throw — logging must never break the calling request
  try {
    const sb = getServiceClient();
    await sb.from('admin_logs').insert({
      level,
      source,
      message,
      details: details ?? null,
    });
  } catch {
    // Swallow silently
  }
}
