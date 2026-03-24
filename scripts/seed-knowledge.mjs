/**
 * scripts/seed-knowledge.mjs
 *
 * Fast knowledge seeder — uses ONLY Groq LLM knowledge (no web scraping).
 * Writes directly to Supabase (no Next.js server needed).
 * Useful for initial DB population or filling gaps quickly.
 *
 * Usage:
 *   node scripts/seed-knowledge.mjs                   # all generals + years
 *   GENERAL_ONLY=true node scripts/seed-knowledge.mjs # only general (year=null) rows
 *   YEARS_ONLY=true  node scripts/seed-knowledge.mjs  # only year rows
 *   SKIP_EXISTING=true node scripts/seed-knowledge.mjs
 *   DELAY_MS=400     node scripts/seed-knowledge.mjs  # rate limit
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CAR_LIST } from './car-list.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch { /* ignore */ }
}
loadEnv();

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY   = process.env.GROQ_API_KEY;
const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SKIP       = process.env.SKIP_EXISTING === 'true';
const DELAY_MS   = parseInt(process.env.DELAY_MS ?? '500');
const GEN_ONLY   = process.env.GENERAL_ONLY === 'true';
const YEARS_ONLY = process.env.YEARS_ONLY   === 'true';

if (!GROQ_KEY || !SB_URL || !SB_KEY) {
  console.error('Missing GROQ_API_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SB_URL, SB_KEY);

// Hebrew name lookup from car-list data — we replicate the mapping here
const HE_MAKES = {
  toyota: 'טויוטה', hyundai: 'יונדאי', kia: 'קיה', mazda: 'מאזדה',
  volkswagen: 'פולקסווגן', skoda: 'סקודה', honda: 'הונדה', suzuki: 'סוזוקי',
  bmw: 'ב.מ.וו', mercedes: 'מרצדס-בנץ', audi: 'אאודי', ford: 'פורד',
  nissan: 'ניסאן', peugeot: "פיג'ו", renault: 'רנו', volvo: 'וולוו',
  jeep: "ג'יפ", mitsubishi: 'מיצובישי', subaru: 'סובארו',
  byd: 'BYD', mg: 'MG', chery: "צ'רי", geely: "ג'ילי",
};
const HE_MODELS = {
  corolla: 'קורולה', camry: 'קאמרי', yaris: 'יאריס', rav4: 'RAV4',
  hilux: 'הילוקס', chr: 'C-HR', prius: 'פריוס', 'land-cruiser': 'לנד קרוזר',
  tucson: 'טוסון', i20: 'i20', i30: 'i30', sonata: 'סונטה',
  'santa-fe': 'סנטה פה', 'ioniq-5': 'איוניק 5', kona: 'קונה', elantra: 'אלנטרה',
  sportage: "ספורטז'", ceed: 'סיד', cerato: 'סראטו', sorento: 'סורנטו',
  picanto: 'פיקנטו', ev6: 'EV6', niro: 'נירו',
  mazda3: 'מאזדה 3', mazda6: 'מאזדה 6', cx5: 'CX-5', cx30: 'CX-30', mx5: 'MX-5',
  golf: 'גולף', polo: 'פולו', passat: 'פאסאט', tiguan: 'טיגואן', troc: 'T-Roc', id4: 'ID.4',
  octavia: 'אוקטביה', kodiaq: 'קודיאק', superb: 'סופרב', karoq: 'קארוק', fabia: 'פביה',
  civic: 'סיוויק', hrv: 'HR-V', crv: 'CR-V', jazz: "ג'אז",
  swift: 'סוויפט', vitara: 'ויטארה', scross: 'S-Cross', jimny: "ג'ימני",
  series1: 'סדרה 1', series3: 'סדרה 3', series5: 'סדרה 5', x1: 'X1', x3: 'X3', x5: 'X5', ix3: 'iX3',
  'a-class': 'A-Class', 'c-class': 'C-Class', 'e-class': 'E-Class',
  gla: 'GLA', glb: 'GLB', glc: 'GLC', eqc: 'EQC',
  a3: 'A3', a4: 'A4', a6: 'A6', q3: 'Q3', q5: 'Q5', etron: 'e-tron',
  fiesta: 'פיאסטה', focus: 'פוקוס', kuga: 'קוגה', puma: 'פומה', ranger: "ריינג'ר",
  qashqai: 'קשקאי', juke: "ג'וק", note: 'נוט', leaf: 'ליף',
  '208': '208', '308': '308', '3008': '3008', '5008': '5008', e208: 'e-208',
  clio: 'קליאו', megane: 'מגאן', kadjar: "קדג'ר", arkana: 'ארקנה', zoe: 'זואי',
  xc40: 'XC40', xc60: 'XC60', xc90: 'XC90', s60: 'S60', ex30: 'EX30',
  renegade: 'רנגייד', compass: 'קומפס', wrangler: 'רנגלר', cherokee: "צ'רוקי",
  outlander: 'אאוטלנדר', 'eclipse-cross': 'אקליפס קרוס', asx: 'ASX',
  forester: 'פורסטר', outback: 'אאוטבק', xv: 'XV', impreza: 'אימפרזה',
  atto3: 'Atto 3', seal: 'Seal', dolphin: 'Dolphin', han: 'Han', sealion6: 'Sealion 6',
  'mg-zs': 'ZS', mg4: 'MG4', mg5: 'MG5', hs: 'HS',
  tiggo7: 'Tiggo 7 Pro', tiggo8: 'Tiggo 8 Pro', arrizo6: 'Arrizo 6 Pro',
  coolray: 'Coolray', emgrand: 'Emgrand',
};

const EN_MAKES = {
  toyota: 'Toyota', hyundai: 'Hyundai', kia: 'Kia', mazda: 'Mazda',
  volkswagen: 'Volkswagen', skoda: 'Skoda', honda: 'Honda', suzuki: 'Suzuki',
  bmw: 'BMW', mercedes: 'Mercedes-Benz', audi: 'Audi', ford: 'Ford',
  nissan: 'Nissan', peugeot: 'Peugeot', renault: 'Renault', volvo: 'Volvo',
  jeep: 'Jeep', mitsubishi: 'Mitsubishi', subaru: 'Subaru',
  byd: 'BYD', mg: 'MG', chery: 'Chery', geely: 'Geely',
};
const EN_MODELS = {
  corolla: 'Corolla', camry: 'Camry', yaris: 'Yaris', rav4: 'RAV4',
  hilux: 'Hilux', chr: 'C-HR', prius: 'Prius', 'land-cruiser': 'Land Cruiser',
  tucson: 'Tucson', i20: 'i20', i30: 'i30', sonata: 'Sonata',
  'santa-fe': 'Santa Fe', 'ioniq-5': 'Ioniq 5', kona: 'Kona', elantra: 'Elantra',
  sportage: 'Sportage', ceed: "Cee'd", cerato: 'Cerato', sorento: 'Sorento',
  picanto: 'Picanto', ev6: 'EV6', niro: 'Niro',
  mazda3: 'Mazda3', mazda6: 'Mazda6', cx5: 'CX-5', cx30: 'CX-30', mx5: 'MX-5',
  golf: 'Golf', polo: 'Polo', passat: 'Passat', tiguan: 'Tiguan', troc: 'T-Roc', id4: 'ID.4',
  octavia: 'Octavia', kodiaq: 'Kodiaq', superb: 'Superb', karoq: 'Karoq', fabia: 'Fabia',
  civic: 'Civic', hrv: 'HR-V', crv: 'CR-V', jazz: 'Jazz',
  swift: 'Swift', vitara: 'Vitara', scross: 'S-Cross', jimny: 'Jimny',
  series1: 'Series 1', series3: 'Series 3', series5: 'Series 5', x1: 'X1', x3: 'X3', x5: 'X5', ix3: 'iX3',
  'a-class': 'A-Class', 'c-class': 'C-Class', 'e-class': 'E-Class',
  gla: 'GLA', glb: 'GLB', glc: 'GLC', eqc: 'EQC',
  a3: 'A3', a4: 'A4', a6: 'A6', q3: 'Q3', q5: 'Q5', etron: 'e-tron',
  fiesta: 'Fiesta', focus: 'Focus', kuga: 'Kuga', puma: 'Puma', ranger: 'Ranger',
  qashqai: 'Qashqai', juke: 'Juke', note: 'Note', leaf: 'Leaf',
  '208': '208', '308': '308', '3008': '3008', '5008': '5008', e208: 'e-208',
  clio: 'Clio', megane: 'Megane', kadjar: 'Kadjar', arkana: 'Arkana', zoe: 'Zoe',
  xc40: 'XC40', xc60: 'XC60', xc90: 'XC90', s60: 'S60', ex30: 'EX30',
  renegade: 'Renegade', compass: 'Compass', wrangler: 'Wrangler', cherokee: 'Cherokee',
  outlander: 'Outlander', 'eclipse-cross': 'Eclipse Cross', asx: 'ASX',
  forester: 'Forester', outback: 'Outback', xv: 'XV', impreza: 'Impreza',
  atto3: 'Atto 3', seal: 'Seal', dolphin: 'Dolphin', han: 'Han', sealion6: 'Sealion 6',
  'mg-zs': 'ZS', mg4: 'MG4', mg5: 'MG5', hs: 'HS',
  tiggo7: 'Tiggo 7 Pro', tiggo8: 'Tiggo 8 Pro', arrizo6: 'Arrizo 6 Pro',
  coolray: 'Coolray', emgrand: 'Emgrand',
};

async function groqKnowledge(makeHe, modelHe, makeEn, modelEn, year) {
  const yearNote = year ? ` דגם ${year}` : '';
  const prompt = `אתה מומחה רכב ישראלי שכותב סיכומים לאתר ביקורות רכב.

כתוב סיכום מקיף בעברית על ${makeHe} ${modelHe}${yearNote} (${makeEn} ${modelEn}${year ? ` ${year}` : ''}) עבור קונים ישראלים.
השתמש בידע שלך על הדגם — מאפיינים ידועים, חוזקות, חולשות, מה בעלי הרכב בדרך כלל מדווחים עליו.
כתוב 2-3 משפטים ישירים ועניינים. אל תכתוב "אין מידע" — תמיד יש מה לומר על רכב מוכר.
אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק.
אל תשתמש בביטויים עמומים כמו "יושבת" — הסבר במפורש.

החזר JSON בלבד:
{"summary_he":"2-3 משפטים","score":7,"pros":["יתרון 1","יתרון 2"],"cons":["חיסרון 1","חיסרון 2"]}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json();
      if (json?.error) {
        const isRateLimit = json.error?.type === 'tokens' || json.error?.code === 'rate_limit_exceeded';
        const waitMs = isRateLimit ? 65000 : 4000;  // wait full minute on rate limit
        process.stdout.write(isRateLimit ? `(rate-limit, wait ${waitMs/1000}s)` : `(err, retry)`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      const text = (json?.choices?.[0]?.message?.content ?? '').trim();
      const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(clean);
      parsed.score = Math.min(10, Math.max(1, Number(parsed.score) || 6));
      if (!parsed.summary_he || parsed.summary_he.length < 20) continue;
      return parsed;
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

async function saveRow(makeSlug, modelSlug, year, data) {
  // Delete existing row first
  const del = sb.from('expert_reviews').delete()
    .eq('make_slug', makeSlug).eq('model_slug', modelSlug);
  if (year) await del.eq('year', year);
  else       await del.is('year', null);

  const { error } = await sb.from('expert_reviews').insert({
    make_slug: makeSlug, model_slug: modelSlug,
    year: year ?? null,
    source_name: 'AI Knowledge', source_url: '', original_title: '',
    summary_he:       data.summary_he,
    local_summary_he: null,
    global_summary_he: data.summary_he,
    local_score:  null,
    global_score: data.score,
    top_score:    data.score,
    pros: (data.pros ?? []).slice(0, 4),
    cons: (data.cons ?? []).slice(0, 4),
    local_post_count:  0,
    global_post_count: 0,
    scraped_at: new Date().toISOString(),
  });
  return !error;
}

// Build scraped keys set for SKIP mode
let scraped = new Set();
if (SKIP) {
  const { data } = await sb.from('expert_reviews').select('make_slug,model_slug,year');
  scraped = new Set((data ?? []).map(r => `${r.make_slug}/${r.model_slug}/${r.year ?? 'gen'}`));
  console.log(`Skipping ${scraped.size} existing entries`);
}

// Build target list
const targets = [];
const seen = new Set();

if (!YEARS_ONLY) {
  for (const { make, model } of CAR_LIST) {
    const key = `${make}/${model}/gen`;
    if (!seen.has(key) && (!SKIP || !scraped.has(key))) {
      targets.push({ makeSlug: make, modelSlug: model, year: null });
      seen.add(key);
    }
  }
}

if (!GEN_ONLY) {
  for (const { make, model, years } of CAR_LIST) {
    for (const year of years) {
      const key = `${make}/${model}/${year}`;
      if (!SKIP || !scraped.has(key)) targets.push({ makeSlug: make, modelSlug: model, year });
    }
  }
}

const totalGeneral    = [...new Set(CAR_LIST.map(c => `${c.make}/${c.model}`))].length;
const totalYearSlots  = CAR_LIST.reduce((s, c) => s + c.years.length, 0);
console.log(`\nKnowledge seeder — ${targets.length} entries (${DELAY_MS}ms delay each)`);
console.log(`Est. time: ${Math.round(targets.length * (DELAY_MS + 4000) / 60000)} min\n`);

let done = 0, saved = 0, failed = 0;
const start = Date.now();

for (const { makeSlug, modelSlug, year } of targets) {
  const makeHe  = HE_MAKES[makeSlug]  ?? makeSlug;
  const modelHe = HE_MODELS[modelSlug] ?? modelSlug;
  const makeEn  = EN_MAKES[makeSlug]  ?? makeSlug;
  const modelEn = EN_MODELS[modelSlug] ?? modelSlug;

  const label = year ? `${makeSlug}/${modelSlug} ${year}` : `${makeSlug}/${modelSlug} (general)`;
  process.stdout.write(`[${done + 1}/${targets.length}] ${label.padEnd(44)}`);

  const data = await groqKnowledge(makeHe, modelHe, makeEn, modelEn, year);
  if (!data) {
    process.stdout.write('— (no data)\n');
    failed++;
  } else {
    const ok = await saveRow(makeSlug, modelSlug, year, data);
    if (ok) { process.stdout.write('✓\n'); saved++; }
    else    { process.stdout.write('✗ (db error)\n'); failed++; }
  }

  done++;
  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

const elapsed = Math.round((Date.now() - start) / 1000);
console.log(`\nDone in ${elapsed}s — ${saved} saved, ${failed} failed`);
