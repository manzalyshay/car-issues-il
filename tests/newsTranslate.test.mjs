// Unit tests for the news Hebrew rewrite: failure reasons, the Workers AI fallback,
// the 429 circuit breaker, counts and run status. No network: Gemini goes to a mocked
// fetch and Workers AI to a mocked env.AI.run.
// Run: npm test   (node --test, Node 22+ strips the TypeScript types)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  callGemini, callWorkersAi, translateHebrew, parseHebrewJson, geminiGenerationConfig, newRunState,
  newTranslationStats, recordOutcome, newsRunStatus, sanitizeDiagnostic, WORKERS_AI_MODEL,
} from '../src/lib/newsTranslate.ts';

const KEY = 'test-key-123';
const BODY = 'טויוטה הציגה את הדור החדש של הקורולה עם מערכת הנעה היברידית משופרת. '.repeat(6).trim();
const GOOD = JSON.stringify({ title: 'כותרת', body: BODY });
const ARTICLE = { titleHe: 'כותרת', bodyHe: BODY };

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
  assert.deepEqual(r, { ok: true, article: ARTICLE });
});

test('JSON surrounded by chatter still parses', async () => {
  const chatter = `*Expanding slightly while remaining factual*:\n${GOOD}\nParagraph 2: done.`;
  assert.deepEqual(parseHebrewJson(chatter), ARTICLE);
  const r = await callGemini('p', { apiKey: KEY, fetchImpl: geminiReply('Here you go:\n```json\n' + GOOD + '\n```\nHope this helps') });
  assert.deepEqual(r, { ok: true, article: ARTICLE });
});

test('parseHebrewJson rejects a stub body and a body with no Hebrew', () => {
  assert.equal(parseHebrewJson(JSON.stringify({ title: 'כותרת', body: 'גוף קצר' })), null);
  assert.equal(parseHebrewJson(JSON.stringify({ title: 'כותרת', body: 'English only. '.repeat(40) })), null);
  assert.equal(parseHebrewJson(JSON.stringify({ title: 'Title', body: BODY })), null);
});

test('Gemini is asked for schema-constrained JSON with room for a full article', async () => {
  let sent;
  const fetchImpl = async (_url, init) => { sent = JSON.parse(init.body); return geminiReply(GOOD)(); };
  await callGemini('p', { apiKey: KEY, fetchImpl });
  const c = sent.generationConfig;
  assert.equal(c.responseMimeType, 'application/json');
  assert.deepEqual(c.responseSchema.required, ['title', 'body']);
  assert.ok(c.maxOutputTokens >= 4096);
  assert.deepEqual(geminiGenerationConfig('gemini-2.5-flash').thinkingConfig, { thinkingBudget: 0 });
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

// ── Workers AI ───────────────────────────────────────────────────────────────

const aiReply = reply => async () => reply;
const aiThrows = message => async () => { throw new Error(message); };

test('Workers AI: missing binding, error, string, object and choices replies', async () => {
  assert.deepEqual(await callWorkersAi('p', { run: undefined }), { ok: false, reason: 'missing_binding' });
  const e = await callWorkersAi('p', { run: aiThrows('capacity exceeded') });
  assert.equal(e.reason, 'error');
  assert.match(e.message, /capacity/);
  assert.deepEqual(await callWorkersAi('p', { run: aiReply({ response: GOOD }) }), { ok: true, article: ARTICLE });
  assert.deepEqual(await callWorkersAi('p', { run: aiReply({ response: JSON.parse(GOOD) }) }), { ok: true, article: ARTICLE });
  assert.deepEqual(await callWorkersAi('p', { run: aiReply({ choices: [{ message: { content: GOOD } }] }) }), { ok: true, article: ARTICLE });
  assert.deepEqual(await callWorkersAi('p', { run: aiReply({ response: '' }) }), { ok: false, reason: 'empty' });
  assert.equal((await callWorkersAi('p', { run: aiReply({ response: 'sorry' }) })).reason, 'bad_json');
});

test('Workers AI: default model, system message and generation settings', async () => {
  let call;
  await callWorkersAi('prompt text', { run: async (model, input) => { call = { model, input }; return { response: GOOD }; } });
  assert.equal(call.model, WORKERS_AI_MODEL);
  assert.deepEqual(call.input.messages[0], { role: 'system', content: 'Return only a JSON object' });
  assert.deepEqual(call.input.messages[1], { role: 'user', content: 'prompt text' });
  assert.equal(call.input.max_tokens, 2048);
  assert.equal(call.input.temperature, 0.2);
});

// ── Fallback and circuit breaker ─────────────────────────────────────────────

const g429 = () => callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: 'You exceeded your current quota' } }) });
const gOk = () => callGemini('p', { apiKey: KEY, fetchImpl: geminiReply(GOOD) });
const wOk = () => callWorkersAi('p', { run: aiReply({ response: GOOD }) });
const wBad = () => callWorkersAi('p', { run: aiReply({ response: 'not json' }) });

