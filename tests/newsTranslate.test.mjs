// Unit tests for the news Hebrew rewrite: failure reasons, counts and run status.
// No network: every Gemini call goes to a mocked fetch, Workers AI to a stub.
// Run: npm test   (node --test, Node 22+ strips the TypeScript types)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  callGemini, callWorkersAi, translateWithFallback, parseHebrewJson,
  newTranslationStats, recordOutcome, newsRunStatus,
} from '../src/lib/newsTranslate.ts';

const KEY = 'test-key-123';
const GOOD = JSON.stringify({ title: 'כותרת', body: 'גוף הכתבה' });

const json = (status, body) => async () =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const geminiReply = text => json(200, { candidates: [{ content: { parts: [{ text }] } }] });
const throws = (name, message = name) => async () => { const e = new Error(message); e.name = name; throw e; };
let calls = 0;
const counting = fn => async (...a) => { calls++; return fn(...a); };

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

test('fallback: Gemini fails, existing Workers AI rewrite succeeds', async () => {
  const out = await translateWithFallback(
    () => callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: 'quota' } }) }),
    () => callWorkersAi('p', async () => GOOD),
  );
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'workers_ai');
  assert.deepEqual(out.failures, { gemini: 'http_429' });
});

test('fallback not used when Gemini succeeds', async () => {
  calls = 0;
  const out = await translateWithFallback(
    () => callGemini('p', { apiKey: KEY, fetchImpl: geminiReply(GOOD) }),
    counting(() => callWorkersAi('p', async () => GOOD)),
  );
  assert.equal(out.provider, 'gemini');
  assert.equal(calls, 0);
});

test('both fail: both reasons recorded; Workers AI null is "empty"', async () => {
  const out = await translateWithFallback(
    () => callGemini('p', { apiKey: undefined }),
    () => callWorkersAi('p', async () => null),
  );
  assert.equal(out.ok, false);
  assert.deepEqual(out.failures, { gemini: 'missing_key', workers_ai: 'empty' });
});

test('no fallback supplied (short-body retries): only Gemini is tried', async () => {
  const out = await translateWithFallback(() => callGemini('p', { apiKey: KEY, fetchImpl: throws('TimeoutError') }));
  assert.deepEqual(out, { ok: false, failures: { gemini: 'timeout' }, messages: {} });
});

test('counts per run', async () => {
  const s = newTranslationStats();
  const geminiOk = () => callGemini('p', { apiKey: KEY, fetchImpl: geminiReply(GOOD) });
  const gemini429 = () => callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: 'quota' } }) });
  recordOutcome(s, await translateWithFallback(geminiOk, () => callWorkersAi('p', async () => GOOD)));
  recordOutcome(s, await translateWithFallback(gemini429, () => callWorkersAi('p', async () => GOOD)));
  recordOutcome(s, await translateWithFallback(gemini429, () => callWorkersAi('p', async () => 'nope')));
  assert.equal(s.attempted, 3);
  assert.equal(s.translated, 2);
  assert.equal(s.viaGemini, 1);
  assert.equal(s.viaWorkersAi, 1);
  assert.equal(s.untranslated, 1);
  assert.deepEqual(s.reasons, { 'gemini:http_429': 2, 'workers_ai:bad_json': 1 });
  assert.equal(s.samples['gemini:http_429'], 'quota');
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
