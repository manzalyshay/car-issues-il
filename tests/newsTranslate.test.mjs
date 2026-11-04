// Unit tests for the news Hebrew rewrite: failure reasons, counts, run status,
// and that there is no fallback provider. No network: every Gemini call goes to a mocked fetch.
// Run: npm test   (node --test, Node 22+ strips the TypeScript types)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  callGemini, translateHebrew, parseHebrewJson,
  newTranslationStats, recordOutcome, newsRunStatus, sanitizeDiagnostic,
} from '../src/lib/newsTranslate.ts';

const KEY = 'test-key-123';
const GOOD = JSON.stringify({ title: 'כותרת', body: 'גוף הכתבה' });

const json = (status, body) => async () =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const geminiReply = text => json(200, { candidates: [{ content: { parts: [{ text }] } }] });
const throws = (name, message = name) => async () => { const e = new Error(message); e.name = name; throw e; };
let calls = 0;
const counting = fn => async (...a) => { calls++; return fn(...a); };

// ── Gemini failure reasons ───────────────────────────────────────────────────

test('missing key: no request is made', async () => {
  calls = 0;
  const r = await callGemini('p', { apiKey: undefined, fetchImpl: counting(geminiReply(GOOD)) });
  assert.deepEqual(r, { ok: false, reason: 'missing_key' });
  assert.equal(calls, 0);
});

test('HTTP 429 keeps the status and the provider message, with the key masked', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: `Quota exceeded for key ${KEY}` } }) });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'http_429');
  assert.match(r.message, /Quota exceeded/);
  assert.ok(!r.message.includes(KEY));
});

test('HTTP 404 (model not found) is reported as http_404', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'models/x is not found' } }) });
  assert.equal(r.reason, 'http_404');
});

test('timeout', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: throws('TimeoutError') });
  assert.deepEqual(r, { ok: false, reason: 'timeout' });
});

test('network error', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: throws('TypeError', 'fetch failed') });
  assert.equal(r.reason, 'network_error');
});

test('invalid JSON from the model', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: geminiReply('{"title": "x", "body": ') });
  assert.equal(r.reason, 'bad_json');
});

test('response body that is not JSON', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(200, '<html>oops</html>') });
  assert.equal(r.reason, 'bad_json');
});

test('empty candidate text', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(200, { candidates: [] }) });
  assert.deepEqual(r, { ok: false, reason: 'empty' });
});

test('success, including a fenced JSON reply', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: geminiReply('```json\n' + GOOD + '\n```') });
  assert.deepEqual(r, { ok: true, article: { titleHe: 'כותרת', bodyHe: 'גוף הכתבה' } });
});

test('parseHebrewJson rejects missing or blank fields without throwing', () => {
  assert.equal(parseHebrewJson('{"title":"x"}'), null);
  assert.equal(parseHebrewJson('{"title":" ","body":"y"}'), null);
  assert.equal(parseHebrewJson('not json'), null);
});

test('non-string error.message does not throw and is stored as text', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(500, { error: { message: { code: 7, detail: 'boom' } } }) });
  assert.equal(r.reason, 'http_500');
  assert.equal(typeof r.message, 'string');
  assert.match(r.message, /boom/);
});

test('error body that is not JSON keeps the raw text', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(503, 'Service Unavailable') });
  assert.deepEqual(r, { ok: false, reason: 'http_503', message: 'Service Unavailable' });
});

test('error body that cannot be read does not throw', async () => {
  const fetchImpl = async () => ({ ok: false, status: 502, text: async () => { throw new Error('stream closed'); } });
  const r = await callGemini('p', { apiKey: KEY, fetchImpl });
  assert.deepEqual(r, { ok: false, reason: 'http_502', message: '' });
});

test('non-string candidate text is bad_json, not a crash', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: json(200, { candidates: [{ content: { parts: [{ text: { a: 1 } }] } }] }) });
  assert.equal(r.reason, 'bad_json');
});

test('network error text is sanitized: key masked', async () => {
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: throws('TypeError', `connect failed for https://x/y?key=${KEY}`) });
  assert.equal(r.reason, 'network_error');
  assert.ok(!r.message.includes(KEY));
});

