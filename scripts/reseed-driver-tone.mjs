/**
 * Re-seeds all existing AI-Knowledge rows with the new driver-experience prompt.
 * The old prompt wrote "what the car is" — the new prompt writes "what drivers say".
 *
 * Usage: node scripts/reseed-driver-tone.mjs
 *
 * Optional env:
 *   BATCH=50      — how many rows to process per run (default: 50, to avoid long runs)
 *   OFFSET=0      — skip first N rows (for resuming)
 *   DELAY_MS=1200 — delay between API calls
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
const BATCH       = parseInt(process.env.BATCH ?? '50');
const OFFSET      = parseInt(process.env.OFFSET ?? '0');
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1200');

if (!MISTRAL_KEY || !SB_URL || !SB_KEY) { console.error('Missing env vars'); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SB_URL, SB_KEY);

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
    // Must contain driver-report framing
    const driverPhrases = ['מדווחים', 'מציינים', 'נהגים', 'בעלי הרכב', 'תלונה', 'בעלים'];
    if (!driverPhrases.some(ph => p.summary_he.includes(ph))) return null;
    // Reject only exact word-for-word repeats (4+ chars, not Hebrew ו-prefix)
    if (/(?<!\S)(\p{L}{4,})\s+\1(?!\S)/u.test(p.summary_he)) return null;
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
        process.stdout.write(`(rl,30s)`);
        await new Promise(r => setTimeout(r, 30000));
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

// Hebrew/English name maps
const HE_MAKES = {
  toyota:'טויוטה',hyundai:'יונדאי',kia:'קיה',mazda:'מאזדה',volkswagen:'פולקסווגן',
  skoda:'סקודה',honda:'הונדה',suzuki:'סוזוקי',bmw:'ב.מ.וו',mercedes:'מרצדס-בנץ',
  audi:'אאודי',ford:'פורד',nissan:'ניסאן',peugeot:"פיג'ו",renault:'רנו',volvo:'וולוו',
  jeep:"ג'יפ",mitsubishi:'מיצובישי',subaru:'סובארו',byd:'BYD',mg:'MG',chery:"צ'רי",geely:"ג'ילי",
  cupra:'קופרה',seat:'סיאט',opel:'אופל',lexus:'לקסוס',dacia:"דאצ'יה",
};
const HE_MODELS = {
  corolla:'קורולה','corolla-cross':'קורולה קרוס',camry:'קאמרי',yaris:'יאריס','yaris-cross':'יאריס קרוס',
  rav4:'RAV4',hilux:'הילוקס',chr:'C-HR',prius:'פריוס',bz4x:'bZ4X','land-cruiser':'לנד קרוזר',
  tucson:'טוסון',i20:'i20',i30:'i30',sonata:'סונטה','santa-fe':'סנטה פה',
  'ioniq-5':'איוניק 5','ioniq-6':'איוניק 6',kona:'קונה',bayon:'ביון',venue:'וונו',
  elantra:'אלנטרה',staria:'סטריה',
  sportage:"ספורטז'",seltos:'סלטוס',stonic:'סטוניק',ceed:'סיד',cerato:'סראטו',
  sorento:'סורנטו',carnival:'קרנבל',picanto:'פיקנטו',ev6:'EV6',ev9:'EV9',niro:'נירו',
  mazda3:'מאזדה 3',mazda6:'מאזדה 6',cx5:'CX-5',cx30:'CX-30',mx5:'MX-5',
  golf:'גולף',polo:'פולו',passat:'פאסאט',tiguan:'טיגואן',taigo:'טייגו',troc:'T-Roc',id3:'ID.3',id4:'ID.4',
  octavia:'אוקטביה',kodiaq:'קודיאק',kamiq:'קאמיק',superb:'סופרב',karoq:'קארוק',scala:'סקאלה',enyaq:'אניאק',fabia:'פביה',
  civic:'סיוויק',hrv:'HR-V',crv:'CR-V',jazz:"ג'אז",
  swift:'סוויפט',vitara:'ויטארה',scross:'S-Cross',jimny:"ג'ימני",
  series1:'סדרה 1',series3:'סדרה 3',series5:'סדרה 5',x1:'X1',x3:'X3',x5:'X5',ix3:'iX3',
  'a-class':'A-Class','b-class':'B-Class',cla:'CLA','c-class':'C-Class','e-class':'E-Class',
  gla:'GLA',glb:'GLB',glc:'GLC',eqb:'EQB',eqc:'EQC',
  a3:'A3',a4:'A4',a6:'A6',q3:'Q3',q5:'Q5',etron:'e-tron',
  fiesta:'פיאסטה',focus:'פוקוס',kuga:'קוגה',puma:'פומה',ranger:"ריינג'ר",
  qashqai:'קשקאי','x-trail':'X-Trail',juke:"ג'וק",kicks:'קיקס',note:'נוט',leaf:'ליף',navara:'נאוורה',
  '208':'208','308':'308','3008':'3008','5008':'5008',e208:'e-208',
  clio:'קליאו',megane:'מגאן',kadjar:"קדג'ר",arkana:'ארקנה',zoe:'זואי',
  xc40:'XC40',xc60:'XC60',xc90:'XC90',s60:'S60',ex30:'EX30',
  renegade:'רנגייד',compass:'קומפס','grand-cherokee':'גרנד צ׳רוקי',wrangler:'רנגלר',cherokee:"צ'רוקי",avenger:"אוונג'ר",
  outlander:'אאוטלנדר','eclipse-cross':'אקליפס קרוס',asx:'ASX',
  forester:'פורסטר',outback:'אאוטבק',xv:'XV',impreza:'אימפרזה',
  formentor:'פורמנטור',born:'בורן',ateca:'אטקה',ibiza:'איביזה',leon:'ליאון',arona:'ארונה',
  corsa:'קורסה',astra:'אסטרה',mokka:'מוקה',grandland:'גרנדלנד',crossland:'קרוסלנד',
  ux:'UX',nx:'NX',rx:'RX',is:'IS',es:'ES',rz:'RZ',
  sandero:'סנדרו',duster:'דאסטר',spring:'ספרינג',
  atto3:'Atto 3',seal:'Seal',dolphin:'Dolphin',han:'Han',sealion6:'Sealion 6',sealion7:'Sealion 7',tang:'Tang',
  'mg-zs':'ZS',mg4:'MG4',mg5:'MG5',hs:'HS',
  omoda5:'Omoda 5',tiggo7:'Tiggo 7 Pro',tiggo8:'Tiggo 8 Pro',arrizo6:'Arrizo 6 Pro',
  coolray:'Coolray',emgrand:'Emgrand',
};
const EN_MAKES = {
  toyota:'Toyota',hyundai:'Hyundai',kia:'Kia',mazda:'Mazda',volkswagen:'Volkswagen',
  skoda:'Skoda',honda:'Honda',suzuki:'Suzuki',bmw:'BMW',mercedes:'Mercedes-Benz',
  audi:'Audi',ford:'Ford',nissan:'Nissan',peugeot:'Peugeot',renault:'Renault',volvo:'Volvo',
  jeep:'Jeep',mitsubishi:'Mitsubishi',subaru:'Subaru',byd:'BYD',mg:'MG',chery:'Chery',geely:'Geely',
  cupra:'Cupra',seat:'Seat',opel:'Opel',lexus:'Lexus',dacia:'Dacia',
};
const EN_MODELS = {
  corolla:'Corolla','corolla-cross':'Corolla Cross',camry:'Camry',yaris:'Yaris','yaris-cross':'Yaris Cross',
  rav4:'RAV4',hilux:'Hilux',chr:'C-HR',prius:'Prius',bz4x:'bZ4X','land-cruiser':'Land Cruiser',
  tucson:'Tucson',i20:'i20',i30:'i30',sonata:'Sonata','santa-fe':'Santa Fe',
  'ioniq-5':'Ioniq 5','ioniq-6':'Ioniq 6',kona:'Kona',bayon:'Bayon',venue:'Venue',
  elantra:'Elantra',staria:'Staria',
  sportage:'Sportage',seltos:'Seltos',stonic:'Stonic',ceed:"Cee'd",cerato:'Cerato',
  sorento:'Sorento',carnival:'Carnival',picanto:'Picanto',ev6:'EV6',ev9:'EV9',niro:'Niro',
  mazda3:'Mazda3',mazda6:'Mazda6',cx5:'CX-5',cx30:'CX-30',mx5:'MX-5',
  golf:'Golf',polo:'Polo',passat:'Passat',tiguan:'Tiguan',taigo:'Taigo',troc:'T-Roc',id3:'ID.3',id4:'ID.4',
  octavia:'Octavia',kodiaq:'Kodiaq',kamiq:'Kamiq',superb:'Superb',karoq:'Karoq',scala:'Scala',enyaq:'Enyaq',fabia:'Fabia',
  civic:'Civic',hrv:'HR-V',crv:'CR-V',jazz:'Jazz',
  swift:'Swift',vitara:'Vitara',scross:'S-Cross',jimny:'Jimny',
  series1:'Series 1',series3:'Series 3',series5:'Series 5',x1:'X1',x3:'X3',x5:'X5',ix3:'iX3',
  'a-class':'A-Class','b-class':'B-Class',cla:'CLA','c-class':'C-Class','e-class':'E-Class',
  gla:'GLA',glb:'GLB',glc:'GLC',eqb:'EQB',eqc:'EQC',
  a3:'A3',a4:'A4',a6:'A6',q3:'Q3',q5:'Q5',etron:'e-tron',
  fiesta:'Fiesta',focus:'Focus',kuga:'Kuga',puma:'Puma',ranger:'Ranger',
  qashqai:'Qashqai','x-trail':'X-Trail',juke:'Juke',kicks:'Kicks',note:'Note',leaf:'Leaf',navara:'Navara',
  '208':'208','308':'308','3008':'3008','5008':'5008',e208:'e-208',
  clio:'Clio',megane:'Megane',kadjar:'Kadjar',arkana:'Arkana',zoe:'Zoe',
  xc40:'XC40',xc60:'XC60',xc90:'XC90',s60:'S60',ex30:'EX30',
  renegade:'Renegade',compass:'Compass','grand-cherokee':'Grand Cherokee',wrangler:'Wrangler',cherokee:'Cherokee',avenger:'Avenger',
  outlander:'Outlander','eclipse-cross':'Eclipse Cross',asx:'ASX',
  forester:'Forester',outback:'Outback',xv:'XV',impreza:'Impreza',
  formentor:'Formentor',born:'Born',ateca:'Ateca',ibiza:'Ibiza',leon:'Leon',arona:'Arona',
  corsa:'Corsa',astra:'Astra',mokka:'Mokka',grandland:'Grandland',crossland:'Crossland',
  ux:'UX',nx:'NX',rx:'RX',is:'IS',es:'ES',rz:'RZ',
  sandero:'Sandero',duster:'Duster',spring:'Spring',
  atto3:'Atto 3',seal:'Seal',dolphin:'Dolphin',han:'Han',sealion6:'Sealion 6',sealion7:'Sealion 7',tang:'Tang',
  'mg-zs':'ZS',mg4:'MG4',mg5:'MG5',hs:'HS',
  omoda5:'Omoda 5',tiggo7:'Tiggo 7 Pro',tiggo8:'Tiggo 8 Pro',arrizo6:'Arrizo 6 Pro',
  coolray:'Coolray',emgrand:'Emgrand',
};

// Fetch AI-generated rows (AI Knowledge, Claude AI, and empty source) — excludes real scraped sources
const { data: rows, error } = await sb
  .from('expert_reviews')
  .select('id,make_slug,model_slug,year')
  .or('source_name.eq.AI Knowledge,source_name.eq.Claude AI,source_name.is.null')
  .order('make_slug', { ascending: true })
  .range(OFFSET, OFFSET + BATCH - 1);

if (error) { console.error('DB error:', error.message); process.exit(1); }
console.log(`Found ${rows.length} AI-generated rows (batch ${OFFSET}-${OFFSET + BATCH - 1})`);

let done = 0, updated = 0, failed = 0;
for (const row of rows) {
  const makeHe = HE_MAKES[row.make_slug] ?? row.make_slug;
  const modelHe = HE_MODELS[row.model_slug] ?? row.model_slug;
  const makeEn = EN_MAKES[row.make_slug] ?? row.make_slug;
  const modelEn = EN_MODELS[row.model_slug] ?? row.model_slug;

  process.stdout.write(`${row.make_slug}/${row.model_slug}${row.year ? '/'+row.year : ''} `);
  const data = await callMistral(buildPrompt(makeHe, modelHe, makeEn, modelEn, row.year));
  if (!data) {
    process.stdout.write('✗\n');
    failed++;
  } else {
    const { error: upErr } = await sb
      .from('expert_reviews')
      .update({
        summary_he: data.summary_he,
        // AI-only: clear split local/global summaries so component uses unified fallback
        local_summary_he: null,
        local_score: null,
        global_summary_he: null,
        global_score: null,
        top_score: data.score,
        pros: (data.pros ?? []).slice(0, 4),
        cons: (data.cons ?? []).slice(0, 4),
        source_name: 'AI Knowledge',
        scraped_at: new Date().toISOString(),
        next_scrape_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', row.id);
    process.stdout.write(upErr ? '✗(db)\n' : '✓\n');
    if (!upErr) updated++; else failed++;
  }
  done++;
  if (done < rows.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`Done: ${updated} updated, ${failed} failed`);
console.log(`Next batch: OFFSET=${OFFSET + BATCH} node scripts/reseed-driver-tone.mjs`);
