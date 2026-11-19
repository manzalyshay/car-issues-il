// Model-year page <title> (src/lib/yearTitle.ts). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hebrewYearTitle } from '../src/lib/yearTitle.ts';

test('newest year: new-car price intent', () => {
  assert.equal(
    hebrewYearTitle({ makeHe: "ג'טור", modelHe: 'T2', year: 2026, isNewest: true, priceHook: ' ₪190K–₪220K' }),
    "ג'טור T2 2026 ₪190K–₪220K – מחיר בישראל, גרסאות וחוות דעת",
  );
});

test('older year: used-car intent', () => {
  assert.equal(
    hebrewYearTitle({ makeHe: 'ניסאן', modelHe: 'קשקאי', year: 2021, isNewest: false }),
    'ניסאן קשקאי 2021 יד שנייה – חוות דעת, תקלות ואמינות',
  );
});

test('owner reviews replace the generic tail', () => {
  assert.equal(
    hebrewYearTitle({ makeHe: 'קיה', modelHe: 'סטוניק', year: 2019, isNewest: false, reviewCount: 3, rating: 4.33 }),
    'קיה סטוניק 2019 – 3 ביקורות בעלים ⭐ 4.3 | אמינות',
  );
});

test('long names fall back to shorter titles within 60 characters', () => {
  const cases = [
    ['לנד רובר', 'ריינג׳ רובר אבוק', 2016, false, ''],
    ['פולקסווגן', 'טי-רוק', 2021, false, ''],
    ['מיצובישי', 'אקליפס קרוס', 2026, true, ' ₪160K–₪190K'],
    ['מרצדס', 'GLC קופה', 2026, true, ' ₪390K–₪460K'],
  ];
  for (const [makeHe, modelHe, year, isNewest, priceHook] of cases) {
    for (const reviewCount of [0, 12]) {
      const t = hebrewYearTitle({ makeHe, modelHe, year, isNewest, priceHook, reviewCount, rating: 4.5 });
      assert.ok(t.length <= 60, `${t} (${t.length})`);
      assert.ok(t.startsWith(`${makeHe} ${modelHe} ${year}`), t);
    }
  }
});