test('sanitizeDiagnostic masks keys and tokens, strips control characters, clips to 200', () => {
  assert.equal(sanitizeDiagnostic(`bad key ${KEY}`, KEY), 'bad key ***');
  assert.equal(sanitizeDiagnostic('GET /v1?alt=json&key=AIzaSECRET&x=1'), 'GET /v1?alt=json&key=***&x=1');
  assert.equal(sanitizeDiagnostic('https://h/p?access_token=abc.def'), 'https://h/p?access_token=***');
  assert.equal(sanitizeDiagnostic('line1\n\u0000line2\tend'), 'line1 line2 end');
  assert.equal(sanitizeDiagnostic('x'.repeat(500)).length, 200);
  assert.equal(sanitizeDiagnostic(null), '');
  assert.equal(sanitizeDiagnostic({ a: 1 }), '{"a":1}');
});

// ── No fallback ──────────────────────────────────────────────────────────────

test('no fallback: a Gemini failure is an untranslated outcome with reason and message', async () => {
  const out = await translateHebrew(() => callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'models/gemini-3.6-flash is not found' } }) }));
  assert.deepEqual(out, {
    ok: false,
    failures: { gemini: 'http_404' },
    messages: { gemini: 'models/gemini-3.6-flash is not found' },
  });
});

test('no fallback: Gemini success is the only way to get Hebrew', async () => {
  const out = await translateHebrew(() => callGemini('p', { apiKey: KEY, fetchImpl: geminiReply(GOOD) }));
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'gemini');
  assert.deepEqual(out.failures, {});
});

test('no fallback: each failure reason passes through unchanged', async () => {
  const cases = [
    [undefined, geminiReply(GOOD), 'missing_key'],
    [KEY, throws('TimeoutError'), 'timeout'],
    [KEY, json(429, { error: { message: 'quota' } }), 'http_429'],
    [KEY, geminiReply('nope'), 'bad_json'],
    [KEY, json(200, { candidates: [] }), 'empty'],
  ];
  for (const [apiKey, fetchImpl, reason] of cases) {
    const out = await translateHebrew(() => callGemini('p', { apiKey, fetchImpl }));
    assert.equal(out.ok, false);
    assert.deepEqual(out.failures, { gemini: reason });
  }
});

test('no fallback: news code no longer imports or calls Workers AI', () => {
  const lib = readFileSync(new URL('../src/lib/newsTranslate.ts', import.meta.url), 'utf8');
  const news = readFileSync(new URL('../src/lib/carNews.ts', import.meta.url), 'utf8');
  for (const src of [lib, news]) {
    assert.ok(!/runWorkersAI|workersAi|callWorkersAi|translateWithFallback/.test(src));
  }
});

// ── Counts and run status ────────────────────────────────────────────────────

test('counts per run, with samples', async () => {
  const s = newTranslationStats();
  const ok = () => callGemini('p', { apiKey: KEY, fetchImpl: geminiReply(GOOD) });
  const q = () => callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: 'quota' } }) });
  const t = () => callGemini('p', { apiKey: KEY, fetchImpl: throws('TimeoutError') });
  recordOutcome(s, await translateHebrew(ok));
  recordOutcome(s, await translateHebrew(q));
  recordOutcome(s, await translateHebrew(q));
  recordOutcome(s, await translateHebrew(t));
  assert.deepEqual(s, {
    attempted: 4, translated: 1, viaGemini: 1, untranslated: 3,
    reasons: { 'gemini:http_429': 2, 'gemini:timeout': 1 },
    samples: { 'gemini:http_429': 'quota' },
  });
});

test('run status is honest', () => {
  const stats = (attempted, translated) => ({ ...newTranslationStats(), attempted, translated, untranslated: attempted - translated });
  // Today's production pattern: 5 new + 10 retries, none translated -> failed, not ok.
  assert.equal(newsRunStatus(0, [stats(5, 0), stats(10, 0)]), 'failed');
  assert.equal(newsRunStatus(0, [stats(5, 4), stats(0, 0)]), 'partial');
  assert.equal(newsRunStatus(1, [stats(5, 5), stats(0, 0)]), 'partial');
  assert.equal(newsRunStatus(0, [stats(5, 5), stats(2, 2)]), 'ok');
  assert.equal(newsRunStatus(0, [stats(0, 0), stats(0, 0)]), 'ok');
});

test('no-fallback run with every Gemini call failing is recorded as failed', async () => {
  const fresh = newTranslationStats();
  const retry = newTranslationStats();
  const fail = () => callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'not found' } }) });
  for (let i = 0; i < 5; i++) recordOutcome(fresh, await translateHebrew(fail));
  for (let i = 0; i < 10; i++) recordOutcome(retry, await translateHebrew(fail));
  assert.equal(newsRunStatus(0, [fresh, retry]), 'failed');
  assert.deepEqual(fresh.reasons, { 'gemini:http_404': 5 });
  assert.equal(fresh.samples['gemini:http_404'], 'not found');
});
