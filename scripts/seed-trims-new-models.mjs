/**
 * Seeds car_trims for all new models directly into D1.
 * Uses Claude's own knowledge of specs.
 * Run: node scripts/seed-trims-new-models.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

function d1Exec(sql) {
  const tmp = join(tmpdir(), `trims_${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(
      `bash -c 'source "$HOME/.nvm/nvm.sh" && nvm use 22 --silent && npx wrangler d1 execute DB --config wrangler.toml --remote --file "${tmp}" 2>&1'`,
      { stdio: 'pipe', cwd: '/workspace/car-issues-il' }
    );
    return true;
  } catch (e) {
    console.error('D1 error:', e.stdout?.toString().slice(0, 300));
    return false;
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

const sq = (s) => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const yn = (n) => n == null ? 'NULL' : String(n);

// Feature sets
const B = ['aeb','lane_keep','rear_camera','parking_sensors','led_lights','push_start','apple_carplay'];
const M = [...B,'adaptive_cruise','blind_spot','traffic_sign','wireless_carplay','wireless_charging','heated_seats_front','keyless_entry','digital_cluster'];
const T = [...M,'camera_360','ventilated_seats','heated_seats_rear','electric_seats','memory_seats','panoramic_roof','ambient_lighting','premium_audio','hud','auto_lights','heated_steering'];

function trim(make_slug, model_slug, name, year, opts) {
  return {
    id: randomUUID(),
    make_slug,
    model_slug,
    name,
    model_year: year,
    engine_type: opts.engine_type ?? 'gasoline',
    engine_cc: opts.engine_cc ?? null,
    engine_hp: opts.engine_hp ?? null,
    transmission: opts.transmission ?? 'automatic',
    drive: opts.drive ?? 'fwd',
    seats: opts.seats ?? 'leatherette',
    seat_count: opts.seat_count ?? 5,
    screen_size: opts.screen_size ?? 10,
    features: JSON.stringify(opts.features ?? M),
    price_ils: opts.price_ils ?? null,
    is_israel: 1,
    sort_order: opts.sort_order ?? 0,
    acceleration_0_100: opts.acc ?? null,
    top_speed_kmh: opts.top ?? null,
    torque_nm: opts.torque ?? null,
    fuel_consumption: opts.fuel ?? null,
    cargo_liters: opts.cargo ?? null,
    curb_weight_kg: opts.weight ?? null,
  };
}

const TRIMS = [
  // ── Mini Cooper ──
  trim('mini','cooper','One',2024,{engine_cc:1499,engine_hp:102,transmission:'manual',seats:'fabric',screen_size:8.8,features:B,price_ils:129000,acc:10.8,top:188,torque:190,fuel:5.8,sort_order:0}),
  trim('mini','cooper','Cooper',2024,{engine_cc:1499,engine_hp:136,seats:'fabric',screen_size:8.8,features:B,price_ils:149000,acc:8.4,top:210,torque:220,fuel:5.5,sort_order:1}),
  trim('mini','cooper','Cooper S',2024,{engine_cc:1998,engine_hp:178,seats:'leatherette',screen_size:8.8,features:M,price_ils:179000,acc:6.9,top:240,torque:280,fuel:6.4,sort_order:2}),
  trim('mini','cooper','John Cooper Works',2024,{engine_cc:1998,engine_hp:231,seats:'leatherette',screen_size:8.8,features:T,price_ils:229000,acc:6.1,top:250,torque:320,fuel:7.2,sort_order:3}),

  // ── Mini Countryman ──
  trim('mini','countryman','Cooper',2024,{engine_cc:1499,engine_hp:136,drive:'fwd',seats:'fabric',screen_size:9.0,features:B,price_ils:169000,acc:9.5,top:210,torque:220,fuel:6.2,sort_order:0}),
  trim('mini','countryman','Cooper S',2024,{engine_cc:1998,engine_hp:178,drive:'fwd',seats:'leatherette',screen_size:9.0,features:M,price_ils:199000,acc:7.7,top:240,torque:280,fuel:6.8,sort_order:1}),
  trim('mini','countryman','Cooper S ALL4',2024,{engine_cc:1998,engine_hp:178,drive:'awd',seats:'leatherette',screen_size:9.0,features:M,price_ils:219000,acc:7.4,top:237,torque:280,fuel:7.2,sort_order:2}),
  trim('mini','countryman','JCW ALL4',2024,{engine_cc:1998,engine_hp:300,drive:'awd',seats:'leather',screen_size:9.0,features:T,price_ils:279000,acc:5.4,top:250,torque:450,fuel:7.9,sort_order:3}),

  // ── Citroën C3 ──
  trim('citroen','c3','Feel',2024,{engine_cc:1199,engine_hp:83,transmission:'manual',seats:'fabric',screen_size:7,features:B,price_ils:99000,acc:12.5,top:171,torque:118,fuel:5.5,sort_order:0}),
  trim('citroen','c3','Shine',2024,{engine_cc:1199,engine_hp:110,seats:'fabric',screen_size:10,features:M,price_ils:119000,acc:9.9,top:195,torque:205,fuel:5.8,sort_order:1}),

  // ── Citroën C4 ──
  trim('citroen','c4','Feel',2024,{engine_cc:1199,engine_hp:130,seats:'fabric',screen_size:10,features:M,price_ils:139000,acc:9.5,top:205,torque:230,fuel:5.9,sort_order:0}),
  trim('citroen','c4','Shine',2024,{engine_cc:1199,engine_hp:130,seats:'leatherette',screen_size:10,features:M,price_ils:159000,acc:9.5,top:205,torque:230,fuel:5.9,sort_order:1}),

  // ── Infiniti Q50 ──
  trim('infiniti','q50','Q50 2.0t RWD',2024,{engine_cc:1991,engine_hp:208,drive:'rwd',seats:'leather',screen_size:8,features:M,price_ils:199000,acc:6.9,top:220,torque:350,fuel:8.5,sort_order:0}),
  trim('infiniti','q50','Q50 3.0t AWD',2024,{engine_cc:2997,engine_hp:300,drive:'awd',seats:'leather',screen_size:8,features:T,price_ils:249000,acc:5.5,top:250,torque:400,fuel:9.8,sort_order:1}),
  trim('infiniti','q50','Red Sport 400 AWD',2024,{engine_cc:2997,engine_hp:400,drive:'awd',seats:'leather',screen_size:8,features:T,price_ils:299000,acc:4.5,top:270,torque:475,fuel:11.2,sort_order:2}),

  // ── Infiniti QX60 ──
  trim('infiniti','qx60','Pure FWD',2024,{engine_cc:3498,engine_hp:295,drive:'fwd',seat_count:7,seats:'leather',screen_size:12.3,features:M,price_ils:289000,acc:7.4,top:210,torque:350,fuel:11.5,sort_order:0}),
  trim('infiniti','qx60','Luxe AWD',2024,{engine_cc:3498,engine_hp:295,drive:'awd',seat_count:7,seats:'leather',screen_size:12.3,features:T,price_ils:339000,acc:7.1,top:210,torque:350,fuel:12.2,sort_order:1}),

  // ── Genesis G80 ──
  trim('genesis','g80','2.5T RWD',2024,{engine_cc:2497,engine_hp:304,drive:'rwd',seats:'leather',screen_size:14.5,features:M,price_ils:279000,acc:6.0,top:250,torque:422,fuel:9.5,sort_order:0}),
  trim('genesis','g80','2.5T AWD',2024,{engine_cc:2497,engine_hp:304,drive:'awd',seats:'leather',screen_size:14.5,features:T,price_ils:309000,acc:5.8,top:250,torque:422,fuel:10.1,sort_order:1}),
  trim('genesis','g80','3.5T AWD',2024,{engine_cc:3470,engine_hp:380,drive:'awd',seats:'leather',screen_size:14.5,features:T,price_ils:379000,acc:4.9,top:270,torque:530,fuel:12.1,sort_order:2}),

  // ── Genesis GV70 ──
  trim('genesis','gv70','2.5T FWD',2024,{engine_cc:2497,engine_hp:300,drive:'fwd',seats:'leather',screen_size:14.5,features:M,price_ils:269000,acc:6.0,top:245,torque:422,fuel:9.5,sort_order:0}),
  trim('genesis','gv70','2.5T AWD',2024,{engine_cc:2497,engine_hp:300,drive:'awd',seats:'leather',screen_size:14.5,features:M,price_ils:299000,acc:5.8,top:245,torque:422,fuel:10.1,sort_order:1}),
  trim('genesis','gv70','3.5T AWD Sport',2024,{engine_cc:3470,engine_hp:380,drive:'awd',seats:'leather',screen_size:14.5,features:T,price_ils:369000,acc:4.5,top:270,torque:530,fuel:12.5,sort_order:2}),

  // ── Polestar 2 ──
  trim('polestar','polestar-2','Standard Range RWD',2024,{engine_type:'electric',engine_hp:299,drive:'rwd',seats:'vegan',screen_size:11.15,features:T,price_ils:219000,acc:6.4,top:205,torque:490,sort_order:0}),
  trim('polestar','polestar-2','Long Range Single Motor RWD',2024,{engine_type:'electric',engine_hp:299,drive:'rwd',seats:'vegan',screen_size:11.15,features:T,price_ils:249000,acc:6.4,top:205,torque:490,sort_order:1}),
  trim('polestar','polestar-2','Long Range Dual Motor AWD',2024,{engine_type:'electric',engine_hp:476,drive:'awd',seats:'vegan',screen_size:11.15,features:T,price_ils:289000,acc:4.5,top:205,torque:740,sort_order:2}),

  // ── Lamborghini Urus ──
  trim('lamborghini','urus','Urus S',2024,{engine_cc:3996,engine_hp:666,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:1500000,acc:3.5,top:306,torque:850,fuel:15.0,weight:2197,sort_order:0}),
  trim('lamborghini','urus','Urus Performante',2024,{engine_cc:3996,engine_hp:657,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:1800000,acc:3.3,top:306,torque:850,fuel:14.0,weight:2150,sort_order:1}),

  // ── Lamborghini Huracán ──
  trim('lamborghini','huracan','Huracán EVO RWD',2024,{engine_cc:5204,engine_hp:610,drive:'rwd',seat_count:2,seats:'leather',screen_size:8.4,features:T,price_ils:1200000,acc:3.3,top:325,torque:600,fuel:13.5,weight:1422,sort_order:0}),
  trim('lamborghini','huracan','Huracán EVO',2024,{engine_cc:5204,engine_hp:640,drive:'awd',seat_count:2,seats:'leather',screen_size:8.4,features:T,price_ils:1400000,acc:2.9,top:325,torque:600,fuel:14.0,weight:1540,sort_order:1}),

  // ── Haval Jolion ──
  trim('haval','jolion','Comfort DCT',2024,{engine_cc:1499,engine_hp:150,seats:'fabric',screen_size:10.25,features:B,price_ils:119000,acc:9.5,top:195,torque:220,fuel:7.2,sort_order:0}),
  trim('haval','jolion','HEV',2024,{engine_type:'hybrid',engine_cc:1498,engine_hp:192,seats:'leatherette',screen_size:10.25,features:M,price_ils:139000,acc:8.0,top:185,torque:375,fuel:5.5,sort_order:1}),

  // ── Haval H6 ──
  trim('haval','h6','2.0T Comfort',2024,{engine_cc:1999,engine_hp:204,seats:'leatherette',screen_size:12.3,features:M,price_ils:149000,acc:8.0,top:210,torque:320,fuel:8.2,sort_order:0}),
  trim('haval','h6','HEV Premium',2024,{engine_type:'hybrid',engine_cc:1498,engine_hp:243,seats:'leather',screen_size:12.3,features:T,price_ils:179000,acc:6.5,top:200,torque:530,fuel:5.9,sort_order:1}),

  // ── Isuzu D-Max ──
  trim('isuzu','d-max','2.5L Space Cab',2024,{engine_type:'diesel',engine_cc:2499,engine_hp:163,transmission:'manual',drive:'rwd',seat_count:5,seats:'fabric',screen_size:9,features:B,price_ils:139000,acc:12.5,top:170,torque:400,fuel:8.5,cargo:850,sort_order:0}),
  trim('isuzu','d-max','3.0 DDi Double Cab 4x4',2024,{engine_type:'diesel',engine_cc:2999,engine_hp:190,drive:'awd',seat_count:5,seats:'fabric',screen_size:9,features:M,price_ils:179000,acc:11.0,top:175,torque:450,fuel:9.5,cargo:790,sort_order:1}),

  // ── Isuzu MU-X ──
  trim('isuzu','mu-x','1.9 DDTi 4x2',2024,{engine_type:'diesel',engine_cc:1898,engine_hp:163,drive:'fwd',seat_count:7,seats:'leatherette',screen_size:9,features:M,price_ils:189000,acc:12.0,top:185,torque:360,fuel:7.5,sort_order:0}),
  trim('isuzu','mu-x','3.0 DDTi 4x4',2024,{engine_type:'diesel',engine_cc:2999,engine_hp:190,drive:'awd',seat_count:7,seats:'leather',screen_size:9,features:T,price_ils:229000,acc:11.0,top:185,torque:450,fuel:9.0,sort_order:1}),

  // ── Mercedes G-Class ──
  trim('mercedes','g-class','G400d',2024,{engine_type:'diesel',engine_cc:2925,engine_hp:330,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:799000,acc:6.0,top:210,torque:700,fuel:12.5,weight:2560,sort_order:0}),
  trim('mercedes','g-class','G500',2024,{engine_cc:3982,engine_hp:422,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:999000,acc:5.9,top:210,torque:610,fuel:14.2,weight:2560,sort_order:1}),
  trim('mercedes','g-class','G63 AMG',2024,{engine_cc:3982,engine_hp:585,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:1400000,acc:4.5,top:220,torque:850,fuel:16.0,weight:2560,sort_order:2}),

  // ── Mercedes GLE ──
  trim('mercedes','gle','GLE 300d 4MATIC',2024,{engine_type:'diesel',engine_cc:2925,engine_hp:272,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:399000,acc:7.0,top:240,torque:600,fuel:7.5,sort_order:0}),
  trim('mercedes','gle','GLE 350 4MATIC',2024,{engine_cc:1991,engine_hp:258,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:449000,acc:6.4,top:240,torque:370,fuel:9.5,sort_order:1}),
  trim('mercedes','gle','GLE 53 AMG 4MATIC+',2024,{engine_cc:2999,engine_hp:435,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:679000,acc:5.3,top:250,torque:520,fuel:11.0,sort_order:2}),

  // ── Mercedes GLS ──
  trim('mercedes','gls','GLS 400d 4MATIC',2024,{engine_type:'diesel',engine_cc:2925,engine_hp:330,drive:'awd',seat_count:7,seats:'leather',screen_size:12.8,features:T,price_ils:589000,acc:6.3,top:250,torque:700,fuel:8.5,sort_order:0}),
  trim('mercedes','gls','GLS 450 4MATIC',2024,{engine_cc:2999,engine_hp:367,drive:'awd',seat_count:7,seats:'leather',screen_size:12.8,features:T,price_ils:679000,acc:5.9,top:250,torque:500,fuel:10.5,sort_order:1}),

  // ── Mercedes S-Class ──
  trim('mercedes','s-class','S350d 4MATIC',2024,{engine_type:'diesel',engine_cc:2925,engine_hp:286,drive:'awd',seats:'leather',screen_size:12.8,features:T,price_ils:699000,acc:6.0,top:250,torque:600,fuel:7.5,sort_order:0}),
  trim('mercedes','s-class','S450 4MATIC',2024,{engine_cc:2999,engine_hp:381,drive:'awd',seats:'leather',screen_size:12.8,features:T,price_ils:849000,acc:5.0,top:250,torque:500,fuel:10.0,sort_order:1}),
  trim('mercedes','s-class','S63 AMG 4MATIC+',2024,{engine_cc:3982,engine_hp:612,drive:'awd',seats:'leather',screen_size:12.8,features:T,price_ils:1500000,acc:3.4,top:300,torque:900,fuel:12.5,sort_order:2}),

  // ── Mercedes EQA ──
  trim('mercedes','eqa','EQA 250',2024,{engine_type:'electric',engine_hp:190,drive:'fwd',seats:'leatherette',screen_size:10.25,features:M,price_ils:279000,acc:8.9,top:160,torque:385,sort_order:0}),
  trim('mercedes','eqa','EQA 300 4MATIC',2024,{engine_type:'electric',engine_hp:228,drive:'awd',seats:'leather',screen_size:10.25,features:T,price_ils:319000,acc:6.8,top:160,torque:390,sort_order:1}),

  // ── Mercedes EQE ──
  trim('mercedes','eqe','EQE 300',2024,{engine_type:'electric',engine_hp:245,drive:'rwd',seats:'leather',screen_size:12.8,features:T,price_ils:399000,acc:7.3,top:210,torque:565,sort_order:0}),
  trim('mercedes','eqe','EQE 350',2024,{engine_type:'electric',engine_hp:292,drive:'rwd',seats:'leather',screen_size:12.8,features:T,price_ils:449000,acc:6.4,top:210,torque:565,sort_order:1}),
  trim('mercedes','eqe','EQE 500 4MATIC',2024,{engine_type:'electric',engine_hp:407,drive:'awd',seats:'leather',screen_size:12.8,features:T,price_ils:549000,acc:4.5,top:210,torque:858,sort_order:2}),

  // ── Mercedes EQS ──
  trim('mercedes','eqs','EQS 350',2024,{engine_type:'electric',engine_hp:245,drive:'rwd',seats:'leather',screen_size:12.8,features:T,price_ils:649000,acc:6.2,top:210,torque:565,sort_order:0}),
  trim('mercedes','eqs','EQS 450+',2024,{engine_type:'electric',engine_hp:333,drive:'rwd',seats:'leather',screen_size:12.8,features:T,price_ils:749000,acc:5.6,top:210,torque:568,sort_order:1}),
  trim('mercedes','eqs','EQS 580 4MATIC',2024,{engine_type:'electric',engine_hp:523,drive:'awd',seats:'leather',screen_size:12.8,features:T,price_ils:899000,acc:4.3,top:210,torque:855,sort_order:2}),

  // ── Audi A1 ──
  trim('audi','a1','25 TFSI',2024,{engine_cc:999,engine_hp:95,transmission:'manual',seats:'fabric',screen_size:8.8,features:B,price_ils:119000,acc:10.4,top:176,torque:175,fuel:5.3,sort_order:0}),
  trim('audi','a1','30 TFSI',2024,{engine_cc:999,engine_hp:116,seats:'fabric',screen_size:8.8,features:M,price_ils:139000,acc:9.3,top:196,torque:200,fuel:5.5,sort_order:1}),
  trim('audi','a1','35 TFSI',2024,{engine_cc:1498,engine_hp:150,seats:'leatherette',screen_size:8.8,features:M,price_ils:159000,acc:7.9,top:220,torque:250,fuel:6.2,sort_order:2}),

  // ── Audi A5 ──
  trim('audi','a5','35 TFSI Sportback',2024,{engine_cc:1395,engine_hp:150,seats:'leatherette',screen_size:10.1,features:M,price_ils:199000,acc:8.8,top:224,torque:270,fuel:6.3,sort_order:0}),
  trim('audi','a5','40 TFSI Sportback',2024,{engine_cc:1984,engine_hp:204,seats:'leather',screen_size:10.1,features:M,price_ils:229000,acc:7.3,top:240,torque:340,fuel:7.2,sort_order:1}),
  trim('audi','a5','45 TFSI quattro',2024,{engine_cc:1984,engine_hp:265,drive:'awd',seats:'leather',screen_size:10.1,features:T,price_ils:279000,acc:6.0,top:250,torque:370,fuel:7.9,sort_order:2}),

  // ── Audi Q4 e-tron ──
  trim('audi','q4-etron','Q4 35 e-tron',2024,{engine_type:'electric',engine_hp:174,drive:'rwd',seats:'leatherette',screen_size:10.1,features:M,price_ils:219000,acc:9.0,top:160,torque:310,sort_order:0}),
  trim('audi','q4-etron','Q4 40 e-tron',2024,{engine_type:'electric',engine_hp:204,drive:'rwd',seats:'leatherette',screen_size:10.1,features:M,price_ils:249000,acc:8.5,top:180,torque:310,sort_order:1}),
  trim('audi','q4-etron','Q4 50 e-tron quattro',2024,{engine_type:'electric',engine_hp:299,drive:'awd',seats:'leather',screen_size:10.1,features:T,price_ils:299000,acc:6.2,top:180,torque:460,sort_order:2}),

  // ── Audi Q7 ──
  trim('audi','q7','45 TFSI',2024,{engine_cc:1984,engine_hp:245,seat_count:7,seats:'leather',screen_size:10.1,features:M,price_ils:359000,acc:7.2,top:237,torque:370,fuel:9.0,sort_order:0}),
  trim('audi','q7','50 TDI quattro',2024,{engine_type:'diesel',engine_cc:2967,engine_hp:286,drive:'awd',seat_count:7,seats:'leather',screen_size:10.1,features:T,price_ils:419000,acc:6.1,top:245,torque:620,fuel:7.4,sort_order:1}),
  trim('audi','q7','SQ7 TDI',2024,{engine_type:'diesel',engine_cc:3956,engine_hp:507,drive:'awd',seat_count:7,seats:'leather',screen_size:10.1,features:T,price_ils:649000,acc:4.1,top:250,torque:1000,fuel:10.5,sort_order:2}),

  // ── BMW Series 2 ──
  trim('bmw','series2','218i Active Tourer',2024,{engine_cc:1499,engine_hp:136,seats:'fabric',screen_size:10.25,features:B,price_ils:179000,acc:9.0,top:210,torque:230,fuel:6.3,sort_order:0}),
  trim('bmw','series2','220i xDrive Active Tourer',2024,{engine_cc:1998,engine_hp:170,drive:'awd',seats:'leatherette',screen_size:10.25,features:M,price_ils:209000,acc:7.5,top:235,torque:280,fuel:7.1,sort_order:1}),
  trim('bmw','series2','M240i xDrive Coupe',2024,{engine_cc:2998,engine_hp:374,drive:'awd',seats:'leatherette',screen_size:10.25,features:T,price_ils:299000,acc:4.3,top:250,torque:500,fuel:9.0,sort_order:2}),

  // ── BMW Series 4 ──
  trim('bmw','series4','420i Coupe',2024,{engine_cc:1998,engine_hp:184,drive:'rwd',seats:'leatherette',screen_size:10.25,features:M,price_ils:239000,acc:7.7,top:240,torque:300,fuel:7.3,sort_order:0}),
  trim('bmw','series4','430i xDrive Gran Coupe',2024,{engine_cc:1998,engine_hp:245,drive:'awd',seats:'leather',screen_size:10.25,features:T,price_ils:289000,acc:5.9,top:250,torque:390,fuel:7.9,sort_order:1}),
  trim('bmw','series4','M4 Competition xDrive',2024,{engine_cc:2993,engine_hp:510,drive:'awd',seats:'leather',screen_size:10.25,features:T,price_ils:549000,acc:3.5,top:290,torque:650,fuel:10.3,sort_order:2}),

  // ── BMW X2 ──
  trim('bmw','x2','sDrive18i',2024,{engine_cc:1499,engine_hp:136,drive:'fwd',seats:'fabric',screen_size:10.25,features:B,price_ils:189000,acc:9.5,top:208,torque:220,fuel:6.3,sort_order:0}),
  trim('bmw','x2','xDrive20i',2024,{engine_cc:1998,engine_hp:192,drive:'awd',seats:'leatherette',screen_size:10.25,features:M,price_ils:229000,acc:7.7,top:233,torque:280,fuel:7.4,sort_order:1}),
  trim('bmw','x2','M35i xDrive',2024,{engine_cc:1998,engine_hp:306,drive:'awd',seats:'leather',screen_size:10.25,features:T,price_ils:299000,acc:5.0,top:250,torque:450,fuel:8.5,sort_order:2}),

  // ── BMW i4 ──
  trim('bmw','i4','eDrive35',2024,{engine_type:'electric',engine_hp:286,drive:'rwd',seats:'leatherette',screen_size:14.9,features:T,price_ils:289000,acc:5.7,top:190,torque:400,sort_order:0}),
  trim('bmw','i4','eDrive40',2024,{engine_type:'electric',engine_hp:340,drive:'rwd',seats:'leather',screen_size:14.9,features:T,price_ils:329000,acc:5.7,top:190,torque:430,sort_order:1}),
  trim('bmw','i4','M50 xDrive',2024,{engine_type:'electric',engine_hp:544,drive:'awd',seats:'leather',screen_size:14.9,features:T,price_ils:459000,acc:3.9,top:225,torque:795,sort_order:2}),

  // ── BMW iX ──
  trim('bmw','ix','xDrive40',2024,{engine_type:'electric',engine_hp:326,drive:'awd',seats:'leather',screen_size:14.9,features:T,price_ils:449000,acc:6.1,top:200,torque:630,sort_order:0}),
  trim('bmw','ix','xDrive50',2024,{engine_type:'electric',engine_hp:523,drive:'awd',seats:'leather',screen_size:14.9,features:T,price_ils:579000,acc:4.6,top:200,torque:765,sort_order:1}),
  trim('bmw','ix','M60 xDrive',2024,{engine_type:'electric',engine_hp:619,drive:'awd',seats:'leather',screen_size:14.9,features:T,price_ils:749000,acc:3.8,top:250,torque:1100,sort_order:2}),

  // ── BMW iX1 ──
  trim('bmw','ix1','eDrive20',2024,{engine_type:'electric',engine_hp:204,drive:'fwd',seats:'leatherette',screen_size:10.7,features:M,price_ils:249000,acc:7.1,top:170,torque:250,sort_order:0}),
  trim('bmw','ix1','xDrive30',2024,{engine_type:'electric',engine_hp:313,drive:'awd',seats:'leather',screen_size:10.7,features:T,price_ils:299000,acc:5.7,top:180,torque:494,sort_order:1}),

  // ── Toyota Supra ──
  trim('toyota','supra','GR Supra 2.0',2024,{engine_cc:1998,engine_hp:258,drive:'rwd',seat_count:2,seats:'leather',screen_size:8.8,features:M,price_ils:279000,acc:5.2,top:250,torque:400,fuel:8.5,weight:1395,sort_order:0}),
  trim('toyota','supra','GR Supra 3.0',2024,{engine_cc:2998,engine_hp:387,drive:'rwd',seat_count:2,seats:'leather',screen_size:8.8,features:T,price_ils:369000,acc:3.9,top:250,torque:500,fuel:9.4,weight:1570,sort_order:1}),

  // ── Toyota GR86 ──
  trim('toyota','gr86','GR86 MT',2024,{engine_cc:2387,engine_hp:234,drive:'rwd',seat_count:4,seats:'fabric',screen_size:8,features:M,price_ils:199000,acc:6.3,top:226,torque:250,fuel:9.5,weight:1278,sort_order:0}),
  trim('toyota','gr86','GR86 AT Premium',2024,{engine_cc:2387,engine_hp:234,transmission:'automatic',drive:'rwd',seat_count:4,seats:'leatherette',screen_size:8,features:T,price_ils:219000,acc:6.3,top:226,torque:250,fuel:10.2,weight:1295,sort_order:1}),

  // ── VW Arteon ──
  trim('volkswagen','arteon','2.0 TDI DSG',2024,{engine_type:'diesel',engine_cc:1968,engine_hp:150,seats:'leatherette',screen_size:9.2,features:M,price_ils:199000,acc:8.9,top:214,torque:360,fuel:5.5,sort_order:0}),
  trim('volkswagen','arteon','2.0 TSI 4Motion',2024,{engine_cc:1984,engine_hp:280,drive:'awd',seats:'leather',screen_size:9.2,features:T,price_ils:279000,acc:5.8,top:250,torque:350,fuel:8.8,sort_order:1}),

  // ── VW ID.5 ──
  trim('volkswagen','id5','ID.5 Pro',2024,{engine_type:'electric',engine_hp:204,drive:'rwd',seats:'leatherette',screen_size:12,features:M,price_ils:239000,acc:8.4,top:180,torque:310,sort_order:0}),
  trim('volkswagen','id5','ID.5 GTX',2024,{engine_type:'electric',engine_hp:299,drive:'awd',seats:'leather',screen_size:12,features:T,price_ils:289000,acc:6.2,top:180,torque:460,sort_order:1}),

  // ── VW Amarok ──
  trim('volkswagen','amarok','TDI 204 Style',2024,{engine_type:'diesel',engine_cc:1968,engine_hp:204,drive:'awd',seats:'leatherette',screen_size:10,features:M,price_ils:219000,acc:9.0,top:182,torque:450,fuel:8.0,sort_order:0}),
  trim('volkswagen','amarok','TDI 240 PanAmericana',2024,{engine_type:'diesel',engine_cc:2967,engine_hp:240,drive:'awd',seats:'leather',screen_size:12,features:T,price_ils:269000,acc:8.5,top:210,torque:600,fuel:9.0,sort_order:1}),

  // ── Hyundai Ioniq 9 ──
  trim('hyundai','ioniq-9','Long Range RWD',2025,{engine_type:'electric',engine_hp:218,drive:'rwd',seat_count:7,seats:'leatherette',screen_size:12,features:M,price_ils:299000,acc:9.4,top:185,torque:350,sort_order:0}),
  trim('hyundai','ioniq-9','Long Range AWD',2025,{engine_type:'electric',engine_hp:320,drive:'awd',seat_count:7,seats:'leather',screen_size:12,features:T,price_ils:369000,acc:6.7,top:200,torque:605,sort_order:1}),

  // ── Hyundai Palisade ──
  trim('hyundai','palisade','2.2 CRDi 2WD',2024,{engine_type:'diesel',engine_cc:2151,engine_hp:202,seat_count:7,seats:'leatherette',screen_size:10.25,features:M,price_ils:239000,acc:9.5,top:193,torque:440,fuel:8.0,sort_order:0}),
  trim('hyundai','palisade','2.2 CRDi AWD',2024,{engine_type:'diesel',engine_cc:2151,engine_hp:202,drive:'awd',seat_count:7,seats:'leather',screen_size:10.25,features:T,price_ils:279000,acc:9.3,top:195,torque:440,fuel:8.7,sort_order:1}),

  // ── Kia EV3 ──
  trim('kia','ev3','Standard Range',2025,{engine_type:'electric',engine_hp:150,drive:'fwd',seats:'fabric',screen_size:12.3,features:M,price_ils:149000,acc:8.1,top:165,torque:255,sort_order:0}),
  trim('kia','ev3','Long Range',2025,{engine_type:'electric',engine_hp:150,drive:'fwd',seats:'leatherette',screen_size:12.3,features:T,price_ils:179000,acc:8.1,top:165,torque:255,sort_order:1}),

  // ── Chevrolet Corvette ──
  trim('chevrolet','corvette','Stingray 1LT',2024,{engine_cc:6162,engine_hp:495,drive:'rwd',seat_count:2,seats:'leather',screen_size:8,features:M,price_ils:389000,acc:2.9,top:299,torque:637,fuel:12.5,weight:1527,sort_order:0}),
  trim('chevrolet','corvette','Stingray 3LT',2024,{engine_cc:6162,engine_hp:495,drive:'rwd',seat_count:2,seats:'leather',screen_size:8,features:T,price_ils:449000,acc:2.9,top:299,torque:637,fuel:12.5,weight:1527,sort_order:1}),
  trim('chevrolet','corvette','Z06 3LZ',2024,{engine_cc:5497,engine_hp:670,drive:'rwd',seat_count:2,seats:'leather',screen_size:8,features:T,price_ils:699000,acc:2.6,top:311,torque:623,fuel:13.0,weight:1653,sort_order:2}),

  // ── Geely Monjaro ──
  trim('geely','monjaro','2.0T FWD',2024,{engine_cc:1999,engine_hp:238,seats:'leather',screen_size:12.3,features:M,price_ils:189000,acc:8.0,top:220,torque:350,fuel:8.5,sort_order:0}),
  trim('geely','monjaro','2.0T AWD',2024,{engine_cc:1999,engine_hp:238,drive:'awd',seats:'leather',screen_size:12.3,features:T,price_ils:219000,acc:7.5,top:220,torque:350,fuel:9.5,sort_order:1}),

  // ── SsangYong Tivoli ──
  trim('ssangyong','tivoli','1.5 GDI 2WD',2024,{engine_cc:1497,engine_hp:163,seats:'fabric',screen_size:9,features:B,price_ils:109000,acc:10.5,top:180,torque:280,fuel:7.5,sort_order:0}),
  trim('ssangyong','tivoli','e-XLV 4WD',2024,{engine_cc:1497,engine_hp:163,drive:'awd',seat_count:7,seats:'leatherette',screen_size:9,features:M,price_ils:139000,acc:11.0,top:177,torque:280,fuel:8.5,sort_order:1}),

  // ── SsangYong Rexton ──
  trim('ssangyong','rexton','2.2 e-XDi 4WD',2024,{engine_type:'diesel',engine_cc:2157,engine_hp:181,drive:'awd',seat_count:7,seats:'leather',screen_size:9.2,features:M,price_ils:179000,acc:11.5,top:180,torque:420,fuel:9.5,sort_order:0}),
];

console.log(`Inserting ${TRIMS.length} trims...`);

// Batch insert in groups of 20
const BATCH = 20;
let inserted = 0;

for (let i = 0; i < TRIMS.length; i += BATCH) {
  const batch = TRIMS.slice(i, i + BATCH);
  const lines = batch.map(t =>
    `(${sq(t.id)},${sq(t.make_slug)},${sq(t.model_slug)},${sq(t.name)},${yn(t.model_year)},${sq(t.engine_type)},${yn(t.engine_cc)},${yn(t.engine_hp)},${sq(t.transmission)},${sq(t.drive)},${sq(t.seats)},${yn(t.seat_count)},${yn(t.screen_size)},${sq(t.features)},${yn(t.price_ils)},${yn(t.is_israel)},${yn(t.sort_order)},${yn(t.acceleration_0_100)},${yn(t.top_speed_kmh)},${yn(t.torque_nm)},${yn(t.fuel_consumption)},${yn(t.cargo_liters)},${yn(t.curb_weight_kg)})`
  );

  const sql = `INSERT OR IGNORE INTO car_trims (id,make_slug,model_slug,name,model_year,engine_type,engine_cc,engine_hp,transmission,drive,seats,seat_count,screen_size,features,price_ils,is_israel,sort_order,acceleration_0_100,top_speed_kmh,torque_nm,fuel_consumption,cargo_liters,curb_weight_kg) VALUES\n${lines.join(',\n')};`;
  const ok = d1Exec(sql);
  if (ok) {
    inserted += batch.length;
    process.stdout.write('.');
  }
}

console.log(`\nDone. Inserted ${inserted} trims.`);
