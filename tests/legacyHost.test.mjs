// en.carissues.co.il must 301 to the same path on carissues.net; real hosts are untouched.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyHostRedirect } from '../src/lib/legacyHost.ts';

test('en.carissues.co.il pages go to the same path on carissues.net', () => {
  assert.equal(legacyHostRedirect('en.carissues.co.il', '/', ''), 'https://carissues.net/');
  assert.equal(
    legacyHostRedirect('en.carissues.co.il', '/cars/volkswagen/arteon/2026', ''),
    'https://carissues.net/cars/volkswagen/arteon/2026',
  );
  assert.equal(
    legacyHostRedirect('en.carissues.co.il', '/cars/compare/honda/jazz/toyota/aygo', '?a=1'),
    'https://carissues.net/cars/compare/honda/jazz/toyota/aygo?a=1',
  );
});

test('host matching ignores case, port and trailing dot; www.en is legacy too', () => {
  assert.equal(legacyHostRedirect('EN.CarIssues.co.il', '/tco', ''), 'https://carissues.net/tco');
  assert.equal(legacyHostRedirect('en.carissues.co.il:443', '/news', ''), 'https://carissues.net/news');
  assert.equal(legacyHostRedirect('en.carissues.co.il.', '/news', ''), 'https://carissues.net/news');
  assert.equal(legacyHostRedirect('www.en.carissues.co.il', '/cars', ''), 'https://carissues.net/cars');
});

test('/ru on the legacy host goes straight to carissues.co.il', () => {
  assert.equal(legacyHostRedirect('en.carissues.co.il', '/ru', ''), 'https://carissues.co.il/ru');
  assert.equal(
    legacyHostRedirect('en.carissues.co.il', '/ru/vehicle-lookup', ''),
    'https://carissues.co.il/ru/vehicle-lookup',
  );
  assert.equal(legacyHostRedirect('en.carissues.co.il', '/rules', ''), 'https://carissues.net/rules');
});

test('canonical hosts are not redirected', () => {
  for (const h of ['carissues.co.il', 'www.carissues.co.il', 'carissues.net', 'www.carissues.net', 'localhost:7000', 'ru.carissues.co.il', 'xen.carissues.co.il']) {
    assert.equal(legacyHostRedirect(h, '/cars', ''), null, h);
  }
});