test('Gemini success: Workers AI is not called', async () => {
  calls = 0;
  const out = await translateHebrew(gOk, counting(wOk));
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'gemini');
  assert.deepEqual(out.failures, {});
  assert.equal(calls, 0);
});

test('Gemini 429 then Workers AI ok: translated via Workers AI, Gemini reason kept', async () => {
  const s = newTranslationStats();
  const out = await translateHebrew(g429, wOk);
  recordOutcome(s, out);
  assert.equal(out.ok, true);
  assert.equal(out.provider, 'workers_ai');
  assert.deepEqual(out.article, ARTICLE);
  assert.deepEqual(out.failures, { gemini: 'http_429' });
  assert.equal(s.translated, 1);
  assert.equal(s.viaWorkersAi, 1);
  assert.equal(s.viaGemini, 0);
  assert.equal(s.untranslated, 0);
});

test('both fail: untranslated with both reasons and messages', async () => {
  const s = newTranslationStats();
  const out = await translateHebrew(g429, wBad);
  recordOutcome(s, out);
  assert.equal(out.ok, false);
  assert.deepEqual(out.failures, { gemini: 'http_429', workers_ai: 'bad_json' });
  assert.match(out.messages.gemini, /quota/);
  assert.equal(out.messages.workers_ai, 'not json');
  assert.equal(s.untranslated, 1);
  assert.deepEqual(s.reasons, { 'gemini:http_429': 1, 'workers_ai:bad_json': 1 });
});

const noWait = { sleep: async () => {} };

test('Workers AI writes only when Gemini is really unavailable (quota used up or not set up)', async () => {
  for (const g of [
    () => callGemini('p', { apiKey: undefined, fetchImpl: geminiReply(GOOD) }),
    () => callGemini('p', { apiKey: KEY, fetchImpl: json(429, { error: { message: 'quota' } }) }),
    () => callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'not found' } }) }),
  ]) {
    const out = await translateHebrew(g, wOk, undefined, noWait);
    assert.equal(out.provider, 'workers_ai');
  }
});

test('a busy Gemini gets one more try after a wait, and Workers AI is not used', async () => {
  let n = 0, waited = 0, wCalls = 0;
  const busyThenOk = async () => (++n === 1 ? callGemini('p', { apiKey: KEY, fetchImpl: json(503, 'busy') }) : gOk());
  const out = await translateHebrew(busyThenOk, async () => { wCalls++; return wOk(); }, undefined, { retryDelayMs: 5000, sleep: async (ms) => { waited = ms; } });
  assert.equal(out.provider, 'gemini');
  assert.equal(n, 2);
  assert.equal(waited, 5000);
  assert.equal(wCalls, 0);
});

test('Gemini still busy after the retry, or slow: untranslated, left for the next run', async () => {
  let wCalls = 0;
  const w = async () => { wCalls++; return wOk(); };
  let n = 0;
  const busy = async () => { n++; return callGemini('p', { apiKey: KEY, fetchImpl: json(503, 'busy') }); };
  const a = await translateHebrew(busy, w, undefined, noWait);
  assert.equal(a.ok, false);
  assert.deepEqual(a.failures, { gemini: 'http_503' });
  assert.equal(n, 2);
  const t = await translateHebrew(() => callGemini('p', { apiKey: KEY, fetchImpl: throws('TimeoutError') }), w, undefined, noWait);
  assert.equal(t.ok, false);
  assert.deepEqual(t.failures, { gemini: 'timeout' });
  assert.equal(wCalls, 0);
});

test('circuit breaker: after a 429, the next call skips Gemini', async () => {
  const state = newRunState();
  let geminiCalls = 0;
  const gemini = async () => { geminiCalls++; return g429(); };
  const first = await translateHebrew(gemini, wOk, state);
  assert.equal(state.geminiSkipped, true);
  assert.deepEqual(first.failures, { gemini: 'http_429' });
  const second = await translateHebrew(gemini, wOk, state);
  assert.equal(geminiCalls, 1);
  assert.equal(second.ok, true);
  assert.equal(second.provider, 'workers_ai');
  assert.deepEqual(second.failures, { gemini: 'skipped_after_429' });
});

