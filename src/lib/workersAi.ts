/**
 * Shared text-generation helper: Gemini (free tier) first, Cloudflare Workers AI as
 * the fallback.
 *
 * Workers AI is billed per neuron beyond the daily free allocation; Gemini's free tier
 * covers this volume. Workers AI is used only when Gemini is not set up, fails, or is
 * rate-limited: after a Gemini 429 this isolate skips Gemini for GEMINI_COOLDOWN_MS.
 * Uses a Flash-Lite model so it does not share the news translator's quota (GEMINI_MODEL
 * in src/lib/newsTranslate.ts). Override with the GEMINI_LITE_MODEL env var.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const DEFAULT_GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_TIMEOUT_MS = 20_000;
const GEMINI_COOLDOWN_MS = 10 * 60_000;

let geminiBlockedUntil = 0;

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AiOpts = { max_tokens?: number; temperature?: number };

async function runGemini(messages: AiMessage[], opts: AiOpts | undefined): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || Date.now() < geminiBlockedUntil) return null;
  const model = process.env.GEMINI_LITE_MODEL || DEFAULT_GEMINI_MODEL;
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: opts?.max_tokens ?? 800,
            temperature: opts?.temperature ?? 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    );
    if (res.status === 429) geminiBlockedUntil = Date.now() + GEMINI_COOLDOWN_MS;
    if (!res.ok) {
      console.warn(`[ai] gemini ${model} -> HTTP ${res.status}, falling back to Workers AI`);
      return null;
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[ai] gemini failed, falling back to Workers AI', err instanceof Error ? err.name : err);
    return null;
  }
}

async function runCloudflareAi(messages: AiMessage[], opts: AiOpts | undefined): Promise<string | null> {
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

/** Name kept for existing callers: Gemini first, Workers AI on failure. Returns null if both fail. */
export async function runWorkersAI(messages: AiMessage[], opts?: AiOpts): Promise<string | null> {
  return (await runGemini(messages, opts)) ?? (await runCloudflareAi(messages, opts));
}
