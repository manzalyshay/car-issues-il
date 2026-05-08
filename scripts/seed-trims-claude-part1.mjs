/**
 * Trim specs seeded from Claude's knowledge of the Israeli car market.
 * Part 1: Toyota (remaining), Hyundai (remaining), KIA (remaining)
 * Run: node scripts/seed-trims-claude-part1.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
  .split('\n').reduce((acc, line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    return acc;
  }, {});

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const B = ['aeb','lane_keep','rear_camera','parking_sensors','led_lights','push_start','apple_carplay'];
const M = [...B,'adaptive_cruise','blind_spot','traffic_sign','wireless_carplay','wireless_charging','heated_seats_front','keyless_entry','digital_cluster'];
const T = [...M,'camera_360','ventilated_seats','heated_seats_rear','electric_seats','memory_seats','panoramic_roof','ambient_lighting','premium_audio','hud','auto_lights','heated_steering'];

const TRIMS = [
  // ── Toyota C-HR ─────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'chr', name:'Urban',    sort_order:0, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                                                           price_ils:163000 },
  { make_slug:'toyota', model_slug:'chr', name:'City',     sort_order:1, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.5, features:[...B,'wireless_carplay','wireless_charging','heated_seats_front','keyless_entry','auto_lights'],  price_ils:177000 },
  { make_slug:'toyota', model_slug:'chr', name:'Comfort',  sort_order:2, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.5, features:[...M,'auto_lights','heated_steering'],                                                             price_ils:189000 },
  { make_slug:'toyota', model_slug:'chr', name:'Prestige', sort_order:3, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.5, features:[...T],                                                                                             price_ils:201000 },

  // ── Toyota Yaris ────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'yaris', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:7,    features:['aeb','lane_keep','rear_camera','parking_sensors','led_lights','apple_carplay','push_start'],    price_ils:119000 },
  { make_slug:'toyota', model_slug:'yaris', name:'City',    sort_order:1, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:9,    features:[...B,'wireless_carplay','wireless_charging','heated_seats_front','auto_lights'],                  price_ils:131000 },
  { make_slug:'toyota', model_slug:'yaris', name:'Comfort', sort_order:2, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'auto_lights','heated_steering'],                                                             price_ils:143000 },
  { make_slug:'toyota', model_slug:'yaris', name:'Prestige',sort_order:3, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,    features:[...T],                                                                                             price_ils:154000 },
  { make_slug:'toyota', model_slug:'yaris', name:'GR',      sort_order:4, engine_type:'petrol', engine_cc:1618, engine_hp:261, transmission:'manual',drive:'awd', seats:'fabric',    screen_size:8,    features:[...B,'wireless_carplay','digital_cluster'],                                                        price_ils:215000 },

  // ── Toyota Yaris Cross ──────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'yaris-cross', name:'Urban',    sort_order:0, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                                                price_ils:151000 },
  { make_slug:'toyota', model_slug:'yaris-cross', name:'City',     sort_order:1, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:10.5, features:[...B,'wireless_carplay','wireless_charging','heated_seats_front','keyless_entry'],    price_ils:162000 },
  { make_slug:'toyota', model_slug:'yaris-cross', name:'Comfort',  sort_order:2, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.5, features:[...M,'auto_lights'],                                                                 price_ils:172000 },
  { make_slug:'toyota', model_slug:'yaris-cross', name:'Prestige', sort_order:3, engine_type:'hybrid', engine_cc:1490, engine_hp:116, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.5, features:[...T],                                                                                price_ils:184000 },

  // ── Toyota Camry ────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'camry', name:'Urban',    sort_order:0, engine_type:'hybrid', engine_cc:2487, engine_hp:218, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...B,'wireless_carplay','wireless_charging','keyless_entry'],                                 price_ils:178000 },
  { make_slug:'toyota', model_slug:'camry', name:'Comfort',  sort_order:1, engine_type:'hybrid', engine_cc:2487, engine_hp:218, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:9,    features:[...M,'auto_lights'],                                                                          price_ils:193000 },
  { make_slug:'toyota', model_slug:'camry', name:'Prestige', sort_order:2, engine_type:'hybrid', engine_cc:2487, engine_hp:218, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:9,    features:[...T],                                                                                        price_ils:212000 },

  // ── Toyota Prius ────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'prius', name:'אקטיב',      sort_order:0, engine_type:'hybrid', engine_cc:1987, engine_hp:196, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','digital_cluster'],                                                price_ils:148000 },
  { make_slug:'toyota', model_slug:'prius', name:'אקטיב פלוס', sort_order:1, engine_type:'hybrid', engine_cc:1987, engine_hp:196, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:8,    features:[...M,'digital_cluster'],                                                                   price_ils:162000 },
  { make_slug:'toyota', model_slug:'prius', name:'Prestige',   sort_order:2, engine_type:'hybrid', engine_cc:1987, engine_hp:196, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:8,    features:[...T],                                                                                    price_ils:178000 },

  // ── Toyota bZ4X ─────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'bz4x', name:'Motion',  sort_order:0, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.3, features:[...M,'digital_cluster','camera_360'],                                                                  price_ils:198000 },
  { make_slug:'toyota', model_slug:'bz4x', name:"Vision",  sort_order:1, engine_type:'electric', engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:12.3, features:[...T],                                                                                                 price_ils:218000 },

  // ── Toyota Corolla Cross ─────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'corolla-cross', name:'Urban',    sort_order:0, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay'],                                                             price_ils:158000 },
  { make_slug:'toyota', model_slug:'corolla-cross', name:'Comfort',  sort_order:1, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.5, features:[...M],                                                                               price_ils:172000 },
  { make_slug:'toyota', model_slug:'corolla-cross', name:'Prestige', sort_order:2, engine_type:'hybrid', engine_cc:1798, engine_hp:122, transmission:'cvt', drive:'fwd', seats:'leather',     screen_size:10.5, features:[...T],                                                                               price_ils:186000 },

  // ── Toyota Hilux ─────────────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'hilux', name:'SR',        sort_order:0, engine_type:'diesel', engine_cc:2755, engine_hp:150, transmission:'manual',    drive:'awd', seats:'fabric',      screen_size:null, features:['aeb','rear_camera','parking_sensors','led_lights'],                                  price_ils:198000 },
  { make_slug:'toyota', model_slug:'hilux', name:'SR5',       sort_order:1, engine_type:'diesel', engine_cc:2755, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8,    features:[...B,'wireless_carplay','auto_lights'],                                               price_ils:219000 },
  { make_slug:'toyota', model_slug:'hilux', name:'GR Sport',  sort_order:2, engine_type:'diesel', engine_cc:2755, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:8,    features:[...M,'camera_360'],                                                                   price_ils:243000 },
  { make_slug:'toyota', model_slug:'hilux', name:'Executive', sort_order:3, engine_type:'diesel', engine_cc:2755, engine_hp:150, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:8,    features:[...T],                                                                                price_ils:261000 },

  // ── Toyota Land Cruiser ──────────────────────────────────────────────────────
  { make_slug:'toyota', model_slug:'land-cruiser', name:'GX',        sort_order:0, engine_type:'diesel', engine_cc:2755, engine_hp:204, transmission:'automatic', drive:'awd', seats:'fabric',      screen_size:9,    features:[...B,'auto_lights'],                                                         price_ils:370000 },
  { make_slug:'toyota', model_slug:'land-cruiser', name:'GXR',       sort_order:1, engine_type:'diesel', engine_cc:2755, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leatherette', screen_size:9,    features:[...M,'camera_360'],                                                           price_ils:410000 },
  { make_slug:'toyota', model_slug:'land-cruiser', name:'VX',        sort_order:2, engine_type:'diesel', engine_cc:2755, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:9,    features:[...T],                                                                        price_ils:460000 },
  { make_slug:'toyota', model_slug:'land-cruiser', name:'Executive', sort_order:3, engine_type:'diesel', engine_cc:2755, engine_hp:204, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                                                                  price_ils:510000 },

  // ── Hyundai Kona ─────────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'kona', name:'Smart',     sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'auto_lights'],                                                                        price_ils:145000 },
  { make_slug:'hyundai', model_slug:'kona', name:'Comfort',   sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'auto_lights'],                                                                       price_ils:159000 },
  { make_slug:'hyundai', model_slug:'kona', name:'Premium',   sort_order:2, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','heated_steering','auto_lights'],                                        price_ils:171000 },
  { make_slug:'hyundai', model_slug:'kona', name:'Executive', sort_order:3, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                                                                                     price_ils:185000 },
  { make_slug:'hyundai', model_slug:'kona', name:'N Line',    sort_order:4, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'ambient_lighting','digital_cluster'],                                                price_ils:174000 },
  { make_slug:'hyundai', model_slug:'kona', name:'Electric',  sort_order:5, engine_type:'electric',              engine_hp:156, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','heated_steering'],                                                price_ils:178000 },

  // ── Hyundai i20 ──────────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'i20', name:'Comfort', sort_order:0, engine_type:'petrol', engine_cc:1197, engine_hp:100, transmission:'dct', drive:'fwd', seats:'fabric', screen_size:8, features:[...B,'auto_lights'], price_ils:109000 },

  // ── Hyundai i30 ──────────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'i30', name:'Comfort', sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:180, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M], price_ils:142000 },

  // ── Hyundai Bayon ─────────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'bayon', name:'Comfort', sort_order:0, engine_type:'petrol', engine_cc:1197, engine_hp:100, transmission:'dct', drive:'fwd', seats:'fabric', screen_size:8, features:[...B,'auto_lights'], price_ils:121000 },

  // ── Hyundai Venue ─────────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'venue', name:'Smart',     sort_order:0, engine_type:'petrol', engine_cc:1197, engine_hp:88,  transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:['aeb','rear_camera','parking_sensors','led_lights','apple_carplay','push_start'], price_ils:108000 },
  { make_slug:'hyundai', model_slug:'venue', name:'Comfort',   sort_order:1, engine_type:'petrol', engine_cc:1197, engine_hp:88,  transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'wireless_carplay','heated_seats_front','auto_lights'],                    price_ils:118000 },
  { make_slug:'hyundai', model_slug:'venue', name:'Premium',   sort_order:2, engine_type:'petrol', engine_cc:1197, engine_hp:88,  transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:8,    features:[...M],                                                                          price_ils:128000 },

  // ── Hyundai Santa Fe ─────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'santa-fe', name:'Smart',     sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:230, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360'],                                                    price_ils:238000 },
  { make_slug:'hyundai', model_slug:'santa-fe', name:'Premium',   sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:230, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:10.25,features:[...T],                                                                  price_ils:264000 },
  { make_slug:'hyundai', model_slug:'santa-fe', name:'Executive', sort_order:2, engine_type:'hybrid', engine_cc:1598, engine_hp:230, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T,'hud'],                                                           price_ils:289000 },

  // ── Hyundai Sonata ───────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'sonata', name:'Comfort',   sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:180, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M], price_ils:178000 },
  { make_slug:'hyundai', model_slug:'sonata', name:'Executive', sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:180, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T], price_ils:198000 },

  // ── Hyundai Ioniq-6 ──────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'ioniq-6', name:'Long Range RWD', sort_order:0, engine_type:'electric', engine_hp:229, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.3, features:[...M,'camera_360','digital_cluster','ambient_lighting','heated_steering'], price_ils:198000 },
  { make_slug:'hyundai', model_slug:'ioniq-6', name:'Long Range AWD', sort_order:1, engine_type:'electric', engine_hp:325, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T],                                                                   price_ils:228000 },

  // ── Hyundai Staria ───────────────────────────────────────────────────────────
  { make_slug:'hyundai', model_slug:'staria', name:'Smart',   sort_order:0, engine_type:'petrol', engine_cc:3497, engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leatherette', seat_count:9, screen_size:10.25,features:[...M], price_ils:248000 },
  { make_slug:'hyundai', model_slug:'staria', name:'Premium', sort_order:1, engine_type:'petrol', engine_cc:3497, engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leather',     seat_count:7, screen_size:10.25,features:[...T], price_ils:278000 },
  { make_slug:'hyundai', model_slug:'staria', name:'Limousine',sort_order:2, engine_type:'petrol', engine_cc:3497, engine_hp:272, transmission:'automatic', drive:'fwd', seats:'leather',    seat_count:7, screen_size:10.25,features:[...T,'ambient_lighting'], price_ils:308000 },

  // ── KIA Cerato ───────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'cerato', name:'Comfort', sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M], price_ils:143000 },

  // ── KIA Picanto ──────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'picanto', name:'Active',  sort_order:0, engine_type:'petrol', engine_cc:1197, engine_hp:84, transmission:'automatic', drive:'fwd', seats:'fabric',      screen_size:7, features:['aeb','rear_camera','parking_sensors','apple_carplay','led_lights','push_start'], price_ils:97000 },
  { make_slug:'kia', model_slug:'picanto', name:'Comfort', sort_order:1, engine_type:'petrol', engine_cc:1197, engine_hp:84, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:8, features:[...B,'wireless_carplay','heated_seats_front','auto_lights'],                   price_ils:107000 },

  // ── KIA Stonic ───────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'stonic', name:'Active',  sort_order:0, engine_type:'hybrid', engine_cc:1197, engine_hp:100, transmission:'dct', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'auto_lights'],                   price_ils:128000 },
  { make_slug:'kia', model_slug:'stonic', name:'Comfort', sort_order:1, engine_type:'hybrid', engine_cc:1197, engine_hp:100, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:8,    features:[...M],                                 price_ils:138000 },
  { make_slug:'kia', model_slug:'stonic', name:'Luxe',    sort_order:2, engine_type:'hybrid', engine_cc:1197, engine_hp:100, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:8,    features:[...M,'camera_360','heated_steering'],  price_ils:149000 },
  { make_slug:'kia', model_slug:'stonic', name:'GT Line', sort_order:3, engine_type:'hybrid', engine_cc:1197, engine_hp:120, transmission:'dct', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                                price_ils:162000 },

  // ── KIA Seltos ───────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'seltos', name:'Active',  sort_order:0, engine_type:'petrol', engine_cc:1598, engine_hp:123, transmission:'cvt', drive:'fwd', seats:'fabric',      screen_size:8,    features:[...B,'auto_lights'], price_ils:138000 },
  { make_slug:'kia', model_slug:'seltos', name:'Comfort', sort_order:1, engine_type:'petrol', engine_cc:1598, engine_hp:123, transmission:'cvt', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M],               price_ils:152000 },

  // ── KIA Sorento ──────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'sorento', name:'Comfort',   sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:230, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:12.3, features:[...M,'camera_360'],             price_ils:229000 },
  { make_slug:'kia', model_slug:'sorento', name:'Executive', sort_order:1, engine_type:'hybrid', engine_cc:1598, engine_hp:230, transmission:'automatic', drive:'awd', seats:'leather',     screen_size:12.3, features:[...T],                          price_ils:259000 },

  // ── KIA Carnival ─────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'carnival', name:'Comfort',   sort_order:0, engine_type:'petrol', engine_cc:3497, engine_hp:294, transmission:'automatic', drive:'fwd', seat_count:8, seats:'leatherette', screen_size:12.3, features:[...M,'camera_360'],          price_ils:248000 },
  { make_slug:'kia', model_slug:'carnival', name:'Luxe',      sort_order:1, engine_type:'petrol', engine_cc:3497, engine_hp:294, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T],                      price_ils:268000 },
  { make_slug:'kia', model_slug:'carnival', name:'Executive', sort_order:2, engine_type:'petrol', engine_cc:3497, engine_hp:294, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'ambient_lighting'],   price_ils:289000 },
  { make_slug:'kia', model_slug:'carnival', name:'Limousine', sort_order:3, engine_type:'petrol', engine_cc:3497, engine_hp:294, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'hud','ambient_lighting'], price_ils:319000 },

  // ── KIA Niro ─────────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'niro', name:'Hybrid Comfort',  sort_order:0, engine_type:'hybrid',   engine_cc:1580, engine_hp:141, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M],                           price_ils:152000 },
  { make_slug:'kia', model_slug:'niro', name:'PHEV Comfort',    sort_order:1, engine_type:'phev',     engine_cc:1580, engine_hp:183, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M],                           price_ils:168000 },
  { make_slug:'kia', model_slug:'niro', name:'EV Comfort',      sort_order:2, engine_type:'electric',               engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leatherette', screen_size:10.25,features:[...M,'camera_360','heated_steering'],  price_ils:178000 },
  { make_slug:'kia', model_slug:'niro', name:'EV GT Line',      sort_order:3, engine_type:'electric',               engine_hp:204, transmission:'automatic', drive:'fwd', seats:'leather',     screen_size:10.25,features:[...T],                       price_ils:196000 },

  // ── KIA EV9 ──────────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'ev9', name:'Long Range RWD',   sort_order:0, engine_type:'electric', engine_hp:283, transmission:'automatic', drive:'fwd', seat_count:7, seats:'leatherette', screen_size:12.3, features:[...M,'camera_360','digital_cluster','heated_steering'],  price_ils:298000 },
  { make_slug:'kia', model_slug:'ev9', name:'Long Range AWD',   sort_order:1, engine_type:'electric', engine_hp:384, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'hud'],                                           price_ils:338000 },
  { make_slug:'kia', model_slug:'ev9', name:'GT-Line AWD',      sort_order:2, engine_type:'electric', engine_hp:384, transmission:'automatic', drive:'awd', seat_count:7, seats:'leather',     screen_size:12.3, features:[...T,'hud','ambient_lighting'],                         price_ils:358000 },
  { make_slug:'kia', model_slug:'ev9', name:'GT',               sort_order:3, engine_type:'electric', engine_hp:501, transmission:'automatic', drive:'awd', seat_count:6, seats:'leather',     screen_size:12.3, features:[...T,'hud','ambient_lighting'],                         price_ils:398000 },

  // ── KIA Ceed ─────────────────────────────────────────────────────────────────
  { make_slug:'kia', model_slug:'ceed', name:'Comfort', sort_order:0, engine_type:'hybrid', engine_cc:1598, engine_hp:180, transmission:'dct', drive:'fwd', seats:'leatherette', screen_size:10.25, features:[...M], price_ils:148000 },
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
