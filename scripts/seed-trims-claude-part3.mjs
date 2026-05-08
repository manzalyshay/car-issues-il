/**
 * Part 3: Nissan, Mazda remaining, Mitsubishi, Subaru, Suzuki, Tesla, Volvo, Lexus, Porsche
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
  .split('\n').reduce((acc, l) => { const m = l.match(/^([^=]+)=(.*)/); if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g,''); return acc; }, {});
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const B = ['aeb','lane_keep','rear_camera','parking_sensors','led_lights','push_start','apple_carplay'];
const M = [...B,'adaptive_cruise','blind_spot','traffic_sign','wireless_carplay','wireless_charging','heated_seats_front','keyless_entry','digital_cluster'];
const T = [...M,'camera_360','ventilated_seats','heated_seats_rear','electric_seats','memory_seats','panoramic_roof','ambient_lighting','premium_audio','hud','auto_lights','heated_steering'];

const TRIMS = [
  // ── Nissan Qashqai ────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'qashqai', name:'Visia',      sort_order:0, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'auto_lights'],               price_ils:148000 },
  { make_slug:'nissan', model_slug:'qashqai', name:'Acenta',     sort_order:1, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'auto_lights'],               price_ils:164000 },
  { make_slug:'nissan', model_slug:'qashqai', name:'N-Connecta', sort_order:2, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'camera_360','auto_lights'],   price_ils:178000 },
  { make_slug:'nissan', model_slug:'qashqai', name:'Tekna',      sort_order:3, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:12.3, features:[...T],                             price_ils:196000 },
  { make_slug:'nissan', model_slug:'qashqai', name:'Tekna+',     sort_order:4, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                        price_ils:212000 },
  { make_slug:'nissan', model_slug:'qashqai', name:'e-Power Tekna',sort_order:5,engine_type:'hybrid', engine_cc:1497, engine_hp:190, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud'],                   price_ils:228000 },

  // ── Nissan Juke ───────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'juke', name:'Visia',   sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:114, transmission:'dct', drive:'fwd', seats:'fabric',      screen_size:8,   features:[...B,'auto_lights'],    price_ils:132000 },
  { make_slug:'nissan', model_slug:'juke', name:'Tekna',   sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:114, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:8,   features:[...M,'auto_lights'],    price_ils:156000 },

  // ── Nissan X-Trail ────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'x-trail', name:'Visia',  sort_order:0, engine_type:'hybrid', engine_cc:1497, engine_hp:158, transmission:'cvt', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:9,    features:[...M,'auto_lights'],   price_ils:188000 },
  { make_slug:'nissan', model_slug:'x-trail', name:'Tekna',  sort_order:1, engine_type:'hybrid', engine_cc:1497, engine_hp:213, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:12.3, features:[...T,'hud'],         price_ils:228000 },

  // ── Nissan Leaf ───────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'leaf', name:'Acenta', sort_order:0, engine_type:'electric', engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'heated_steering'], price_ils:148000 },

  // ── Nissan Note ───────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'note', name:'Visia',  sort_order:0, engine_type:'hybrid', engine_cc:1197, engine_hp:91, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,  features:[...B,'auto_lights'],   price_ils:116000 },
  { make_slug:'nissan', model_slug:'note', name:'Tekna',  sort_order:1, engine_type:'hybrid', engine_cc:1197, engine_hp:91, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],   price_ils:132000 },

  // ── Nissan Kicks ──────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'kicks', name:'Visia',  sort_order:0, engine_type:'hybrid', engine_cc:1197, engine_hp:136, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8, features:[...B,'auto_lights'],  price_ils:132000 },
  { make_slug:'nissan', model_slug:'kicks', name:'Tekna',  sort_order:1, engine_type:'hybrid', engine_cc:1197, engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9, features:[...M,'auto_lights'],  price_ils:152000 },

  // ── Nissan Navara ─────────────────────────────────────────────────────────────
  { make_slug:'nissan', model_slug:'navara', name:'Tekna', sort_order:0, engine_type:'diesel', engine_cc:2298, engine_hp:163, transmission:'automatic', drive:'awd', seats:'leather', screen_size:8, features:[...M,'camera_360'], price_ils:218000 },

  // ── Mazda Mazda3 ──────────────────────────────────────────────────────────────
  { make_slug:'mazda', model_slug:'mazda3', name:'Pure',   sort_order:0, engine_type:'hybrid', engine_cc:1998, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8.8,  features:[...M,'auto_lights'],               price_ils:148000 },
  { make_slug:'mazda', model_slug:'mazda3', name:'Exclusive-Line', sort_order:1, engine_type:'hybrid', engine_cc:1998, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:8.8, features:[...M,'camera_360','panoramic_roof'], price_ils:168000 },
  { make_slug:'mazda', model_slug:'mazda3', name:'Homura', sort_order:2, engine_type:'petrol', engine_cc:2488, engine_hp:228, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:8.8,  features:[...T],                             price_ils:186000 },

  // ── Mazda CX-30 ───────────────────────────────────────────────────────────────
  { make_slug:'mazda', model_slug:'cx30', name:'Pure',          sort_order:0, engine_type:'hybrid', engine_cc:1998, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8.8,  features:[...M,'auto_lights'],              price_ils:154000 },
  { make_slug:'mazda', model_slug:'cx30', name:'Exclusive-Line',sort_order:1, engine_type:'hybrid', engine_cc:1998, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:8.8,  features:[...M,'panoramic_roof','auto_lights'], price_ils:172000 },
  { make_slug:'mazda', model_slug:'cx30', name:'Carbon Edition',sort_order:2, engine_type:'hybrid', engine_cc:1998, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8,  features:[...M,'camera_360','auto_lights'],  price_ils:186000 },
  { make_slug:'mazda', model_slug:'cx30', name:'Homura',        sort_order:3, engine_type:'petrol', engine_cc:2488, engine_hp:228, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8,  features:[...T],                            price_ils:202000 },
  { make_slug:'mazda', model_slug:'cx30', name:'e-Skyactiv X',  sort_order:4, engine_type:'hybrid', engine_cc:1998, engine_hp:186, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8,  features:[...T],                            price_ils:196000 },

  // ── Mazda CX-3 ────────────────────────────────────────────────────────────────
  { make_slug:'mazda', model_slug:'cx3', name:'Pure',          sort_order:0, engine_type:'petrol', engine_cc:1496, engine_hp:120, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,   features:[...B,'auto_lights'],  price_ils:128000 },
  { make_slug:'mazda', model_slug:'cx3', name:'Exclusive-Line',sort_order:1, engine_type:'petrol', engine_cc:1496, engine_hp:120, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,   features:[...M,'auto_lights'],  price_ils:142000 },
  { make_slug:'mazda', model_slug:'cx3', name:'Carbon Edition',sort_order:2, engine_type:'petrol', engine_cc:1496, engine_hp:120, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:7,   features:[...M,'panoramic_roof'], price_ils:154000 },

  // ── Mazda 6 ───────────────────────────────────────────────────────────────────
  { make_slug:'mazda', model_slug:'mazda6', name:'Dynamic',       sort_order:0, engine_type:'petrol', engine_cc:1998, engine_hp:165, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8.8, features:[...M,'auto_lights'],         price_ils:162000 },
  { make_slug:'mazda', model_slug:'mazda6', name:'Exclusive-Line',sort_order:1, engine_type:'petrol', engine_cc:2488, engine_hp:194, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:8.8, features:[...T],                       price_ils:186000 },

  // ── Mazda MX-5 ────────────────────────────────────────────────────────────────
  { make_slug:'mazda', model_slug:'mx5', name:'Sport',       sort_order:0, engine_type:'petrol', engine_cc:1496, engine_hp:132, transmission:'manual',    drive:'rwd', seats:'leatherette', screen_size:7, features:[...B,'wireless_carplay','heated_seats_front','push_start'], price_ils:178000 },
  { make_slug:'mazda', model_slug:'mx5', name:'Homura',      sort_order:1, engine_type:'petrol', engine_cc:1998, engine_hp:184, transmission:'manual',    drive:'rwd', seats:'leather',     screen_size:7, features:[...M],                                                     price_ils:198000 },

  // ── Mitsubishi ASX ────────────────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'asx', name:'פנורמיק',  sort_order:0, engine_type:'hybrid', engine_cc:1333, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','auto_lights'],    price_ils:145000 },
  { make_slug:'mitsubishi', model_slug:'asx', name:'אינטנס',   sort_order:1, engine_type:'hybrid', engine_cc:1333, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'panoramic_roof','camera_360'],  price_ils:158000 },
  { make_slug:'mitsubishi', model_slug:'asx', name:'אינסטייל', sort_order:2, engine_type:'hybrid', engine_cc:1333, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                                price_ils:171000 },

  // ── Mitsubishi Eclipse Cross ──────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'eclipse-cross', name:'Intense',   sort_order:0, engine_type:'phev', engine_cc:2359, engine_hp:224, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8, features:[...M,'camera_360'],   price_ils:198000 },
  { make_slug:'mitsubishi', model_slug:'eclipse-cross', name:'Instyle',   sort_order:1, engine_type:'phev', engine_cc:2359, engine_hp:224, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8, features:[...T],                 price_ils:218000 },

  // ── Mitsubishi Outlander ──────────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'outlander', name:'Intense',   sort_order:0, engine_type:'phev', engine_cc:2359, engine_hp:302, transmission:'automatic', drive:'awd', seat_count:7, seats:'leatherette', screen_size:12.3, features:[...M,'camera_360'],  price_ils:238000 },
  { make_slug:'mitsubishi', model_slug:'outlander', name:'Instyle',   sort_order:1, engine_type:'phev', engine_cc:2359, engine_hp:302, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T],               price_ils:262000 },
  { make_slug:'mitsubishi', model_slug:'outlander', name:'Executive', sort_order:2, engine_type:'phev', engine_cc:2359, engine_hp:302, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'hud'],         price_ils:282000 },

  // ── Mitsubishi Colt ───────────────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'colt', name:'Intense',  sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:91, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7, features:[...B,'auto_lights'],   price_ils:112000 },
  { make_slug:'mitsubishi', model_slug:'colt', name:'Instyle',  sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:91, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9, features:[...M,'auto_lights'],   price_ils:126000 },

  // ── Mitsubishi L200 ───────────────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'l200', name:'Club',     sort_order:0, engine_type:'diesel', engine_cc:2267, engine_hp:150, transmission:'manual',    drive:'awd', seats:'fabric',      screen_size:null, features:['aeb','rear_camera','led_lights'],  price_ils:178000 },
  { make_slug:'mitsubishi', model_slug:'l200', name:'Intense',  sort_order:1, engine_type:'diesel', engine_cc:2267, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8,    features:[...B,'wireless_carplay','auto_lights'], price_ils:198000 },
  { make_slug:'mitsubishi', model_slug:'l200', name:'Instyle',  sort_order:2, engine_type:'diesel', engine_cc:2267, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8,    features:[...M,'camera_360'],               price_ils:218000 },
  { make_slug:'mitsubishi', model_slug:'l200', name:'Executive',sort_order:3, engine_type:'diesel', engine_cc:2267, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8,    features:[...T],                            price_ils:238000 },

  // ── Mitsubishi Pajero Sport ───────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'pajero-sport', name:'Intense',  sort_order:0, engine_type:'diesel', engine_cc:2442, engine_hp:181, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8, features:[...M,'camera_360'],   price_ils:228000 },
  { make_slug:'mitsubishi', model_slug:'pajero-sport', name:'Instyle',  sort_order:1, engine_type:'diesel', engine_cc:2442, engine_hp:181, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8, features:[...T],                 price_ils:252000 },

  // ── Mitsubishi Space Star ─────────────────────────────────────────────────────
  { make_slug:'mitsubishi', model_slug:'space-star', name:'Intense', sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:71, transmission:'cvt', drive:'fwd', seats:'fabric', screen_size:7, features:['aeb','rear_camera','parking_sensors','led_lights','apple_carplay'], price_ils:98000 },

  // ── Subaru Forester ───────────────────────────────────────────────────────────
  { make_slug:'subaru', model_slug:'forester', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'fabric',      screen_size:8,  features:[...B,'wireless_carplay','auto_lights'],        price_ils:168000 },
  { make_slug:'subaru', model_slug:'forester', name:'Sport',   sort_order:1, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leatherette', screen_size:8,  features:[...M,'auto_lights'],                           price_ils:186000 },
  { make_slug:'subaru', model_slug:'forester', name:'Limited', sort_order:2, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leather',     screen_size:11, features:[...T],                                        price_ils:206000 },
  { make_slug:'subaru', model_slug:'forester', name:'Sport XT',sort_order:3, engine_type:'petrol', engine_cc:1795, engine_hp:177, transmission:'cvt', drive:'awd', seats:'leather',     screen_size:11, features:[...T],                                        price_ils:218000 },

  // ── Subaru Outback ────────────────────────────────────────────────────────────
  { make_slug:'subaru', model_slug:'outback', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leatherette', screen_size:11.6, features:[...M,'auto_lights'],  price_ils:188000 },
  { make_slug:'subaru', model_slug:'outback', name:'Limited', sort_order:1, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leather',     screen_size:11.6, features:[...T,'hud'],           price_ils:214000 },

  // ── Subaru Impreza ────────────────────────────────────────────────────────────
  { make_slug:'subaru', model_slug:'impreza', name:'Active', sort_order:0, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leatherette', screen_size:11.6, features:[...M,'auto_lights'], price_ils:162000 },

  // ── Subaru XV ─────────────────────────────────────────────────────────────────
  { make_slug:'subaru', model_slug:'xv', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'fabric',      screen_size:8,  features:[...B,'wireless_carplay','auto_lights'],  price_ils:158000 },
  { make_slug:'subaru', model_slug:'xv', name:'Sport',   sort_order:1, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leatherette', screen_size:8,  features:[...M,'auto_lights'],                     price_ils:174000 },
  { make_slug:'subaru', model_slug:'xv', name:'Limited', sort_order:2, engine_type:'hybrid', engine_cc:1995, engine_hp:150, transmission:'cvt', drive:'awd', seats:'leather',     screen_size:11, features:[...T],                                  price_ils:192000 },

  // ── Suzuki Vitara ─────────────────────────────────────────────────────────────
  { make_slug:'suzuki', model_slug:'vitara', name:'GL+',    sort_order:0, engine_type:'hybrid', engine_cc:1373, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:9, features:[...B,'wireless_carplay','auto_lights'],  price_ils:128000 },
  { make_slug:'suzuki', model_slug:'vitara', name:'GLX',    sort_order:1, engine_type:'hybrid', engine_cc:1373, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9, features:[...M,'auto_lights'],                     price_ils:143000 },
  { make_slug:'suzuki', model_slug:'vitara', name:'Allgrip',sort_order:2, engine_type:'hybrid', engine_cc:1373, engine_hp:129, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:9, features:[...M,'camera_360'],                      price_ils:158000 },
  { make_slug:'suzuki', model_slug:'vitara', name:'GLX Hybrid',sort_order:3, engine_type:'hybrid', engine_cc:1373, engine_hp:140, transmission:'automatic', drive:'awd', seats:'leather', screen_size:9, features:[...T],                                   price_ils:172000 },

  // ── Suzuki S-Cross ────────────────────────────────────────────────────────────
  { make_slug:'suzuki', model_slug:'scross', name:'GL+',   sort_order:0, engine_type:'hybrid', engine_cc:1373, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:9,  features:[...B,'wireless_carplay','auto_lights'],  price_ils:138000 },
  { make_slug:'suzuki', model_slug:'scross', name:'GLX',   sort_order:1, engine_type:'hybrid', engine_cc:1373, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],                     price_ils:152000 },
  { make_slug:'suzuki', model_slug:'scross', name:'Allgrip Hybrid',sort_order:2, engine_type:'hybrid', engine_cc:1373, engine_hp:140, transmission:'automatic', drive:'awd', seats:'leather', screen_size:9, features:[...T],                               price_ils:168000 },

  // ── Suzuki Swift ──────────────────────────────────────────────────────────────
  { make_slug:'suzuki', model_slug:'swift', name:'GLX', sort_order:0, engine_type:'hybrid', engine_cc:1197, engine_hp:83, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:9, features:[...B,'wireless_carplay','heated_seats_front','auto_lights'], price_ils:108000 },

  // ── Suzuki Jimny ──────────────────────────────────────────────────────────────
  { make_slug:'suzuki', model_slug:'jimny', name:'GLX', sort_order:0, engine_type:'petrol', engine_cc:1373, engine_hp:102, transmission:'automatic', drive:'awd', seats:'fabric', screen_size:9, features:[...B,'wireless_carplay','heated_seats_front'], price_ils:128000 },

  // ── Tesla Model 3 ─────────────────────────────────────────────────────────────
  { make_slug:'tesla', model_slug:'model-3', name:'Standard Range RWD', sort_order:0, engine_type:'electric', engine_hp:283, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:15.4, features:[...M,'digital_cluster','ambient_lighting','camera_360','premium_audio'],  price_ils:168000 },
  { make_slug:'tesla', model_slug:'model-3', name:'Long Range RWD',     sort_order:1, engine_type:'electric', engine_hp:358, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:15.4, features:[...M,'digital_cluster','ambient_lighting','camera_360','premium_audio'],  price_ils:196000 },
  { make_slug:'tesla', model_slug:'model-3', name:'Long Range AWD',     sort_order:2, engine_type:'electric', engine_hp:395, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.4, features:[...T,'hud'],                                                             price_ils:218000 },
  { make_slug:'tesla', model_slug:'model-3', name:'Performance',        sort_order:3, engine_type:'electric', engine_hp:460, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.4, features:[...T,'hud'],                                                             price_ils:249000 },
  { make_slug:'tesla', model_slug:'model-3', name:'Highland Long Range', sort_order:4, engine_type:'electric', engine_hp:358, transmission:'automatic', drive:'fwd', seats:'leather',    screen_size:15.4, features:[...T,'hud'],                                                             price_ils:204000 },
  { make_slug:'tesla', model_slug:'model-3', name:'Highland AWD',       sort_order:5, engine_type:'electric', engine_hp:395, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.4, features:[...T,'hud'],                                                             price_ils:228000 },

  // ── Tesla Model Y ─────────────────────────────────────────────────────────────
  { make_slug:'tesla', model_slug:'model-y', name:'Standard Range RWD', sort_order:0, engine_type:'electric', engine_hp:283, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:15.4, features:[...M,'digital_cluster','ambient_lighting','camera_360','premium_audio'],  price_ils:178000 },
  { make_slug:'tesla', model_slug:'model-y', name:'Long Range RWD',     sort_order:1, engine_type:'electric', engine_hp:358, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:15.4, features:[...M,'digital_cluster','ambient_lighting','camera_360','premium_audio'],  price_ils:208000 },
  { make_slug:'tesla', model_slug:'model-y', name:'Long Range AWD',     sort_order:2, engine_type:'electric', engine_hp:395, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.4, features:[...T,'hud'],                                                             price_ils:232000 },
  { make_slug:'tesla', model_slug:'model-y', name:'Performance',        sort_order:3, engine_type:'electric', engine_hp:513, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.4, features:[...T,'hud'],                                                             price_ils:262000 },
  { make_slug:'tesla', model_slug:'model-y', name:'7-Seat Long Range',  sort_order:4, engine_type:'electric', engine_hp:395, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:15.4, features:[...T,'hud'],                                                   price_ils:248000 },

  // ── Tesla Model S ─────────────────────────────────────────────────────────────
  { make_slug:'tesla', model_slug:'model-s', name:'Long Range',    sort_order:0, engine_type:'electric', engine_hp:670, transmission:'automatic', drive:'awd', seats:'leather', screen_size:17, features:[...T,'hud','digital_cluster'], price_ils:498000 },
  { make_slug:'tesla', model_slug:'model-s', name:'Plaid',         sort_order:1, engine_type:'electric', engine_hp:1020, transmission:'automatic', drive:'awd', seats:'leather', screen_size:17, features:[...T,'hud','digital_cluster'], price_ils:618000 },

  // ── Tesla Model X ─────────────────────────────────────────────────────────────
  { make_slug:'tesla', model_slug:'model-x', name:'Long Range',    sort_order:0, engine_type:'electric', engine_hp:670, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:17, features:[...T,'hud','digital_cluster'], price_ils:568000 },
  { make_slug:'tesla', model_slug:'model-x', name:'Plaid',         sort_order:1, engine_type:'electric', engine_hp:1020, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:17, features:[...T,'hud','digital_cluster'], price_ils:699000 },

  // ── Volvo XC40 ────────────────────────────────────────────────────────────────
  { make_slug:'volvo', model_slug:'xc40', name:'Core',       sort_order:0, engine_type:'hybrid', engine_cc:1477, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],         price_ils:218000 },
  { make_slug:'volvo', model_slug:'xc40', name:'Plus',       sort_order:1, engine_type:'hybrid', engine_cc:1477, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9,  features:[...M,'panoramic_roof','auto_lights'], price_ils:238000 },
  { make_slug:'volvo', model_slug:'xc40', name:'Ultimate',   sort_order:2, engine_type:'hybrid', engine_cc:1477, engine_hp:211, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,  features:[...T,'hud'],                 price_ils:268000 },
  { make_slug:'volvo', model_slug:'xc40', name:'Recharge',   sort_order:3, engine_type:'electric',              engine_hp:408, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,  features:[...T,'hud'],                 price_ils:298000 },

  // ── Volvo XC60 ────────────────────────────────────────────────────────────────
  { make_slug:'volvo', model_slug:'xc60', name:'Core',       sort_order:0, engine_type:'hybrid', engine_cc:1969, engine_hp:197, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],              price_ils:278000 },
  { make_slug:'volvo', model_slug:'xc60', name:'Plus',       sort_order:1, engine_type:'hybrid', engine_cc:1969, engine_hp:197, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,  features:[...M,'panoramic_roof','auto_lights'], price_ils:318000 },
  { make_slug:'volvo', model_slug:'xc60', name:'Ultimate',   sort_order:2, engine_type:'phev',   engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,  features:[...T,'hud'],                      price_ils:378000 },
  { make_slug:'volvo', model_slug:'xc60', name:'Recharge',   sort_order:3, engine_type:'phev',   engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,  features:[...T,'hud'],                      price_ils:398000 },

  // ── Volvo XC90 ────────────────────────────────────────────────────────────────
  { make_slug:'volvo', model_slug:'xc90', name:'Plus',       sort_order:0, engine_type:'phev', engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',  screen_size:9, features:[...T,'hud'], price_ils:478000 },
  { make_slug:'volvo', model_slug:'xc90', name:'Ultimate',   sort_order:1, engine_type:'phev', engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',  screen_size:9, features:[...T,'hud'], price_ils:538000 },
  { make_slug:'volvo', model_slug:'xc90', name:'Recharge',   sort_order:2, engine_type:'phev', engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',  screen_size:9, features:[...T,'hud'], price_ils:568000 },

  // ── Volvo S60 ─────────────────────────────────────────────────────────────────
  { make_slug:'volvo', model_slug:'s60', name:'Core',    sort_order:0, engine_type:'hybrid', engine_cc:1477, engine_hp:129, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9, features:[...M,'auto_lights'],   price_ils:218000 },
  { make_slug:'volvo', model_slug:'s60', name:'Plus',    sort_order:1, engine_type:'hybrid', engine_cc:1969, engine_hp:197, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9, features:[...M,'panoramic_roof'], price_ils:248000 },
  { make_slug:'volvo', model_slug:'s60', name:'Ultimate',sort_order:2, engine_type:'phev',   engine_cc:1969, engine_hp:455, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9, features:[...T,'hud'],            price_ils:318000 },

  // ── Volvo EX30 ────────────────────────────────────────────────────────────────
  { make_slug:'volvo', model_slug:'ex30', name:'Core',         sort_order:0, engine_type:'electric', engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.3, features:[...M,'digital_cluster'],            price_ils:188000 },
  { make_slug:'volvo', model_slug:'ex30', name:'Plus',         sort_order:1, engine_type:'electric', engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:12.3, features:[...M,'digital_cluster','panoramic_roof'], price_ils:208000 },
  { make_slug:'volvo', model_slug:'ex30', name:'Ultra',        sort_order:2, engine_type:'electric', engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:12.3, features:[...T,'hud','digital_cluster'],       price_ils:228000 },
  { make_slug:'volvo', model_slug:'ex30', name:'Twin Motor AWD',sort_order:3, engine_type:'electric', engine_hp:428, transmission:'automatic', drive:'awd', seats:'leather',    screen_size:12.3, features:[...T,'hud','digital_cluster'],       price_ils:252000 },

  // ── Lexus NX ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'nx', name:'NX 250 Urban',    sort_order:0, engine_type:'petrol', engine_cc:2487, engine_hp:203, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.8,  features:[...M,'camera_360','auto_lights'],      price_ils:248000 },
  { make_slug:'lexus', model_slug:'nx', name:'NX 350h Urban',   sort_order:1, engine_type:'hybrid', engine_cc:2487, engine_hp:243, transmission:'cvt',       drive:'awd', seats:'leatherette', screen_size:9.8,  features:[...M,'camera_360','auto_lights'],      price_ils:278000 },
  { make_slug:'lexus', model_slug:'nx', name:'NX 350h Comfort', sort_order:2, engine_type:'hybrid', engine_cc:2487, engine_hp:243, transmission:'cvt',       drive:'awd', seats:'leather',     screen_size:14,   features:[...T,'hud'],                           price_ils:318000 },
  { make_slug:'lexus', model_slug:'nx', name:'NX 450h+ F Sport',sort_order:3, engine_type:'phev',   engine_cc:2487, engine_hp:309, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:14,   features:[...T,'hud'],                           price_ils:368000 },
  { make_slug:'lexus', model_slug:'nx', name:'NX 350h Luxury',  sort_order:4, engine_type:'hybrid', engine_cc:2487, engine_hp:243, transmission:'cvt',       drive:'awd', seats:'leather',     screen_size:14,   features:[...T,'hud'],                           price_ils:338000 },

  // ── Lexus RX ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'rx', name:'RX 350 Urban',    sort_order:0, engine_type:'petrol', engine_cc:2393, engine_hp:279, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:12.3, features:[...M,'camera_360','auto_lights'],  price_ils:318000 },
  { make_slug:'lexus', model_slug:'rx', name:'RX 350h Comfort', sort_order:1, engine_type:'hybrid', engine_cc:2487, engine_hp:246, transmission:'cvt',       drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                      price_ils:368000 },
  { make_slug:'lexus', model_slug:'rx', name:'RX 450h+ F Sport',sort_order:2, engine_type:'phev',   engine_cc:2487, engine_hp:309, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                      price_ils:418000 },
  { make_slug:'lexus', model_slug:'rx', name:'RX 500h F Sport', sort_order:3, engine_type:'hybrid', engine_cc:2393, engine_hp:371, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                      price_ils:458000 },
  { make_slug:'lexus', model_slug:'rx', name:'RX 350h Luxury',  sort_order:4, engine_type:'hybrid', engine_cc:2487, engine_hp:246, transmission:'cvt',       drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                      price_ils:398000 },

  // ── Lexus ES ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'es', name:'ES 250 Urban',   sort_order:0, engine_type:'petrol', engine_cc:2487, engine_hp:203, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8,  features:[...M,'auto_lights'],    price_ils:268000 },
  { make_slug:'lexus', model_slug:'es', name:'ES 300h Comfort',sort_order:1, engine_type:'hybrid', engine_cc:2487, engine_hp:218, transmission:'cvt',       drive:'fwd', seats:'leather',     screen_size:12.3,features:[...T,'hud'],           price_ils:308000 },
  { make_slug:'lexus', model_slug:'es', name:'ES 300h Luxury', sort_order:2, engine_type:'hybrid', engine_cc:2487, engine_hp:218, transmission:'cvt',       drive:'fwd', seats:'leather',     screen_size:12.3,features:[...T,'hud'],           price_ils:338000 },

  // ── Lexus IS ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'is', name:'IS 300h Urban',   sort_order:0, engine_type:'hybrid', engine_cc:2494, engine_hp:223, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:8,    features:[...M,'auto_lights'],  price_ils:248000 },
  { make_slug:'lexus', model_slug:'is', name:'IS 300h Comfort', sort_order:1, engine_type:'hybrid', engine_cc:2494, engine_hp:223, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.3, features:[...T,'hud'],           price_ils:288000 },

  // ── Lexus UX ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'ux', name:'UX 250h Urban',   sort_order:0, engine_type:'hybrid', engine_cc:1987, engine_hp:178, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:7, features:[...M,'auto_lights'],  price_ils:228000 },
  { make_slug:'lexus', model_slug:'ux', name:'UX 250h Comfort', sort_order:1, engine_type:'hybrid', engine_cc:1987, engine_hp:178, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:7, features:[...T,'hud'],           price_ils:258000 },

  // ── Lexus RZ ──────────────────────────────────────────────────────────────────
  { make_slug:'lexus', model_slug:'rz', name:'RZ 450e Urban',   sort_order:0, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:14, features:[...M,'camera_360','digital_cluster'],    price_ils:338000 },
  { make_slug:'lexus', model_slug:'rz', name:'RZ 450e Comfort', sort_order:1, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:14, features:[...T,'hud','digital_cluster'],            price_ils:378000 },

  // ── Porsche 911 ───────────────────────────────────────────────────────────────
  { make_slug:'porsche', model_slug:'911', name:'Carrera',        sort_order:0, engine_type:'petrol', engine_cc:2981, engine_hp:385, transmission:'dct', drive:'rwd', seats:'leatherette', screen_size:10.9, features:[...M,'digital_cluster','ambient_lighting'],       price_ils:598000 },
  { make_slug:'porsche', model_slug:'911', name:'Carrera S',      sort_order:1, engine_type:'petrol', engine_cc:2981, engine_hp:450, transmission:'dct', drive:'rwd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                    price_ils:728000 },
  { make_slug:'porsche', model_slug:'911', name:'Carrera 4S',     sort_order:2, engine_type:'petrol', engine_cc:2981, engine_hp:450, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                    price_ils:798000 },
  { make_slug:'porsche', model_slug:'911', name:'Turbo',          sort_order:3, engine_type:'petrol', engine_cc:3745, engine_hp:580, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                    price_ils:1198000 },
  { make_slug:'porsche', model_slug:'911', name:'Turbo S',        sort_order:4, engine_type:'petrol', engine_cc:3745, engine_hp:650, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                    price_ils:1498000 },

  // ── Porsche Macan ─────────────────────────────────────────────────────────────
  { make_slug:'porsche', model_slug:'macan', name:'Macan',          sort_order:0, engine_type:'electric', engine_hp:408, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:10.9, features:[...M,'digital_cluster','ambient_lighting'],   price_ils:358000 },
  { make_slug:'porsche', model_slug:'macan', name:'Macan 4',        sort_order:1, engine_type:'electric', engine_hp:408, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                price_ils:418000 },
  { make_slug:'porsche', model_slug:'macan', name:'Macan 4S',       sort_order:2, engine_type:'electric', engine_hp:516, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                price_ils:488000 },
  { make_slug:'porsche', model_slug:'macan', name:'Macan Turbo',    sort_order:3, engine_type:'electric', engine_hp:639, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                price_ils:578000 },
  { make_slug:'porsche', model_slug:'macan', name:'Macan GTS',      sort_order:4, engine_type:'electric', engine_hp:516, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],                price_ils:508000 },

  // ── Porsche Cayenne ───────────────────────────────────────────────────────────
  { make_slug:'porsche', model_slug:'cayenne', name:'Cayenne',        sort_order:0, engine_type:'phev', engine_cc:2894, engine_hp:346, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:548000 },
  { make_slug:'porsche', model_slug:'cayenne', name:'Cayenne S',      sort_order:1, engine_type:'petrol', engine_cc:2894, engine_hp:474, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:698000 },
  { make_slug:'porsche', model_slug:'cayenne', name:'Cayenne GTS',    sort_order:2, engine_type:'petrol', engine_cc:3996, engine_hp:500, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:828000 },
  { make_slug:'porsche', model_slug:'cayenne', name:'Cayenne Turbo',  sort_order:3, engine_type:'petrol', engine_cc:3996, engine_hp:650, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:1098000 },

  // ── Porsche Taycan ────────────────────────────────────────────────────────────
  { make_slug:'porsche', model_slug:'taycan', name:'Taycan',          sort_order:0, engine_type:'electric', engine_hp:408, transmission:'automatic', drive:'rwd', seats:'leatherette', screen_size:10.9, features:[...M,'digital_cluster','ambient_lighting'], price_ils:498000 },
  { make_slug:'porsche', model_slug:'taycan', name:'4S',              sort_order:1, engine_type:'electric', engine_hp:571, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],              price_ils:628000 },
  { make_slug:'porsche', model_slug:'taycan', name:'GTS',             sort_order:2, engine_type:'electric', engine_hp:598, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],              price_ils:728000 },
  { make_slug:'porsche', model_slug:'taycan', name:'Turbo',           sort_order:3, engine_type:'electric', engine_hp:680, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],              price_ils:878000 },
  { make_slug:'porsche', model_slug:'taycan', name:'Turbo S',         sort_order:4, engine_type:'electric', engine_hp:938, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.9, features:[...T,'hud','digital_cluster'],              price_ils:1098000 },

  // ── Porsche Panamera ──────────────────────────────────────────────────────────
  { make_slug:'porsche', model_slug:'panamera', name:'Panamera',      sort_order:0, engine_type:'phev', engine_cc:2894, engine_hp:462, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:648000 },
  { make_slug:'porsche', model_slug:'panamera', name:'4S',            sort_order:1, engine_type:'petrol', engine_cc:2894, engine_hp:474, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:798000 },
  { make_slug:'porsche', model_slug:'panamera', name:'GTS',           sort_order:2, engine_type:'petrol', engine_cc:3996, engine_hp:500, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:928000 },
  { make_slug:'porsche', model_slug:'panamera', name:'Turbo E-Hybrid',sort_order:3, engine_type:'phev', engine_cc:3996, engine_hp:739, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:1098000 },
];

async function upsert(trim) {
  const res = await fetch(`${URL_BASE}/rest/v1/car_trims`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(trim),
  });
  return res.ok || res.status === 204 || res.status === 201;
}

let ok = 0, fail = 0;
for (const t of TRIMS) {
  const success = await upsert(t);
  if (success) { process.stdout.write('✓'); ok++; } else { process.stdout.write('✗'); fail++; }
}
console.log(`\n\nDone. OK: ${ok}  Failed: ${fail}`);
