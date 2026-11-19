// Model hub <title> (src/lib/modelTitle.ts). Names are real car_models rows (D1, 2026-11-19).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hebrewModelTitle } from '../src/lib/modelTitle.ts';

test('carries both the Hebrew and English model name', () => {
  assert.equal(hebrewModelTitle('יונדאי', 'i20', 'Hyundai', 'i20', true), 'יונדאי i20 (Hyundai i20) — חוות דעת, בעיות נפוצות ומחיר');
  assert.equal(hebrewModelTitle('קיה', 'סטוניק', 'Kia', 'Stonic', true), 'קיה סטוניק (Kia Stonic) — חוות דעת, בעיות נפוצות ומחיר');
});

test('does not repeat the make when the English model name already has it', () => {
  assert.equal(hebrewModelTitle('מאזדה', '3', 'Mazda', 'Mazda3', true), 'מאזדה 3 (Mazda3) — חוות דעת, בעיות נפוצות ומחיר');
});

test('no "ומחיר" without a price', () => {
  assert.equal(hebrewModelTitle('קיה', 'סטוניק', 'Kia', 'Stonic', false), 'קיה סטוניק (Kia Stonic) — חוות דעת ובעיות נפוצות');
});

test('long names fall back but stay within 60 characters', () => {
  const cases = [
    ['טויוטה', 'יאריס קרוס', 'Toyota', 'Yaris Cross'],
    ['מיצובישי', 'אקליפס קרוס', 'Mitsubishi', 'Eclipse Cross'],
    ['לנד רובר', 'ריינג׳ רובר אבוק', 'Land Rover', 'Range Rover Evoque'],
    ["צ'רי", 'Tiggo 8 Pro', 'Chery', 'Tiggo 8 Pro'],
  ];
  for (const [mh, oh, me, oe] of cases) {
    for (const price of [true, false]) {
      const t = hebrewModelTitle(mh, oh, me, oe, price);
      assert.ok(t.length <= 60, `${t} (${t.length})`);
      assert.ok(t.includes(oh), t);
    }
  }
  assert.equal(hebrewModelTitle('טויוטה', 'יאריס קרוס', 'Toyota', 'Yaris Cross', true), 'טויוטה יאריס קרוס — חוות דעת, בעיות נפוצות ומחיר');
});
