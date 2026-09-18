#!/usr/bin/env node
/**
 * Seed missing car makes and models into D1.
 * Run with: node --env-file=.env scripts/seed-missing-cars.mjs
 * Requires Node 22+ and authenticated wrangler session.
 */
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const W = (sql) => {
  const tmp = join(tmpdir(), `d1_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(
      `bash -c 'source "$HOME/.nvm/nvm.sh" && nvm use 22 --silent && npx wrangler d1 execute DB --config wrangler.toml --remote --file "${tmp}" 2>&1'`,
      { stdio: 'pipe', cwd: '/workspace/car-issues-il' }
    );
    process.stdout.write('.');
  } catch (e) {
    console.error('\nFailed SQL:', sql.slice(0, 120));
    console.error(e.stderr?.toString().slice(0, 300) || e.stdout?.toString().slice(0, 300));
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
};

const sq = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const yn = (n) => (n == null ? 'NULL' : String(n));

// ──────────────────────────────────────────────
// NEW MAKES
// ──────────────────────────────────────────────
const NEW_MAKES = [
  { slug: 'mini',        name_he: 'מיני',        name_en: 'Mini',        country: 'GB', logo_url: 'https://cdn.simpleicons.org/mini',        is_popular: 1, sort_order: 28 },
  { slug: 'citroen',     name_he: 'סיטרואן',     name_en: 'Citroën',     country: 'FR', logo_url: 'https://cdn.simpleicons.org/citroen',     is_popular: 0, sort_order: 29 },
  { slug: 'infiniti',    name_he: 'אינפיניטי',   name_en: 'Infiniti',    country: 'JP', logo_url: 'https://cdn.simpleicons.org/infiniti',    is_popular: 0, sort_order: 30 },
  { slug: 'genesis',     name_he: 'גנסיס',       name_en: 'Genesis',     country: 'KR', logo_url: 'https://cdn.simpleicons.org/genesis',     is_popular: 0, sort_order: 31 },
  { slug: 'polestar',    name_he: 'פולסטאר',     name_en: 'Polestar',    country: 'SE', logo_url: 'https://cdn.simpleicons.org/polestar',    is_popular: 0, sort_order: 32 },
  { slug: 'lynk-co',    name_he: 'לינק אנד קו', name_en: 'Lynk & Co',   country: 'CN', logo_url: '',                                      is_popular: 0, sort_order: 33 },
  { slug: 'haval',       name_he: 'הוואל',       name_en: 'Haval',       country: 'CN', logo_url: '',                                      is_popular: 0, sort_order: 34 },
  { slug: 'lamborghini', name_he: 'למבורגיני',   name_en: 'Lamborghini', country: 'IT', logo_url: 'https://cdn.simpleicons.org/lamborghini', is_popular: 0, sort_order: 35 },
  { slug: 'isuzu',       name_he: 'איסוזו',      name_en: 'Isuzu',       country: 'JP', logo_url: '',                                      is_popular: 0, sort_order: 36 },
  { slug: 'ssangyong',   name_he: 'סאנגיונג',    name_en: 'SsangYong',   country: 'KR', logo_url: '',                                      is_popular: 0, sort_order: 37 },
];

console.log('\n=== Inserting makes ===');
for (const m of NEW_MAKES) {
  W(`INSERT OR IGNORE INTO car_makes (slug,name_he,name_en,country,logo_url,is_popular,sort_order) VALUES (${sq(m.slug)},${sq(m.name_he)},${sq(m.name_en)},${sq(m.country)},${sq(m.logo_url)},${yn(m.is_popular)},${yn(m.sort_order)})`);
}
console.log(' done');

// ──────────────────────────────────────────────
// MODELS
// format: { slug, make_slug, name_he, name_en, years:[], category, trims:[], sort_order }
// ──────────────────────────────────────────────
function yrs(from, to) {
  const arr = [];
  for (let y = to; y >= from; y--) arr.push(y);
  return arr;
}

const NEW_MODELS = [
  // ── Mercedes missing ──
  { slug:'g-class',  make_slug:'mercedes', name_he:'מרצדס G-Class', name_en:'Mercedes-Benz G-Class', years:yrs(2000,2026), category:'suv',     trims:['G350d','G400d','G500','G63 AMG'], sort_order:67 },
  { slug:'gle',      make_slug:'mercedes', name_he:'מרצדס GLE',     name_en:'Mercedes-Benz GLE',     years:yrs(2015,2026), category:'suv',     trims:['GLE 300d','GLE 350','GLE 400d','GLE 53 AMG','GLE 63 S AMG'], sort_order:68 },
  { slug:'gls',      make_slug:'mercedes', name_he:'מרצדס GLS',     name_en:'Mercedes-Benz GLS',     years:yrs(2013,2026), category:'suv',     trims:['GLS 350d','GLS 400d','GLS 450','GLS 580','GLS 63 AMG'], sort_order:69 },
  { slug:'s-class',  make_slug:'mercedes', name_he:'מרצדס S-Class', name_en:'Mercedes-Benz S-Class', years:yrs(2013,2026), category:'sedan',   trims:['S350d','S400d','S450','S500','S580','S63 AMG','S680'], sort_order:70 },
  { slug:'eqa',      make_slug:'mercedes', name_he:'מרצדס EQA',     name_en:'Mercedes-Benz EQA',     years:yrs(2021,2026), category:'suv',     trims:['EQA 250','EQA 250+','EQA 300 4MATIC','EQA 350 4MATIC'], sort_order:71 },
  { slug:'eqe',      make_slug:'mercedes', name_he:'מרצדס EQE',     name_en:'Mercedes-Benz EQE',     years:yrs(2022,2026), category:'sedan',   trims:['EQE 300','EQE 350','EQE 500 4MATIC','EQE 43 AMG','EQE 53 AMG'], sort_order:72 },
  { slug:'eqs',      make_slug:'mercedes', name_he:'מרצדס EQS',     name_en:'Mercedes-Benz EQS',     years:yrs(2021,2026), category:'sedan',   trims:['EQS 350','EQS 450+','EQS 580 4MATIC','EQS 53 AMG'], sort_order:73 },

  // ── Audi missing ──
  { slug:'a1',       make_slug:'audi', name_he:'אאודי A1',       name_en:'Audi A1',          years:yrs(2018,2026), category:'hatchback', trims:['25 TFSI','30 TFSI','35 TFSI'], sort_order:50 },
  { slug:'a5',       make_slug:'audi', name_he:'אאודי A5',       name_en:'Audi A5',          years:yrs(2016,2026), category:'coupe',     trims:['35 TFSI','40 TFSI','45 TFSI','S5','RS5'], sort_order:51 },
  { slug:'a7',       make_slug:'audi', name_he:'אאודי A7',       name_en:'Audi A7',          years:yrs(2017,2026), category:'sedan',     trims:['40 TDI','45 TFSI','50 TDI','55 TFSI','S7','RS7'], sort_order:52 },
  { slug:'q2',       make_slug:'audi', name_he:'אאודי Q2',       name_en:'Audi Q2',          years:yrs(2016,2026), category:'suv',       trims:['25 TFSI','30 TFSI','35 TFSI'], sort_order:53 },
  { slug:'q7',       make_slug:'audi', name_he:'אאודי Q7',       name_en:'Audi Q7',          years:yrs(2015,2026), category:'suv',       trims:['45 TFSI','50 TDI','55 TFSI','SQ7'], sort_order:54 },
  { slug:'q8',       make_slug:'audi', name_he:'אאודי Q8',       name_en:'Audi Q8',          years:yrs(2018,2026), category:'suv',       trims:['50 TDI','55 TFSI','SQ8','RS Q8'], sort_order:55 },
  { slug:'q4-etron', make_slug:'audi', name_he:'אאודי Q4 e-tron', name_en:'Audi Q4 e-tron',  years:yrs(2021,2026), category:'electric',  trims:['35 e-tron','40 e-tron','45 e-tron','50 e-tron quattro'], sort_order:56 },

  // ── BMW missing ──
  { slug:'series2',  make_slug:'bmw', name_he:'BMW סדרה 2',  name_en:'BMW 2 Series', years:yrs(2021,2026), category:'coupe',    trims:['218i','220i','230i','M240i','M2'], sort_order:50 },
  { slug:'series4',  make_slug:'bmw', name_he:'BMW סדרה 4',  name_en:'BMW 4 Series', years:yrs(2020,2026), category:'coupe',    trims:['420i','430i','420d','440i xDrive','M440i','M4'], sort_order:51 },
  { slug:'x2',       make_slug:'bmw', name_he:'BMW X2',       name_en:'BMW X2',       years:yrs(2018,2026), category:'suv',     trims:['18i','20i','20d','25e','M35i'], sort_order:52 },
  { slug:'x4',       make_slug:'bmw', name_he:'BMW X4',       name_en:'BMW X4',       years:yrs(2018,2026), category:'suv',     trims:['20i','20d','30d','30i','M40i','X4 M'], sort_order:53 },
  { slug:'x6',       make_slug:'bmw', name_he:'BMW X6',       name_en:'BMW X6',       years:yrs(2019,2026), category:'suv',     trims:['30d','40i','M50i','M60i','X6 M'], sort_order:54 },
  { slug:'i4',       make_slug:'bmw', name_he:'BMW i4',       name_en:'BMW i4',       years:yrs(2021,2026), category:'electric', trims:['eDrive35','eDrive40','M50'], sort_order:55 },
  { slug:'ix',       make_slug:'bmw', name_he:'BMW iX',       name_en:'BMW iX',       years:yrs(2021,2026), category:'electric', trims:['xDrive40','xDrive50','M60'], sort_order:56 },
  { slug:'ix1',      make_slug:'bmw', name_he:'BMW iX1',      name_en:'BMW iX1',      years:yrs(2022,2026), category:'electric', trims:['eDrive20','xDrive30'], sort_order:57 },

  // ── Toyota missing ──
  { slug:'supra',    make_slug:'toyota', name_he:'טויוטה סופרה', name_en:'Toyota Supra',  years:yrs(2019,2026), category:'sports', trims:['2.0 Turbo','3.0 Turbo','GR Supra A90'], sort_order:50 },
  { slug:'gr86',     make_slug:'toyota', name_he:'טויוטה GR86',  name_en:'Toyota GR86',   years:yrs(2021,2026), category:'sports', trims:['2.4 NA','GR86 Premium'], sort_order:51 },

  // ── Volkswagen missing ──
  { slug:'arteon',   make_slug:'volkswagen', name_he:'פולקסווגן ארטאון', name_en:'Volkswagen Arteon', years:yrs(2017,2026), category:'sedan',  trims:['1.5 TSI','2.0 TDI','2.0 TSI 4Motion','R'], sort_order:50 },
  { slug:'id5',      make_slug:'volkswagen', name_he:'פולקסווגן ID.5',   name_en:'Volkswagen ID.5',   years:yrs(2022,2026), category:'electric', trims:['ID.5 Pure+','ID.5 Pro','ID.5 Pro Performance','ID.5 GTX'], sort_order:51 },
  { slug:'amarok',   make_slug:'volkswagen', name_he:'פולקסווגן אמרוק',  name_en:'Volkswagen Amarok', years:yrs(2010,2026), category:'pickup',  trims:['2.0 TDI','3.0 TDI V6','TDI 4Motion'], sort_order:52 },

  // ── Hyundai missing ──
  { slug:'ioniq-9',  make_slug:'hyundai', name_he:'יונדאי איוניק 9', name_en:'Hyundai Ioniq 9', years:yrs(2025,2026), category:'electric', trims:['Standard Range','Long Range RWD','Long Range AWD'], sort_order:50 },
  { slug:'palisade', make_slug:'hyundai', name_he:'יונדאי פליסייד',  name_en:'Hyundai Palisade', years:yrs(2019,2026), category:'suv',     trims:['2.2 CRDi','2.2 CRDi AWD','3.8 V6 AWD'], sort_order:51 },

  // ── Kia missing ──
  { slug:'ev3',      make_slug:'kia', name_he:'קיה EV3', name_en:'Kia EV3', years:yrs(2024,2026), category:'electric', trims:['Standard Range','Long Range'], sort_order:50 },

  // ── Chevrolet missing ──
  { slug:'corvette', make_slug:'chevrolet', name_he:'שברולט קורבט', name_en:'Chevrolet Corvette', years:yrs(2019,2026), category:'sports', trims:['Stingray 1LT','Stingray 3LT','Grand Sport','Z06','ZR1'], sort_order:50 },

  // ── Geely missing ──
  { slug:'monjaro', make_slug:'geely', name_he:'ג\'ילי מונחארו', name_en:'Geely Monjaro', years:yrs(2022,2026), category:'suv', trims:['2.0T AWD','2.0T FWD'], sort_order:50 },

  // ── Chery missing ──
  { slug:'omoda-fx', make_slug:'chery', name_he:'צ\'רי אומודה FX', name_en:'Chery OMODA FX', years:yrs(2024,2026), category:'suv', trims:['1.6T','2.0T'], sort_order:50 },

  // ── Mini models ──
  { slug:'cooper',      make_slug:'mini', name_he:'מיני קופר',       name_en:'Mini Cooper',      years:yrs(2014,2026), category:'hatchback', trims:['One','Cooper','Cooper S','John Cooper Works'], sort_order:1 },
  { slug:'countryman',  make_slug:'mini', name_he:'מיני קאנטרימן',   name_en:'Mini Countryman',  years:yrs(2017,2026), category:'suv',       trims:['Cooper','Cooper S','Cooper D','Cooper SE','JCW'], sort_order:2 },
  { slug:'clubman',     make_slug:'mini', name_he:'מיני קלאבמן',     name_en:'Mini Clubman',     years:yrs(2015,2024), category:'hatchback', trims:['Cooper','Cooper S','Cooper SD','JCW'], sort_order:3 },
  { slug:'mini-electric', make_slug:'mini', name_he:'מיני אלקטרי',   name_en:'Mini Electric',    years:yrs(2020,2026), category:'electric',  trims:['SE 1LT','SE 2LT','SE Resolute'], sort_order:4 },

  // ── Citroën models ──
  { slug:'c3',   make_slug:'citroen', name_he:'סיטרואן C3',    name_en:'Citroën C3',    years:yrs(2016,2026), category:'hatchback', trims:['PureTech 82','PureTech 110','BlueHDi 100'], sort_order:1 },
  { slug:'c4',   make_slug:'citroen', name_he:'סיטרואן C4',    name_en:'Citroën C4',    years:yrs(2020,2026), category:'hatchback', trims:['PureTech 130','BlueHDi 130','ë-C4 Electric'], sort_order:2 },
  { slug:'c5x',  make_slug:'citroen', name_he:'סיטרואן C5 X',  name_en:'Citroën C5 X',  years:yrs(2022,2026), category:'suv',       trims:['PureTech 130','Plug-in Hybrid 225'], sort_order:3 },
  { slug:'berlingo', make_slug:'citroen', name_he:'סיטרואן ברלינגו', name_en:'Citroën Berlingo', years:yrs(2018,2026), category:'minivan', trims:['PureTech 110','BlueHDi 100','BlueHDi 130'], sort_order:4 },

  // ── Infiniti models ──
  { slug:'q50',  make_slug:'infiniti', name_he:'אינפיניטי Q50',  name_en:'Infiniti Q50',  years:yrs(2013,2026), category:'sedan', trims:['2.0t','3.0t RWD','3.0t AWD','3.5 Hybrid','Red Sport 400'], sort_order:1 },
  { slug:'qx50', make_slug:'infiniti', name_he:'אינפיניטי QX50', name_en:'Infiniti QX50', years:yrs(2018,2026), category:'suv',   trims:['Pure FWD','Luxe AWD','Sensory AWD','Autograph AWD'], sort_order:2 },
  { slug:'qx60', make_slug:'infiniti', name_he:'אינפיניטי QX60', name_en:'Infiniti QX60', years:yrs(2021,2026), category:'suv',   trims:['Pure FWD','Luxe AWD','Sensory AWD','Autograph AWD'], sort_order:3 },

  // ── Genesis models ──
  { slug:'g80',  make_slug:'genesis', name_he:'גנסיס G80',  name_en:'Genesis G80',  years:yrs(2020,2026), category:'sedan', trims:['2.5T RWD','2.5T AWD','3.5T AWD','Electrified G80'], sort_order:1 },
  { slug:'gv70', make_slug:'genesis', name_he:'גנסיס GV70', name_en:'Genesis GV70', years:yrs(2021,2026), category:'suv',   trims:['2.5T FWD','2.5T AWD','3.5T AWD','Electrified GV70'], sort_order:2 },
  { slug:'gv80', make_slug:'genesis', name_he:'גנסיס GV80', name_en:'Genesis GV80', years:yrs(2020,2026), category:'suv',   trims:['2.5T','3.5T','3.5T AWD'], sort_order:3 },

  // ── Polestar models ──
  { slug:'polestar-2', make_slug:'polestar', name_he:'פולסטאר 2', name_en:'Polestar 2', years:yrs(2021,2026), category:'electric', trims:['Single Motor FWD','Single Motor RWD','Dual Motor AWD'], sort_order:1 },
  { slug:'polestar-3', make_slug:'polestar', name_he:'פולסטאר 3', name_en:'Polestar 3', years:yrs(2024,2026), category:'electric', trims:['Long Range Single Motor','Long Range Dual Motor','Long Range Dual Motor Performance'], sort_order:2 },

  // ── Lynk & Co models ──
  { slug:'01',   make_slug:'lynk-co', name_he:'לינק 01', name_en:'Lynk & Co 01', years:yrs(2017,2026), category:'suv',     trims:['2.0T FWD','2.0T AWD','PHEV'], sort_order:1 },
  { slug:'05',   make_slug:'lynk-co', name_he:'לינק 05', name_en:'Lynk & Co 05', years:yrs(2019,2026), category:'suv',     trims:['2.0T FWD','PHEV'], sort_order:2 },

  // ── Haval models ──
  { slug:'jolion', make_slug:'haval', name_he:'הוואל ג\'וליון', name_en:'Haval Jolion', years:yrs(2020,2026), category:'suv', trims:['1.5T DCT','HEV','PHEV'], sort_order:1 },
  { slug:'h6',     make_slug:'haval', name_he:'הוואל H6',       name_en:'Haval H6',     years:yrs(2020,2026), category:'suv', trims:['1.5T','2.0T','HEV'], sort_order:2 },

  // ── Lamborghini models ──
  { slug:'urus',     make_slug:'lamborghini', name_he:'למבורגיני אורוס',   name_en:'Lamborghini Urus',   years:yrs(2018,2026), category:'suv',    trims:['Urus','Urus S','Urus Performante'], sort_order:1 },
  { slug:'huracan',  make_slug:'lamborghini', name_he:'למבורגיני הוראקן',  name_en:'Lamborghini Huracán', years:yrs(2014,2026), category:'sports', trims:['LP 610-4','EVO','EVO RWD','STO'], sort_order:2 },
  { slug:'revuelto', make_slug:'lamborghini', name_he:'למבורגיני רבואלטו', name_en:'Lamborghini Revuelto', years:yrs(2023,2026), category:'sports', trims:['V12 Hybrid 1015hp'], sort_order:3 },

  // ── Isuzu models ──
  { slug:'d-max', make_slug:'isuzu', name_he:'איסוזו D-Max', name_en:'Isuzu D-Max', years:yrs(2012,2026), category:'pickup', trims:['2.5L','3.0L ddi','Space Cab','Double Cab 4x4'], sort_order:1 },
  { slug:'mu-x',  make_slug:'isuzu', name_he:'איסוזו MU-X',  name_en:'Isuzu MU-X',  years:yrs(2014,2026), category:'suv',    trims:['1.9 DDTi 4x2','3.0 DDTi 4x2','3.0 DDTi 4x4'], sort_order:2 },

  // ── SsangYong models ──
  { slug:'tivoli',  make_slug:'ssangyong', name_he:'סאנגיונג טיבולי', name_en:'SsangYong Tivoli', years:yrs(2015,2026), category:'suv', trims:['1.5 GDI','1.6D 2WD','e-XLV'], sort_order:1 },
  { slug:'rexton',  make_slug:'ssangyong', name_he:'סאנגיונג רקסטון', name_en:'SsangYong Rexton', years:yrs(2017,2026), category:'suv', trims:['2.2 e-XDi 2WD','2.2 e-XDi 4WD','Ultimate'], sort_order:2 },
];

console.log('\n=== Inserting models ===');
for (const m of NEW_MODELS) {
  const years = JSON.stringify(m.years);
  const trims = JSON.stringify(m.trims);
  W(`INSERT OR IGNORE INTO car_models (slug,make_slug,name_he,name_en,years,category,trims,sort_order) VALUES (${sq(m.slug)},${sq(m.make_slug)},${sq(m.name_he)},${sq(m.name_en)},${sq(years)},${sq(m.category)},${sq(trims)},${yn(m.sort_order)})`);
}
console.log(' done');

// ──────────────────────────────────────────────
// EXPERT REVIEWS
// ──────────────────────────────────────────────
const NOW = new Date().toISOString();

function review(makeSlug, modelSlug, year, opts) {
  return {
    id: randomUUID(),
    make_slug: makeSlug,
    model_slug: modelSlug,
    year,
    source_name: 'CarIssues Expert Review',
    source_url: `https://carissues.co.il/cars/${makeSlug}/${modelSlug}`,
    original_title: `${opts.name_en} — Expert Review`,
    ...opts,
    local_post_count: 0,
    global_post_count: 0,
    scraped_at: NOW,
  };
}

