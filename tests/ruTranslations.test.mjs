// The Russian UI strings (src/lib/translations.ru.ts) must cover every key of the
// English set, and every value must actually be Russian (no English or Hebrew left over).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/lib/translations.ts';
import { ru } from '../src/lib/translations.ru.ts';

// Values that are the same in every language.
const SAME = new Set(['CarIssues', '*', '...', '-', '?', '→', 'TCO']);

function walk(en, r, path, out) {
  if (typeof en === 'string') { out.push({ path, en, r }); return; }
  assert.equal(typeof r, 'object', `${path}: missing in ru`);
  const enKeys = Object.keys(en).sort();
  const ruKeys = Object.keys(r).sort();
  assert.deepEqual(ruKeys, enKeys, `${path}: keys differ`);
  for (const k of enKeys) walk(en[k], r[k], path ? `${path}.${k}` : k, out);
}

const strings = [];
walk(translations.en, ru, '', strings);

test('ru has exactly the same keys as en', () => {
  assert.ok(strings.length > 500, `only ${strings.length} strings`);
});

test('every ru value is translated (Cyrillic, not a copy of en)', () => {
  const bad = strings.filter(({ path, en, r }) => {
    if (typeof r !== 'string' || !r.trim()) return true;
    if (SAME.has(r) || /^[\p{Emoji}\s‍️✓✕×-]*$/u.test(r)) return false;
    if (path.startsWith('footer.links') && path.endsWith('.href')) return false;
    if (path.endsWith('.icon')) return false;
    return !/[Ѐ-ӿ]/.test(r) || (r === en && !SAME.has(r));
  });
  assert.deepEqual(bad.map(b => b.path), []);
});

test('no Hebrew in ru values', () => {
  const heb = strings.filter(({ r }) => /[א-ת]/.test(r));
  assert.deepEqual(heb.map(b => b.path), []);
});

test('placeholders are kept', () => {
  for (const { path, en, r } of strings) {
    for (const ph of en.match(/\$\{\w\}|\{\w\}/g) ?? []) assert.ok(r.includes(ph), `${path}: lost ${ph}`);
  }
});

import { ruPluralIndex, ruCount, RU_COUNT_FORMS } from '../src/lib/translations.ru.ts';

test('Russian plural rule', () => {
  const cases = { 0: 2, 1: 0, 2: 1, 4: 1, 5: 2, 11: 2, 12: 2, 14: 2, 21: 0, 22: 1, 25: 2, 101: 0, 111: 2, 112: 2, 122: 1 };
  for (const [n, want] of Object.entries(cases)) assert.equal(ruPluralIndex(Number(n)), want, `n=${n}`);
  assert.equal(ruCount(1, 'makePage.reviews'), '1 отзыв');
  assert.equal(ruCount(3, 'makePage.reviews'), '3 отзыва');
  assert.equal(ruCount(7, 'makePage.reviews'), '7 отзывов');
  assert.equal(ruCount(21, 'home.models'), '21 модель');
});

test('every counted key exists in ru, and its "many" form is the ru string itself', () => {
  for (const [key, forms] of Object.entries(RU_COUNT_FORMS)) {
    const v = key.split('.').reduce((o, k) => o?.[k], ru);
    assert.equal(typeof v, 'string', `${key} not in ru`);
    assert.equal(forms[2], v, `${key}: many-form differs from ru string`);
  }
});
