/**
 * Cloudflare Workers AI helper.
 * Proven pattern (see src/app/api/admin/fill-perf-data/route.ts,
 * src/app/api/price-seller-type/route.ts): getCloudflareContext -> env.AI.run(...).
 * Requires no API key — covered by the Workers Paid plan.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function runWorkersAI(
  messages: AiMessage[],
  opts?: { max_tokens?: number; temperature?: number },
): Promise<string | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as Record<string, unknown>;
    const ai = env.AI as
      | { run: (model: string, options: unknown) => Promise<Record<string, unknown>> }
      | undefined;
    if (!ai) return null;

    const result = await ai.run(MODEL, {
      messages,
      max_tokens: opts?.max_tokens ?? 800,
      temperature: opts?.temperature ?? 0.3,
    });

    const response = result?.response;
    if (typeof response === 'string') return response.trim() || null;
    if (response != null) return JSON.stringify(response);

    const choicesContent = (result?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content;
    return choicesContent?.trim() || null;
  } catch {
    return null;
  }
}
