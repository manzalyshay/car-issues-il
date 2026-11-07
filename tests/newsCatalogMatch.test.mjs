// News photo fallback: a headline maps to a catalogue model only on an exact make + model
// match, so an article never gets a photo of a different car. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCatalogModel, stripYears } from '../src/lib/newsCatalogMatch.ts';

const m = (slug, nameEn, models) => ({ slug, nameEn, models: models.map((n) => ({ slug: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nameEn: n })) });
const MAKES = [
  m('toyota', 'Toyota', ['Corolla', 'Corolla Cross', 'RAV4', 'C-HR']),
  m('mazda', 'Mazda', ['CX-3', 'CX-30', 'CX-5', 'Mazda 2', 'Mazda3', 'Mazda 5', 'MX-5']),
  m('subaru', 'Subaru', ['Forester', 'Outback']),
  m('ford', 'Ford', ['Focus', 'Kuga', 'Puma', 'Ranger']),
  m('bmw', 'BMW', ['i4', 'iX', 'Series 3', 'X5']),
  m('mercedes', 'Mercedes-Benz', ['A-Class', 'GLC', 'GLC Coupe']),
  m('volkswagen', 'Volkswagen', ['Golf', 'ID.4']),
  m('mini', 'Mini', ['Cooper', 'Countryman', 'Electric']),
  m('nissan', 'Nissan', ['Note', 'Leaf', 'Qashqai']),
  m('land-rover', 'Land Rover', ['Defender', 'Range Rover', 'Range Rover Sport']),
  m('polestar', 'Polestar', ['2', '3']),
];
const hit = (t) => { const r = matchCatalogModel(t, MAKES); return r && `${r.makeSlug}/${r.modelSlug}`; };

test('exact make + model', () => {
  assert.equal(hit('2027 Toyota RAV4 Gets A New Hybrid'), 'toyota/rav4');
  assert.equal(hit('Mazda CX-5 Review: Still The Benchmark'), 'mazda/cx-5');
  assert.equal(hit('New Mazda CX5 spied'), 'mazda/cx-5');
  assert.equal(hit('Ford Puma Gen-E Arrives'), 'ford/puma');
  assert.equal(hit('VW ID.4 recall'), 'volkswagen/id-4');
  assert.equal(hit('Mercedes GLC Coupe facelift'), 'mercedes/glc-coupe');
  assert.equal(hit('Mercedes-Benz A-Class ends production'), 'mercedes/a-class');
});

test('longest model wins', () => {
  assert.equal(hit('Toyota Corolla Cross Hybrid Tested'), 'toyota/corolla-cross');
  assert.equal(hit('Mazda CX-30 vs rivals'), 'mazda/cx-30');
});

test('short and numeric names need the make right before them', () => {
  assert.equal(hit('Mazda 3 Turbo Is Back'), 'mazda/mazda3');
  assert.equal(hit('Mazda3 Turbo Is Back'), 'mazda/mazda3');
  assert.equal(hit('BMW i4 gets more range'), 'bmw/i4');
  assert.equal(hit('Polestar 3 deliveries begin'), 'polestar/3');
  assert.equal(hit('Polestar sells 3 million shares'), null);
  assert.equal(hit('Mazda posts 5 percent growth'), null);
  assert.equal(hit('BMW 3 Series Touring'), 'bmw/series-3');
});

test('common-word model names need the make right before them', () => {
  assert.equal(hit('Nissan Leaf battery recall'), 'nissan/leaf');
  assert.equal(hit('Nissan turns over a new leaf with Qashqai'), 'nissan/qashqai');
  assert.equal(hit('Nissan files note with regulators'), null);
  assert.equal(hit('Mini Cooper Electric SE'), 'mini/cooper');
  assert.equal(hit('Mini Electric gets a cheaper trim'), 'mini/electric');
});

test('brand-only or unknown model headlines get nothing', () => {
  assert.equal(hit('2028 Subaru Getaway'), null);
  assert.equal(hit("Ford Fathom Won't Cost More Than $40,000. Not Even The Top Trim"), null);
  assert.equal(hit('Ringbrothers Spent 5,500 Hours Turning An Old Pontiac Into A 650-HP GTO'), null);
  assert.equal(hit('The best mini SUV with a Cooper-style roof'), null);
  assert.equal(hit(null), null);
});

test('Range Rover models', () => {
  assert.equal(hit('Range Rover Sport SV Edition Two'), 'land-rover/range-rover-sport');
  assert.equal(hit('Range Rover recall'), 'land-rover/range-rover');
  assert.equal(hit('Land Rover Range Rover Sport SV'), 'land-rover/range-rover-sport');
  assert.equal(hit('Land Rover Defender Octa'), 'land-rover/defender');
});

test('stripYears', () => {
  assert.equal(stripYears('2028 Subaru Getaway'), 'Subaru Getaway');
  assert.equal(stripYears('2027.5 Ford Ranger'), 'Ford Ranger');
  assert.equal(stripYears('BMW X5'), 'BMW X5');
});
