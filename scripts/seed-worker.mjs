/**
 * Parallel seed worker — seeds only the makes listed in MAKES env var.
 * Usage: MAKES=toyota,hyundai,kia node scripts/seed-worker.mjs
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

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
const SB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAKES_FILTER = (process.env.MAKES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1200');

if (!MISTRAL_KEY || !SB_URL || !SB_KEY) { console.error('Missing env vars'); process.exit(1); }
if (!MAKES_FILTER.length) { console.error('Set MAKES=make1,make2,...'); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SB_URL, SB_KEY);

// Hebrew/English name maps (copied from seed-knowledge.mjs)
const HE_MAKES = {
  toyota:'טויוטה',hyundai:'יונדאי',kia:'קיה',mazda:'מאזדה',volkswagen:'פולקסווגן',
  skoda:'סקודה',honda:'הונדה',suzuki:'סוזוקי',bmw:'ב.מ.וו',mercedes:'מרצדס-בנץ',
  audi:'אאודי',ford:'פורד',nissan:'ניסאן',peugeot:"פיג'ו",renault:'רנו',volvo:'וולוו',
  jeep:"ג'יפ",mitsubishi:'מיצובישי',subaru:'סובארו',byd:'BYD',mg:'MG',chery:"צ'רי",geely:"ג'ילי",
};
const HE_MODELS = {
  corolla:'קורולה',camry:'קאמרי',yaris:'יאריס',rav4:'RAV4',hilux:'הילוקס',chr:'C-HR',
  prius:'פריוס','land-cruiser':'לנד קרוזר',tucson:'טוסון',i20:'i20',i30:'i30',sonata:'סונטה',
  'santa-fe':'סנטה פה','ioniq-5':'איוניק 5',kona:'קונה',elantra:'אלנטרה',sportage:"ספורטז'",
  ceed:'סיד',cerato:'סראטו',sorento:'סורנטו',picanto:'פיקנטו',ev6:'EV6',niro:'נירו',
  mazda3:'מאזדה 3',mazda6:'מאזדה 6',cx5:'CX-5',cx30:'CX-30',mx5:'MX-5',golf:'גולף',
  polo:'פולו',passat:'פאסאט',tiguan:'טיגואן',troc:'T-Roc',id4:'ID.4',octavia:'אוקטביה',
  kodiaq:'קודיאק',superb:'סופרב',karoq:'קארוק',fabia:'פביה',civic:'סיוויק',hrv:'HR-V',
  crv:'CR-V',jazz:"ג'אז",swift:'סוויפט',vitara:'ויטארה',scross:'S-Cross',jimny:"ג'ימני",
  series1:'סדרה 1',series3:'סדרה 3',series5:'סדרה 5',x1:'X1',x3:'X3',x5:'X5',ix3:'iX3',
  'a-class':'A-Class','c-class':'C-Class','e-class':'E-Class',gla:'GLA',glb:'GLB',glc:'GLC',eqc:'EQC',
  a3:'A3',a4:'A4',a6:'A6',q3:'Q3',q5:'Q5',etron:'e-tron',fiesta:'פיאסטה',focus:'פוקוס',
  kuga:'קוגה',puma:'פומה',ranger:"ריינג'ר",qashqai:'קשקאי',juke:"ג'וק",note:'נוט',leaf:'ליף',
  '208':'208','308':'308','3008':'3008','5008':'5008',e208:'e-208',clio:'קליאו',megane:'מגאן',
  kadjar:"קדג'ר",arkana:'ארקנה',zoe:'זואי',xc40:'XC40',xc60:'XC60',xc90:'XC90',s60:'S60',ex30:'EX30',
  renegade:'רנגייד',compass:'קומפס',wrangler:'רנגלר',cherokee:"צ'רוקי",outlander:'אאוטלנדר',
  'eclipse-cross':'אקליפס קרוס',asx:'ASX',forester:'פורסטר',outback:'אאוטבק',xv:'XV',impreza:'אימפרזה',
  atto3:'Atto 3',seal:'Seal',dolphin:'Dolphin',han:'Han',sealion6:'Sealion 6',
  'mg-zs':'ZS',mg4:'MG4',mg5:'MG5',hs:'HS',tiggo7:'Tiggo 7 Pro',tiggo8:'Tiggo 8 Pro',
  arrizo6:'Arrizo 6 Pro',coolray:'Coolray',emgrand:'Emgrand',
};
const EN_MAKES = {
  toyota:'Toyota',hyundai:'Hyundai',kia:'Kia',mazda:'Mazda',volkswagen:'Volkswagen',
  skoda:'Skoda',honda:'Honda',suzuki:'Suzuki',bmw:'BMW',mercedes:'Mercedes-Benz',
  audi:'Audi',ford:'Ford',nissan:'Nissan',peugeot:'Peugeot',renault:'Renault',volvo:'Volvo',
  jeep:'Jeep',mitsubishi:'Mitsubishi',subaru:'Subaru',byd:'BYD',mg:'MG',chery:'Chery',geely:'Geely',
};
const EN_MODELS = {
  corolla:'Corolla',camry:'Camry',yaris:'Yaris',rav4:'RAV4',hilux:'Hilux',chr:'C-HR',
  prius:'Prius','land-cruiser':'Land Cruiser',tucson:'Tucson',i20:'i20',i30:'i30',sonata:'Sonata',
  'santa-fe':'Santa Fe','ioniq-5':'Ioniq 5',kona:'Kona',elantra:'Elantra',sportage:'Sportage',
  ceed:"Cee'd",cerato:'Cerato',sorento:'Sorento',picanto:'Picanto',ev6:'EV6',niro:'Niro',
  mazda3:'Mazda3',mazda6:'Mazda6',cx5:'CX-5',cx30:'CX-30',mx5:'MX-5',golf:'Golf',polo:'Polo',
  passat:'Passat',tiguan:'Tiguan',troc:'T-Roc',id4:'ID.4',octavia:'Octavia',kodiaq:'Kodiaq',
  superb:'Superb',karoq:'Karoq',fabia:'Fabia',civic:'Civic',hrv:'HR-V',crv:'CR-V',jazz:'Jazz',
  swift:'Swift',vitara:'Vitara',scross:'S-Cross',jimny:'Jimny',series1:'Series 1',series3:'Series 3',
  series5:'Series 5',x1:'X1',x3:'X3',x5:'X5',ix3:'iX3','a-class':'A-Class','c-class':'C-Class',
  'e-class':'E-Class',gla:'GLA',glb:'GLB',glc:'GLC',eqc:'EQC',a3:'A3',a4:'A4',a6:'A6',
  q3:'Q3',q5:'Q5',etron:'e-tron',fiesta:'Fiesta',focus:'Focus',kuga:'Kuga',puma:'Puma',
  ranger:'Ranger',qashqai:'Qashqai',juke:'Juke',note:'Note',leaf:'Leaf','208':'208','308':'308',
  '3008':'3008','5008':'5008',e208:'e-208',clio:'Clio',megane:'Megane',kadjar:'Kadjar',
  arkana:'Arkana',zoe:'Zoe',xc40:'XC40',xc60:'XC60',xc90:'XC90',s60:'S60',ex30:'EX30',
  renegade:'Renegade',compass:'Compass',wrangler:'Wrangler',cherokee:'Cherokee',
  outlander:'Outlander','eclipse-cross':'Eclipse Cross',asx:'ASX',forester:'Forester',
  outback:'Outback',xv:'XV',impreza:'Impreza',atto3:'Atto 3',seal:'Seal',dolphin:'Dolphin',
  han:'Han',sealion6:'Sealion 6','mg-zs':'ZS',mg4:'MG4',mg5:'MG5',hs:'HS',
  tiggo7:'Tiggo 7 Pro',tiggo8:'Tiggo 8 Pro',arrizo6:'Arrizo 6 Pro',coolray:'Coolray',emgrand:'Emgrand',
};

function buildPrompt(makeHe, modelHe, makeEn, modelEn, year) {
  const yearNote = year ? ` ${year}` : '';
  const yearInstr = year ? `\nהתמקד על ${year} ספציפית — מה השתנה, תקלות ידועות לאותה שנה, מה בעלים אומרים על אותה גרסה.` : '';
  return `אתה עוזר לאתר ביקורות רכב ישראלי. הצג את המידע מנקודת מבט של בעלי רכב בפועל.

כתוב 2-3 משפטים בעברית שמשקפים מה בעלי ${makeHe} ${modelHe}${yearNote} (${makeEn} ${modelEn}${year ? ` ${year}` : ''}) בדרך כלל מדווחים.${yearInstr}

חוקים:
- כתוב בגוף שלישי: "בעלי הרכב מדווחים ש...", "נהגים מציינים...", "תלונה נפוצה היא..."
- התמקד בחוויית נהיגה יומיומית, תקלות שחוזרות, עלויות תחזוקה, מה אוהבים ומה לא
- אל תכתוב תיאור כללי של הרכב (מנוע, גודל, עיצוב) — כתוב מה הנהגים אומרים
- אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק
- אסור לציין גדלי מנוע, מספרים טכניים ספציפיים, או פרטים שאתה לא בטוח לגביהם — שמור על רמה כללית
- ציון: 9-10 רכב שבעלים ממליצים בחום, 7-8 שביעות רצון כללית, 5-6 מעורב, 3-4 תלונות רבות
- יתרונות/חסרונות: רק מה שבעלים בפועל מציינים — תכונות ספציפיות, לא כלליות

החזר JSON בלבד:
{"summary_he":"2-3 משפטים","score":8,"pros":["יתרון 1","יתרון 2"],"cons":["חיסרון 1","חיסרון 2"]}`;
}

function parseJson(text) {
  try {
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const p = JSON.parse(clean);
    p.score = Math.min(10, Math.max(1, Number(p.score) || 6));
    if (!p.summary_he || p.summary_he.length < 20) return null;
    return p;
  } catch { return null; }
}

async function callMistral(prompt) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(MISTRAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5, max_tokens: 500,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) {
        const wait = 20;
        process.stdout.write(`(rl,${wait}s)`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      const json = await res.json();
      if (json?.error) { await new Promise(r => setTimeout(r, 3000)); continue; }
      return parseJson((json?.choices?.[0]?.message?.content ?? '').trim());
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

async function saveRow(makeSlug, modelSlug, year, data) {
  const del = sb.from('expert_reviews').delete().eq('make_slug', makeSlug).eq('model_slug', modelSlug);
  if (year) await del.eq('year', year); else await del.is('year', null);
  const { error } = await sb.from('expert_reviews').insert({
    make_slug: makeSlug, model_slug: modelSlug, year: year ?? null,
    source_name: 'AI Knowledge', source_url: '', original_title: '',
    summary_he: data.summary_he, local_summary_he: null, global_summary_he: data.summary_he,
    local_score: null, global_score: data.score, top_score: data.score,
    pros: (data.pros ?? []).slice(0, 4), cons: (data.cons ?? []).slice(0, 4),
    local_post_count: 0, global_post_count: 0,
    scraped_at: new Date().toISOString(),
    next_scrape_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return !error;
}

// Get already-existing rows for skip
const { data: existing } = await sb.from('expert_reviews').select('make_slug,model_slug,year')
  .not('year', 'is', null).in('make_slug', MAKES_FILTER);
const have = new Set((existing ?? []).map(r => `${r.make_slug}/${r.model_slug}/${r.year}`));

const targets = CAR_LIST
  .filter(c => MAKES_FILTER.includes(c.make))
  .flatMap(({ make, model, years }) =>
    years.filter(y => !have.has(`${make}/${model}/${y}`)).map(y => ({ make, model, year: y }))
  );

const worker = MAKES_FILTER.join(',');
console.log(`[${worker}] ${targets.length} rows to seed`);

let done = 0, saved = 0, failed = 0;
for (const { make, model, year } of targets) {
  const makeHe = HE_MAKES[make] ?? make;
  const modelHe = HE_MODELS[model] ?? model;
  const makeEn = EN_MAKES[make] ?? make;
  const modelEn = EN_MODELS[model] ?? model;

  process.stdout.write(`[${worker}] ${make}/${model}/${year} `);
  const data = await callMistral(buildPrompt(makeHe, modelHe, makeEn, modelEn, year));
  if (!data) { process.stdout.write('✗\n'); failed++; }
  else {
    const ok = await saveRow(make, model, year, data);
    process.stdout.write(ok ? '✓\n' : '✗(db)\n');
    if (ok) saved++; else failed++;
  }
  done++;
  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}
console.log(`[${worker}] Done: ${saved} saved, ${failed} failed`);
