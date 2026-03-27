/**
 * Fills missing local_summary_he for all expert_reviews rows that have none.
 * Uses Mistral AI to generate Israeli-framed summaries.
 * Run: node scripts/fill-israeli-summaries.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MISTRAL_KEY  = process.env.MISTRAL_API_KEY;
const MISTRAL_URL  = 'https://api.mistral.ai/v1/chat/completions';

if (!SUPABASE_URL || !SERVICE_KEY || !MISTRAL_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MISTRAL_API_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// car name maps - make/model slug → Hebrew name
// We read these from the DB rows themselves (make_slug/model_slug) plus a lookup table

const HE_MAKES = {
  toyota: 'טויוטה', hyundai: 'יונדאי', kia: 'קיה', volkswagen: 'פולקסווגן',
  skoda: 'שקודה', mazda: 'מאזדה', honda: 'הונדה', nissan: 'ניסאן',
  ford: 'פורד', bmw: 'ב.מ.וו', mercedes: 'מרצדס', audi: 'אאודי',
  volvo: 'וולוו', peugeot: 'פיז׳ו', renault: 'רנו', suzuki: 'סוזוקי',
  subaru: 'סובארו', mitsubishi: 'מיצובישי', jeep: 'ג׳יפ', seat: 'סיאט',
  cupra: 'קופרה', opel: 'אופל', lexus: 'לקסוס', dacia: 'דאצ׳יה',
  byd: 'BYD', mg: 'MG', chery: 'צ׳רי', geely: 'גילי',
};

const HE_MODELS = {
  corolla: 'קורולה', camry: 'קאמרי', rav4: 'RAV4', yaris: 'יאריס',
  'c-hr': 'C-HR', 'corolla-cross': 'קורולה קרוס', 'yaris-cross': 'יאריס קרוס',
  'prius': 'פריוס', 'bz4x': 'bZ4X', 'highlander': 'היילנדר', 'land-cruiser': 'לנד קרוזר',
  tucson: 'טוקסון', 'santa-fe': 'סנטה פה', i30: 'i30', i10: 'i10', i20: 'i20',
  kona: 'קונה', ioniq: 'איוניק', 'ioniq-5': 'איוניק 5', 'ioniq-6': 'איוניק 6',
  bayon: 'בייאון', venue: 'וניו', staria: 'סטריה',
  sportage: 'ספורטג׳', sorento: 'סורנטו', stinger: 'סטינגר', 'ev6': 'EV6',
  seltos: 'סלטוס', stonic: 'סטוניק', carnival: 'קרניבל', ev9: 'EV9',
  golf: 'גולף', passat: 'פאסאט', tiguan: 'טיגואן', polo: 'פולו',
  taigo: 'טייגו', id3: 'ID.3', 'id-4': 'ID.4',
  octavia: 'אוקטביה', kodiaq: 'קודיאק', superb: 'סופרב', fabia: 'פביה',
  kamiq: 'קאמיק', scala: 'סקאלה', enyaq: 'אניאק',
  cx5: 'CX-5', cx3: 'CX-3', 'cx-30': 'CX-30', mazda3: 'מאזדה 3', mazda2: 'מאזדה 2',
  civic: 'סיוויק', jazz: 'ג׳אז', hrv: 'HR-V', crv: 'CR-V',
  qashqai: 'קשקאי', juke: 'ג׳וק', 'x-trail': 'X-Trail', kicks: 'קיקס',
  focus: 'פוקוס', fiesta: 'פיאסטה', kuga: 'קוגה', ecosport: 'אקוספורט',
  '1-series': 'סדרה 1', '3-series': 'סדרה 3', 'x1': 'X1', 'x3': 'X3', 'x5': 'X5',
  'a-class': 'קלאס A', 'c-class': 'קלאס C', 'e-class': 'קלאס E',
  'glc': 'GLC', 'b-class': 'קלאס B', 'cla': 'CLA', 'eqb': 'EQB',
  'a3': 'A3', 'a4': 'A4', 'a6': 'A6', 'q3': 'Q3', 'q5': 'Q5', 'q7': 'Q7',
  'xc40': 'XC40', 'xc60': 'XC60', 'xc90': 'XC90', 'v60': 'V60',
  '208': '208', '3008': '3008', '2008': '2008', '508': '508',
  'clio': 'קליאו', 'captur': 'קפצ׳ור', 'megane': 'מגאן', 'arkana': 'ארקנה',
  'swift': 'סוויפט', 'vitara': 'ויטרה', 'sx4': 'SX4',
  'forester': 'פורסטר', 'outback': 'אאוטבק', 'xv': 'XV', 'impreza': 'אימפרזה',
  'outlander': 'אאוטלנדר', 'eclipse-cross': 'אקליפס קרוס', 'colt': 'קולט',
  'space-star': 'ספייס סטאר', 'l200': 'L200', 'pajero-sport': 'פג׳רו ספורט',
  'compass': 'קומפס', 'renegade': 'רנגייד', 'wrangler': 'רנגלר',
  'grand-cherokee': 'גרנד צ׳רוקי', 'avenger': 'אוונג׳ר',
  'formentor': 'פורמנטור', 'born': 'Born',
  'ateca': 'אטקה', 'ibiza': 'איביזה', 'leon': 'לאון', 'arona': 'ארונה',
  'corsa': 'קורסה', 'astra': 'אסטרה', 'mokka': 'מוקה',
  'ux': 'UX', 'nx': 'NX', 'rx': 'RX', 'is': 'IS', 'es': 'ES', 'rz': 'RZ',
  'sandero': 'סנדרו', 'duster': 'דאסטר', 'spring': 'ספרינג',
  'seal': 'Seal', 'atto3': 'Atto 3', 'han': 'Han', 'sealion7': 'Sealion 7', 'tang': 'Tang',
  'zs': 'ZS', 'hs': 'HS', 'mg5': 'MG5',
  'omoda5': 'OMODA 5',
};

const EN_MAKES = {
  toyota: 'Toyota', hyundai: 'Hyundai', kia: 'Kia', volkswagen: 'Volkswagen',
  skoda: 'Skoda', mazda: 'Mazda', honda: 'Honda', nissan: 'Nissan',
  ford: 'Ford', bmw: 'BMW', mercedes: 'Mercedes-Benz', audi: 'Audi',
  volvo: 'Volvo', peugeot: 'Peugeot', renault: 'Renault', suzuki: 'Suzuki',
  subaru: 'Subaru', mitsubishi: 'Mitsubishi', jeep: 'Jeep', seat: 'SEAT',
  cupra: 'CUPRA', opel: 'Opel', lexus: 'Lexus', dacia: 'Dacia',
  byd: 'BYD', mg: 'MG', chery: 'Chery', geely: 'Geely',
};

const EN_MODELS = {
  corolla: 'Corolla', camry: 'Camry', rav4: 'RAV4', yaris: 'Yaris',
  'c-hr': 'C-HR', 'corolla-cross': 'Corolla Cross', 'yaris-cross': 'Yaris Cross',
  prius: 'Prius', bz4x: 'bZ4X', highlander: 'Highlander', 'land-cruiser': 'Land Cruiser',
  tucson: 'Tucson', 'santa-fe': 'Santa Fe', i30: 'i30', i10: 'i10', i20: 'i20',
  kona: 'Kona', ioniq: 'Ioniq', 'ioniq-5': 'Ioniq 5', 'ioniq-6': 'Ioniq 6',
  bayon: 'Bayon', venue: 'Venue', staria: 'Staria',
  sportage: 'Sportage', sorento: 'Sorento', stinger: 'Stinger', ev6: 'EV6',
  seltos: 'Seltos', stonic: 'Stonic', carnival: 'Carnival', ev9: 'EV9',
  golf: 'Golf', passat: 'Passat', tiguan: 'Tiguan', polo: 'Polo',
  taigo: 'Taigo', id3: 'ID.3', 'id-4': 'ID.4',
  octavia: 'Octavia', kodiaq: 'Kodiaq', superb: 'Superb', fabia: 'Fabia',
  kamiq: 'Kamiq', scala: 'Scala', enyaq: 'Enyaq',
  cx5: 'CX-5', cx3: 'CX-3', 'cx-30': 'CX-30', mazda3: 'Mazda3', mazda2: 'Mazda2',
  civic: 'Civic', jazz: 'Jazz', hrv: 'HR-V', crv: 'CR-V',
  qashqai: 'Qashqai', juke: 'Juke', 'x-trail': 'X-Trail', kicks: 'Kicks',
  focus: 'Focus', fiesta: 'Fiesta', kuga: 'Kuga', ecosport: 'EcoSport',
  '1-series': '1 Series', '3-series': '3 Series', x1: 'X1', x3: 'X3', x5: 'X5',
  'a-class': 'A-Class', 'c-class': 'C-Class', 'e-class': 'E-Class',
  glc: 'GLC', 'b-class': 'B-Class', cla: 'CLA', eqb: 'EQB',
  a3: 'A3', a4: 'A4', a6: 'A6', q3: 'Q3', q5: 'Q5', q7: 'Q7',
  xc40: 'XC40', xc60: 'XC60', xc90: 'XC90', v60: 'V60',
  '208': '208', '3008': '3008', '2008': '2008', '508': '508',
  clio: 'Clio', captur: 'Captur', megane: 'Megane', arkana: 'Arkana',
  swift: 'Swift', vitara: 'Vitara', sx4: 'SX4',
  forester: 'Forester', outback: 'Outback', xv: 'XV', impreza: 'Impreza',
  outlander: 'Outlander', 'eclipse-cross': 'Eclipse Cross', colt: 'Colt',
  'space-star': 'Space Star', l200: 'L200', 'pajero-sport': 'Pajero Sport',
  compass: 'Compass', renegade: 'Renegade', wrangler: 'Wrangler',
  'grand-cherokee': 'Grand Cherokee', avenger: 'Avenger',
  formentor: 'Formentor', born: 'Born',
  ateca: 'Ateca', ibiza: 'Ibiza', leon: 'Leon', arona: 'Arona',
  corsa: 'Corsa', astra: 'Astra', mokka: 'Mokka',
  ux: 'UX', nx: 'NX', rx: 'RX', is: 'IS', es: 'ES', rz: 'RZ',
  sandero: 'Sandero', duster: 'Duster', spring: 'Spring',
  seal: 'Seal', atto3: 'Atto 3', han: 'Han', sealion7: 'Sealion 7', tang: 'Tang',
  zs: 'ZS', hs: 'HS', mg5: 'MG5',
  omoda5: 'OMODA 5',
};

async function callMistral(prompt) {
  const res = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MISTRAL_KEY}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 600,
    }),
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim() ?? '';
  try {
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    const p = JSON.parse(clean);
    p.score = Math.min(10, Math.max(1, Number(p.score) || 6));
    p.pros = (p.pros ?? []).filter(s => s.trim().length > 2);
    p.cons = (p.cons ?? []).filter(s => s.trim().length > 2);
    if (!p.summary_he || p.summary_he.trim().length < 30) return null;
    const NO_DATA = ['אין מספיק', 'לא ניתן', 'אין מידע', 'לא נמצא', 'לא ידוע'];
    if (NO_DATA.some(p2 => p.summary_he.includes(p2))) return null;
    const DRIVER_PHRASES = ['מדווחים', 'מציינים', 'נהגים', 'בעלי הרכב', 'תלונה', 'בעלים', 'לקוחות'];
    if (!DRIVER_PHRASES.some(ph => p.summary_he.includes(ph))) return null;
    return p;
  } catch { return null; }
}

async function generateIsraeliSummary(makeHe, modelHe, makeEn, modelEn) {
  const prompt = `אתה עוזר לאתר ביקורות רכב ישראלי. כתוב סיכום מנקודת מבט של נהגים ישראלים בפועל.

כתוב 2-3 משפטים בעברית שמשקפים מה בעלי ${makeHe} ${modelHe} (${makeEn} ${modelEn}) בישראל בדרך כלל מדווחים — בהתחשב בתנאי הנהיגה, האקלים, ורמת השירות בישראל.

חוקים:
- כתוב בגוף שלישי: "בעלי הרכב בישראל מדווחים ש...", "נהגים ישראלים מציינים...", "תלונה נפוצה בישראל היא..."
- התמקד בחוויה ישראלית: תנאי נהיגה עירוניים, חום, שירות, אמינות
- אל תכתוב תיאור כללי של הרכב — כתוב מה הנהגים אומרים
- אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק
- אסור לציין גדלי מנוע או נתונים טכניים ספציפיים
- ציון: 9-10 ממליצים בחום, 7-8 שביעות רצון כללית, 5-6 מעורב, 3-4 תלונות רבות

החזר JSON בלבד:
{"summary_he":"...","score":8,"pros":["...","..."],"cons":["...","..."]}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callMistral(prompt);
    if (result) return result;
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

async function main() {
  // Fetch all rows missing local_summary_he (year IS NULL = general model rows)
  const { data: rows, error } = await sb
    .from('expert_reviews')
    .select('id, make_slug, model_slug, global_score, top_score')
    .is('year', null)
    .is('local_summary_he', null)
    .order('make_slug');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${rows.length} rows missing Israeli summaries\n`);

  let ok = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const makeHe  = HE_MAKES[row.make_slug]  ?? row.make_slug;
    const modelHe = HE_MODELS[row.model_slug] ?? row.model_slug;
    const makeEn  = EN_MAKES[row.make_slug]   ?? row.make_slug;
    const modelEn = EN_MODELS[row.model_slug] ?? row.model_slug;

    process.stdout.write(`[${i + 1}/${rows.length}] ${makeHe} ${modelHe}... `);

    const out = await generateIsraeliSummary(makeHe, modelHe, makeEn, modelEn);

    if (!out) {
      console.log('SKIP (no valid output)');
      failed++;
      await new Promise(r => setTimeout(r, 800));
      continue;
    }

    const newTopScore = row.global_score != null
      ? (out.score + parseFloat(row.global_score)) / 2
      : out.score;

    const { error: upErr } = await sb
      .from('expert_reviews')
      .update({
        local_summary_he: out.summary_he,
        local_score: out.score,
        top_score: newTopScore,
        // Merge pros/cons — keep existing global ones, prepend Israeli ones
      })
      .eq('id', row.id);

    if (upErr) {
      console.log(`ERROR: ${upErr.message}`);
      failed++;
    } else {
      console.log(`✓  score=${out.score}/10`);
      ok++;
    }

    // Rate limit: 60 RPM = 1/s
    if (i < rows.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\nDone! ✓ ${ok} updated, ✗ ${failed} failed`);
}

main().catch(err => { console.error(err); process.exit(1); });
