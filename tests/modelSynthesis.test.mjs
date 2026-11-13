// Road-test findings shown in the problems tab.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

// modelSynthesis.ts imports the DB module, which needs the app's path aliases; the
// selection logic is pure, so load just that function from the source text.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const src = readFileSync(new URL('../src/lib/modelSynthesis.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/m, '');
const mod = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(src))}`);
const { pickFaultFindings } = mod;

const stored = [
  { text_he: 'המתלים קשיחים על כביש משובש', text_en: 'Firm suspension on rough roads', source_site: 'carwow', source_url: 'https://example.com/a' },
  { text_he: 'מחיר גבוה בגרסאות הבכירות', text_en: 'High price on top trims', source_site: 'icar', source_url: 'https://example.com/b' },
  { text_he: 'המתלים קשיחים על כביש משובש', text_en: 'Firm suspension on rough roads', source_site: 'carwow', source_url: 'https://example.com/a' },
  { text_he: 'בלי מקור', text_en: 'No source' },
];

test('keeps sourced faults, drops price remarks, duplicates and unsourced items', () => {
  assert.deepEqual(pickFaultFindings(stored, 'he'), [
    { text: 'המתלים קשיחים על כביש משובש', site: 'carwow', url: 'https://example.com/a' },
  ]);
});

test('English text for the English site', () => {
  const [f] = pickFaultFindings(stored, 'en');
  assert.equal(f.text, 'Firm suspension on rough roads');
  assert.doesNotMatch(f.text, /[֐-׿]/);
});
