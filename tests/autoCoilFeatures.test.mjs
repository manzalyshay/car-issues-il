// auto.co.il trim rows store the Hebrew equipment table as an object; src/lib/autoCoilFeatures.ts
// maps it to TRIM_FEATURES keys. Fixtures are real Kia Niro 2026 versions (auto.co.il, 2026-11-21).
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFromAutoCoil, isAutoCoilEquipment } from '../src/lib/autoCoilFeatures.ts';

const LX = {
  'מערכת לבלימת חרום עצמאית': 'כולל במהירות בינעירונית',
  'מערכת להתרעת סטייה מנתיב': 'שמירת נתיב אקטיבית (היגוי)',
  'קישוריות': "דיבורית בלוטות' + Android Auto + Apple CarPlay",
  'בקרת שיוט': 'בקרת שיוט + שמירת מרחק',
  'ריפוד': 'בד',
  'כוונון מושבים': 'ידני',
  'סוג פנסי חזית': 'רגילים',
  'עזרי חנייה': 'חיישני חניה אחוריים + מצלמת רוורס',
  'חיישני תאורה': 'כן',
  'כניסה ללא מפתח': 'כולל הנעה',
  'אבזור נוסף כלול במחיר': 'בלם חניה חשמלי כולל "Auto Hold", מערכת מולטימדיה עם מסך "10.25, לוח מחוונים דיגיטלי "4.2',
};
const PREMIUM_FL = {
  ...LX,
  'מערכת לניטור רכב בשטח מת': 'היגוי אקטיבי',
  'מערכת זיהוי תמרורים': 'כן',
  'ריפוד': 'עור טבעוני',
  'כוונון מושבים': 'חשמלי - מושב נהג בלבד',
  'סוג גג שמש': 'גג שמש חשמלי',
  'סוג פנסי חזית': 'LED',
  'תאורת אווירה': 'כן',
  'עזרי חנייה': 'חיישני חניה אחוריים וקדמיים + מצלמת רוורס',
  'אבזור נוסף כלול במחיר': 'מערכת מולטימדיה עם מסך "12.3, לוח מחוונים דיגיטלי "4.2, משטח טעינה אלחוטי',
};

test('detects the equipment object shape', () => {
  assert.equal(isAutoCoilEquipment(LX), true);
  assert.equal(isAutoCoilEquipment(['aeb']), false);
  assert.equal(isAutoCoilEquipment(null), false);
});

test('base trim: only what the table lists', () => {
  const d = deriveFromAutoCoil(LX);
  assert.deepEqual(new Set(d.features), new Set(['apple_carplay', 'digital_cluster', 'aeb', 'adaptive_cruise', 'lane_keep',
    'rear_camera', 'parking_sensors', 'keyless_entry', 'push_start', 'auto_lights']));
  assert.equal(d.seats, 'fabric');
  assert.equal(d.screenSize, 10.25);
});

test('top trim: the differences show up', () => {
  const d = deriveFromAutoCoil(PREMIUM_FL);
  for (const k of ['blind_spot', 'traffic_sign', 'electric_seats', 'sunroof', 'ambient_lighting', 'led_lights', 'wireless_charging']) {
    assert.ok(d.features.includes(k), k);
  }
  assert.ok(!d.features.includes('panoramic_roof'));
  assert.equal(d.seats, 'leatherette');
  assert.equal(d.screenSize, 12.3);
});

test('panoramic roof and real leather', () => {
  const d = deriveFromAutoCoil({ 'סוג גג שמש': 'גג שמש פנוראמי נפתח', 'ריפוד': 'עור' });
  assert.ok(d.features.includes('panoramic_roof') && !d.features.includes('sunroof'));
  assert.equal(d.seats, 'leather');
});
