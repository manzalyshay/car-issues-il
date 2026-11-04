// Displayed score vs external tests: blend, drift cap, and the weak-points note.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blendWithTestScore, MAX_TEST_DRIFT, isClearlyBelowTests, belowTestsNote, NOTE_MIN_RECALLS,
} from '../src/lib/proReviewScoreLabels.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('no test average: base score unchanged', () => {
  assert.equal(blendWithTestScore(5.2, null), 5.2);
});

test('within the band: plain 70/30 blend, unchanged from before', () => {
  close(blendWithTestScore(7.0, 8.0), 7.3);
  close(blendWithTestScore(8.6, 7.6), 8.3);
});

test('far below the tests: lifted to test - MAX_TEST_DRIFT (Range Rover 4.8 vs 8.6)', () => {
  // old blend 0.7*4.8 + 0.3*8.6 = 5.94
  close(blendWithTestScore(4.8, 8.6), 8.6 - MAX_TEST_DRIFT);
});

test('far above the tests: lowered to test + MAX_TEST_DRIFT (Lancer 7.8 vs 4.0)', () => {
  // old blend 0.7*7.8 + 0.3*4.0 = 6.66
  close(blendWithTestScore(7.8, 4.0), 4.0 + MAX_TEST_DRIFT);
});

test('displayed score never drifts more than MAX_TEST_DRIFT from the tests', () => {
  for (let base = 1; base <= 10; base += 0.1) {
    for (let t = 1; t <= 10; t += 0.5) {
      assert.ok(Math.abs(blendWithTestScore(base, t) - t) <= MAX_TEST_DRIFT + 1e-9);
    }
  }
});

test('isClearlyBelowTests: 1 point or more below, and only with both numbers', () => {
  assert.equal(isClearlyBelowTests(7.1, 8.6), true);
  assert.equal(isClearlyBelowTests(7.7, 8.6), false);
  assert.equal(isClearlyBelowTests(8.0, 7.0), false);
  assert.equal(isClearlyBelowTests(null, 8.6), false);
  assert.equal(isClearlyBelowTests(7.0, null), false);
});

test('Hebrew note: first two cons, cleaned, plus recalls when enough', () => {
  const note = belowTestsNote({
    cons: ['נטיות גוף מוחשות בכבישים מפותלים', 'והמחיר לא זול, עד 467,000 ₪ במבחן.', 'שלישי לא נכלל'],
    recallCount: 12,
    isEn: false,
  });
  assert.equal(note, 'כדאי לקחת בחשבון לפני קנייה: נטיות גוף מוחשות בכבישים מפותלים; המחיר לא זול, עד 467,000 ₪ במבחן. בנוסף, לדגם רשומות 12 קריאות ריקול.');
});

test('English note: skips Hebrew items, normalizes case', () => {
  const note = belowTestsNote({ cons: ['Third row is not adult-friendly', 'Did you see those prices?'], recallCount: 0, isEn: true });
  assert.equal(note, 'Worth weighing before buying: Third row is not adult-friendly; did you see those prices?');
});

test('recalls below the minimum are not mentioned', () => {
  const note = belowTestsNote({ cons: ['מחיר גבוה'], recallCount: NOTE_MIN_RECALLS - 1, isEn: false });
  assert.equal(note, 'כדאי לקחת בחשבון לפני קנייה: מחיר גבוה.');
});

test('recalls only, no cons', () => {
  assert.equal(belowTestsNote({ cons: [], recallCount: 9, isEn: false }), 'כדאי לקחת בחשבון לפני קנייה: לדגם רשומות 9 קריאות ריקול.');
  assert.equal(belowTestsNote({ cons: [], recallCount: 9, isEn: true }), 'Worth weighing before buying: the model has 9 recall campaigns on record.');
});

test('nothing documented: no note', () => {
  assert.equal(belowTestsNote({ cons: [], recallCount: null, isEn: false }), null);
  assert.equal(belowTestsNote({ cons: ['עברית בלבד'], recallCount: 0, isEn: true }), null);
});

// ── Test-set year fallback ───────────────────────────────────────────────────
import { scoreSetsForPageYear, TEST_YEAR_FALLBACK } from '../src/lib/proReviewScoreLabels.ts';

test('exact year match is used as before', () => {
  const sets = [{ years: '2022-', score: 8 }];
  assert.deepEqual(scoreSetsForPageYear(sets, 2026, 2026), sets);
});

test('Huracan: tests 2014-2024, model listed to 2026 -> tests used on the model page', () => {
  const sets = [{ years: '2014-2024', score: 7.6 }];
  assert.deepEqual(scoreSetsForPageYear(sets, 2026, 2026), sets);
  assert.deepEqual(scoreSetsForPageYear(sets, 2025, 2026), sets);
});

test('Corvette: C7 tests (2014-2019) never stand in for the C8 (2020-2026)', () => {
  const sets = [{ years: '2014-2019', score: 8 }];
  assert.equal(scoreSetsForPageYear(sets, 2026, 2026), null);
  assert.equal(scoreSetsForPageYear(sets, 2021, 2026), null);
  assert.equal(scoreSetsForPageYear(sets, 2020, 2026), null);
  assert.deepEqual(scoreSetsForPageYear(sets, 2019, 2026), sets);
});

test(`fallback window is ${TEST_YEAR_FALLBACK} years from the end of the range, not from the page year`, () => {
  const sets = [{ years: '2015-2022', score: 8 }];
  assert.equal(scoreSetsForPageYear(sets, 2026, 2026), null); // 4 years past the tests
  assert.equal(scoreSetsForPageYear(sets, 2024, 2026), null); // inside the window, but no test in 2024..2024
});