test('circuit breaker: other Gemini failures do not trip it', async () => {
  const state = newRunState();
  await translateHebrew(() => callGemini('p', { apiKey: KEY, fetchImpl: json(503, 'busy') }), wOk, state, noWait);
  assert.equal(state.geminiSkipped, false);
});

test('without a fallback, a Gemini failure is untranslated with its reason', async () => {
  const out = await translateHebrew(() => callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'models/gemini-3.6-flash is not found' } }) }));
  assert.deepEqual(out, {
    ok: false,
    failures: { gemini: 'http_404' },
    messages: { gemini: 'models/gemini-3.6-flash is not found' },
  });
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
    attempted: 4, translated: 1, viaGemini: 1, viaWorkersAi: 0, untranslated: 3,
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

test('a run where only Workers AI worked is ok (or partial on a feed error), not failed', async () => {
  const state = newRunState();
  const fresh = newTranslationStats();
  const retry = newTranslationStats();
  for (let i = 0; i < 5; i++) recordOutcome(fresh, await translateHebrew(g429, wOk, state));
  for (let i = 0; i < 3; i++) recordOutcome(retry, await translateHebrew(g429, wOk, state));
  assert.equal(fresh.viaWorkersAi, 5);
  assert.equal(newsRunStatus(0, [fresh, retry]), 'ok');
  assert.equal(newsRunStatus(1, [fresh, retry]), 'partial');
  assert.deepEqual(fresh.reasons, { 'gemini:http_429': 1, 'gemini:skipped_after_429': 4 });
});

test('run with every call failing on both providers is recorded as failed', async () => {
  const fresh = newTranslationStats();
  const retry = newTranslationStats();
  const fail = () => callGemini('p', { apiKey: KEY, fetchImpl: json(404, { error: { message: 'not found' } }) });
  for (let i = 0; i < 5; i++) recordOutcome(fresh, await translateHebrew(fail, wBad));
  for (let i = 0; i < 10; i++) recordOutcome(retry, await translateHebrew(fail, wBad));
  assert.equal(newsRunStatus(0, [fresh, retry]), 'failed');
  assert.deepEqual(fresh.reasons, { 'gemini:http_404': 5, 'workers_ai:bad_json': 5 });
  assert.equal(fresh.samples['gemini:http_404'], 'not found');
});

// ── Quality guard and timeout breaker ────────────────────────────────────────

test('a rewrite with English words glued into the Hebrew is rejected', () => {
  const bad = (body) => JSON.stringify({ title: 'כותרת', body });
  assert.equal(parseHebrewJson(bad(BODY + ' הדגם החדש י arrive עם מנוע 2.4 ליטר טורבו.')), null);
  assert.equal(parseHebrewJson(bad('חברת ג meנטרל מוטורס רשמה פטנט. ' + BODY)), null);
  assert.equal(parseHebrewJson(bad('פורד חושפת את הטruck החדש. ' + BODY)), null);
  assert.equal(parseHebrewJson(bad('מכונית פerrarרי נדירה. ' + BODY)), null);
  // Brand and model names are fine: capitalised, or after a hyphen
  const ok = BODY + ' הדגם מגיע עם Apple CarPlay ומערכת EyeSight, ממש כמו ה-e-tron ו-iX3. לקוראי carissues.co.il, פנסי pop-up.';
  assert.deepEqual(parseHebrewJson(bad(ok)), { titleHe: 'כותרת', bodyHe: ok });
});

test('Gemini gets 30 seconds by default', async () => {
  let signal;
  await callGemini('p', { apiKey: KEY, fetchImpl: async (_u, init) => { signal = init.signal; return geminiReply(GOOD)(); } });
  assert.ok(signal instanceof AbortSignal);
});

test('three Gemini timeouts stop Gemini for the run, without falling back', async () => {
  const state = newRunState();
  const gTimeout = () => callGemini('p', { apiKey: KEY, fetchImpl: throws('TimeoutError') });
  let calls = 0, wCalls = 0;
  const gemini = async () => { calls++; return gTimeout(); };
  const w = async () => { wCalls++; return wOk(); };
  for (let i = 0; i < 2; i++) await translateHebrew(gemini, w, state, noWait);
  assert.equal(state.geminiSkipped, false);
  await translateHebrew(gemini, w, state, noWait);
  assert.equal(state.geminiSkipped, true);
  const next = await translateHebrew(gemini, w, state, noWait);
  assert.equal(calls, 3);
  assert.equal(wCalls, 0);
  assert.equal(next.ok, false);
  assert.deepEqual(next.failures, { gemini: 'skipped_after_timeouts' });
});
