// Text generated for the per-model "common problems" page from recall data.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeIlRecalls, buildIssuesIntro, buildIssuesDescription, buildYearsLabel, faultLabel,
} from '../src/lib/issuesSummary.ts';

const SAFETY = 'תקלה סידרתית בטיחותית';
const recalls = [
  { year: 2026, faultType: 'בלמים', recallType: SAFETY },
  { year: 2024, faultType: 'בלמים', recallType: SAFETY },
  { year: 2025, faultType: 'חשמל אליקטרוניקה ומיזוג', recallType: 'קמפיין שרות טכני' },
  { year: 2023, faultType: 'אחר', recallType: SAFETY },
];

test('summarizeIlRecalls counts systems, skips the catch-all category and tidies labels', () => {
  const s = summarizeIlRecalls(recalls);
  assert.equal(s.total, 4);
  assert.equal(s.safety, 3);
  assert.equal(s.latestYear, 2026);
  assert.deepEqual(s.systems, [
    { label: 'בלמים', count: 2 },
    { label: 'חשמל, אלקטרוניקה ומיזוג', count: 1 },
  ]);
});

test('summarizeIlRecalls on no notices', () => {
  assert.deepEqual(summarizeIlRecalls([]), { total: 0, safety: 0, latestYear: null, systems: [] });
});

test('buildYearsLabel', () => {
  assert.equal(buildYearsLabel({ buildBegin: '2015-01-01', buildEnd: '2020-12-31' }), '2015–2020');
  assert.equal(buildYearsLabel({ buildBegin: '2019-01-01', buildEnd: '2019-12-31' }), '2019');
  assert.equal(buildYearsLabel({ buildBegin: null, buildEnd: null }), '');
});

test('faultLabel leaves unknown categories untouched', () => {
  assert.equal(faultLabel('כריות אוויר'), 'כריות אוויר');
  assert.equal(faultLabel(null), '');
});

test('Hebrew intro states the real counts', () => {
  const text = buildIssuesIntro({
    makeName: 'יונדאי', modelName: 'i20', il: summarizeIlRecalls(recalls), usRecallCount: 0,
    cons: ['בידוד רעש בינוני'],
  }, 'he');
  assert.match(text, /ליונדאי i20 פורסמו בישראל 4 קריאות שירות/);
  assert.match(text, /האחרונה בשנת 2026/);
  assert.match(text, /בלמים \(2\)/);
  assert.match(text, /בידוד רעש בינוני/);
  assert.doesNotMatch(text, /בארה״ב/);
});

test('Hebrew intro with a single notice and with none', () => {
  const one = buildIssuesIntro({
    makeName: 'קיה', modelName: 'סטוניק', il: summarizeIlRecalls([recalls[0]]), usRecallCount: 1, cons: [],
  }, 'he');
  assert.match(one, /קריאת שירות אחת/);
  assert.match(one, /המערכת שבה נמצאה התקלה: בלמים\./);
  assert.match(one, /תועד ריקול אחד/);
  const none = buildIssuesIntro({
    makeName: 'קיה', modelName: 'סטוניק', il: summarizeIlRecalls([]), usRecallCount: 0, cons: [],
  }, 'he');
  assert.match(none, /לא נמצאו קריאות שירות/);
});

test('English text never contains Hebrew', () => {
  const f = { makeName: 'Hyundai', modelName: 'i20', il: summarizeIlRecalls(recalls), usRecallCount: 3, cons: ['Average noise insulation'] };
  for (const text of [buildIssuesIntro(f, 'en'), buildIssuesDescription(f, 'en')]) {
    assert.doesNotMatch(text, /[֐-׿]/);
    assert.match(text, /3 US/);
  }
});

test('description is null when there is nothing specific to say', () => {
  const f = { makeName: 'Hyundai', modelName: 'i20', il: summarizeIlRecalls([]), usRecallCount: 0, cons: [] };
  assert.equal(buildIssuesDescription(f, 'he'), null);
  assert.equal(buildIssuesDescription(f, 'en'), null);
});
