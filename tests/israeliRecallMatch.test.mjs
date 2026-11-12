// Matching Ministry of Transport recall notices (recalls_il.degem) to site models.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degemMatches, normalizeForMatch, MAKE_ALIASES } from '../src/lib/israeliRecallMatch.ts';

/** Whether a DEGEM string matches the site model, looked up the way getIsraeliRecalls does. */
const matches = (degem, make, model) => {
  const mk = normalizeForMatch(make);
  return degemMatches(degem, normalizeForMatch(model), MAKE_ALIASES[mk] ?? [mk]);
};

test('Tucson: the Ministry spells it TUSCON, with or without chassis codes', () => {
  for (const d of ['TUSCON', 'TUSCON NX4E', 'TUSCON  NX4', 'TUSCON,NX4,FL/NX4,HEV,FL', 'TUSCON,SANTA FE',
    'PALISADE,IONIQ 9,IONIQ 6,IONIQ 5,SONATA,TUSCON,SANTA FE,KONA']) {
    assert.ok(matches(d, 'Hyundai', 'Tucson'), d);
  }
});

test('chassis codes and powertrain words after the model name', () => {
  assert.ok(matches('KONA SX2', 'Hyundai', 'Kona'));
  assert.ok(matches('SANTA FE MX5', 'Hyundai', 'Santa Fe'));
  assert.ok(matches('SANTA FE DM', 'Hyundai', 'Santa Fe'));
  assert.ok(matches('SONATA LF HEV', 'Hyundai', 'Sonata'));
  assert.ok(matches('ELANTRA HYBRID CN7 HEV', 'Hyundai', 'Elantra'));
  assert.ok(matches('X-TRAIL T33', 'Nissan', 'X-Trail'));
  assert.ok(matches('JUKE F-16', 'Nissan', 'Juke'));
  assert.ok(matches('QASHQAI J12', 'Nissan', 'Qashqai'));
  assert.ok(matches('OUTLANDER GF6W', 'Mitsubishi', 'Outlander'));
  assert.ok(matches('NX450H PLUG IN HYBRID', 'Lexus', 'NX'));
  assert.ok(matches('GLE 167', 'Mercedes-Benz', 'GLE'));
  assert.ok(matches('C CLASS 206', 'Mercedes-Benz', 'C-Class'));
});

test('misspellings and other names', () => {
  assert.ok(matches('CAROC', 'Skoda', 'Karoq'));
  assert.ok(matches('MOOKA,CORSA', 'Opel', 'Mokka'));
  assert.ok(matches('COROLA CROSS,BZ4X,CROWN', 'Toyota', 'Corolla Cross'));
  assert.ok(matches('QUATROPORTE,GHIBLI', 'Maserati', 'Quattroporte'));
  assert.ok(matches('CIVIC,CVR', 'Honda', 'CR-V'));
  assert.ok(matches('3', 'Mazda', 'Mazda3'));
  assert.ok(matches('3,5,7', 'BMW', 'Series 3'));
  assert.ok(matches('1 2 3 4 5 6', 'BMW', '4 Series'));
  assert.ok(matches('3,S,Y,X', 'Tesla', 'Model Y'));
});

test('brands filed under another make', () => {
  assert.ok(MAKE_ALIASES.GENESIS.includes('HYUNDAI'));
  assert.ok(matches('GENESIS GV70 GV80 G80', 'Genesis', 'GV80'));
  assert.ok(matches('LEXUS RX350,LEXUS RX450H', 'Lexus', 'RX'));
  assert.ok(matches('MINI F56', 'Mini', 'Cooper'));
});

test('different models are not matched', () => {
  assert.ok(!matches('IX35', 'Hyundai', 'Tucson'));
  assert.ok(!matches('IX35', 'BMW', 'iX3'));
  assert.ok(!matches('IONIQ 5', 'Hyundai', 'Ioniq'));
  assert.ok(!matches('IONIQ CE 6', 'Hyundai', 'Ioniq'));
  assert.ok(!matches('CX50', 'Mazda', 'CX-5'));
  assert.ok(!matches('323', 'Mazda', 'Mazda3'));
  assert.ok(!matches('RANGE ROVER SPORT', 'Land Rover', 'Range Rover'));
  assert.ok(!matches('PAJERO SPORT', 'Mitsubishi', 'Pajero'));
  assert.ok(!matches('EQS SUV', 'Mercedes-Benz', 'EQS'));
  assert.ok(!matches('GLE COUPE', 'Mercedes-Benz', 'GLE'));
  assert.ok(!matches('QASHQAI+2', 'Nissan', 'Qashqai'));
  assert.ok(!matches('X5M', 'BMW', 'X5'));
  assert.ok(!matches('C4 X', 'Citroën', 'C4'));
  assert.ok(!matches('SX4 S-CROSS', 'Suzuki', 'SX4'));
  assert.ok(!matches('GENESIS', 'Genesis', 'G80'));
});
