/**
 * Part 4: Honda, Ford, Renault, Peugeot, Opel, Fiat, Jeep, Dacia, Chevrolet, Land Rover,
 *         MG, BYD, Chery, Geely, Alfa Romeo
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
  // ── Honda Civic ───────────────────────────────────────────────────────────────
  { make_slug:'honda', model_slug:'civic', name:'Comfort',  sort_order:0, engine_type:'hybrid', engine_cc:1498, engine_hp:182, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'auto_lights'],                         price_ils:158000 },
  { make_slug:'honda', model_slug:'civic', name:'Advance',  sort_order:1, engine_type:'hybrid', engine_cc:1498, engine_hp:182, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,    features:[...T],                                       price_ils:178000 },
  { make_slug:'honda', model_slug:'civic', name:'Sport',    sort_order:2, engine_type:'hybrid', engine_cc:1498, engine_hp:182, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,    features:[...T],                                       price_ils:168000 },

  // ── Honda CR-V ────────────────────────────────────────────────────────────────
  { make_slug:'honda', model_slug:'crv', name:'Comfort',  sort_order:0, engine_type:'hybrid', engine_cc:2000, engine_hp:184, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'auto_lights'],                           price_ils:198000 },
  { make_slug:'honda', model_slug:'crv', name:'Advance',  sort_order:1, engine_type:'hybrid', engine_cc:2000, engine_hp:184, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,    features:[...M,'panoramic_roof','camera_360'],            price_ils:218000 },
  { make_slug:'honda', model_slug:'crv', name:'PHEV',     sort_order:2, engine_type:'phev',   engine_cc:2000, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather', screen_size:9,  features:[...T],                                         price_ils:248000 },
  { make_slug:'honda', model_slug:'crv', name:'e:PHEV Executive', sort_order:3, engine_type:'phev', engine_cc:2000, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather', screen_size:9, features:[...T,'hud'], price_ils:268000 },

  // ── Honda HR-V ────────────────────────────────────────────────────────────────
  { make_slug:'honda', model_slug:'hrv', name:'אלגנס',        sort_order:0, engine_type:'hybrid', engine_cc:1498, engine_hp:131, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:9,  features:[...B,'wireless_carplay','auto_lights'],    price_ils:142000 },
  { make_slug:'honda', model_slug:'hrv', name:'אדוונס',       sort_order:1, engine_type:'hybrid', engine_cc:1498, engine_hp:131, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],                       price_ils:158000 },
  { make_slug:'honda', model_slug:'hrv', name:'אדוונס סטייל', sort_order:2, engine_type:'hybrid', engine_cc:1498, engine_hp:131, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,  features:[...T],                                     price_ils:172000 },

  // ── Honda Jazz ────────────────────────────────────────────────────────────────
  { make_slug:'honda', model_slug:'jazz', name:'Comfort',  sort_order:0, engine_type:'hybrid', engine_cc:1498, engine_hp:109, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:9,  features:[...B,'wireless_carplay','auto_lights'],    price_ils:128000 },
  { make_slug:'honda', model_slug:'jazz', name:'Advance',  sort_order:1, engine_type:'hybrid', engine_cc:1498, engine_hp:109, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'auto_lights'],                       price_ils:142000 },
  { make_slug:'honda', model_slug:'jazz', name:'Sport',    sort_order:2, engine_type:'hybrid', engine_cc:1498, engine_hp:109, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,  features:[...M,'camera_360'],                        price_ils:152000 },
  { make_slug:'honda', model_slug:'jazz', name:'Executive',sort_order:3, engine_type:'hybrid', engine_cc:1498, engine_hp:109, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,  features:[...T],                                     price_ils:165000 },

  // ── Ford Puma ─────────────────────────────────────────────────────────────────
  { make_slug:'ford', model_slug:'puma', name:'Titanium',  sort_order:0, engine_type:'hybrid', engine_cc:999,  engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12, features:[...M,'auto_lights'],                 price_ils:145000 },
  { make_slug:'ford', model_slug:'puma', name:'ST-Line',   sort_order:1, engine_type:'hybrid', engine_cc:999,  engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12, features:[...M,'camera_360','auto_lights'],   price_ils:159000 },
  { make_slug:'ford', model_slug:'puma', name:'ST',        sort_order:2, engine_type:'petrol', engine_cc:1497, engine_hp:200, transmission:'manual',    drive:'fwd', seats:'leather',     screen_size:12, features:[...T],                             price_ils:185000 },

  // ── Ford Focus ────────────────────────────────────────────────────────────────
  { make_slug:'ford', model_slug:'focus', name:'Active', sort_order:0, engine_type:'hybrid', engine_cc:999, engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'auto_lights'], price_ils:142000 },

  // ── Ford Fiesta ───────────────────────────────────────────────────────────────
  { make_slug:'ford', model_slug:'fiesta', name:'Titanium',  sort_order:0, engine_type:'hybrid', engine_cc:999, engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'auto_lights'],  price_ils:128000 },
  { make_slug:'ford', model_slug:'fiesta', name:'ST-Line',   sort_order:1, engine_type:'hybrid', engine_cc:999, engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'auto_lights'],  price_ils:138000 },
  { make_slug:'ford', model_slug:'fiesta', name:'Active',    sort_order:2, engine_type:'hybrid', engine_cc:999, engine_hp:125, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'auto_lights'],  price_ils:144000 },

  // ── Ford Kuga ─────────────────────────────────────────────────────────────────
  { make_slug:'ford', model_slug:'kuga', name:'Titanium', sort_order:0, engine_type:'phev', engine_cc:1999, engine_hp:225, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:10, features:[...M,'panoramic_roof','camera_360'], price_ils:198000 },

  // ── Ford Ranger ───────────────────────────────────────────────────────────────
  { make_slug:'ford', model_slug:'ranger', name:'XL',      sort_order:0, engine_type:'diesel', engine_cc:1996, engine_hp:170, transmission:'manual',    drive:'awd', seats:'fabric',      screen_size:null, features:['rear_camera','parking_sensors','led_lights'],         price_ils:188000 },
  { make_slug:'ford', model_slug:'ranger', name:'XLT',     sort_order:1, engine_type:'diesel', engine_cc:1996, engine_hp:170, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                price_ils:212000 },
  { make_slug:'ford', model_slug:'ranger', name:'Wildtrak',sort_order:2, engine_type:'diesel', engine_cc:1996, engine_hp:170, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:12,   features:[...M,'camera_360'],                                    price_ils:238000 },
  { make_slug:'ford', model_slug:'ranger', name:'Raptor',  sort_order:3, engine_type:'petrol', engine_cc:2958, engine_hp:288, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12,   features:[...T],                                                price_ils:298000 },

  // ── Renault Clio ──────────────────────────────────────────────────────────────
  { make_slug:'renault', model_slug:'clio', name:'Zen',      sort_order:0, engine_type:'hybrid', engine_cc:999,  engine_hp:91,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,   features:[...B,'auto_lights'],                  price_ils:112000 },
  { make_slug:'renault', model_slug:'clio', name:'Intens',   sort_order:1, engine_type:'hybrid', engine_cc:999,  engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.3, features:[...M,'auto_lights'],                  price_ils:128000 },
  { make_slug:'renault', model_slug:'clio', name:'R.S. Line',sort_order:2, engine_type:'hybrid', engine_cc:999,  engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.3, features:[...M,'ambient_lighting','auto_lights'], price_ils:142000 },

  // ── Renault Megane ────────────────────────────────────────────────────────────
  { make_slug:'renault', model_slug:'megane', name:'Zen',       sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.3,  features:[...M,'auto_lights'],             price_ils:138000 },
  { make_slug:'renault', model_slug:'megane', name:'Intens',    sort_order:1, engine_type:'hybrid', engine_cc:1332, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3,  features:[...M,'camera_360','auto_lights'], price_ils:152000 },
  { make_slug:'renault', model_slug:'megane', name:'R.S. Line', sort_order:2, engine_type:'hybrid', engine_cc:1332, engine_hp:160, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3,  features:[...T],                          price_ils:166000 },
  { make_slug:'renault', model_slug:'megane', name:'E-Tech 130',sort_order:3, engine_type:'hybrid', engine_cc:1332, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3,  features:[...M,'auto_lights'],             price_ils:144000 },
  { make_slug:'renault', model_slug:'megane', name:'E-Tech 160',sort_order:4, engine_type:'hybrid', engine_cc:1332, engine_hp:160, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3,  features:[...T],                          price_ils:162000 },
  { make_slug:'renault', model_slug:'megane', name:'E-TECH Electric',sort_order:5, engine_type:'electric', engine_hp:220, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:12, features:[...T], price_ils:172000 },
  { make_slug:'renault', model_slug:'megane', name:'RS',         sort_order:6, engine_type:'petrol', engine_cc:1798, engine_hp:300, transmission:'dct', drive:'fwd', seats:'leather', screen_size:9.3, features:[...T], price_ils:198000 },

  // ── Renault Arkana ────────────────────────────────────────────────────────────
  { make_slug:'renault', model_slug:'arkana', name:'Zen',       sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.3, features:[...M,'auto_lights'],   price_ils:148000 },
  { make_slug:'renault', model_slug:'arkana', name:'Intens',    sort_order:1, engine_type:'hybrid', engine_cc:1332, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3, features:[...M,'panoramic_roof'],  price_ils:162000 },
  { make_slug:'renault', model_slug:'arkana', name:'R.S. Line', sort_order:2, engine_type:'hybrid', engine_cc:1332, engine_hp:145, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3, features:[...T],                  price_ils:174000 },
  { make_slug:'renault', model_slug:'arkana', name:'E-TECH',    sort_order:3, engine_type:'hybrid', engine_cc:1598, engine_hp:145, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:9.3, features:[...T],                  price_ils:166000 },
  { make_slug:'renault', model_slug:'arkana', name:'E-TECH AWD',sort_order:4, engine_type:'hybrid', engine_cc:1598, engine_hp:145, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9.3, features:[...T],                  price_ils:178000 },

  // ── Renault Kadjar ────────────────────────────────────────────────────────────
  { make_slug:'renault', model_slug:'kadjar', name:'Intens', sort_order:0, engine_type:'petrol', engine_cc:1332, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8.7, features:[...M,'auto_lights'], price_ils:148000 },

  // ── Renault Zoe ───────────────────────────────────────────────────────────────
  { make_slug:'renault', model_slug:'zoe', name:'Intens', sort_order:0, engine_type:'electric', engine_hp:135, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:9.3, features:[...M,'heated_steering'], price_ils:138000 },

  // ── Peugeot 208 ───────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'208', name:'Active',   sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:100, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,   features:[...B,'auto_lights'],                  price_ils:112000 },
  { make_slug:'peugeot', model_slug:'208', name:'Allure',   sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10,  features:[...M,'digital_cluster','auto_lights'],price_ils:128000 },
  { make_slug:'peugeot', model_slug:'208', name:'GT',       sort_order:2, engine_type:'petrol', engine_cc:999, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10,  features:[...T,'digital_cluster'],              price_ils:148000 },

  // ── Peugeot e-208 ─────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'e208', name:'Active',  sort_order:0, engine_type:'electric', engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'digital_cluster','heated_steering'], price_ils:148000 },
  { make_slug:'peugeot', model_slug:'e208', name:'Allure',  sort_order:1, engine_type:'electric', engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'digital_cluster','heated_steering'], price_ils:162000 },
  { make_slug:'peugeot', model_slug:'e208', name:'GT',      sort_order:2, engine_type:'electric', engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T,'digital_cluster'],                  price_ils:178000 },

  // ── Peugeot 2008 ──────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'2008', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'digital_cluster','auto_lights'],  price_ils:138000 },
  { make_slug:'peugeot', model_slug:'2008', name:'Allure',  sort_order:1, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'panoramic_roof','digital_cluster'],price_ils:155000 },
  { make_slug:'peugeot', model_slug:'2008', name:'GT',      sort_order:2, engine_type:'petrol', engine_cc:1598, engine_hp:180, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T,'digital_cluster'],                price_ils:175000 },

  // ── Peugeot 3008 ──────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'3008', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:225, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'digital_cluster','auto_lights'],  price_ils:188000 },
  { make_slug:'peugeot', model_slug:'3008', name:'Allure',  sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:225, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'panoramic_roof','digital_cluster'],price_ils:208000 },
  { make_slug:'peugeot', model_slug:'3008', name:'GT',      sort_order:2, engine_type:'phev',   engine_cc:1598, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10, features:[...T,'digital_cluster'],                price_ils:238000 },

  // ── Peugeot 5008 ──────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'5008', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:225, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10, features:[...M,'digital_cluster'],   price_ils:218000 },
  { make_slug:'peugeot', model_slug:'5008', name:'Allure',  sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:225, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leather',     screen_size:10, features:[...M,'panoramic_roof','digital_cluster'], price_ils:238000 },
  { make_slug:'peugeot', model_slug:'5008', name:'GT',      sort_order:2, engine_type:'phev',   engine_cc:1598, engine_hp:300, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:10, features:[...T,'digital_cluster'],   price_ils:268000 },

  // ── Peugeot 308 ───────────────────────────────────────────────────────────────
  { make_slug:'peugeot', model_slug:'308', name:'Allure', sort_order:0, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'digital_cluster','auto_lights'], price_ils:148000 },

  // ── Opel Corsa ────────────────────────────────────────────────────────────────
  { make_slug:'opel', model_slug:'corsa', name:'Edition',  sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:100, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,   features:[...B,'auto_lights'],  price_ils:112000 },
  { make_slug:'opel', model_slug:'corsa', name:'GS',       sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10,  features:[...M,'auto_lights'],  price_ils:128000 },
  { make_slug:'opel', model_slug:'corsa', name:'Electric', sort_order:2, engine_type:'electric',              engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10,  features:[...M,'heated_steering'],price_ils:142000 },

  // ── Opel Mokka ────────────────────────────────────────────────────────────────
  { make_slug:'opel', model_slug:'mokka', name:'Edition',   sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'auto_lights'],          price_ils:138000 },
  { make_slug:'opel', model_slug:'mokka', name:'GS',        sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'camera_360','auto_lights'],price_ils:155000 },
  { make_slug:'opel', model_slug:'mokka', name:'GS Line',   sort_order:2, engine_type:'petrol', engine_cc:999,  engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T],                          price_ils:168000 },
  { make_slug:'opel', model_slug:'mokka', name:'Electric',  sort_order:3, engine_type:'electric',               engine_hp:136, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T],                          price_ils:175000 },

  // ── Opel Astra ────────────────────────────────────────────────────────────────
  { make_slug:'opel', model_slug:'astra', name:'GS', sort_order:0, engine_type:'phev', engine_cc:1199, engine_hp:180, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:10, features:[...T], price_ils:168000 },

  // ── Opel Crossland ────────────────────────────────────────────────────────────
  { make_slug:'opel', model_slug:'crossland', name:'GS', sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:110, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...M,'auto_lights'], price_ils:132000 },

  // ── Opel Grandland ────────────────────────────────────────────────────────────
  { make_slug:'opel', model_slug:'grandland', name:'GS', sort_order:0, engine_type:'phev', engine_cc:1598, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10, features:[...T,'hud'], price_ils:198000 },

  // ── Fiat 500 ──────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'500', name:'Pop',       sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:69,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,  features:['rear_camera','parking_sensors','apple_carplay','led_lights'],  price_ils:98000 },
  { make_slug:'fiat', model_slug:'500', name:'Dolcevita', sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:69,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...B,'wireless_carplay','auto_lights'],                         price_ils:112000 },
  { make_slug:'fiat', model_slug:'500', name:'Sport',     sort_order:2, engine_type:'petrol', engine_cc:999, engine_hp:85,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...B,'wireless_carplay','heated_seats_front','auto_lights'],    price_ils:122000 },
  { make_slug:'fiat', model_slug:'500', name:'Lounge',    sort_order:3, engine_type:'petrol', engine_cc:999, engine_hp:85,  transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:7,  features:[...M,'sunroof'],                                                price_ils:132000 },
  { make_slug:'fiat', model_slug:'500', name:'Cabrio',    sort_order:4, engine_type:'petrol', engine_cc:999, engine_hp:85,  transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:7,  features:[...M,'sunroof'],                                                price_ils:142000 },

  // ── Fiat 500e ─────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'500e', name:'Action',   sort_order:0, engine_type:'electric', engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,  features:[...B,'wireless_carplay','heated_steering'],            price_ils:128000 },
  { make_slug:'fiat', model_slug:'500e', name:'Passion',  sort_order:1, engine_type:'electric', engine_hp:118, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'heated_steering'],                               price_ils:148000 },
  { make_slug:'fiat', model_slug:'500e', name:'Icon',     sort_order:2, engine_type:'electric', engine_hp:118, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'sunroof','heated_steering'],                      price_ils:162000 },
  { make_slug:'fiat', model_slug:'500e', name:'La Prima', sort_order:3, engine_type:'electric', engine_hp:118, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T],                                                 price_ils:178000 },

  // ── Fiat Tipo ─────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'tipo', name:'City Life',sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,  features:[...B,'auto_lights'],  price_ils:108000 },
  { make_slug:'fiat', model_slug:'tipo', name:'Life',     sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...M,'auto_lights'],  price_ils:118000 },
  { make_slug:'fiat', model_slug:'tipo', name:'Sport',    sort_order:2, engine_type:'petrol', engine_cc:1332, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10, features:[...M,'auto_lights'],  price_ils:132000 },
  { make_slug:'fiat', model_slug:'tipo', name:'Cross',    sort_order:3, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...M,'auto_lights'],  price_ils:122000 },
  { make_slug:'fiat', model_slug:'tipo', name:'Cross Sport',sort_order:4, engine_type:'petrol', engine_cc:1332, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leather',   screen_size:10, features:[...T],               price_ils:145000 },
  { make_slug:'fiat', model_slug:'tipo', name:'GR Sport', sort_order:5, engine_type:'petrol', engine_cc:1332, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T],               price_ils:148000 },

  // ── Fiat Tipo Cross ───────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'tipo-cross', name:'Life',  sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...M,'auto_lights'],  price_ils:122000 },
  { make_slug:'fiat', model_slug:'tipo-cross', name:'Sport', sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...T],               price_ils:142000 },

  // ── Fiat 500X ─────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'500x', name:'City Cross',sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:120, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:7,  features:[...B,'wireless_carplay','auto_lights'],  price_ils:138000 },
  { make_slug:'fiat', model_slug:'500x', name:'Sport',     sort_order:1, engine_type:'petrol', engine_cc:1332, engine_hp:150, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'auto_lights'],                    price_ils:155000 },
  { make_slug:'fiat', model_slug:'500x', name:'Cross',     sort_order:2, engine_type:'petrol', engine_cc:1332, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10, features:[...T],                                 price_ils:172000 },
  { make_slug:'fiat', model_slug:'500x', name:'Cross Sport',sort_order:3, engine_type:'petrol', engine_cc:1332, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',   screen_size:10, features:[...T],                                 price_ils:182000 },
  { make_slug:'fiat', model_slug:'500x', name:'Dolcevita', sort_order:4, engine_type:'petrol', engine_cc:999,  engine_hp:120, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10, features:[...M,'sunroof'],                        price_ils:148000 },

  // ── Fiat Panda ────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'panda', name:'Pop',       sort_order:0, engine_type:'hybrid', engine_cc:999, engine_hp:70, transmission:'manual', drive:'fwd', seats:'fabric', screen_size:null, features:['rear_camera','parking_sensors','led_lights'],  price_ils:88000 },
  { make_slug:'fiat', model_slug:'panda', name:'City Life', sort_order:1, engine_type:'hybrid', engine_cc:999, engine_hp:70, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:7, features:[...B,'auto_lights'],                            price_ils:98000 },
  { make_slug:'fiat', model_slug:'panda', name:'Cross',     sort_order:2, engine_type:'hybrid', engine_cc:999, engine_hp:70, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:7, features:[...B,'wireless_carplay','auto_lights'],      price_ils:112000 },

  // ── Fiat Doblo ────────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'doblo', name:'Comfort',   sort_order:0, engine_type:'petrol', engine_cc:1199, engine_hp:110, transmission:'automatic', drive:'fwd', seat_count:7, seats:'fabric',      screen_size:8,  features:[...B,'auto_lights'],  price_ils:138000 },
  { make_slug:'fiat', model_slug:'doblo', name:'Sport',     sort_order:1, engine_type:'petrol', engine_cc:1199, engine_hp:110, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10, features:[...M,'auto_lights'],  price_ils:155000 },
  { make_slug:'fiat', model_slug:'doblo', name:'Electric',  sort_order:2, engine_type:'electric',              engine_hp:136, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:10, features:[...M,'heated_steering'],price_ils:172000 },

  // ── Fiat Ducato ───────────────────────────────────────────────────────────────
  { make_slug:'fiat', model_slug:'ducato', name:'Comfort', sort_order:0, engine_type:'diesel', engine_cc:2287, engine_hp:120, transmission:'manual',    drive:'fwd', seats:'fabric', screen_size:7,  features:['rear_camera','parking_sensors','apple_carplay'],           price_ils:198000 },
  { make_slug:'fiat', model_slug:'ducato', name:'Business',sort_order:1, engine_type:'diesel', engine_cc:2287, engine_hp:140, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:7,  features:['rear_camera','parking_sensors','apple_carplay','auto_lights'], price_ils:218000 },

  // ── Jeep Wrangler ─────────────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'wrangler', name:'Sport',        sort_order:0, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seats:'fabric',      screen_size:8.4,  features:[...B,'wireless_carplay'],               price_ils:248000 },
  { make_slug:'jeep', model_slug:'wrangler', name:'Sahara',       sort_order:1, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8.4,  features:[...M,'camera_360'],                    price_ils:278000 },
  { make_slug:'jeep', model_slug:'wrangler', name:'Rubicon',      sort_order:2, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:12,   features:[...M,'camera_360'],                    price_ils:308000 },
  { make_slug:'jeep', model_slug:'wrangler', name:'4xe PHEV',     sort_order:3, engine_type:'phev',   engine_cc:1995, engine_hp:380, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12,   features:[...T],                                 price_ils:338000 },
  { make_slug:'jeep', model_slug:'wrangler', name:'Unlimited Sahara',sort_order:4, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seat_count:5, seats:'leather', screen_size:12, features:[...T],                      price_ils:298000 },

  // ── Jeep Compass ──────────────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'compass', name:'Longitude',  sort_order:0, engine_type:'petrol', engine_cc:1332, engine_hp:130, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.1, features:[...M,'camera_360','auto_lights'],  price_ils:178000 },
  { make_slug:'jeep', model_slug:'compass', name:'S',          sort_order:1, engine_type:'phev',   engine_cc:1332, engine_hp:240, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.1, features:[...T],                          price_ils:228000 },

  // ── Jeep Grand Cherokee ───────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'Laredo',     sort_order:0, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:10.1,features:[...M,'camera_360'],     price_ils:278000 },
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'Limited',    sort_order:1, engine_type:'petrol', engine_cc:1995, engine_hp:272, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.1,features:[...T,'hud'],            price_ils:318000 },
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'Overland',   sort_order:2, engine_type:'petrol', engine_cc:2995, engine_hp:360, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.1,features:[...T,'hud'],            price_ils:358000 },
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'Summit',     sort_order:3, engine_type:'petrol', engine_cc:2995, engine_hp:360, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.1,features:[...T,'hud'],            price_ils:398000 },
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'4xe Summit', sort_order:4, engine_type:'phev',   engine_cc:1995, engine_hp:380, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.1,features:[...T,'hud'],            price_ils:428000 },
  { make_slug:'jeep', model_slug:'grand-cherokee', name:'Trailhawk',  sort_order:5, engine_type:'phev',   engine_cc:1995, engine_hp:380, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.1,features:[...T,'hud'],            price_ils:418000 },

  // ── Jeep Avenger ──────────────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'avenger', name:'Longitude',  sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],   price_ils:138000 },
  { make_slug:'jeep', model_slug:'avenger', name:'Altitude',   sort_order:1, engine_type:'petrol', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                price_ils:158000 },
  { make_slug:'jeep', model_slug:'avenger', name:'Summit',     sort_order:2, engine_type:'electric',               engine_hp:156, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                price_ils:168000 },
  { make_slug:'jeep', model_slug:'avenger', name:'4xe Summit', sort_order:3, engine_type:'electric',               engine_hp:156, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],           price_ils:188000 },

  // ── Jeep Renegade ─────────────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'renegade', name:'S', sort_order:0, engine_type:'phev', engine_cc:1332, engine_hp:240, transmission:'automatic', drive:'awd', seats:'leather', screen_size:8.4, features:[...T], price_ils:198000 },

  // ── Jeep Cherokee ─────────────────────────────────────────────────────────────
  { make_slug:'jeep', model_slug:'cherokee', name:'Limited', sort_order:0, engine_type:'hybrid', engine_cc:1332, engine_hp:195, transmission:'automatic', drive:'awd', seats:'leather', screen_size:8.4, features:[...T,'hud'], price_ils:248000 },

  // ── Dacia Duster ──────────────────────────────────────────────────────────────
  { make_slug:'dacia', model_slug:'duster', name:'Essential', sort_order:0, engine_type:'petrol', engine_cc:999,  engine_hp:90,  transmission:'manual',    drive:'fwd', seats:'fabric', screen_size:8,   features:['aeb','rear_camera','parking_sensors','apple_carplay','led_lights'],  price_ils:98000 },
  { make_slug:'dacia', model_slug:'duster', name:'Expression',sort_order:1, engine_type:'hybrid', engine_cc:999,  engine_hp:100, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:8,   features:[...B,'wireless_carplay','auto_lights'],                               price_ils:112000 },
  { make_slug:'dacia', model_slug:'duster', name:'Extreme',   sort_order:2, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'fwd', seats:'leatherette',screen_size:10.1,features:[...M,'auto_lights'],                                              price_ils:128000 },
  { make_slug:'dacia', model_slug:'duster', name:'Journey',   sort_order:3, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'awd', seats:'leatherette',screen_size:10.1,features:[...M,'camera_360'],                                              price_ils:142000 },
  { make_slug:'dacia', model_slug:'duster', name:'4WD Extreme',sort_order:4, engine_type:'hybrid', engine_cc:1199, engine_hp:130, transmission:'automatic', drive:'awd', seats:'leather',  screen_size:10.1,features:[...T],                                                            price_ils:155000 },

  // ── Dacia Sandero ─────────────────────────────────────────────────────────────
  { make_slug:'dacia', model_slug:'sandero', name:'Expression', sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:90, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:8, features:[...B,'auto_lights'], price_ils:92000 },

  // ── Dacia Spring ──────────────────────────────────────────────────────────────
  { make_slug:'dacia', model_slug:'spring', name:'Extreme', sort_order:0, engine_type:'electric', engine_hp:65, transmission:'automatic', drive:'fwd', seats:'fabric', screen_size:7, features:['rear_camera','parking_sensors','apple_carplay','led_lights'], price_ils:82000 },

  // ── Chevrolet Spark ───────────────────────────────────────────────────────────
  { make_slug:'chevrolet', model_slug:'spark', name:'LS',   sort_order:0, engine_type:'petrol', engine_cc:999, engine_hp:75, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:7, features:['rear_camera','apple_carplay','led_lights'],  price_ils:88000 },
  { make_slug:'chevrolet', model_slug:'spark', name:'LT',   sort_order:1, engine_type:'petrol', engine_cc:999, engine_hp:75, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:7, features:[...B,'auto_lights'],                          price_ils:97000 },
  { make_slug:'chevrolet', model_slug:'spark', name:'LTZ',  sort_order:2, engine_type:'petrol', engine_cc:999, engine_hp:75, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:7, features:[...B,'wireless_carplay','heated_seats_front'],price_ils:108000 },
  { make_slug:'chevrolet', model_slug:'spark', name:'Activ',sort_order:3, engine_type:'petrol', engine_cc:999, engine_hp:75, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:7, features:[...B,'wireless_carplay','heated_seats_front'],price_ils:112000 },

  // ── Chevrolet Cruze ───────────────────────────────────────────────────────────
  { make_slug:'chevrolet', model_slug:'cruze', name:'LS',    sort_order:0, engine_type:'petrol', engine_cc:1399, engine_hp:153, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7,   features:[...B,'auto_lights'],             price_ils:108000 },
  { make_slug:'chevrolet', model_slug:'cruze', name:'LT',    sort_order:1, engine_type:'petrol', engine_cc:1399, engine_hp:153, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8,   features:[...M,'auto_lights'],             price_ils:122000 },
  { make_slug:'chevrolet', model_slug:'cruze', name:'LTZ',   sort_order:2, engine_type:'petrol', engine_cc:1399, engine_hp:153, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:8,   features:[...M,'camera_360'],              price_ils:135000 },
  { make_slug:'chevrolet', model_slug:'cruze', name:'Premier',sort_order:3, engine_type:'petrol', engine_cc:1399, engine_hp:153, transmission:'automatic', drive:'fwd', seats:'leather',    screen_size:8,   features:[...T],                           price_ils:148000 },

  // ── MG ZS ─────────────────────────────────────────────────────────────────────
  { make_slug:'mg', model_slug:'mg-zs', name:'Excite',    sort_order:0, engine_type:'hybrid', engine_cc:1490, engine_hp:106, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],            price_ils:128000 },
  { make_slug:'mg', model_slug:'mg-zs', name:'Exclusive', sort_order:1, engine_type:'hybrid', engine_cc:1490, engine_hp:106, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                         price_ils:142000 },
  { make_slug:'mg', model_slug:'mg-zs', name:'EV Excite', sort_order:2, engine_type:'electric',               engine_hp:177, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','heated_steering'],price_ils:138000 },
  { make_slug:'mg', model_slug:'mg-zs', name:'EV Exclusive',sort_order:3, engine_type:'electric',             engine_hp:177, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                         price_ils:155000 },

  // ── MG MG4 ────────────────────────────────────────────────────────────────────
  { make_slug:'mg', model_slug:'mg4', name:'Excite',    sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'digital_cluster','heated_steering'],    price_ils:148000 },
  { make_slug:'mg', model_slug:'mg4', name:'Exclusive', sort_order:1, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T,'digital_cluster'],                     price_ils:168000 },

  // ── MG MG5 ────────────────────────────────────────────────────────────────────
  { make_slug:'mg', model_slug:'mg5', name:'Excite',   sort_order:0, engine_type:'electric', engine_hp:156, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'heated_steering'], price_ils:138000 },
  { make_slug:'mg', model_slug:'mg5', name:'Exclusive',sort_order:1, engine_type:'electric', engine_hp:156, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                  price_ils:152000 },

  // ── MG HS ─────────────────────────────────────────────────────────────────────
  { make_slug:'mg', model_slug:'hs', name:'Comfort', sort_order:0, engine_type:'hybrid', engine_cc:1490, engine_hp:162, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:10.25, features:[...T], price_ils:168000 },

  // ── MG EHS ────────────────────────────────────────────────────────────────────
  { make_slug:'mg', model_slug:'ehs', name:'PHEV Luxury', sort_order:0, engine_type:'phev', engine_cc:1490, engine_hp:258, transmission:'automatic', drive:'fwd', seats:'leather', screen_size:10.25, features:[...T], price_ils:188000 },

  // ── BYD Atto 3 ────────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'atto3', name:'Design', sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.8, features:[...M,'camera_360','digital_cluster','heated_steering','ambient_lighting'], price_ils:158000 },

  // ── BYD Seal ──────────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'seal', name:'Comfort', sort_order:0, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'rwd', seats:'leather', screen_size:15.6, features:[...T,'hud','digital_cluster'], price_ils:198000 },

  // ── BYD Han ───────────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'han', name:'Premium', sort_order:0, engine_type:'electric', engine_hp:517, transmission:'automatic', drive:'awd', seats:'leather', screen_size:15.6, features:[...T,'hud','digital_cluster'], price_ils:258000 },
  { make_slug:'byd', model_slug:'han', name:'Executive',sort_order:1, engine_type:'electric', engine_hp:517, transmission:'automatic', drive:'awd', seats:'leather', screen_size:15.6, features:[...T,'hud','digital_cluster'], price_ils:288000 },

  // ── BYD Dolphin ───────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'dolphin', name:'Comfort', sort_order:0, engine_type:'electric', engine_hp:95,  transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.8, features:[...M,'digital_cluster','heated_steering'], price_ils:118000 },

  // ── BYD Tang ──────────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'tang', name:'Design',    sort_order:0, engine_type:'electric', engine_hp:523, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:15.6, features:[...T,'hud','digital_cluster'], price_ils:268000 },
  { make_slug:'byd', model_slug:'tang', name:'Executive', sort_order:1, engine_type:'electric', engine_hp:523, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:15.6, features:[...T,'hud','digital_cluster'], price_ils:298000 },

  // ── BYD Sealion 6 ─────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'sealion6', name:'Design',    sort_order:0, engine_type:'phev', engine_cc:1498, engine_hp:218, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:15.6, features:[...M,'digital_cluster','camera_360'],  price_ils:168000 },
  { make_slug:'byd', model_slug:'sealion6', name:'Premium',   sort_order:1, engine_type:'phev', engine_cc:1498, engine_hp:218, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:15.6, features:[...T,'hud','digital_cluster'],           price_ils:188000 },
  { make_slug:'byd', model_slug:'sealion6', name:'Executive', sort_order:2, engine_type:'phev', engine_cc:1498, engine_hp:218, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.6, features:[...T,'hud','digital_cluster'],           price_ils:208000 },
  { make_slug:'byd', model_slug:'sealion6', name:'DM-p AWD',  sort_order:3, engine_type:'phev', engine_cc:1498, engine_hp:326, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.6, features:[...T,'hud','digital_cluster'],           price_ils:228000 },

  // ── BYD Sealion 7 ─────────────────────────────────────────────────────────────
  { make_slug:'byd', model_slug:'sealion7', name:'Comfort',   sort_order:0, engine_type:'electric', engine_hp:313, transmission:'automatic', drive:'rwd', seats:'leatherette', screen_size:15.6, features:[...M,'digital_cluster','camera_360','heated_steering'],  price_ils:188000 },
  { make_slug:'byd', model_slug:'sealion7', name:'Premium',   sort_order:1, engine_type:'electric', engine_hp:390, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.6, features:[...T,'hud','digital_cluster'],                           price_ils:218000 },
  { make_slug:'byd', model_slug:'sealion7', name:'Executive', sort_order:2, engine_type:'electric', engine_hp:523, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:15.6, features:[...T,'hud','digital_cluster'],                           price_ils:248000 },

  // ── Chery Tiggo 7 ─────────────────────────────────────────────────────────────
  { make_slug:'chery', model_slug:'tiggo7', name:'Comfort',   sort_order:0, engine_type:'hybrid', engine_cc:1497, engine_hp:197, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360'],  price_ils:148000 },
  { make_slug:'chery', model_slug:'tiggo7', name:'Premium',   sort_order:1, engine_type:'hybrid', engine_cc:1497, engine_hp:197, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],               price_ils:162000 },
  { make_slug:'chery', model_slug:'tiggo7', name:'Executive', sort_order:2, engine_type:'hybrid', engine_cc:1497, engine_hp:197, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],          price_ils:178000 },
  { make_slug:'chery', model_slug:'tiggo7', name:'e+',        sort_order:3, engine_type:'phev',   engine_cc:1497, engine_hp:326, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],          price_ils:195000 },

  // ── Chery Tiggo 8 ─────────────────────────────────────────────────────────────
  { make_slug:'chery', model_slug:'tiggo8', name:'Comfort',   sort_order:0, engine_type:'phev', engine_cc:1497, engine_hp:326, transmission:'automatic', drive:'awd', seat_count:7, seats:'leatherette', screen_size:12.3, features:[...M,'camera_360'],  price_ils:178000 },
  { make_slug:'chery', model_slug:'tiggo8', name:'Premium',   sort_order:1, engine_type:'phev', engine_cc:1497, engine_hp:326, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T],               price_ils:198000 },
  { make_slug:'chery', model_slug:'tiggo8', name:'Executive', sort_order:2, engine_type:'phev', engine_cc:1497, engine_hp:326, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'hud'],          price_ils:218000 },

  // ── Chery Omoda 5 ─────────────────────────────────────────────────────────────
  { make_slug:'chery', model_slug:'omoda5', name:'Comfort',   sort_order:0, engine_type:'petrol', engine_cc:1497, engine_hp:147, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M,'auto_lights'],  price_ils:138000 },
  { make_slug:'chery', model_slug:'omoda5', name:'Premium',   sort_order:1, engine_type:'petrol', engine_cc:1497, engine_hp:147, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.25, features:[...T],               price_ils:152000 },

  // ── Chery Arrizo 6 ────────────────────────────────────────────────────────────
  { make_slug:'chery', model_slug:'arrizo6', name:'Comfort',  sort_order:0, engine_type:'petrol', engine_cc:1497, engine_hp:147, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M,'auto_lights'],  price_ils:128000 },
  { make_slug:'chery', model_slug:'arrizo6', name:'Premium',  sort_order:1, engine_type:'petrol', engine_cc:1497, engine_hp:147, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.25, features:[...T],               price_ils:142000 },

  // ── Geely Coolray ─────────────────────────────────────────────────────────────
  { make_slug:'geely', model_slug:'coolray', name:'Comfort',   sort_order:0, engine_type:'petrol', engine_cc:1477, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],  price_ils:132000 },
  { make_slug:'geely', model_slug:'coolray', name:'Premium',   sort_order:1, engine_type:'petrol', engine_cc:1477, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],               price_ils:148000 },
  { make_slug:'geely', model_slug:'coolray', name:'Executive', sort_order:2, engine_type:'petrol', engine_cc:1477, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T,'hud'],          price_ils:162000 },

  // ── Geely Emgrand ─────────────────────────────────────────────────────────────
  { make_slug:'geely', model_slug:'emgrand', name:'Comfort',  sort_order:0, engine_type:'petrol', engine_cc:1497, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],  price_ils:112000 },
  { make_slug:'geely', model_slug:'emgrand', name:'Premium',  sort_order:1, engine_type:'petrol', engine_cc:1497, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],               price_ils:128000 },

  // ── Alfa Romeo Giulia ─────────────────────────────────────────────────────────
  { make_slug:'alfa-romeo', model_slug:'giulia', name:'Sprint',      sort_order:0, engine_type:'petrol', engine_cc:1995, engine_hp:200, transmission:'automatic', drive:'rwd', seats:'leatherette', screen_size:8.8, features:[...M,'auto_lights'],          price_ils:248000 },
  { make_slug:'alfa-romeo', model_slug:'giulia', name:'Super',       sort_order:1, engine_type:'petrol', engine_cc:1995, engine_hp:200, transmission:'automatic', drive:'rwd', seats:'leather',     screen_size:8.8, features:[...M,'ambient_lighting'],      price_ils:268000 },
  { make_slug:'alfa-romeo', model_slug:'giulia', name:'Veloce',      sort_order:2, engine_type:'petrol', engine_cc:1995, engine_hp:280, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8, features:[...T,'hud'],                   price_ils:318000 },
  { make_slug:'alfa-romeo', model_slug:'giulia', name:'Quadrifoglio',sort_order:3, engine_type:'petrol', engine_cc:2891, engine_hp:510, transmission:'automatic', drive:'rwd', seats:'leather',     screen_size:8.8, features:[...T,'hud'],                   price_ils:498000 },

  // ── Alfa Romeo Giulietta ──────────────────────────────────────────────────────
  { make_slug:'alfa-romeo', model_slug:'giulietta', name:'Sprint',  sort_order:0, engine_type:'petrol', engine_cc:1368, engine_hp:120, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:6.5, features:[...M,'auto_lights'],  price_ils:168000 },
  { make_slug:'alfa-romeo', model_slug:'giulietta', name:'Super',   sort_order:1, engine_type:'petrol', engine_cc:1742, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:6.5, features:[...M,'camera_360'],    price_ils:185000 },
  { make_slug:'alfa-romeo', model_slug:'giulietta', name:'Veloce',  sort_order:2, engine_type:'petrol', engine_cc:1742, engine_hp:150, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:6.5, features:[...T],                 price_ils:198000 },

  // ── Alfa Romeo Stelvio ────────────────────────────────────────────────────────
  { make_slug:'alfa-romeo', model_slug:'stelvio', name:'Sprint',      sort_order:0, engine_type:'petrol', engine_cc:1995, engine_hp:200, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8.8, features:[...M,'camera_360','auto_lights'],   price_ils:288000 },
  { make_slug:'alfa-romeo', model_slug:'stelvio', name:'Super',       sort_order:1, engine_type:'petrol', engine_cc:1995, engine_hp:200, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8, features:[...M,'panoramic_roof','camera_360'],  price_ils:318000 },
  { make_slug:'alfa-romeo', model_slug:'stelvio', name:'Veloce',      sort_order:2, engine_type:'petrol', engine_cc:1995, engine_hp:280, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8, features:[...T,'hud'],                          price_ils:368000 },
  { make_slug:'alfa-romeo', model_slug:'stelvio', name:'Quadrifoglio',sort_order:3, engine_type:'petrol', engine_cc:2891, engine_hp:510, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8.8, features:[...T,'hud'],                          price_ils:598000 },

  // ── Alfa Romeo Tonale ─────────────────────────────────────────────────────────
  { make_slug:'alfa-romeo', model_slug:'tonale', name:'Sprint',  sort_order:0, engine_type:'hybrid', engine_cc:1469, engine_hp:130, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],   price_ils:218000 },
  { make_slug:'alfa-romeo', model_slug:'tonale', name:'Ti',      sort_order:1, engine_type:'hybrid', engine_cc:1469, engine_hp:160, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...M,'panoramic_roof'], price_ils:248000 },
  { make_slug:'alfa-romeo', model_slug:'tonale', name:'Veloce',  sort_order:2, engine_type:'phev',   engine_cc:1469, engine_hp:280, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.25,features:[...T,'hud'],         price_ils:298000 },
  { make_slug:'alfa-romeo', model_slug:'tonale', name:'PHEV AWD',sort_order:3, engine_type:'phev',   engine_cc:1469, engine_hp:280, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10.25,features:[...T,'hud'],         price_ils:318000 },

  // ── Land Rover Defender ───────────────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'defender', name:'S',         sort_order:0, engine_type:'hybrid', engine_cc:1997, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:11.4,features:[...M,'camera_360'],              price_ils:348000 },
  { make_slug:'land-rover', model_slug:'defender', name:'SE',        sort_order:1, engine_type:'hybrid', engine_cc:1997, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],                     price_ils:398000 },
  { make_slug:'land-rover', model_slug:'defender', name:'HSE',       sort_order:2, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],                     price_ils:468000 },
  { make_slug:'land-rover', model_slug:'defender', name:'X-Dynamic', sort_order:3, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],                     price_ils:518000 },
  { make_slug:'land-rover', model_slug:'defender', name:'V8',        sort_order:4, engine_type:'petrol', engine_cc:4999, engine_hp:525, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],                     price_ils:698000 },

  // ── Land Rover Range Rover Evoque ─────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'range-rover-evoque', name:'S',          sort_order:0, engine_type:'hybrid', engine_cc:1997, engine_hp:249, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:11.4,features:[...M,'camera_360'],      price_ils:298000 },
  { make_slug:'land-rover', model_slug:'range-rover-evoque', name:'SE',         sort_order:1, engine_type:'hybrid', engine_cc:1997, engine_hp:249, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],             price_ils:338000 },
  { make_slug:'land-rover', model_slug:'range-rover-evoque', name:'HSE',        sort_order:2, engine_type:'hybrid', engine_cc:1997, engine_hp:249, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],             price_ils:368000 },
  { make_slug:'land-rover', model_slug:'range-rover-evoque', name:'Dynamic HSE',sort_order:3, engine_type:'hybrid', engine_cc:1997, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:11.4,features:[...T,'hud'],             price_ils:398000 },

  // ── Land Rover Discovery Sport ────────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'discovery-sport', name:'S',    sort_order:0, engine_type:'hybrid', engine_cc:1997, engine_hp:204, transmission:'automatic', drive:'awd', seat_count:7, seats:'leatherette', screen_size:11.4,features:[...M,'camera_360'], price_ils:268000 },
  { make_slug:'land-rover', model_slug:'discovery-sport', name:'SE',   sort_order:1, engine_type:'hybrid', engine_cc:1997, engine_hp:204, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:11.4,features:[...T,'hud'],        price_ils:308000 },
  { make_slug:'land-rover', model_slug:'discovery-sport', name:'HSE',  sort_order:2, engine_type:'hybrid', engine_cc:1997, engine_hp:204, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:11.4,features:[...T,'hud'],        price_ils:338000 },
  { make_slug:'land-rover', model_slug:'discovery-sport', name:'PHEV', sort_order:3, engine_type:'phev',   engine_cc:1997, engine_hp:309, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:11.4,features:[...T,'hud'],        price_ils:368000 },

  // ── Land Rover Range Rover Velar ──────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'range-rover-velar', name:'S',     sort_order:0, engine_type:'hybrid', engine_cc:1997, engine_hp:249, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10, features:[...T,'hud'],  price_ils:398000 },
  { make_slug:'land-rover', model_slug:'range-rover-velar', name:'SE',    sort_order:1, engine_type:'hybrid', engine_cc:1997, engine_hp:300, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10, features:[...T,'hud'],  price_ils:448000 },
  { make_slug:'land-rover', model_slug:'range-rover-velar', name:'HSE',   sort_order:2, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:10, features:[...T,'hud'],  price_ils:498000 },

  // ── Land Rover Range Rover Sport ──────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'range-rover-sport', name:'S',     sort_order:0, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:598000 },
  { make_slug:'land-rover', model_slug:'range-rover-sport', name:'SE',    sort_order:1, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:648000 },
  { make_slug:'land-rover', model_slug:'range-rover-sport', name:'HSE',   sort_order:2, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:698000 },
  { make_slug:'land-rover', model_slug:'range-rover-sport', name:'Autobiography', sort_order:3, engine_type:'hybrid', engine_cc:4395, engine_hp:530, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'], price_ils:798000 },

  // ── Land Rover Range Rover (full size) ───────────────────────────────────────
  { make_slug:'land-rover', model_slug:'range-rover', name:'SE',           sort_order:0, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:798000 },
  { make_slug:'land-rover', model_slug:'range-rover', name:'HSE',          sort_order:1, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:898000 },
  { make_slug:'land-rover', model_slug:'range-rover', name:'Autobiography',sort_order:2, engine_type:'hybrid', engine_cc:4395, engine_hp:530, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:1198000 },
  { make_slug:'land-rover', model_slug:'range-rover', name:'SV',           sort_order:3, engine_type:'hybrid', engine_cc:4395, engine_hp:530, transmission:'automatic', drive:'awd', seats:'leather', screen_size:13.1,features:[...T,'hud'],  price_ils:1498000 },

  // ── Land Rover Discovery ──────────────────────────────────────────────────────
  { make_slug:'land-rover', model_slug:'discovery', name:'S',     sort_order:0, engine_type:'hybrid', engine_cc:2996, engine_hp:300, transmission:'automatic', drive:'awd', seat_count:7, seats:'leatherette', screen_size:11.4,features:[...M,'camera_360'],   price_ils:448000 },
  { make_slug:'land-rover', model_slug:'discovery', name:'SE',    sort_order:1, engine_type:'hybrid', engine_cc:2996, engine_hp:300, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:11.4,features:[...T,'hud'],           price_ils:498000 },
  { make_slug:'land-rover', model_slug:'discovery', name:'HSE',   sort_order:2, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:11.4,features:[...T,'hud'],           price_ils:548000 },
  { make_slug:'land-rover', model_slug:'discovery', name:'R-Dynamic HSE', sort_order:3, engine_type:'hybrid', engine_cc:2996, engine_hp:400, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather', screen_size:11.4,features:[...T,'hud'],      price_ils:598000 },
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
