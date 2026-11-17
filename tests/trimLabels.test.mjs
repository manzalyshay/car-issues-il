// English/Russian pages must never show Hebrew. Trim names and some raw trim values in
// car_trims are Hebrew (Israeli price lists); src/lib/trimLabels.ts translates them.
// The fixture holds real trim names covering every Hebrew word in the data (2026-11-10).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimNameEn, hasHebrew, driveKey, engineKey, transmissionKey, transmissionGears, trimValueLabel } from '../src/lib/trimLabels.ts';

const NAMES = [
 "אלגנס",
 "אדוונס",
 "אדוונס סטייל",
 "2.0T 7-מושבים",
 "1.6 ל' Long, טורבו היברידי, אוט', Pure ,4x4",
 "(מ. פנים) 1.6 ל' טורבו, אוט', Premium",
 "1.4 ל' טורבו, ידנית, Sport",
 "1.5 ל' טורבו, היברידי מתון, Sprint",
 "30 TFSI ספורטבק, אוט', 1.0 ל' טורבו",
 "סדאן 40TFSI, אוט', 2.0 ל' טורבו היברידי-מתון, 2x4",
 "סדאן 50e-hybrid, אוט', 2.0 ל' טורבו פלאג-אין הייבריד, 4x4",
 "סדאן 40TFSI (דור חדש) 2.0 ל' טורבו היברידי-מתון, 2x4",
 "RS5 קופה, אוט', 2.9 ל' טורבו, 4x4",
 "S Line 60 TFSIe, אוט', 3.0 ל' טורבו, פלאג-אין הייבריד, 5 מק', 4x4",
 "S Line 50 TDI, אוט', 3.0 ל' דיזל, היברידי מתון, 7 מק', 4x4",
 "eDrive35 חשמלי (מ. פנים), Essence",
 "xDrive20i אוט', 2.0 ל' טורבו, היברידי מתון (184 כ\"ס), Executive",
 "חשמלי (מתיחת פנים), Comfort",
 "סטינגריי קופה, 6.2 ל' V8, אוט', 2LT",
 "סטינגריי קבריולה, 6.2 ל' V8, אוט', 2LT",
 "1.4 ל' טורבו, אוט', 4 דל', LT",
 "130, ידני, 1.2 ל' טורבו היברידי מתון, Expression ,4x4",
 "140 (דור חדש), אוט', 1.6 ל' היברידי מלא, Extreme ,2x4",
 "סטפוויי 1.0 ל' טורבו, אוט', Expression",
 "e חשמלי, האצ'בק, Action",
 "1.5 ל' דיזל, אוט', קצר, קומבי, 5 מק'",
 "1.5 ל' דיזל, אוט', ארוך, קומבי, 7 מק'",
 "1.5 ל' דיזל, אוט', ארוך, ואן, 3 מק', MAXI",
 "1.5 ל' טורבו אוט' 5 דלתות האצ'בק , ST-Line",
 "1.5 ל' טורבו אוט' 5 דלתות סטיישן, Active Tourer",
 "אקטיב טורר, אוט', 1.5 ל' טורבו, סטיישן",
 "1.5 ל' דיזל, סדאן, טיטניום",
 "חשמלית, Luxury, 4x4",
 "סיוויק Type-R ידנית, 2.0 ל' טורבו",
 "EV (דור קודם) חשמלי",
 "הובלת נוסעים, 1.6 ל' טורבו היברידי, Premium ,1+8",
 "מסחרי סגור, 1.6 ל' טורבו היברידי, 1+2",
 "אוקטה 110 P635, אוט', 4.4 ל' טורבו V8, היברידי מתון, 5 מק', 4x4",
 "קופה, 3.6 ליטר, ידנית",
 "ספורט 2.4 ל', אוט' ,LS",
 "תלתן ירוק 1.75 ל' טורבו, אוט', Monza",
 "1.4 ט', ידנית, Sportiva",
 "2.0TDI מולטיטרוניק Luxury",
 "3.2FSI V6 אוט' קוואטרו"
];

test('every Hebrew trim name translates to text with no Hebrew', () => {
  for (const n of NAMES) {
    const en = trimNameEn(n);
    assert.ok(!hasHebrew(en), `${n} -> ${en}`);
    assert.ok(en.length >= 2, `${n} -> "${en}"`);
  }
});

test('trim names translate word by word', () => {
  assert.equal(trimNameEn("2.0 ל' היברידי, אוט', Elegance"), '2.0 L Hybrid, Auto, Elegance');
  assert.equal(trimNameEn("(מ. פנים) 1.6 ל' טורבו, אוט', Premium"), '(Facelift) 1.6 L Turbo, Auto, Premium');
  assert.equal(trimNameEn("55 TFSIe אוט', 3.0 ל' טורבו, פלאג אין הייבריד, S-Line ,4x4"), '55 TFSIe Auto, 3.0 L Turbo, Plug-in Hybrid, S-Line, 4x4');
  assert.equal(trimNameEn("1.5 ל' טורבו, היברידי מתון, Sprint"), '1.5 L Turbo, Mild Hybrid, Sprint');
  assert.equal(trimNameEn("חשמלי, 7 מק', Flagship, 4x4"), 'Electric, 7 Seats, Flagship, 4x4');
  assert.equal(trimNameEn('Elegance'), 'Elegance');
});

test('raw drive / engine / transmission values map to keys', () => {
  for (const [v, k] of [['הנעה קדמית', 'fwd'], ['קדמי', 'fwd'], ['fwd', 'fwd'], ['כפולה (4X4)', 'awd'], ['AWD', 'awd'], ['4WD', 'awd'], ['הנעה אחורית', 'rwd'], ['rwd', 'rwd']]) assert.equal(driveKey(v), k, v);
  for (const [v, k] of [['בנזין טורבו', 'petrol'], ['gasoline', 'petrol'], ['חשמלי', 'electric'], ['היברידי תקע', 'phev'], ['דיזל טורבו', 'diesel'], ['בנזין V6 טורבו', 'petrol'], ['hybrid', 'hybrid']]) assert.equal(engineKey(v), k, v);
  for (const [v, k] of [['DCT 7 הילוכים', 'dct'], ['AT 8 הילוכים', 'automatic'], ['אוטומטי', 'automatic'], ['CVT', 'cvt'], ['manual', 'manual']]) assert.equal(transmissionKey(v), k, v);
  assert.equal(transmissionGears('DCT 7 הילוכים'), 7);
});

test('value labels: Hebrew kept on he, never shown elsewhere', () => {
  const en = { fwd: 'FWD', awd: 'AWD / 4×4' };
  assert.equal(trimValueLabel('הנעה קדמית', 'fwd', en, 'en'), 'FWD');
  assert.equal(trimValueLabel('הנעה קדמית', 'fwd', { fwd: 'קדמי' }, 'he'), 'הנעה קדמית');
  assert.equal(trimValueLabel('משהו לא מוכר', null, en, 'en'), null);
  assert.equal(trimValueLabel('vegan', null, en, 'en'), 'vegan');
});