const REVIEWS = [
  review('mercedes','g-class', 2024, {
    name_en: 'Mercedes-Benz G-Class',
    top_score: 9.0, local_score: 9, global_score: 9,
    summary_he: 'הג׳יפ האגדי של מרצדס — G-Class הוא סמל יוקרה ויכולת שטח מנוסה. מבנה גוף-על-מסגרת קלאסי, שנשתפר עם כל דור.',
    local_summary_he: 'בישראל G-Class הוא סטטוס סימבול בולט. בעלים מדווחים על אמינות גבוהה, ביצועי שטח יוצאי דופן ועל כך שהרכב מושך תשומת לב בכל מקום. עלות אחזקה גבוהה מציינת ברוב הביקורות.',
    global_summary_he: 'ברחבי העולם G-Class נחשב לרכב האייקוני ביותר של מרצדס — שילוב נדיר בין יכולות שטח אמיתיות לפנים יוקרתיים ביותר. הדגם החדש (W464) שיפר משמעותית את נוחות הנהיגה בכביש.',
    global_summary_en: 'The G-Class is Mercedes-Benz\'s most iconic model, blending genuine off-road capability with the highest luxury standards. The W464 generation significantly improved on-road refinement while retaining the legendary body-on-frame design.',
    local_summary_en: 'In Israel the G-Class is a highly sought status symbol. Owners report outstanding off-road performance and high reliability, though running costs are steep. Servicing at authorized centers is essential.',
    summary_en: 'The G-Class is Mercedes-Benz\'s most iconic model, blending genuine off-road capability with the highest luxury standards.',
    pros: JSON.stringify(['יכולות שטח אמיתיות ומוכחות','עיצוב אייקוני שלא מתיישן','פנים יוקרתיים ביותר בקטגוריה','ערך שימור גבוה מאוד']),
    cons: JSON.stringify(['מחיר התחלתי גבוה מאוד','צריכת דלק גבוהה','מקום מוגבל בשורה האחורית','תיבת הגה כבדה בנהיגה עירונית']),
    pros_en: JSON.stringify(['Exceptional off-road capability','Iconic timeless design','Top-tier luxury interior','Outstanding resale value']),
    cons_en: JSON.stringify(['Very high purchase price','High fuel consumption','Limited rear legroom','Heavy steering in urban conditions']),
  }),

  review('mercedes','gle', 2024, {
    name_en: 'Mercedes-Benz GLE',
    top_score: 8.3, local_score: 8, global_score: 8,
    summary_he: 'GLE הוא ה-SUV הגדול והמפואר של מרצדס — מתחרה ישיר ל-BMW X5. מציע שילוב מצוין של נוחות, טכנולוגיה וביצועים.',
    local_summary_he: 'בישראל GLE נמכר בעיקר בגרסאות 300d ו-350 4MATIC. הבעלים מדווחים על נוחות נסיעה יוצאת דופן ומערכות בטיחות מתקדמות. חלק מציינים עלויות שירות גבוהות.',
    global_summary_he: 'GLE קיבל ציונים גבוהים בסקירות בינלאומיות על תחכום הטכנולוגיה (MBUX), אפשרות להשעיה אוויר ומנועי AMG חזקים. גרסת PHEV 350e מאוד פופולרית באירופה.',
    global_summary_en: 'The GLE receives top marks for MBUX technology, optional air suspension and powerful AMG derivatives. The 350e PHEV variant is especially popular in Europe for its blend of efficiency and performance.',
    local_summary_en: 'In Israel the GLE is primarily sold in 300d and 350 4MATIC specs. Owners appreciate the exceptional ride comfort and advanced driver assistance systems.',
    summary_en: 'The GLE is Mercedes-Benz\'s flagship mid-size luxury SUV, competing directly with the BMW X5 with superior comfort and technology.',
    pros: JSON.stringify(['נוחות נסיעה יוצאת דופן','מערכת MBUX מתקדמת','מגוון מנועים כולל AMG','אפשרות להשעיה אוויר']),
    cons: JSON.stringify(['מחיר גבוה עם אופציות','צריכת דלק גבוהה בדגמי בנזין','מקום מוגבל ל-7 נוסעים (אופציונלי)','עלות שירות גבוהה']),
    pros_en: JSON.stringify(['Exceptional ride quality with air suspension','Advanced MBUX infotainment','Wide powertrain range including AMG','Spacious luxury interior']),
    cons_en: JSON.stringify(['High price when optioned','Thirsty petrol engines','Optional third row cramped','Expensive servicing']),
  }),

  review('mercedes','s-class', 2024, {
    name_en: 'Mercedes-Benz S-Class',
    top_score: 9.2, local_score: 9, global_score: 9,
    summary_he: 'S-Class הוא התקן הזהב לסדאן יוקרה. כל דור חדש מגדיר מחדש את הטכנולוגיה, הנוחות והחדשנות בתחום.',
    local_summary_he: 'בישראל S-Class הוא רכב הייצוג האולטימטיבי. נמכר בעיקר בגרסאות S350d ו-S450. הבעלים מדווחים על נוחות מלכותית ועל מערכות ADAS המובילות בשוק.',
    global_summary_he: 'W223 (הדור הנוכחי) הציג תצוגות OLED, כריות אוויר ב-4 ממדים ומנועי היברידיים קלים. S-Class תמיד מוביל את תעשיית הרכב בחדשנות.',
    global_summary_en: 'The W223 S-Class introduced OLED rear displays, 4D air cushions and mild-hybrid powertrains. It consistently leads the automotive industry in technological innovation.',
    local_summary_en: 'In Israel the S-Class is the ultimate prestige sedan, primarily sold in S350d and S450 variants. Owners report royal comfort and class-leading ADAS systems.',
    summary_en: 'The S-Class sets the benchmark for luxury sedans, consistently pioneering automotive technology and refinement.',
    pros: JSON.stringify(['הנוחות הגבוהה ביותר בקטגוריה','טכנולוגיה פורצת דרך','מנועים חזקים ויעילים','בטיחות מהמובילות בעולם']),
    cons: JSON.stringify(['מחיר גבוה מאוד','עלות אחזקה גבוהה','ממדים גדולים לחניות עירוניות','מורכבות טכנולוגית עלולה לבלבל']),
    pros_en: JSON.stringify(['Unmatched cabin luxury','Pioneering technology','Powerful and efficient engines','Best-in-class active safety']),
    cons_en: JSON.stringify(['Very high purchase price','Expensive maintenance','Large dimensions challenging in cities','Technology complexity can overwhelm']),
  }),

  review('mercedes','eqa', 2024, {
    name_en: 'Mercedes-Benz EQA',
    top_score: 7.8, local_score: 8, global_score: 8,
    summary_he: 'EQA הוא ה-SUV החשמלי הקומפקטי של מרצדס — נקודת הכניסה לעולם EQ. מבוסס על ה-GLA עם דרייבטריין חשמלי.',
    local_summary_he: 'בישראל EQA מושך קונים שרוצים מרצדס חשמלי בתקציב יחסית נגיש. הטווח (400-500 ק״מ) מספיק לשימוש יומי. טעינה מהירה 100kW.',
    global_summary_he: 'ביקורות בינלאומיות מציינות את EQA כאחד ה-SUV החשמליים הנוחים בקטגוריה, עם פנים יוקרתיים וטכנולוגיית MBUX. החיסרון העיקרי הוא קצב הטעינה הנמוך יחסית.',
    global_summary_en: 'International reviews praise the EQA as one of the most comfortable compact electric SUVs, with a premium MBUX interior. The main criticism is slower DC charging speed compared to competitors.',
    local_summary_en: 'In Israel the EQA attracts buyers who want a Mercedes EV at a relatively accessible price. The 400-500km range is sufficient for daily use.',
    summary_en: 'The EQA is Mercedes-Benz\'s entry-level electric SUV, based on the GLA platform with premium EQ brand positioning.',
    pros: JSON.stringify(['פנים יוקרתיים','MBUX מתקדם','טווח טוב לשימוש יומי','נהיגה נוחה וחלקה']),
    cons: JSON.stringify(['טעינה מהירה מוגבלת ל-100kW','מחיר גבוה ביחס לטווח','תא מטען קטן','אין גרסת AWD בחלק מהשווקים']),
    pros_en: JSON.stringify(['Luxurious MBUX interior','Smooth quiet ride','Good daily range','Premium EQ brand experience']),
    cons_en: JSON.stringify(['Slow 100kW DC charging','Expensive for range offered','Small boot space','Limited AWD availability']),
  }),

  review('mercedes','eqe', 2024, {
    name_en: 'Mercedes-Benz EQE',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'EQE הוא הסדאן החשמלי האמצעי של מרצדס — בין EQA ל-EQS. מציע טווח של עד 660 ק״מ ועיצוב אווירודינמי מרשים.',
    local_summary_he: 'בישראל EQE 350 הוא הגרסה המבוקשת. נוחות נסיעה מעולה עם AIRMATIC, מסך היפר-ענק אופציונלי. מתאים לנסיעות ארוכות.',
    global_summary_he: 'EQE קיבל ציונים גבוהים על עיצובו האווירודינמי (Cd 0.20), טווח מצוין ופנים יוקרתיים. ה-AMG EQE 43 ו-53 מציעים ביצועים ספורטיביים מרשימים.',
    global_summary_en: 'The EQE earns high marks for its aerodynamic design (Cd 0.20), excellent range, and premium interior. The AMG EQE 43 and 53 variants offer impressive performance.',
    local_summary_en: 'In Israel the EQE 350 is the most popular variant, praised for exceptional comfort with AIRMATIC and the optional Hyperscreen.',
    summary_en: 'The EQE is Mercedes-Benz\'s mid-size electric sedan combining long range with luxury interior and AMG performance options.',
    pros: JSON.stringify(['טווח מצוין (עד 660 ק״מ)','עיצוב אווירודינמי מרשים','Hyperscreen אופציונלי','AMG בגרסאות חזקות']),
    cons: JSON.stringify(['מחיר גבוה','תא מטען קטן (עיצוב ״בועה״)','עיצוב פנים שנוי במחלוקת','כבד יחסית']),
    pros_en: JSON.stringify(['Excellent range up to 660km','Aerodynamic design','Optional Hyperscreen','AMG performance variants available']),
    cons_en: JSON.stringify(['High price','Small boot (bubble design)','Polarizing interior design','Heavy weight']),
  }),

  review('mercedes','g-class', 2024, { name_en:'dummy' }), // placeholder removed below

  review('mercedes','gls', 2024, {
    name_en: 'Mercedes-Benz GLS',
    top_score: 8.8, local_score: 9, global_score: 9,
    summary_he: 'GLS הוא ה-SUV הגדול ביותר של מרצדס — S-Class בין ה-SUVs. 7 מקומות, פנים יוקרתיים ביותר, מנועים חזקים.',
    local_summary_he: 'בישראל GLS 400d הוא המכירה הנפוצה. משפחות גדולות מעריכות את 7 המקומות הנוחים ואת יכולות הגרירה המצוינות.',
    global_summary_he: 'GLS נחשב "S-Class SUV" — מציע את הפנים היוקרתיים ביותר בין ה-SUVs הגדולים. מתחרה ישיר לBMW X7 ו-Cadillac Escalade.',
    global_summary_en: 'Called the "S-Class of SUVs," the GLS offers the most luxurious interior in its segment. Direct competition for the BMW X7 and Cadillac Escalade.',
    local_summary_en: 'In Israel the GLS 400d is the most popular variant. Larger families appreciate the genuinely usable seven seats and excellent towing capacity.',
    summary_en: 'The GLS is Mercedes-Benz\'s flagship full-size SUV, offering S-Class levels of luxury with 7 seats and powerful powertrains.',
    pros: JSON.stringify(['7 מקומות נוחים אמיתיים','פנים יוקרתיים ביותר','מנועים חזקים ויעילים','נוחות S-Class ב-SUV']),
    cons: JSON.stringify(['מחיר גבוה מאוד','גודל מאתגר בעיר','צריכת דלק גבוהה','עלות אחזקה גבוהה']),
    pros_en: JSON.stringify(['Genuinely comfortable 7 seats','S-Class level luxury','Powerful efficient engines','Exceptional ride quality']),
    cons_en: JSON.stringify(['Very high price','Challenging size in cities','High fuel consumption','Expensive to maintain']),
  }),

  review('mercedes','eqs', 2024, {
    name_en: 'Mercedes-Benz EQS',
    top_score: 8.7, local_score: 9, global_score: 9,
    summary_he: 'EQS הוא הפסגה בין רכבי ה-EQ של מרצדס — חשמלי יוקרתי עם טווח של עד 780 ק״מ ו-Hyperscreen ייחודי.',
    local_summary_he: 'בישראל EQS 350 ו-580 הם הגרסות המבוקשות. נוחות מלכותית, AIRMATIC ומשקם מיוחד. הטווח הגבוה מבטל חרדת טווח.',
    global_summary_he: 'EQS מוביל את קטגוריית הסדאן החשמלי היוקרתי. Hyperscreen עם 3 מסכים, MBUX מתקדם ו-AMG EQS 53 עם 760 כ״ס.',
    global_summary_en: 'The EQS leads the luxury electric sedan segment. The Hyperscreen with 3 displays, advanced MBUX and the 760hp AMG EQS 53 set benchmarks.',
    local_summary_en: 'In Israel the EQS 350 and 580 are most sought after. Royal ride quality, AIRMATIC, and the high range eliminate range anxiety entirely.',
    summary_en: 'The EQS is Mercedes-Benz\'s pinnacle electric vehicle, offering up to 780km range, Hyperscreen technology, and S-Class luxury.',
    pros: JSON.stringify(['טווח מוביל (עד 780 ק״מ)','Hyperscreen מרשים','נוחות EQS מלכותית','AMG EQS 53 — 760 כ״ס']),
    cons: JSON.stringify(['מחיר גבוה מאוד','כבד (2.5+ טון)','תא מטען קטן','מורכבות מערכות']),
    pros_en: JSON.stringify(['Class-leading range up to 780km','Impressive Hyperscreen display','Royal comfort and refinement','AMG EQS 53 with 760hp']),
    cons_en: JSON.stringify(['Very high price','Heavy 2.5+ tonnes','Small boot','System complexity']),
  }),

  review('audi','a1', 2024, {
    name_en: 'Audi A1',
    top_score: 7.5, local_score: 7, global_score: 8,
    summary_he: 'A1 הוא ההאצ׳בק הפרמיום הקטן של אאודי — עיצוב ספורטיבי, פנים איכותיים ומנועים קטנים יעילים.',
    local_summary_he: 'בישראל A1 פופולרי בקרב צעירים ונהגות המחפשים רכב פרמיום קטן. הגרסה 30 TFSI נפוצה. עלות שירות גבוהה יחסית לגודל.',
    global_summary_he: 'A1 Sportback מציע עיצוב פנים מתקדם עם Virtual Cockpit, מנועים יעילים 3 צילינדר ובסיס שוות ל-Polo GTI.',
    global_summary_en: 'The A1 Sportback offers a premium interior with Virtual Cockpit, efficient 3-cylinder engines and VW Polo GTI underpinnings with Audi premium badge.',
    local_summary_en: 'In Israel the A1 is popular among young buyers seeking a premium compact. The 30 TFSI is the most common trim. Service costs are higher than non-premium competitors.',
    summary_en: 'The Audi A1 is a premium compact hatchback with sporty styling, quality interior and efficient small displacement engines.',
    pros: JSON.stringify(['עיצוב ספורטיבי מושך','פנים פרמיום Virtual Cockpit','מנועים יעילים','חניה קלה בעיר']),
    cons: JSON.stringify(['מחיר גבוה לגודלו','מנועי 3 צילינדר לא תמיד חלקים','מקום מוגבל בשורה האחורית','עלות שירות גבוהה']),
    pros_en: JSON.stringify(['Sporty attractive styling','Premium Virtual Cockpit interior','Efficient engines','Easy urban parking']),
    cons_en: JSON.stringify(['High price for size','3-cylinder engines can feel rough','Limited rear space','Expensive servicing']),
  }),

  review('audi','a5', 2024, {
    name_en: 'Audi A5',
    top_score: 8.2, local_score: 8, global_score: 8,
    summary_he: 'A5 הוא הקופה/ספורטבק האלגנטי של אאודי — עיצוב מדהים, פנים יוקרתיים ומנועים חזקים.',
    local_summary_he: 'בישראל A5 Sportback 40 TFSI ו-45 TFSI הם הגרסות הנפוצות. ביצועים מצוינים עם quattro.',
    global_summary_he: 'A5 Sportback נחשב לאחד הרכבים היפים ביותר שמייצרת אאודי. מנוע 2.0 TFSI בגרסות שונות, RS5 עם 450 כ״ס.',
    global_summary_en: 'The A5 Sportback is considered one of Audi\'s most beautiful designs. Available with 2.0 TFSI in various states of tune, culminating in the RS5 with 450hp.',
    local_summary_en: 'In Israel the A5 Sportback 40 TFSI and 45 TFSI are most common. Excellent performance with quattro all-wheel drive.',
    summary_en: 'The Audi A5 is an elegant coupe/sportback with stunning design, luxury interior and a range from efficient to high-performance.',
    pros: JSON.stringify(['עיצוב מרהיב','ביצועים מצוינים עם quattro','פנים יוקרתיים','תחושת נהיגה משפרת']),
    cons: JSON.stringify(['נראות מוגבלת לאחור','מחיר גבוה עם אופציות','תא מטען קטן בקופה','RS5 יקר מאוד']),
    pros_en: JSON.stringify(['Stunning design','Excellent quattro performance','Luxury interior','Engaging driving feel']),
    cons_en: JSON.stringify(['Limited rear visibility','High price with options','Small coupe boot','RS5 very expensive']),
  }),

  review('audi','q4-etron', 2024, {
    name_en: 'Audi Q4 e-tron',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'Q4 e-tron הוא ה-SUV החשמלי הגדול ביותר שמגיע מאאודי בתקציב יחסית נגיש — מבוסס על MEB של VW.',
    local_summary_he: 'בישראל Q4 40 e-tron ו-50 e-tron quattro פופולריים. טווח של 520-550 ק״מ, טעינה 135kW. מתחרה ישיר לטסלה Model Y.',
    global_summary_he: 'Q4 e-tron על בסיס פלטפורמת MEB מציע ערך מצוין — פנים מרווחים, AR Head-up display ייחודי וביצועים טובים. חיסרון — אין לו את ה"תחושה" של אאודי בגבהים.',
    global_summary_en: 'The MEB-based Q4 e-tron offers excellent value with spacious interior, unique AR head-up display and solid performance. Critics note it lacks the premium feel of traditional Audi models.',
    local_summary_en: 'In Israel the Q4 40 and 50 quattro are popular choices. Range of 520-550km and 135kW charging make it competitive with Tesla Model Y.',
    summary_en: 'The Q4 e-tron is Audi\'s most accessible electric SUV, built on the VW MEB platform with spacious interior and strong performance.',
    pros: JSON.stringify(['טווח מצוין 520+ ק״מ','AR Head-up display','פנים מרווחים','מחיר תחרותי']),
    cons: JSON.stringify(['חוסר ב"תחושה" פרמיום','ממשק מגע מורכב','ביצועי טעינה בינוניים','עיצוב חיצוני שמרני']),
    pros_en: JSON.stringify(['Excellent 520+km range','Unique AR head-up display','Spacious interior','Competitive pricing']),
    cons_en: JSON.stringify(['Lacks traditional Audi premium feel','Complex touch interface','Average charging performance','Conservative exterior']),
  }),

  review('audi','q7', 2024, {
    name_en: 'Audi Q7',
    top_score: 8.5, local_score: 8, global_score: 9,
    summary_he: 'Q7 הוא ה-SUV הגדול של אאודי — 7 מקומות, מנועי V6 ו-V8, עיצוב יוקרתי ושלל טכנולוגיות.',
    local_summary_he: 'בישראל Q7 45 TFSI ו-50 TDI הם הנפוצים. הורים מציינים את 7 המקומות ואת מערכת הבידור לילדים. עלות גבוהה.',
    global_summary_he: 'Q7 מציע את המיטב מאאודי — Virtual Cockpit Pro, שלדה אוויר אופציונלי, SQ7 עם 507 כ״ס ופלאגין היברידי יעיל.',
    global_summary_en: 'The Q7 offers the best of Audi — Virtual Cockpit Pro, optional air suspension, SQ7 with 507hp and an efficient plug-in hybrid variant.',
    local_summary_en: 'In Israel the 45 TFSI and 50 TDI variants are most common. Families value the genuine 7-seat configuration and the rear entertainment system.',
    summary_en: 'The Audi Q7 is a full-size luxury 7-seat SUV with a premium interior, powerful powertrains and optional air suspension.',
    pros: JSON.stringify(['7 מקומות נוחים','Virtual Cockpit Pro','SQ7 — מפלצת ביצועים','נהיגה נוחה עם AIRMATIC']),
    cons: JSON.stringify(['מחיר גבוה מאוד','צריכת דלק גבוהה','גדול לחניות מצומצמות','SQ7 יקר מאוד']),
    pros_en: JSON.stringify(['Comfortable 7 seats','Excellent Virtual Cockpit Pro','SQ7 performance monster','Smooth AIRMATIC ride']),
    cons_en: JSON.stringify(['Very high price','High fuel consumption','Challenging urban parking','SQ7 very expensive']),
  }),

  review('bmw','series2', 2024, {
    name_en: 'BMW 2 Series',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'BMW סדרה 2 — הקופה הספורטיבי של BMW. M2 הוא אחד מרכבי הכיף המובילים בקטגוריה.',
    local_summary_he: 'בישראל סדרה 2 Gran Coupe נפוץ. 220i Active Tourer פופולרי אצל משפחות קטנות. M2 — רכב חלומות לחובבי נהיגה.',
    global_summary_he: 'הדור הנוכחי של M2 (G87) עם 460 כ״ס הפך לאגדה מיד. ה-218i ו-220i מציעים שיווי משקל בין יעילות לכיף נהיגה.',
    global_summary_en: 'The current M2 (G87) with 460hp became legendary immediately. The 218i and 220i offer a balance of efficiency and driving pleasure.',
    local_summary_en: 'In Israel the 2 Series Gran Coupe is popular for practical coupe style. The M2 is a dream car for driving enthusiasts.',
    summary_en: 'The BMW 2 Series offers sporty driving dynamics from the compact 218i to the legendary M2 with 460hp.',
    pros: JSON.stringify(['M2 — אחד הכיפיים בקטגוריה','עיצוב ספורטיבי','מנועים מעולים','כיף נהיגה ב-RWD']),
    cons: JSON.stringify(['פנים מינימליסטי מדי','iDrive 8 שנוי במחלוקת','מקום מוגבל בקופה','M2 — בלאי גבוה']),
    pros_en: JSON.stringify(['M2 — among the most fun cars','Sporty design','Excellent engines','RWD driving joy']),
    cons_en: JSON.stringify(['Minimalist interior divides opinion','iDrive 8 controversial','Limited coupe space','M2 high running costs']),
  }),

  review('bmw','series4', 2024, {
    name_en: 'BMW 4 Series',
    top_score: 8.3, local_score: 8, global_score: 8,
    summary_he: 'BMW סדרה 4 — קופה/גרן קופה מרשים עם קידמי ענק שנוי במחלוקת. M4 עם 510 כ״ס מציג ביצועים מדהימים.',
    local_summary_he: 'בישראל 420i ו-430i Gran Coupe הם הנפוצים. M4 Competition מבוקש מאוד. מחיר גבוה מסדרה 3.',
    global_summary_he: 'סדרה 4 G22 שנויה במחלוקת בגלל הקידמי הגדול אך מוערכת על תחושת הנהיגה. M4 CSL מוגבל היה אחד מרכבי 2022.',
    global_summary_en: 'The G22 4 Series is controversial for its large grille but praised for driving dynamics. The M4 CSL was one of the cars of 2022.',
    local_summary_en: 'In Israel the 420i and 430i Gran Coupe are most popular. M4 Competition is highly sought after.',
    summary_en: 'The BMW 4 Series is a premium coupe with striking design, from the elegant 420i to the track-ready M4 Competition.',
    pros: JSON.stringify(['עיצוב בולט וייחודי','ביצועי נהיגה מצוינים','M4 — ביצועים מדהימים','Gran Coupe — פרקטי ויפה']),
    cons: JSON.stringify(['קידמי שנוי במחלוקת','מחיר גבוה','מקום מוגבל בקופה','iDrive 8 מורכב']),
    pros_en: JSON.stringify(['Bold distinctive design','Excellent driving dynamics','M4 exceptional performance','Gran Coupe practical and beautiful']),
    cons_en: JSON.stringify(['Controversial large grille','High price','Limited coupe space','Complex iDrive 8']),
  }),

  review('bmw','i4', 2024, {
    name_en: 'BMW i4',
    top_score: 8.5, local_score: 8, global_score: 9,
    summary_he: 'i4 הוא הסדאן/גרן קופה החשמלי של BMW — טווח מצוין, ביצועים חזקים ותחושת BMW אמיתית.',
    local_summary_he: 'בישראל i4 eDrive40 ו-M50 נמכרים היטב. טווח של 590 ק״מ ל-eDrive40. טעינה 200kW. מתחרה טסלה Model 3.',
    global_summary_he: 'i4 קיבל ביקורות מצוינות על תחושת הנהיגה הספורטיבית בעולם החשמלי. i4 M50 עם 544 כ״ס — BMWית אמיתית בלי מנוע בנזין.',
    global_summary_en: 'The i4 received excellent reviews for delivering a sporty BMW driving feel in an EV. The i4 M50 with 544hp proves you don\'t need a petrol engine for the true BMW experience.',
    local_summary_en: 'In Israel the i4 eDrive40 and M50 sell well. The eDrive40 offers 590km range and 200kW charging to compete effectively with Tesla Model 3.',
    summary_en: 'The BMW i4 is a premium electric gran coupe offering genuine BMW driving dynamics with up to 590km range.',
    pros: JSON.stringify(['תחושת נהיגה BMW אמיתית','טווח מצוין 590 ק״מ','i4 M50 — ביצועים מדהימים','עיצוב מרשים']),
    cons: JSON.stringify(['מחיר גבוה','תא מטען קטן','משקל כבד','iDrive 8 לא לכולם']),
    pros_en: JSON.stringify(['Genuine BMW driving dynamics','Excellent 590km range','i4 M50 exceptional performance','Striking design']),
    cons_en: JSON.stringify(['High price','Small boot','Heavy weight','iDrive 8 complex']),
  }),

  review('bmw','ix', 2024, {
    name_en: 'BMW iX',
    top_score: 8.7, local_score: 9, global_score: 9,
    summary_he: 'iX הוא ה-SUV החשמלי הפרמיום של BMW — עיצוב מהפכני, פנים מינימליסטי יוקרתי וטווח של עד 630 ק״מ.',
    local_summary_he: 'בישראל iX xDrive40 ו-50 נמכרים. nפנים ה"ספא" הייחודיים וחומרי הגמר הפרמיום מבדילים אותו. iX M60 עם 619 כ״ס.',
    global_summary_he: 'iX סימל את כיוון BMW העתידי — ארכיטקטורת NEUE KLASSE. ביקורות מצוינות על הנוחות, ה-audio אופציונלי (Bowers & Wilkins) ותחושת הנהיגה.',
    global_summary_en: 'The iX signaled BMW\'s future direction with NEUE KLASSE architecture. Excellent reviews for comfort, optional Bowers & Wilkins audio and refined driving feel.',
    local_summary_en: 'In Israel the iX xDrive40 and 50 are popular. The unique spa-like interior and premium materials set it apart. iX M60 offers 619hp.',
    summary_en: 'The BMW iX is a flagship electric SUV with revolutionary design, spa-like interior and up to 630km range.',
    pros: JSON.stringify(['פנים "ספא" ייחודי ומרשים','טווח מצוין 630 ק״מ','iX M60 — 619 כ״ס','חומרי גמר פרמיום']),
    cons: JSON.stringify(['עיצוב חיצוני שנוי במחלוקת','מחיר גבוה מאוד','קידמי גדול','מורכבות מערכות']),
    pros_en: JSON.stringify(['Unique spa-like interior','Excellent 630km range','iX M60 with 619hp','Premium sustainable materials']),
    cons_en: JSON.stringify(['Controversial exterior design','Very high price','Large grille','System complexity']),
  }),

  review('toyota','supra', 2024, {
    name_en: 'Toyota Supra',
    top_score: 8.8, local_score: 9, global_score: 9,
    summary_he: 'GR Supra — החזרת האגדה. מבוסס על BMW Z4, עם מנוע 3.0 טורבו של 340-387 כ״ס. כיף נהיגה טהור.',
    local_summary_he: 'בישראל GR Supra 3.0 Turbo מבוקש מאוד בקרב חובבי ספורט. מחיר גבוה (280K+ ₪) מגביל את הקהל.',
    global_summary_he: 'GR Supra A90 קיבל ביקורות חיוביות על תחושת הנהיגה, אך ביקורת על שיתוף הפעולה עם BMW. 2024 מציג 382 כ״ס. MT אופציונלי מ-2023.',
    global_summary_en: 'The GR Supra A90 receives strong reviews for driving dynamics, though some criticize the BMW partnership. 2024 brings 382hp and a manual transmission option from 2023.',
    local_summary_en: 'In Israel the GR Supra 3.0 Turbo is highly sought by sports car enthusiasts. The high price (280K+ ILS) limits the audience.',
    summary_en: 'The Toyota GR Supra is a reborn legend co-developed with BMW, offering rear-wheel-drive sports car thrills with a powerful turbocharged inline-six.',
    pros: JSON.stringify(['כיף נהיגה טהור','מנוע 6 צילינדר מרהיב','RWD קלאסי','ירושת שם אגדי']),
    cons: JSON.stringify(['יקר מאוד','מנוע BMW — פחות "טויוטה" בתחושה','2 מקומות בלבד','מקום לאחסון מוגבל']),
    pros_en: JSON.stringify(['Pure driving joy','Magnificent straight-six engine','Classic RWD layout','Legendary nameplate']),
    cons_en: JSON.stringify(['Very expensive','BMW engine feels less Toyota','Only 2 seats','Very limited storage']),
  }),

  review('toyota','gr86', 2024, {
    name_en: 'Toyota GR86',
    top_score: 8.5, local_score: 8, global_score: 9,
    summary_he: 'GR86 — קופה ספורטיבי קלאסי עם 2.4 ליטר טבעי 234 כ״ס. קל, זריז, ומהנה לנהיגה — ה"רכב הכיפי" של טויוטה.',
    local_summary_he: 'בישראל GR86 מושך חובבי נהיגה שרוצים כיף טהור בפחות כסף מ-Supra. גרסת MT מועדפת.',
    global_summary_he: 'GR86 (86/BRZ Gen 2) מציג שיפור גדול על הדור הראשון — יותר כח, פחות תת-הגה. Motor Trend Car of the Year 2022.',
    global_summary_en: 'The second-gen GR86 (2022+) brings significant improvements — more power, less understeer. Motor Trend Car of the Year 2022.',
    local_summary_en: 'In Israel the GR86 attracts driving enthusiasts wanting pure fun at lower cost than the Supra. Manual transmission preferred.',
    summary_en: 'The Toyota GR86 is a lightweight naturally-aspirated sports coupe offering pure driving engagement at an accessible price point.',
    pros: JSON.stringify(['קל ומהנה — נהיגה טהורה','מחיר נגיש','מנוע 2.4 טבעי 234 כ״ס','GT86 המתוקן']),
    cons: JSON.stringify(['כח לא מספיק לחלק מהנהגים','פנים פשוטים','2 מקומות בלבד','מד דלק בינוני']),
    pros_en: JSON.stringify(['Lightweight pure driving fun','Accessible price','2.4 NA 234hp engine','Rewarding handling']),
    cons_en: JSON.stringify(['Power insufficient for some','Basic interior','Only 2 seats','Average fuel economy']),
  }),

  review('volkswagen','id5', 2024, {
    name_en: 'Volkswagen ID.5',
    top_score: 7.9, local_score: 8, global_score: 8,
    summary_he: 'ID.5 הוא הגרסה הקופה-סאב של ID.4 — עיצוב אווירודינמי יותר, טווח מעט טוב יותר.',
    local_summary_he: 'בישראל ID.5 GTX עם 299 כ״ס מאוד מבוקש. עיצוב הקופה מושך. טווח 520+ ק״מ. טעינה 135kW.',
    global_summary_he: 'ID.5 GTX ביקורות מצוינות — עיצוב נפלא, ביצועים טובים ו-OTA עדכונים. מתחרה ב-Ioniq 5 ו-Model Y.',
    global_summary_en: 'The ID.5 GTX receives excellent reviews for its coupe design, solid performance and OTA updates. Strong competition for Ioniq 5 and Model Y.',
    local_summary_en: 'In Israel the ID.5 GTX with 299hp is highly popular. The coupe design is attractive with 520+km range and 135kW charging.',
    summary_en: 'The Volkswagen ID.5 is the coupe-SUV variant of the ID.4, offering sportier styling with comparable range and performance.',
    pros: JSON.stringify(['עיצוב קופה אווירודינמי','GTX — ביצועים מצוינים','OTA עדכונים','WLTP 520+ ק״מ']),
    cons: JSON.stringify(['תא מטען קטן יותר מID.4','מחיר גבוה מID.4','ראש מוגבל לנוסעים גבוהים','ממשק מגע בסיסי']),
    pros_en: JSON.stringify(['Attractive coupe-SUV design','GTX excellent performance','OTA software updates','WLTP 520+km range']),
    cons_en: JSON.stringify(['Smaller boot than ID.4','More expensive than ID.4','Limited headroom for tall rear passengers','Basic touch interface']),
  }),

  review('hyundai','ioniq-9', 2025, {
    name_en: 'Hyundai Ioniq 9',
    top_score: 8.8, local_score: 9, global_score: 9,
    summary_he: 'Ioniq 9 הוא ה-SUV החשמלי הגדול של יונדאי — 7 מקומות, טווח 620 ק״מ ועיצוב עתידני מרשים.',
    local_summary_he: 'Ioniq 9 הגיע לישראל ב-2025. ביקושים גבוהים בגרסת Long Range AWD. עיצוב פנים מרהיב עם 3 שורות נוחות.',
    global_summary_he: 'Ioniq 9 — המתחרה הישיר ל-Kia EV9 (פלטפורמה משותפת). 800V מאפשרת טעינה מהירה. המרחב הפנימי גדול יוצא דופן.',
    global_summary_en: 'The Ioniq 9 directly competes with its sibling Kia EV9 on the shared 800V platform. Ultra-fast charging and exceptional interior space define this 7-seater.',
    local_summary_en: 'The Ioniq 9 arrived in Israel in 2025. High demand for Long Range AWD. The tri-row interior is genuinely impressive.',
    summary_en: 'The Hyundai Ioniq 9 is a full-size 7-seat electric SUV with 800V architecture, 620km range and a futuristic interior.',
    pros: JSON.stringify(['7 מקומות נוחים באמת','800V — טעינה 350kW','טווח 620 ק״מ','עיצוב פנים עתידני']),
    cons: JSON.stringify(['מחיר גבוה','גדול לאחסון בישראל','מנוי לחלק מהפיצ\'רים','זמן אספקה ארוך']),
    pros_en: JSON.stringify(['Genuinely comfortable 7 seats','800V ultra-fast 350kW charging','620km range','Futuristic interior design']),
    cons_en: JSON.stringify(['High price','Large size challenging in Israel','Subscription for some features','Long delivery times']),
  }),

  review('hyundai','palisade', 2024, {
    name_en: 'Hyundai Palisade',
    top_score: 8.2, local_score: 8, global_score: 8,
    summary_he: 'Palisade הוא ה-SUV הגדול של יונדאי עם 7-8 מקומות, מנוע V6 או דיזל 2.2 ועיצוב מרשים.',
    local_summary_he: 'בישראל Palisade 2.2 CRDi AWD נפוץ במשפחות גדולות. גרירה 2.5 טון. נוחות גבוהה ושירות מצוין.',
    global_summary_he: 'Palisade מציע ערך מצוין — מרחב, נוחות ושלל טכנולוגיות במחיר נמוך ממתחרים כמו Explorer ו-Telluride.',
    global_summary_en: 'The Palisade offers outstanding value — space, comfort and technology at prices below competitors like the Ford Explorer and Kia Telluride.',
    local_summary_en: 'In Israel the Palisade 2.2 CRDi AWD is popular with large families. 2.5-ton towing capacity and excellent service network.',
    summary_en: 'The Hyundai Palisade is a full-size family SUV offering 7-8 seats, strong diesel powertrain and competitive pricing.',
    pros: JSON.stringify(['7-8 מקומות נוחים','גרירה 2.5 טון','ערך מצוין למחיר','שירות יונדאי מצוין']),
    cons: JSON.stringify(['פנים לא הכי יוקרתי','דיזל — עלויות שירות','גדול לחניות','V6 בנזין צורך הרבה']),
    pros_en: JSON.stringify(['Comfortable 7-8 seats','2.5-ton towing','Outstanding value for money','Excellent Hyundai service']),
    cons_en: JSON.stringify(['Interior not most luxurious','Diesel servicing costs','Large for urban parking','V6 petrol thirsty']),
  }),

  review('chevrolet','corvette', 2024, {
    name_en: 'Chevrolet Corvette',
    top_score: 9.3, local_score: 9, global_score: 9,
    summary_he: 'קורבט C8 — מהפכה! מנוע אמצעי 6.2 ליטר LT2 V8 495 כ״ס. ביצועים של סופרקאר במחיר מדהים.',
    local_summary_he: 'בישראל קורבט C8 Stingray הוא חלום ילדות. פחות מ-400K ₪ לרכב עם 0-100 ב-2.9 שניות. Z06 עם 670 כ״ס.',
    global_summary_he: 'C8 שינה את כל מה שחשבנו על קורבט. Mid-engine לראשונה בתולדות הסדרה. Car and Driver 10 Best 2024. Z06 עם מנוע פלאט-קריינק 670 כ״ס.',
    global_summary_en: 'The C8 revolutionized the Corvette with its first-ever mid-engine layout. Car and Driver 10 Best 2024. The Z06 flat-plane V8 with 670hp is a technical marvel.',
    local_summary_en: 'In Israel the C8 Stingray is a childhood dream at under 400K ILS with 0-100 in 2.9 seconds. Z06 offers 670hp.',
    summary_en: 'The Chevrolet Corvette C8 brings mid-engine supercar performance to an accessible price point, with the Z06 offering 670hp flat-plane V8.',
    pros: JSON.stringify(['ביצועים של סופרקאר','מחיר תחרותי ביחס לביצועים','עיצוב מרהיב','C8 Z06 — אחד הרכבים הטובים בעולם']),
    cons: JSON.stringify(['מקום לאחסון מוגבל','2 מקומות בלבד','אמינות — שיפור מהדורות קודמות','שירות מוגבל בישראל']),
    pros_en: JSON.stringify(['Supercar performance at accessible price','Stunning design','Z06 — one of the world\'s best driver\'s cars','Mid-engine balance']),
    cons_en: JSON.stringify(['Very limited storage','Only 2 seats','Reliability improving from previous generations','Limited Israel service network']),
  }),

  review('kia','ev3', 2025, {
    name_en: 'Kia EV3',
    top_score: 8.4, local_score: 8, global_score: 9,
    summary_he: 'EV3 הוא ה-SUV החשמלי הקטן של קיה — טווח מדהים של 600 ק״מ במחיר נגיש יחסית.',
    local_summary_he: 'EV3 מגיע לישראל ב-2025. טווח 600 ק״מ ומחיר תחרותי הופכים אותו לאחד האטרקטיביים בקטגוריה.',
    global_summary_he: 'EV3 עם סוללה 81.4kWh ו-600 ק״מ WLTP הוא אחד הטווחים הגבוהים בקטגוריה. 800V חלקי ל-100kW.',
    global_summary_en: 'The EV3 with 81.4kWh battery and 600km WLTP range has one of the longest ranges in its class. 800V architecture supports 100kW charging.',
    local_summary_en: 'The EV3 arrives in Israel in 2025 with 600km range and competitive pricing making it one of the most attractive in its class.',
    summary_en: 'The Kia EV3 is a compact electric SUV with class-leading 600km range and affordable pricing on the 800V platform.',
    pros: JSON.stringify(['טווח 600 ק״מ — מוביל בקטגוריה','מחיר נגיש','800V ארכיטקטורה','עיצוב מרשים']),
    cons: JSON.stringify(['טעינה מהירה 100kW (לא 350kW)','מקום מוגבל','גרסאות מוגבלות בהשקה','זמן אספקה ארוך']),
    pros_en: JSON.stringify(['Class-leading 600km range','Affordable price','800V architecture','Impressive design']),
    cons_en: JSON.stringify(['Only 100kW fast charging','Limited space','Limited trim availability at launch','Long delivery times']),
  }),

  review('geely','monjaro', 2024, {
    name_en: 'Geely Monjaro',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'מונחארו — ה-SUV הפרמיום של ג\'ילי. מנוע 2.0T 238 כ״ס, פנים איכותיים ומחיר תחרותי ביחס למתחרים אירופאים.',
    local_summary_he: 'בישראל מונחארו 2.0T AWD מגיע עם ציוד עשיר. עיצוב פנים מרשים, מסכים גדולים ומערכת בטיחות מלאה.',
    global_summary_he: 'מונחארו (Lynk & Co 09 בסין) מקבל ביקורות חיוביות על ערך, איכות ועיצוב. פלטפורמת CMA משותפת עם Volvo.',
    global_summary_en: 'The Monjaro (sold as Lynk & Co 09 in China) receives positive reviews for value, quality and design. Shares the CMA platform with Volvo.',
    local_summary_en: 'In Israel the Monjaro 2.0T AWD comes with rich standard equipment, impressive interior screens and comprehensive safety.',
    summary_en: 'The Geely Monjaro is a premium Chinese SUV on Volvo\'s CMA platform offering European-quality engineering with competitive pricing.',
    pros: JSON.stringify(['פנים פרמיום','מחיר תחרותי','AWD עם 238 כ״ס','פלטפורמת Volvo CMA']),
    cons: JSON.stringify(['מותג פחות מוכר בישראל','שירות מוגבל','אמינות לטווח ארוך לא מוכחת','ערך שימור נמוך']),
    pros_en: JSON.stringify(['Premium interior','Competitive pricing','AWD with 238hp','Volvo CMA platform']),
    cons_en: JSON.stringify(['Lesser known brand in Israel','Limited service network','Long-term reliability unproven','Lower resale value']),
  }),

  review('mini','cooper', 2024, {
    name_en: 'Mini Cooper',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'Mini Cooper — האייקון הבריטי שחזר לחיים. עיצוב קלאסי מודרני, נהיגה ספורטיבית ואפשרות חשמלית.',
    local_summary_he: 'בישראל Mini Cooper S ו-JCW פופולריים. עיצוב מושך, נהיגה כיפית אבל מקום מוגבל. שירות BMW מצוין.',
    global_summary_he: 'Mini Cooper F56 Gen 3 (2024) עם עיצוב חדש ומנועי JCW. גרסת SE חשמלית עם 204 כ״ס ו-240 ק״מ.',
    global_summary_en: 'The F56 Gen 3 Mini (2024) features fresh styling and new JCW engines. The SE electric variant offers 204hp and 240km range.',
    local_summary_en: 'In Israel the Cooper S and JCW are popular. Attractive design and fun driving but limited space. Excellent BMW service network.',
    summary_en: 'The Mini Cooper is an iconic premium hatchback combining retro British style with modern technology and fun driving dynamics.',
    pros: JSON.stringify(['עיצוב אייקוני ומושך','נהיגה ספורטיבית וכיפית','JCW — ביצועים מרשימים','שירות BMW מצוין']),
    cons: JSON.stringify(['מקום מאוד מוגבל','מחיר גבוה לגודל','מד דלק גבוה ב-JCW','מגוון אופציות מבלבל']),
    pros_en: JSON.stringify(['Iconic attractive design','Fun sporty driving','JCW impressive performance','BMW service quality']),
    cons_en: JSON.stringify(['Very limited interior space','High price for size','JCW thirsty','Confusing options list']),
  }),

  review('mini','countryman', 2024, {
    name_en: 'Mini Countryman',
    top_score: 7.8, local_score: 8, global_score: 8,
    summary_he: 'Countryman הוא ה-SUV הגדול של Mini — יותר מקום, אפשרות JCW ו-PHEV עם 300 כ״ס.',
    local_summary_he: 'בישראל Countryman Cooper S ו-ALL4 פופולריים. מתאים למשפחות קטנות שרוצות את סגנון Mini עם יותר מקום.',
    global_summary_he: 'Countryman 2024 עמד על פלטפורמת UKL2 משותפת עם BMW X1. JCW ALL4 עם 300 כ״ס — ה-Mini החזק ביותר.',
    global_summary_en: 'The 2024 Countryman on BMW UKL2 platform shared with X1. JCW ALL4 with 300hp is the most powerful Mini ever.',
    local_summary_en: 'In Israel the Cooper S and ALL4 are popular. Suits small families wanting Mini style with more practical space.',
    summary_en: 'The Mini Countryman is a premium compact SUV based on BMW\'s UKL2 platform with Mini\'s distinctive styling and optional JCW performance.',
    pros: JSON.stringify(['יותר מקום מ-Cooper','JCW ALL4 — 300 כ״ס','PHEV יעיל','עיצוב Mini מובהק']),
    cons: JSON.stringify(['מחיר גבוה','קטן מ-BMW X1','שאין לא הכי אמין','כי עם JCW — צריכה גבוהה']),
    pros_en: JSON.stringify(['More space than Cooper','JCW ALL4 with 300hp','Efficient PHEV option','Distinctive Mini styling']),
    cons_en: JSON.stringify(['High price','Smaller than BMW X1','Some reliability concerns','JCW high fuel consumption']),
  }),

  review('genesis','gv70', 2024, {
    name_en: 'Genesis GV70',
    top_score: 8.8, local_score: 9, global_score: 9,
    summary_he: 'GV70 הוא ה-SUV הבינוני של Genesis — עיצוב מרהיב, פנים יוקרתיים ושלל מנועים כולל 2.5T ו-3.5T Twin Turbo.',
    local_summary_he: 'בישראל GV70 2.5T AWD ו-3.5T Sport מבוקשים מאוד. עיצוב ייחודי ואיכות פנים מפתיעה ביחס למחיר.',
    global_summary_he: 'GV70 קיבל פרסי עיצוב רבים. Electrified GV70 עם 483 כ״ס ו-400V. Car and Driver — Best Luxury SUV.',
    global_summary_en: 'The GV70 won numerous design awards. The Electrified GV70 offers 483hp on 400V. Named Car and Driver Best Luxury SUV.',
    local_summary_en: 'In Israel the GV70 2.5T AWD and 3.5T Sport are highly sought. Distinctive design and surprising interior quality for the price.',
    summary_en: 'The Genesis GV70 is a premium mid-size SUV with award-winning design, luxury interior and strong powertrain options including an electric variant.',
    pros: JSON.stringify(['עיצוב פרס-זוכה','פנים יוקרתיים מפתיע','3.5T Twin Turbo — 380 כ״ס','ערך מצוין ביחס ל-BMW X3']),
    cons: JSON.stringify(['רשת שירות מצומצמת','ערך שימור לא מוכח','אינפוטיינמנט מעט מסורבל','Genesis פחות מוכר']),
    pros_en: JSON.stringify(['Award-winning design','Surprisingly luxurious interior','3.5T Twin Turbo with 380hp','Excellent value vs BMW X3']),
    cons_en: JSON.stringify(['Limited service network','Unproven resale value','Slightly cumbersome infotainment','Genesis less established']),
  }),

  review('polestar','polestar-2', 2024, {
    name_en: 'Polestar 2',
    top_score: 8.3, local_score: 8, global_score: 8,
    summary_he: 'Polestar 2 — הסדאן/פאסטבק החשמלי הסקנדינבי. עיצוב נקי, Android Automotive מובנה וביצועים מרשימים.',
    local_summary_he: 'בישראל Polestar 2 Standard Range ו-Long Range AWD נמכרים. Android Automotive — נוחות שימוש מעולה. ערך ירד עם הזמן.',
    global_summary_he: 'Polestar 2 מציע Android Automotive כ-OS מובנה (Google Maps, Play Store). Dual Motor עם 476 כ״ס. WLTP 635 ק״מ ב-LR Single Motor.',
    global_summary_en: 'The Polestar 2 offers built-in Android Automotive OS with Google Maps and Play Store. Dual Motor delivers 476hp. LR Single Motor reaches 635km WLTP.',
    local_summary_en: 'In Israel the Standard Range and Long Range AWD are available. Built-in Android Automotive is excellent. Resale values have declined over time.',
    summary_en: 'The Polestar 2 is a Scandinavian electric fastback with built-in Android Automotive, clean design and strong dual-motor performance.',
    pros: JSON.stringify(['Android Automotive מובנה','עיצוב סקנדינבי נקי','Dual Motor — 476 כ״ס','LR — 635 ק״מ']),
    cons: JSON.stringify(['ערך שימור ירד','מחיר גבוה','פנים מינימליסטי מדי','שירות מוגבל']),
    pros_en: JSON.stringify(['Built-in Android Automotive','Clean Scandinavian design','Dual Motor 476hp','LR 635km WLTP']),
    cons_en: JSON.stringify(['Declining resale values','High price','Minimalist interior too sparse for some','Limited service']),
  }),

  review('lamborghini','urus', 2024, {
    name_en: 'Lamborghini Urus',
    top_score: 9.2, local_score: 9, global_score: 9,
    summary_he: 'Urus — ה-SUV הספורטיבי ביותר בעולם. V8 4.0 ליטר ביטורבו 666 כ״ס. 0-100 ב-3.3 שניות. גורמת למבטים בכל מקום.',
    local_summary_he: 'בישראל Urus הוא רכב הפסגה של עשירים. מחיר 1.5M+ ₪. ביצועי שטח מפתיעים. כמה שנמכרות בשנה.',
    global_summary_he: 'Urus S (2023) עם 666 כ״ס הוא הגרסה הנוכחית. Urus Performante 657 כ״ס ומוקדת יותר לספורט. Best-selling Lamborghini ever.',
    global_summary_en: 'The Urus S (2023) with 666hp is the current variant. Urus Performante with 657hp is more track-focused. Best-selling Lamborghini in history.',
    local_summary_en: 'In Israel the Urus is the ultimate status symbol at 1.5M+ ILS. Surprising off-road capability alongside supercar performance.',
    summary_en: 'The Lamborghini Urus is the world\'s most powerful production SUV with 666hp V8, 0-100 in 3.3 seconds and full Lamborghini drama.',
    pros: JSON.stringify(['666 כ״ס — ה-SUV החזק בעולם','0-100 ב-3.3 שניות','עיצוב למבורגיני מוחלט','יכולות שטח מפתיעות']),
    cons: JSON.stringify(['מחיר עצום','עלות תחזוקה אסטרונומית','צריכת דלק גבוהה מאוד','מושך יותר מדי תשומת לב']),
    pros_en: JSON.stringify(['666hp most powerful production SUV','0-100 in 3.3 seconds','Full Lamborghini character','Surprising off-road capability']),
    cons_en: JSON.stringify(['Enormous purchase price','Astronomical running costs','Very high fuel consumption','Excessive attention attraction']),
  }),

  review('infiniti','q50', 2024, {
    name_en: 'Infiniti Q50',
    top_score: 7.5, local_score: 7, global_score: 8,
    summary_he: 'Q50 הוא הסדאן הספורטיבי של אינפיניטי — מתחרה ל-BMW 3 Series ו-Audi A4 עם מנוע 3.0 ביטורבו ייחודי.',
    local_summary_he: 'בישראל Q50 Red Sport 400 מוגבל מאוד. Q50 3.0t הנפוץ מציע ערך טוב. שירות מצוין דרך נסיבה.',
    global_summary_he: 'Q50 עם הגה-by-wire ייחודי (Direct Adaptive Steering) ומנוע 3.0t VR30DDTT ב-300/400 כ״ס. עיצוב פנים מעט מיושן.',
    global_summary_en: 'The Q50 features unique Direct Adaptive Steering and the excellent 3.0t VR30DDTT engine in 300/400hp. Interior design shows its age.',
    local_summary_en: 'In Israel the Q50 3.0t provides good value. Excellent service through the Nissan network. Red Sport 400 limited availability.',
    summary_en: 'The Infiniti Q50 is a rear-wheel-drive sports sedan with a twin-turbocharged V6 and unique steer-by-wire technology.',
    pros: JSON.stringify(['VR30DDTT — מנוע V6 מצוין','RWD — נהיגה ספורטיבית','Red Sport 400 — 400 כ״ס','שירות מצוין']),
    cons: JSON.stringify(['עיצוב פנים מיושן','הגה-by-wire — חוסר תחושה','LocateCompetitors מתקדמים יותר','ערך שימור ירד']),
    pros_en: JSON.stringify(['Excellent VR30DDTT twin-turbo V6','RWD sporty character','Red Sport 400 with 400hp','Good service network']),
    cons_en: JSON.stringify(['Ageing interior design','Steer-by-wire lacks feel','Rivals more technologically advanced','Declining resale values']),
  }),

  review('haval','jolion', 2024, {
    name_en: 'Haval Jolion',
    top_score: 7.5, local_score: 7, global_score: 8,
    summary_he: 'Jolion הוא ה-SUV הקומפקטי של האוול — ערך מצוין, עיצוב מודרני ומערכת היברידית יעילה.',
    local_summary_he: 'בישראל Jolion HEV נמכר כ"המציאה של הסגמנט". ציוד עשיר, מחיר נגיש. שירות Great Wall Motors Israel.',
    global_summary_he: 'Jolion HEV עם 192 כ״ס ותצרוכת 5.5L/100 מקבלת ציונים גבוהים בסין, אוסטרליה ועדיין מרחיבה לאירופה.',
    global_summary_en: 'The Jolion HEV with 192hp and 5.5L/100km fuel economy earns high marks in China and Australia as it expands globally.',
    local_summary_en: 'In Israel the Jolion HEV is marketed as the segment bargain. Rich standard equipment at accessible price through Great Wall Motors Israel.',
    summary_en: 'The Haval Jolion is a compact SUV offering generous standard equipment, hybrid powertrain and modern design at competitive pricing.',
    pros: JSON.stringify(['מחיר נגיש','ציוד עשיר','HEV יעיל','עיצוב מודרני']),
    cons: JSON.stringify(['מותג פחות מוכר','שירות מצומצם','אמינות ארוכת-טווח לא מוכחת','ערך שימור נמוך']),
    pros_en: JSON.stringify(['Competitive price','Generous standard equipment','Efficient HEV','Modern design']),
    cons_en: JSON.stringify(['Less established brand','Limited service','Long-term reliability unproven','Low resale value']),
  }),

  review('isuzu','d-max', 2024, {
    name_en: 'Isuzu D-Max',
    top_score: 8.0, local_score: 8, global_score: 8,
    summary_he: 'D-Max הוא פיקאפ ה-4x4 הסמכותי של איסוזו — מנוע דיזל 3.0L 190 כ״ס, גרירה 3.5 טון ואמינות מוכחת.',
    local_summary_he: 'בישראל D-Max 4x4 Double Cab נפוץ בחקלאות, בנייה ופנאי. שירות סמלי בישראל. תחרות עם Ranger ו-Hilux.',
    global_summary_he: 'D-Max Gen 3 (2020+) עם מנוע 4JJ3-TCX 190 כ״ס. 5 כוכבי ANCAP. פיקאפ מהמוכרים בעולם.',
    global_summary_en: 'The third-gen D-Max (2020+) with 4JJ3-TCX 190hp engine. 5-star ANCAP safety. One of the world\'s best-selling pickups.',
    local_summary_en: 'In Israel the D-Max 4x4 Double Cab is used in agriculture, construction and leisure. Competes with Ranger and Hilux.',
    summary_en: 'The Isuzu D-Max is a proven commercial pickup with a reliable diesel engine, impressive towing and 5-star safety rating.',
    pros: JSON.stringify(['אמינות מוכחת','גרירה 3.5 טון','5 כוכבי ANCAP','מנוע דיזל 3.0L חזק']),
    cons: JSON.stringify(['נוחות פחות מפיקאפ עירוני','כביש מהיר — פחות יציב מ-SUV','אינפוטיינמנט בסיסי','שירות מצומצם']),
    pros_en: JSON.stringify(['Proven reliability','3.5-ton towing capacity','5-star ANCAP safety','Strong 3.0L diesel']),
    cons_en: JSON.stringify(['Less comfortable than lifestyle pickups','Highway less stable than SUV','Basic infotainment','Limited dealer network']),
  }),

  review('ssangyong','tivoli', 2024, {
    name_en: 'SsangYong Tivoli',
    top_score: 7.2, local_score: 7, global_score: 7,
    summary_he: 'Tivoli הוא ה-SUV הקומפקטי הקוריאני של SsangYong — ערך טוב, ציוד סביר ומחיר נגיש.',
    local_summary_he: 'בישראל Tivoli פחות נפוץ. SsangYong שינה שם ל-KGM. שירות מוגבל. מתאים לתקציב מצומצם.',
    global_summary_he: 'Tivoli עם 1.5 GDI ו-1.6D. e-XLV — הגרסה המוארכת עם 7 מקומות. המותג נמכר ב-2022 ל-Edison.',
    global_summary_en: 'The Tivoli with 1.5 GDI and 1.6D. e-XLV is the 7-seat extended version. The brand was sold to Edison in 2022 and rebranded KGM.',
    local_summary_en: 'In Israel the Tivoli has limited presence. SsangYong rebranded as KGM. Limited service. Suitable for tight budgets.',
    summary_en: 'The SsangYong Tivoli is a budget-oriented compact SUV offering reasonable equipment at competitive pricing.',
    pros: JSON.stringify(['מחיר נגיש','ציוד סביר','e-XLV עם 7 מקומות','נהיגה נינוחה']),
    cons: JSON.stringify(['מותג פחות מוכר','שירות מוגבל','אמינות שאלה','ערך שימור נמוך']),
    pros_en: JSON.stringify(['Affordable price','Reasonable equipment','e-XLV 7-seat option','Comfortable ride']),
    cons_en: JSON.stringify(['Less established brand','Limited service','Reliability questions','Low resale value']),
  }),
];

