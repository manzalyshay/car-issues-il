// Russian labels for Ministry of Transport values on the /ru plate-lookup pages:
// every value in the registry (data.gov.il, Nov 2026) has a Russian label, and no label
// or fallback can put Hebrew on a Russian page.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_RU, FUEL_RU, OWNERSHIP_RU, ORIGIN_RU, colorRu, fuelRu, ownershipRu, originRu } from '../src/lib/vehicleLookupRu.ts';

const HEBREW = /[֐-׿]/;
const CYRILLIC = /[Ѐ-ӿ]/;

// Distinct values in the registry (SELECT DISTINCT ... on data.gov.il, 2026-11-07)
const COLORS = ["אדום", "אדום בהיר", "אדום זוהר", "אדום כהה (יין)", "אדום מטל", "אדום קלאסי", "אדום שחור", "אדמדם מטאלי", "אחר", "אינדיגו מט", "אפור", "אפור בהיר", "אפור בהיר מטלי", "אפור ברונזה", "אפור כהה", "אפור כהה מטלי", "אפור כחול מטלי", "אפור מטל", "אפור פלדה", "בורדו", "בורדו מטל", "בז", "בז כהה", "בז מטאלי", "ברונזה", "ורוד", "זהב", "זהב מטאלי", "זהוב", "זית מטאלי", "חום", "חום בהיר", "חום כהה", "חציל", "חרדל", "טוניק", "טורקיז", "טורקיז בהיר מטאלי", "טורקיז כהה", "טורקיז מטאלי", "ירוק", "ירוק אקווה", "ירוק בהיר", "ירוק זהב מטלי", "ירוק זית", "ירוק זית מטלי", "ירוק טורקיז", "ירוק ים", "ירוק כהה", "ירוק כסוף", "ירוק מטל", "ירוק פנינה", "ירקרק", "ירקרק בהיר", "ירקרק מטלי", "כחול", "כחול בהיר", "כחול כהה", "כחול מטל", "כחול פחם מטלי", "כחול פנינה", "כחול קריסטל", "כסוף בהיר", "כסוף כהה", "כסוף כהה מטלי", "כסוף מילניום", "כסף", "כסף ים", "כסף ירקרק", "כסף כחלחל מטלי", "כסף מטלי", "כסף תכלת מטלי", "כתום", "לא ידוע", "מלאנג", "מלאנג מטאלי", "מנדרינה מט", "נחושת", "נחושת מטאלי", "סגול", "סגול בהיר", "סגול כהה", "סהרה", "פלטינה", "צהוב", "צהוב חזק", "צהוב לימון", "צהוב מטאלי", "קפה מטאלי", "קרם", "רב גווני", "רוז מתכתי", "שחור", "שחור חציל", "שחור מטלי", "שחור פנינה", "שן פיל", "שנהב לבן", "תכלת", "תכלת מטאלי"];
const FUELS = ['בנזין', 'גפמ"', 'דיזל', 'חשמל', 'חשמל/בנזין', 'חשמל/דיזל'];
const OWNERSHIP = ['השכרה', 'חברה', 'ליסינג', 'סוחר', 'פרטי', 'החכר'];
const ORIGINS = ['ביס לנהיגה"', 'דפלומטי', 'החכר', 'החכר-השכרה', 'השכרה', 'יבוא אישי', 'יבוא אישי-משומש', 'יבואן אבטפוס', 'יוש-עזה"', 'מדינת ישראל', 'מונית', 'משומש מיבואן', 'סיור ותיור'];

test('every registry value has an exact Russian label', () => {
  assert.equal(COLORS.length, 100);
  for (const c of COLORS) assert.ok(COLOR_RU[c], `color ${c}`);
  for (const f of FUELS) assert.ok(FUEL_RU[f], `fuel ${f}`);
  for (const o of OWNERSHIP) assert.ok(OWNERSHIP_RU[o], `ownership ${o}`);
  for (const o of ORIGINS) assert.ok(ORIGIN_RU[o], `origin ${o}`);
});

test('no Russian label contains Hebrew, and all are Cyrillic (brand-free)', () => {
  for (const map of [COLOR_RU, FUEL_RU, OWNERSHIP_RU, ORIGIN_RU]) {
    for (const [k, v] of Object.entries(map)) {
      assert.ok(!HEBREW.test(v), `${k} -> ${v}`);
      assert.ok(CYRILLIC.test(v), `${k} -> ${v} is not Russian`);
    }
  }
});

test('values added to the registry later never show Hebrew', () => {
  assert.equal(colorRu('כחול סגלגל חדש'), 'синий');            // known first word -> base color
  assert.equal(colorRu('גוון שלא קיים'), 'другой');
  assert.equal(fuelRu('דלק עתידי'), 'другое');
  assert.equal(ownershipRu('בעלות חדשה'), 'другая');
  assert.equal(originRu('מקור חדש'), 'другое');
  assert.equal(colorRu(''), 'не указан');
  assert.equal(colorRu('  אפור   כהה  '), 'тёмно-серый');       // extra spaces
});

test('a few translations read as intended', () => {
  assert.equal(colorRu('אפור כהה מטלי'), 'тёмно-серый металлик');
  assert.equal(fuelRu('חשמל/בנזין'), 'гибрид (бензин + электро)');
  assert.equal(ownershipRu('החכר'), 'лизинг');
  assert.equal(originRu('יבוא אישי-משומש'), 'личный импорт (подержанный)');
});
