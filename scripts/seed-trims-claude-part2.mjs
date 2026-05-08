/**
 * Part 2: VW Group (VW, Skoda, Seat, Cupra, Audi), BMW remaining, Mercedes remaining
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
  // ── VW Polo ──────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'polo', name:'Life',    sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                                                 price_ils:116000 },
  { make_slug:'volkswagen', model_slug:'polo', name:'Style',   sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'auto_lights','heated_steering'],                                                 price_ils:131000 },
  { make_slug:'volkswagen', model_slug:'polo', name:'R-Line',  sort_order:2, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'ambient_lighting','auto_lights'],                                               price_ils:141000 },

  // ── VW Tiguan ─────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'tiguan', name:'Life',       sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                  price_ils:159000 },
  { make_slug:'volkswagen', model_slug:'tiguan', name:'Elegance',   sort_order:1, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'heated_steering','auto_lights'],                   price_ils:179000 },
  { make_slug:'volkswagen', model_slug:'tiguan', name:'R-Line',     sort_order:2, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct', drive:'awd', seats:'leatherette', screen_size:10.25,features:[...M,'ambient_lighting','camera_360','heated_steering'], price_ils:199000 },
  { make_slug:'volkswagen', model_slug:'tiguan', name:'R',          sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:320, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T],                                                   price_ils:239000 },

  // ── VW T-Roc ──────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'troc', name:'Life',    sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],              price_ils:141000 },
  { make_slug:'volkswagen', model_slug:'troc', name:'Style',   sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'heated_steering','auto_lights'],               price_ils:158000 },
  { make_slug:'volkswagen', model_slug:'troc', name:'R-Line',  sort_order:2, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',       drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'ambient_lighting','auto_lights'],              price_ils:172000 },
  { make_slug:'volkswagen', model_slug:'troc', name:'R-Line 4Motion', sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct', drive:'awd', seats:'leather', screen_size:9.2, features:[...T], price_ils:196000 },

  // ── VW Passat ─────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'passat', name:'Life',     sort_order:0, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M,'auto_lights'],              price_ils:179000 },
  { make_slug:'volkswagen', model_slug:'passat', name:'Elegance', sort_order:1, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25, features:[...M,'panoramic_roof','auto_lights'], price_ils:196000 },
  { make_slug:'volkswagen', model_slug:'passat', name:'R-Line',   sort_order:2, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25, features:[...T],                            price_ils:214000 },
  { make_slug:'volkswagen', model_slug:'passat', name:'Variant R-Line', sort_order:3, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'awd', seats:'leather', screen_size:10.25, features:[...T], price_ils:228000 },

  // ── VW ID.3 ──────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'id3', name:'Pro', sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12, features:[...M,'camera_360','ambient_lighting','heated_steering'], price_ils:168000 },

  // ── VW ID.4 ──────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'id4', name:'Pro', sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12, features:[...M,'camera_360','ambient_lighting','heated_steering'], price_ils:188000 },

  // ── VW Taigo ──────────────────────────────────────────────────────────────────
  { make_slug:'volkswagen', model_slug:'taigo', name:'R-Line', sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:110, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2, features:[...M,'auto_lights'], price_ils:148000 },

  // ── Skoda Octavia ─────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'octavia', name:'Active',     sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:110, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8.25, features:[...B,'wireless_carplay','auto_lights'],              price_ils:129000 },
  { make_slug:'skoda', model_slug:'octavia', name:'Ambition',   sort_order:1, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',       drive:'fwd', seats:'leatherette', screen_size:10,   features:[...M,'auto_lights'],                                price_ils:148000 },
  { make_slug:'skoda', model_slug:'octavia', name:'Style',      sort_order:2, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',       drive:'fwd', seats:'leather',     screen_size:10,   features:[...M,'panoramic_roof','camera_360','auto_lights'],  price_ils:168000 },
  { make_slug:'skoda', model_slug:'octavia', name:'Sportline',  sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct',       drive:'awd', seats:'leather',     screen_size:10,   features:[...T],                                              price_ils:185000 },
  { make_slug:'skoda', model_slug:'octavia', name:'RS',         sort_order:4, engine_type:'petrol', engine_cc:1984, engine_hp:245, transmission:'dct',       drive:'awd', seats:'leather',     screen_size:10,   features:[...T],                                              price_ils:209000 },

  // ── Skoda Kodiaq ──────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'kodiaq', name:'Active',     sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'automatic', drive:'fwd', seat_count:7, seats:'fabric',      screen_size:9.2, features:[...B,'wireless_carplay','auto_lights'],       price_ils:168000 },
  { make_slug:'skoda', model_slug:'kodiaq', name:'Ambition',   sort_order:1, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10,  features:[...M,'auto_lights'],                          price_ils:188000 },
  { make_slug:'skoda', model_slug:'kodiaq', name:'Style',      sort_order:2, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct',       drive:'awd', seat_count:7, seats:'leather',     screen_size:13,  features:[...M,'panoramic_roof','camera_360','auto_lights'], price_ils:209000 },
  { make_slug:'skoda', model_slug:'kodiaq', name:'Sportline',  sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct',       drive:'awd', seat_count:7, seats:'leather',     screen_size:13,  features:[...T],                                       price_ils:225000 },
  { make_slug:'skoda', model_slug:'kodiaq', name:'L&K',        sort_order:4, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct',       drive:'awd', seat_count:7, seats:'leather',     screen_size:13,  features:[...T,'hud'],                                 price_ils:241000 },

  // ── Skoda Karoq ───────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'karoq', name:'Active',   sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8.25, features:[...B,'wireless_carplay','auto_lights'],          price_ils:136000 },
  { make_slug:'skoda', model_slug:'karoq', name:'Ambition', sort_order:1, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',       drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'auto_lights'],                             price_ils:152000 },
  { make_slug:'skoda', model_slug:'karoq', name:'Style',    sort_order:2, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',       drive:'awd', seats:'leather',     screen_size:9.2,  features:[...M,'panoramic_roof','camera_360','auto_lights'], price_ils:172000 },
  { make_slug:'skoda', model_slug:'karoq', name:'Sportline',sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct',       drive:'awd', seats:'leather',     screen_size:10,   features:[...T],                                           price_ils:188000 },

  // ── Skoda Kamiq ───────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'kamiq', name:'Active',   sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8.25, features:[...B,'wireless_carplay','auto_lights'], price_ils:118000 },
  { make_slug:'skoda', model_slug:'kamiq', name:'Ambition', sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'auto_lights'],                    price_ils:132000 },
  { make_slug:'skoda', model_slug:'kamiq', name:'Style',    sort_order:2, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.2,  features:[...M,'panoramic_roof','auto_lights'],   price_ils:148000 },
  { make_slug:'skoda', model_slug:'kamiq', name:'Monte Carlo',sort_order:3, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct',    drive:'fwd', seats:'leather',     screen_size:9.2,  features:[...T],                                  price_ils:162000 },

  // ── Skoda Fabia ───────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'fabia', name:'Active',      sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:65,  transmission:'manual',    drive:'fwd', seats:'fabric',      screen_size:6.5,  features:['aeb','rear_camera','parking_sensors','apple_carplay','led_lights'], price_ils:96000 },
  { make_slug:'skoda', model_slug:'fabia', name:'Ambition',    sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8.25, features:[...B,'wireless_carplay','auto_lights'],                            price_ils:109000 },
  { make_slug:'skoda', model_slug:'fabia', name:'Style',       sort_order:2, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'auto_lights'],                                               price_ils:122000 },
  { make_slug:'skoda', model_slug:'fabia', name:'Monte Carlo', sort_order:3, engine_type:'petrol', engine_cc:999,  engine_hp:115, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'heated_steering','ambient_lighting'],                        price_ils:132000 },
  { make_slug:'skoda', model_slug:'fabia', name:'RS',          sort_order:4, engine_type:'petrol', engine_cc:1498, engine_hp:207, transmission:'dct',       drive:'fwd', seats:'leather',     screen_size:9.2,  features:[...T],                                                             price_ils:155000 },

  // ── Skoda Superb ──────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'superb', name:'Ambition',  sort_order:0, engine_type:'hybrid', engine_cc:1395, engine_hp:218, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'auto_lights'],                           price_ils:198000 },
  { make_slug:'skoda', model_slug:'superb', name:'Style',     sort_order:1, engine_type:'hybrid', engine_cc:1395, engine_hp:218, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'panoramic_roof','camera_360','auto_lights'], price_ils:219000 },
  { make_slug:'skoda', model_slug:'superb', name:'Sportline', sort_order:2, engine_type:'hybrid', engine_cc:1395, engine_hp:218, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10, features:[...T],                                          price_ils:238000 },
  { make_slug:'skoda', model_slug:'superb', name:'L&K',       sort_order:3, engine_type:'hybrid', engine_cc:1395, engine_hp:218, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10, features:[...T,'hud'],                                    price_ils:258000 },
  { make_slug:'skoda', model_slug:'superb', name:'L&K iV',    sort_order:4, engine_type:'phev',   engine_cc:1395, engine_hp:218, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10, features:[...T,'hud'],                                    price_ils:272000 },

  // ── Skoda Enyaq ───────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'enyaq', name:'iV60',  sort_order:0, engine_type:'electric', engine_hp:177, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:13, features:[...M,'camera_360','ambient_lighting','heated_steering'], price_ils:178000 },
  { make_slug:'skoda', model_slug:'enyaq', name:'iV80',  sort_order:1, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:13, features:[...M,'camera_360','ambient_lighting','heated_steering'], price_ils:196000 },
  { make_slug:'skoda', model_slug:'enyaq', name:'RS iV', sort_order:2, engine_type:'electric', engine_hp:299, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:13, features:[...T,'hud'],                                              price_ils:228000 },

  // ── Skoda Scala ───────────────────────────────────────────────────────────────
  { make_slug:'skoda', model_slug:'scala', name:'Ambition', sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:95, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2, features:[...M,'auto_lights'], price_ils:131000 },

  // ── Seat Arona ────────────────────────────────────────────────────────────────
  { make_slug:'seat', model_slug:'arona', name:'Style',   sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8,   features:[...B,'wireless_carplay','auto_lights'],  price_ils:128000 },
  { make_slug:'seat', model_slug:'arona', name:'FR',      sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:110, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2, features:[...M,'ambient_lighting','auto_lights'],   price_ils:145000 },

  // ── Seat Ateca ────────────────────────────────────────────────────────────────
  { make_slug:'seat', model_slug:'ateca', name:'Style',   sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'auto_lights'],              price_ils:151000 },
  { make_slug:'seat', model_slug:'ateca', name:'FR',      sort_order:1, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T],                            price_ils:179000 },

  // ── Seat Ibiza ────────────────────────────────────────────────────────────────
  { make_slug:'seat', model_slug:'ibiza', name:'Style',   sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:8.25, features:[...B,'wireless_carplay','auto_lights'], price_ils:114000 },
  { make_slug:'seat', model_slug:'ibiza', name:'FR',      sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:115, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.2,  features:[...M,'ambient_lighting','auto_lights'],  price_ils:129000 },

  // ── Seat Leon ─────────────────────────────────────────────────────────────────
  { make_slug:'seat', model_slug:'leon', name:'FR', sort_order:0, engine_type:'hybrid', engine_cc:1395, engine_hp:204, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'ambient_lighting','auto_lights'], price_ils:156000 },

  // ── Cupra Formentor ───────────────────────────────────────────────────────────
  { make_slug:'cupra', model_slug:'formentor', name:'VZ 245',     sort_order:0, engine_type:'petrol', engine_cc:1984, engine_hp:245, transmission:'dct', drive:'awd', seats:'leatherette', screen_size:12, features:[...M,'ambient_lighting','camera_360','digital_cluster'],      price_ils:198000 },
  { make_slug:'cupra', model_slug:'formentor', name:'VZ 310',     sort_order:1, engine_type:'petrol', engine_cc:1984, engine_hp:310, transmission:'dct', drive:'awd', seats:'leather',     screen_size:12, features:[...T,'hud'],                                                  price_ils:225000 },
  { make_slug:'cupra', model_slug:'formentor', name:'VZ5 390',    sort_order:2, engine_type:'petrol', engine_cc:2480, engine_hp:390, transmission:'dct', drive:'awd', seats:'leather',     screen_size:12, features:[...T,'hud'],                                                  price_ils:269000 },
  { make_slug:'cupra', model_slug:'formentor', name:'eHybrid 204',sort_order:3, engine_type:'phev',   engine_cc:1395, engine_hp:204, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:12, features:[...T],                                                        price_ils:209000 },
  { make_slug:'cupra', model_slug:'formentor', name:'eHybrid 272',sort_order:4, engine_type:'phev',   engine_cc:1984, engine_hp:272, transmission:'dct', drive:'awd', seats:'leather',     screen_size:12, features:[...T,'hud'],                                                  price_ils:241000 },

  // ── Cupra Born ────────────────────────────────────────────────────────────────
  { make_slug:'cupra', model_slug:'born', name:'58kWh',         sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12, features:[...M,'camera_360','ambient_lighting','heated_steering'],  price_ils:168000 },
  { make_slug:'cupra', model_slug:'born', name:'77kWh',         sort_order:1, engine_type:'electric', engine_hp:231, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:12, features:[...T,'hud'],                                              price_ils:196000 },
  { make_slug:'cupra', model_slug:'born', name:'VZ 77kWh',      sort_order:2, engine_type:'electric', engine_hp:231, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:12, features:[...T,'hud'],                                              price_ils:211000 },

  // ── Cupra Ateca ───────────────────────────────────────────────────────────────
  { make_slug:'cupra', model_slug:'ateca', name:'300', sort_order:0, engine_type:'petrol', engine_cc:1984, engine_hp:300, transmission:'dct', drive:'awd', seats:'leather', screen_size:9.2, features:[...T], price_ils:228000 },

  // ── Audi A3 ───────────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'a3', name:'Advanced',        sort_order:0, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.1, features:[...M,'auto_lights'],               price_ils:178000 },
  { make_slug:'audi', model_slug:'a3', name:'S Line',          sort_order:1, engine_type:'hybrid', engine_cc:1395, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.1, features:[...M,'ambient_lighting','auto_lights'], price_ils:198000 },
  { make_slug:'audi', model_slug:'a3', name:'S Line Black',    sort_order:2, engine_type:'hybrid', engine_cc:1984, engine_hp:190, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.1, features:[...T,'hud'],                        price_ils:218000 },
  { make_slug:'audi', model_slug:'a3', name:'S3',              sort_order:3, engine_type:'petrol', engine_cc:1984, engine_hp:310, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.1, features:[...T,'hud'],                        price_ils:249000 },
  { make_slug:'audi', model_slug:'a3', name:'RS3',             sort_order:4, engine_type:'petrol', engine_cc:2480, engine_hp:400, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.1, features:[...T,'hud'],                        price_ils:329000 },

  // ── Audi A4 ───────────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'a4', name:'Advanced', sort_order:0, engine_type:'hybrid', engine_cc:1984, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:10.1, features:[...M,'auto_lights'], price_ils:228000 },

  // ── Audi A6 ───────────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'a6', name:'Advanced',     sort_order:0, engine_type:'hybrid', engine_cc:1984, engine_hp:245, transmission:'automatic', drive:'fwd', seats:'leather',  screen_size:10.1, features:[...M,'auto_lights'],      price_ils:268000 },
  { make_slug:'audi', model_slug:'a6', name:'S Line',       sort_order:1, engine_type:'hybrid', engine_cc:2995, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather',  screen_size:10.1, features:[...T,'hud'],              price_ils:318000 },
  { make_slug:'audi', model_slug:'a6', name:'Competition',  sort_order:2, engine_type:'hybrid', engine_cc:2995, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather',  screen_size:10.1, features:[...T,'hud'],              price_ils:348000 },

  // ── Audi Q3 ───────────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'q3', name:'Advanced',  sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.1, features:[...M,'auto_lights'],          price_ils:198000 },
  { make_slug:'audi', model_slug:'q3', name:'S Line',    sort_order:1, engine_type:'petrol', engine_cc:1984, engine_hp:190, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.1, features:[...M,'panoramic_roof','auto_lights'], price_ils:225000 },
  { make_slug:'audi', model_slug:'q3', name:'RS Q3',     sort_order:2, engine_type:'petrol', engine_cc:2480, engine_hp:400, transmission:'dct', drive:'awd', seats:'leather',     screen_size:10.1, features:[...T,'hud'],                  price_ils:319000 },

  // ── Audi Q5 ───────────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'q5', name:'Advanced',     sort_order:0, engine_type:'hybrid', engine_cc:1984, engine_hp:245, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...M,'camera_360','auto_lights'], price_ils:268000 },
  { make_slug:'audi', model_slug:'q5', name:'S Line',       sort_order:1, engine_type:'hybrid', engine_cc:2995, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                   price_ils:318000 },
  { make_slug:'audi', model_slug:'q5', name:'Competition',  sort_order:2, engine_type:'hybrid', engine_cc:2995, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                   price_ils:348000 },
  { make_slug:'audi', model_slug:'q5', name:'SQ5',          sort_order:3, engine_type:'petrol', engine_cc:2995, engine_hp:354, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                   price_ils:378000 },
  { make_slug:'audi', model_slug:'q5', name:'RSQ5',         sort_order:4, engine_type:'petrol', engine_cc:2480, engine_hp:450, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                   price_ils:439000 },

  // ── Audi e-tron ───────────────────────────────────────────────────────────────
  { make_slug:'audi', model_slug:'etron', name:'50',   sort_order:0, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...M,'camera_360','auto_lights'],          price_ils:298000 },
  { make_slug:'audi', model_slug:'etron', name:'55',   sort_order:1, engine_type:'electric', engine_hp:408, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                              price_ils:348000 },
  { make_slug:'audi', model_slug:'etron', name:'S',    sort_order:2, engine_type:'electric', engine_hp:503, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T,'hud'],                              price_ils:398000 },

  // ── BMW 1 Series ──────────────────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'series1', name:'118i',       sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],                price_ils:198000 },
  { make_slug:'bmw', model_slug:'series1', name:'120i',       sort_order:1, engine_type:'petrol', engine_cc:1998, engine_hp:170, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'ambient_lighting','auto_lights'], price_ils:218000 },
  { make_slug:'bmw', model_slug:'series1', name:'M135i xDrive',sort_order:2, engine_type:'petrol', engine_cc:1998, engine_hp:306, transmission:'automatic', drive:'awd', seats:'leather',   screen_size:10.25,features:[...T,'hud'],                          price_ils:268000 },
  { make_slug:'bmw', model_slug:'series1', name:'M140i xDrive',sort_order:3, engine_type:'petrol', engine_cc:2998, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather',   screen_size:10.25,features:[...T,'hud'],                          price_ils:299000 },

  // ── BMW 5 Series ──────────────────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'series5', name:'520i',       sort_order:0, engine_type:'hybrid', engine_cc:1998, engine_hp:208, transmission:'automatic', drive:'fwd', seats:'leather',  screen_size:12.3, features:[...M,'auto_lights','digital_cluster'],       price_ils:298000 },
  { make_slug:'bmw', model_slug:'series5', name:'530i',       sort_order:1, engine_type:'hybrid', engine_cc:1998, engine_hp:245, transmission:'automatic', drive:'fwd', seats:'leather',  screen_size:12.3, features:[...M,'panoramic_roof','auto_lights','digital_cluster'], price_ils:338000 },
  { make_slug:'bmw', model_slug:'series5', name:'530i xDrive',sort_order:2, engine_type:'hybrid', engine_cc:1998, engine_hp:245, transmission:'automatic', drive:'awd', seats:'leather',  screen_size:12.3, features:[...T,'hud','digital_cluster'],                price_ils:368000 },
  { make_slug:'bmw', model_slug:'series5', name:'540i xDrive',sort_order:3, engine_type:'hybrid', engine_cc:2998, engine_hp:380, transmission:'automatic', drive:'awd', seats:'leather',  screen_size:12.3, features:[...T,'hud','digital_cluster'],                price_ils:428000 },
  { make_slug:'bmw', model_slug:'series5', name:'M550i xDrive',sort_order:4, engine_type:'hybrid', engine_cc:4394, engine_hp:530, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],                price_ils:528000 },

  // ── BMW X1 ────────────────────────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'x1', name:'sDrive18i',  sort_order:0, engine_type:'petrol', engine_cc:1498, engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],                        price_ils:218000 },
  { make_slug:'bmw', model_slug:'x1', name:'sDrive20i',  sort_order:1, engine_type:'petrol', engine_cc:1998, engine_hp:170, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'ambient_lighting','auto_lights'],     price_ils:238000 },
  { make_slug:'bmw', model_slug:'x1', name:'xDrive23i',  sort_order:2, engine_type:'petrol', engine_cc:1998, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...M,'panoramic_roof','ambient_lighting'],  price_ils:261000 },
  { make_slug:'bmw', model_slug:'x1', name:'xDrive23d',  sort_order:3, engine_type:'diesel', engine_cc:1995, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],                               price_ils:279000 },
  { make_slug:'bmw', model_slug:'x1', name:'iX1 xDrive30',sort_order:4, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'awd', seats:'leather',                  screen_size:10.25,features:[...T,'hud'],                               price_ils:298000 },
  { make_slug:'bmw', model_slug:'x1', name:'M35i xDrive',sort_order:5, engine_type:'petrol', engine_cc:1998, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],                               price_ils:318000 },

  // ── BMW X3 ────────────────────────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'x3', name:'xDrive20i',    sort_order:0, engine_type:'petrol', engine_cc:1998, engine_hp:184, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:12.3, features:[...M,'auto_lights'],                      price_ils:278000 },
  { make_slug:'bmw', model_slug:'x3', name:'xDrive30i',    sort_order:1, engine_type:'petrol', engine_cc:1998, engine_hp:245, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...M,'panoramic_roof','auto_lights'],      price_ils:319000 },
  { make_slug:'bmw', model_slug:'x3', name:'xDrive30d',    sort_order:2, engine_type:'diesel', engine_cc:2993, engine_hp:286, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                              price_ils:348000 },
  { make_slug:'bmw', model_slug:'x3', name:'M40i xDrive',  sort_order:3, engine_type:'petrol', engine_cc:2998, engine_hp:360, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                              price_ils:398000 },
  { make_slug:'bmw', model_slug:'x3', name:'iX3',          sort_order:4, engine_type:'electric',              engine_hp:286, transmission:'automatic', drive:'rwd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                              price_ils:338000 },

  // ── BMW iX3 (separate model) ──────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'ix3', name:'Impressive',  sort_order:0, engine_type:'electric', engine_hp:286, transmission:'automatic', drive:'rwd', seats:'leather',  screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:328000 },
  { make_slug:'bmw', model_slug:'ix3', name:'M Sport',     sort_order:1, engine_type:'electric', engine_hp:286, transmission:'automatic', drive:'rwd', seats:'leather',  screen_size:12.3, features:[...T,'hud','digital_cluster'], price_ils:349000 },

  // ── BMW X5 ────────────────────────────────────────────────────────────────────
  { make_slug:'bmw', model_slug:'x5', name:'xDrive40i',    sort_order:0, engine_type:'petrol', engine_cc:2998, engine_hp:340, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:478000 },
  { make_slug:'bmw', model_slug:'x5', name:'xDrive50e',    sort_order:1, engine_type:'phev',   engine_cc:2998, engine_hp:489, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:528000 },
  { make_slug:'bmw', model_slug:'x5', name:'xDrive45e',    sort_order:2, engine_type:'phev',   engine_cc:2998, engine_hp:394, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:508000 },
  { make_slug:'bmw', model_slug:'x5', name:'M60i xDrive',  sort_order:3, engine_type:'petrol', engine_cc:4394, engine_hp:530, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:608000 },
  { make_slug:'bmw', model_slug:'x5', name:'X5 M',         sort_order:4, engine_type:'petrol', engine_cc:4394, engine_hp:625, transmission:'automatic', drive:'awd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],  price_ils:749000 },

  // ── Mercedes A-class variants ─────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'a180', name:'Progressive',  sort_order:0, engine_type:'petrol', engine_cc:1332, engine_hp:136, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],                    price_ils:198000 },
  { make_slug:'mercedes', model_slug:'a180', name:'AMG Line',     sort_order:1, engine_type:'petrol', engine_cc:1332, engine_hp:136, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'ambient_lighting','auto_lights'],  price_ils:218000 },

  { make_slug:'mercedes', model_slug:'a200', name:'Progressive',  sort_order:0, engine_type:'petrol', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],                    price_ils:218000 },
  { make_slug:'mercedes', model_slug:'a200', name:'AMG Line',     sort_order:1, engine_type:'petrol', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'ambient_lighting','auto_lights'],  price_ils:238000 },
  { make_slug:'mercedes', model_slug:'a200', name:'Night Package', sort_order:2, engine_type:'petrol', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leather',   screen_size:10.25,features:[...T,'hud'],                              price_ils:258000 },

  { make_slug:'mercedes', model_slug:'a220', name:'AMG Line',  sort_order:0, engine_type:'petrol', engine_cc:1991, engine_hp:190, transmission:'dct', drive:'fwd', seats:'leather', screen_size:10.25,features:[...M,'ambient_lighting','auto_lights'],  price_ils:248000 },
  { make_slug:'mercedes', model_slug:'a220', name:'Night',     sort_order:1, engine_type:'petrol', engine_cc:1991, engine_hp:190, transmission:'dct', drive:'fwd', seats:'leather', screen_size:10.25,features:[...T,'hud'],                              price_ils:272000 },

  { make_slug:'mercedes', model_slug:'a250', name:'AMG Line', sort_order:0, engine_type:'petrol', engine_cc:1991, engine_hp:224, transmission:'dct', drive:'fwd', seats:'leather', screen_size:10.25,features:[...T,'hud'], price_ils:288000 },

  { make_slug:'mercedes', model_slug:'a35-amg', name:'AMG A 35',       sort_order:0, engine_type:'petrol', engine_cc:1991, engine_hp:306, transmission:'dct', drive:'awd', seats:'leather', screen_size:10.25,features:[...T,'hud'], price_ils:348000 },
  { make_slug:'mercedes', model_slug:'a35-amg', name:'AMG A 35 4MATIC',sort_order:1, engine_type:'petrol', engine_cc:1991, engine_hp:306, transmission:'dct', drive:'awd', seats:'leather', screen_size:10.25,features:[...T,'hud'], price_ils:358000 },

  { make_slug:'mercedes', model_slug:'a45-amg', name:'AMG A 45 S',     sort_order:0, engine_type:'petrol', engine_cc:1991, engine_hp:421, transmission:'dct', drive:'awd', seats:'leather', screen_size:10.25,features:[...T,'hud'], price_ils:428000 },

  { make_slug:'mercedes', model_slug:'b-class', name:'B 200', sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'], price_ils:218000 },

  // ── Mercedes C-class variants ─────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'c180', name:'Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1496, engine_hp:170, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:11.9,features:[...M,'digital_cluster','auto_lights'],              price_ils:238000 },
  { make_slug:'mercedes', model_slug:'c180', name:'AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1496, engine_hp:170, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:11.9,features:[...M,'digital_cluster','ambient_lighting','auto_lights'], price_ils:258000 },

  { make_slug:'mercedes', model_slug:'c200', name:'Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:11.9,features:[...M,'digital_cluster','auto_lights'],              price_ils:258000 },
  { make_slug:'mercedes', model_slug:'c200', name:'AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:11.9,features:[...M,'digital_cluster','ambient_lighting'],         price_ils:278000 },
  { make_slug:'mercedes', model_slug:'c200', name:'AMG Night',   sort_order:2, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:11.9,features:[...T,'hud','digital_cluster'],                    price_ils:299000 },

  { make_slug:'mercedes', model_slug:'c220d', name:'Progressive', sort_order:0, engine_type:'diesel', engine_cc:1992, engine_hp:200, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:11.9,features:[...M,'digital_cluster','auto_lights'],  price_ils:268000 },
  { make_slug:'mercedes', model_slug:'c220d', name:'AMG Line',    sort_order:1, engine_type:'diesel', engine_cc:1992, engine_hp:200, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:11.9,features:[...T,'hud','digital_cluster'],           price_ils:298000 },

  { make_slug:'mercedes', model_slug:'c300', name:'AMG Line',    sort_order:0, engine_type:'hybrid', engine_cc:1999, engine_hp:258, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:11.9,features:[...T,'hud','digital_cluster'],  price_ils:318000 },
  { make_slug:'mercedes', model_slug:'c300', name:'AMG Night',   sort_order:1, engine_type:'hybrid', engine_cc:1999, engine_hp:258, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:11.9,features:[...T,'hud','digital_cluster'],  price_ils:338000 },

  { make_slug:'mercedes', model_slug:'c300d', name:'AMG Line', sort_order:0, engine_type:'diesel', engine_cc:1992, engine_hp:265, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:11.9,features:[...T,'hud','digital_cluster'],  price_ils:328000 },

  { make_slug:'mercedes', model_slug:'c43-amg', name:'AMG C 43',       sort_order:0, engine_type:'hybrid', engine_cc:1999, engine_hp:408, transmission:'automatic', drive:'awd', seats:'leather', screen_size:11.9,features:[...T,'hud','digital_cluster'], price_ils:418000 },
  { make_slug:'mercedes', model_slug:'c63-amg', name:'AMG C 63 S E Performance', sort_order:0, engine_type:'phev', engine_cc:1999, engine_hp:680, transmission:'automatic', drive:'awd', seats:'leather', screen_size:11.9, features:[...T,'hud','digital_cluster'], price_ils:568000 },

  // ── Mercedes CLA ──────────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'cla', name:'Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],             price_ils:228000 },
  { make_slug:'mercedes', model_slug:'cla', name:'AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'ambient_lighting'],        price_ils:248000 },

  // ── Mercedes GLA ──────────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'gla', name:'AMG Line', sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seats:'leather', screen_size:10.25,features:[...M,'camera_360','auto_lights'], price_ils:258000 },

  // ── Mercedes GLB ──────────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'glb', name:'Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],         price_ils:258000 },
  { make_slug:'mercedes', model_slug:'glb', name:'AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1332, engine_hp:163, transmission:'dct', drive:'awd', seat_count:7, seats:'leather',     screen_size:10.25,features:[...M,'camera_360','auto_lights'], price_ils:285000 },

  // ── Mercedes GLC ──────────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'glc', name:'Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:11.9,features:[...M,'digital_cluster','auto_lights'],              price_ils:298000 },
  { make_slug:'mercedes', model_slug:'glc', name:'AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.9,features:[...M,'digital_cluster','camera_360','panoramic_roof'], price_ils:338000 },
  { make_slug:'mercedes', model_slug:'glc', name:'AMG Night',   sort_order:2, engine_type:'hybrid', engine_cc:1999, engine_hp:258, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.9,features:[...T,'hud','digital_cluster'],                    price_ils:368000 },
  { make_slug:'mercedes', model_slug:'glc', name:'300e 4MATIC', sort_order:3, engine_type:'phev',   engine_cc:1999, engine_hp:313, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.9,features:[...T,'hud','digital_cluster'],                    price_ils:398000 },

  // ── Mercedes E-class ──────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'e-class', name:'E 200 Progressive', sort_order:0, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:12.3, features:[...M,'digital_cluster','auto_lights'],       price_ils:318000 },
  { make_slug:'mercedes', model_slug:'e-class', name:'E 200 AMG Line',    sort_order:1, engine_type:'hybrid', engine_cc:1496, engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:12.3, features:[...M,'digital_cluster','ambient_lighting'],   price_ils:348000 },
  { make_slug:'mercedes', model_slug:'e-class', name:'E 220d AMG Line',   sort_order:2, engine_type:'diesel', engine_cc:1992, engine_hp:197, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],                price_ils:358000 },
  { make_slug:'mercedes', model_slug:'e-class', name:'E 300 AMG Line',    sort_order:3, engine_type:'hybrid', engine_cc:1999, engine_hp:258, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:12.3, features:[...T,'hud','digital_cluster'],                price_ils:388000 },

  // ── Mercedes EQB / EQC ────────────────────────────────────────────────────────
  { make_slug:'mercedes', model_slug:'eqb', name:'EQB 250+',    sort_order:0, engine_type:'electric', engine_hp:190, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','auto_lights'],  price_ils:268000 },
  { make_slug:'mercedes', model_slug:'eqb', name:'EQB 350 4MATIC',sort_order:1, engine_type:'electric', engine_hp:292, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',   screen_size:10.25,features:[...T,'hud'],                        price_ils:308000 },

  { make_slug:'mercedes', model_slug:'eqc', name:'EQC 400 4MATIC',sort_order:0, engine_type:'electric', engine_hp:408, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.25, features:[...T,'hud','digital_cluster'], price_ils:358000 },
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