// Remove the accidental duplicate placeholder entry
const FINAL_REVIEWS = REVIEWS.filter(r => r.name_en !== 'dummy');

console.log('\n=== Inserting reviews ===');
for (const r of FINAL_REVIEWS) {
  const sql = `INSERT OR IGNORE INTO expert_reviews (id,make_slug,model_slug,year,source_name,source_url,original_title,summary_he,local_summary_he,global_summary_he,local_score,global_score,top_score,pros,cons,local_post_count,global_post_count,scraped_at,pros_en,cons_en,local_summary_en,global_summary_en,summary_en) VALUES (${sq(r.id)},${sq(r.make_slug)},${sq(r.model_slug)},${yn(r.year)},${sq(r.source_name)},${sq(r.source_url)},${sq(r.original_title)},${sq(r.summary_he)},${sq(r.local_summary_he)},${sq(r.global_summary_he)},${yn(r.local_score)},${yn(r.global_score)},${yn(r.top_score)},${sq(r.pros)},${sq(r.cons)},${yn(r.local_post_count)},${yn(r.global_post_count)},${sq(r.scraped_at)},${sq(r.pros_en)},${sq(r.cons_en)},${sq(r.local_summary_en)},${sq(r.global_summary_en)},${sq(r.summary_en)})`;
  W(sql);
}
console.log(' done');

console.log('\n=== All done! ===');
console.log(`Makes: ${NEW_MAKES.length}, Models: ${NEW_MODELS.length}, Reviews: ${FINAL_REVIEWS.length}`);
