/**
 * Seed trim specs for popular car models in the Israeli market.
 * Run with: npx tsx scripts/seed-trim-specs.ts
 *
 * Data reflects Israeli market specifications as sold by local importers.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TrimRow {
  make_slug: string;
  model_slug: string;
  name: string;
  sort_order: number;
  engine_type?: string;
  engine_cc?: number;
  engine_hp?: number;
  transmission?: string;
  drive?: string;
  seats?: string;
  seat_count?: number;
  screen_size?: number;
  features: string[];
}

const BASE_SAFETY = ['aeb', 'lane_keep', 'rear_camera', 'parking_sensors', 'auto_lights'];
const STD_SAFETY  = [...BASE_SAFETY, 'adaptive_cruise', 'blind_spot', 'traffic_sign'];
const FULL_SAFETY = [...STD_SAFETY, 'camera_360'];

const TRIMS: TrimRow[] = [

  // ════════════════════════════════════════════════════════
  // Toyota Corolla
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'toyota', model_slug: 'corolla', name: 'Urban', sort_order: 0,
    engine_type: 'hybrid', engine_cc: 1798, engine_hp: 122,
    transmission: 'cvt', drive: 'fwd',
    seats: 'fabric', screen_size: 8,
    features: [...BASE_SAFETY, 'apple_carplay', 'push_start', 'led_lights'],
  },
  {
    make_slug: 'toyota', model_slug: 'corolla', name: 'Comfort', sort_order: 1,
    engine_type: 'hybrid', engine_cc: 1798, engine_hp: 122,
    transmission: 'cvt', drive: 'fwd',
    seats: 'leatherette', screen_size: 10.5,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'auto_wipers'],
  },
  {
    make_slug: 'toyota', model_slug: 'corolla', name: 'Prestige', sort_order: 2,
    engine_type: 'hybrid', engine_cc: 1798, engine_hp: 122,
    transmission: 'cvt', drive: 'fwd',
    seats: 'leather', screen_size: 10.5,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'auto_wipers', 'digital_cluster'],
  },
  {
    make_slug: 'toyota', model_slug: 'corolla', name: 'GR Sport', sort_order: 3,
    engine_type: 'hybrid', engine_cc: 1987, engine_hp: 196,
    transmission: 'cvt', drive: 'fwd',
    seats: 'leatherette', screen_size: 10.5,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting'],
  },

  // ════════════════════════════════════════════════════════
  // Toyota RAV4
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'toyota', model_slug: 'rav4', name: 'Urban', sort_order: 0,
    engine_type: 'hybrid', engine_cc: 2487, engine_hp: 218,
    transmission: 'cvt', drive: 'awd',
    seats: 'fabric', screen_size: 8,
    features: [...BASE_SAFETY, 'apple_carplay', 'push_start', 'led_lights'],
  },
  {
    make_slug: 'toyota', model_slug: 'rav4', name: 'Comfort', sort_order: 1,
    engine_type: 'hybrid', engine_cc: 2487, engine_hp: 218,
    transmission: 'cvt', drive: 'awd',
    seats: 'leatherette', screen_size: 10.5,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'auto_wipers'],
  },
  {
    make_slug: 'toyota', model_slug: 'rav4', name: 'Prestige', sort_order: 2,
    engine_type: 'hybrid', engine_cc: 2487, engine_hp: 218,
    transmission: 'cvt', drive: 'awd',
    seats: 'leather', screen_size: 10.5,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'auto_wipers', 'digital_cluster', 'hud'],
  },
  {
    make_slug: 'toyota', model_slug: 'rav4', name: 'Prestige Plus', sort_order: 3,
    engine_type: 'phev', engine_cc: 2487, engine_hp: 306,
    transmission: 'cvt', drive: 'awd',
    seats: 'leather', screen_size: 10.5,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'auto_wipers', 'digital_cluster', 'hud', 'heated_steering'],
  },
  {
    make_slug: 'toyota', model_slug: 'rav4', name: 'GR Sport', sort_order: 4,
    engine_type: 'hybrid', engine_cc: 2487, engine_hp: 218,
    transmission: 'cvt', drive: 'awd',
    seats: 'leatherette', screen_size: 10.5,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster', 'ambient_lighting'],
  },

  // ════════════════════════════════════════════════════════
  // Hyundai Tucson
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'hyundai', model_slug: 'tucson', name: 'Smart', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 150,
    transmission: 'automatic', drive: 'fwd',
    seats: 'fabric', screen_size: 8,
    features: [...BASE_SAFETY, 'apple_carplay', 'led_lights'],
  },
  {
    make_slug: 'hyundai', model_slug: 'tucson', name: 'Comfort', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 180,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'hyundai', model_slug: 'tucson', name: 'Premium', sort_order: 2,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 180,
    transmission: 'dct', drive: 'fwd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'heated_steering'],
  },
  {
    make_slug: 'hyundai', model_slug: 'tucson', name: 'Premium Plus', sort_order: 3,
    engine_type: 'phev', engine_cc: 1591, engine_hp: 265,
    transmission: 'dct', drive: 'awd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'hud', 'heated_steering', 'premium_audio'],
  },
  {
    make_slug: 'hyundai', model_slug: 'tucson', name: 'N Line', sort_order: 4,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 180,
    transmission: 'dct', drive: 'awd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },

  // ════════════════════════════════════════════════════════
  // Kia Sportage
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'kia', model_slug: 'sportage', name: 'Active', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 150,
    transmission: 'automatic', drive: 'fwd',
    seats: 'fabric', screen_size: 8,
    features: [...BASE_SAFETY, 'apple_carplay', 'led_lights'],
  },
  {
    make_slug: 'kia', model_slug: 'sportage', name: 'Comfort', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 180,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 12.3,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'kia', model_slug: 'sportage', name: 'Luxe', sort_order: 2,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 180,
    transmission: 'dct', drive: 'fwd',
    seats: 'leather', screen_size: 12.3,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'heated_steering', 'hud'],
  },
  {
    make_slug: 'kia', model_slug: 'sportage', name: 'GT Line', sort_order: 3,
    engine_type: 'hybrid', engine_cc: 1591, engine_hp: 230,
    transmission: 'dct', drive: 'fwd',
    seats: 'leather', screen_size: 12.3,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'heated_steering', 'hud', 'premium_audio'],
  },
  {
    make_slug: 'kia', model_slug: 'sportage', name: 'GT Line AWD', sort_order: 4,
    engine_type: 'hybrid', engine_cc: 1591, engine_hp: 230,
    transmission: 'dct', drive: 'awd',
    seats: 'leather', screen_size: 12.3,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'heated_steering', 'hud', 'premium_audio'],
  },

  // ════════════════════════════════════════════════════════
  // Mazda CX-5
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'mazda', model_slug: 'cx5', name: 'Dynamic', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1998, engine_hp: 165,
    transmission: 'automatic', drive: 'fwd',
    seats: 'fabric', screen_size: 10.25,
    features: [...BASE_SAFETY, 'apple_carplay', 'led_lights'],
  },
  {
    make_slug: 'mazda', model_slug: 'cx5', name: 'Exclusive-Line', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1998, engine_hp: 165,
    transmission: 'automatic', drive: 'awd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'mazda', model_slug: 'cx5', name: 'Carbon Edition', sort_order: 2,
    engine_type: 'petrol', engine_cc: 1998, engine_hp: 165,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'sunroof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'premium_audio'],
  },
  {
    make_slug: 'mazda', model_slug: 'cx5', name: 'Homura', sort_order: 3,
    engine_type: 'petrol', engine_cc: 2488, engine_hp: 228,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'sunroof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'premium_audio', 'hud', 'heated_steering'],
  },

  // ════════════════════════════════════════════════════════
  // Volkswagen Golf
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'volkswagen', model_slug: 'golf', name: 'Life', sort_order: 0,
    engine_type: 'petrol', engine_cc: 999, engine_hp: 110,
    transmission: 'automatic', drive: 'fwd',
    seats: 'fabric', screen_size: 10,
    features: [...BASE_SAFETY, 'apple_carplay', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'volkswagen', model_slug: 'golf', name: 'Style', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1498, engine_hp: 150,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 10,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting'],
  },
  {
    make_slug: 'volkswagen', model_slug: 'golf', name: 'R-Line', sort_order: 2,
    engine_type: 'petrol', engine_cc: 1498, engine_hp: 150,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 10,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting'],
  },
  {
    make_slug: 'volkswagen', model_slug: 'golf', name: 'GTI', sort_order: 3,
    engine_type: 'petrol', engine_cc: 1984, engine_hp: 245,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 10,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting', 'premium_audio'],
  },
  {
    make_slug: 'volkswagen', model_slug: 'golf', name: 'Golf R', sort_order: 4,
    engine_type: 'petrol', engine_cc: 1984, engine_hp: 333,
    transmission: 'dct', drive: 'awd',
    seats: 'leather', screen_size: 10,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'electric_seats', 'memory_seats', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'ambient_lighting', 'premium_audio', 'hud'],
  },

  // ════════════════════════════════════════════════════════
  // BMW 3 Series
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'bmw', model_slug: 'series3', name: '318i', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1499, engine_hp: 156,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'bmw', model_slug: 'series3', name: '320i', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1998, engine_hp: 184,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'electric_seats', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'ambient_lighting', 'heated_steering'],
  },
  {
    make_slug: 'bmw', model_slug: 'series3', name: '330i', sort_order: 2,
    engine_type: 'petrol', engine_cc: 2998, engine_hp: 258,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'ventilated_seats', 'electric_seats', 'memory_seats',
               'sunroof', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting', 'heated_steering', 'hud', 'premium_audio'],
  },
  {
    make_slug: 'bmw', model_slug: 'series3', name: 'M340i xDrive', sort_order: 3,
    engine_type: 'petrol', engine_cc: 2998, engine_hp: 374,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'ventilated_seats', 'electric_seats', 'memory_seats',
               'sunroof', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting', 'heated_steering', 'hud', 'premium_audio'],
  },

  // ════════════════════════════════════════════════════════
  // Hyundai IONIQ 5
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'hyundai', model_slug: 'ioniq-5', name: '58kWh Standard Range', sort_order: 0,
    engine_type: 'electric', engine_hp: 170,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leatherette', screen_size: 12,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'hyundai', model_slug: 'ioniq-5', name: '73kWh Long Range', sort_order: 1,
    engine_type: 'electric', engine_hp: 225,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leatherette', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'panoramic_roof', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'ambient_lighting', 'heated_steering'],
  },
  {
    make_slug: 'hyundai', model_slug: 'ioniq-5', name: '73kWh AWD', sort_order: 2,
    engine_type: 'electric', engine_hp: 325,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'keyless_entry', 'push_start', 'led_lights',
               'digital_cluster', 'ambient_lighting', 'heated_steering', 'hud', 'premium_audio'],
  },
  {
    make_slug: 'hyundai', model_slug: 'ioniq-5', name: 'N', sort_order: 3,
    engine_type: 'electric', engine_hp: 650,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'ventilated_seats', 'electric_seats', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'ambient_lighting', 'hud', 'premium_audio'],
  },

  // ════════════════════════════════════════════════════════
  // Kia EV6
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'kia', model_slug: 'ev6', name: 'Standard Range', sort_order: 0,
    engine_type: 'electric', engine_hp: 170,
    transmission: 'automatic', drive: 'rwd',
    seats: 'fabric', screen_size: 12,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'kia', model_slug: 'ev6', name: 'Long Range RWD', sort_order: 1,
    engine_type: 'electric', engine_hp: 229,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leatherette', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'heated_steering', 'hud'],
  },
  {
    make_slug: 'kia', model_slug: 'ev6', name: 'Long Range AWD', sort_order: 2,
    engine_type: 'electric', engine_hp: 325,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'heated_steering', 'hud', 'premium_audio'],
  },
  {
    make_slug: 'kia', model_slug: 'ev6', name: 'GT', sort_order: 3,
    engine_type: 'electric', engine_hp: 585,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 12,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'ventilated_seats', 'electric_seats', 'panoramic_roof',
               'ambient_lighting', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster',
               'heated_steering', 'hud', 'premium_audio'],
  },

  // ════════════════════════════════════════════════════════
  // Mercedes C-Class
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'mercedes', model_slug: 'c-class', name: 'C180', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1496, engine_hp: 170,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leatherette', screen_size: 11.9,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster', 'ambient_lighting'],
  },
  {
    make_slug: 'mercedes', model_slug: 'c-class', name: 'C200', sort_order: 1,
    engine_type: 'hybrid', engine_cc: 1496, engine_hp: 204,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leather', screen_size: 11.9,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'ventilated_seats', 'electric_seats', 'keyless_entry',
               'push_start', 'led_lights', 'digital_cluster', 'ambient_lighting', 'hud', 'heated_steering'],
  },
  {
    make_slug: 'mercedes', model_slug: 'c-class', name: 'C300', sort_order: 2,
    engine_type: 'hybrid', engine_cc: 1999, engine_hp: 258,
    transmission: 'automatic', drive: 'rwd',
    seats: 'leather', screen_size: 11.9,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'hud', 'premium_audio', 'heated_steering'],
  },
  {
    make_slug: 'mercedes', model_slug: 'c-class', name: 'AMG C43', sort_order: 3,
    engine_type: 'hybrid', engine_cc: 1999, engine_hp: 408,
    transmission: 'automatic', drive: 'awd',
    seats: 'leather', screen_size: 11.9,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'memory_seats', 'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'hud', 'premium_audio', 'heated_steering'],
  },

  // ════════════════════════════════════════════════════════
  // Hyundai Elantra
  // ════════════════════════════════════════════════════════
  {
    make_slug: 'hyundai', model_slug: 'elantra', name: 'Smart', sort_order: 0,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 123,
    transmission: 'automatic', drive: 'fwd',
    seats: 'fabric', screen_size: 8,
    features: [...BASE_SAFETY, 'apple_carplay', 'led_lights'],
  },
  {
    make_slug: 'hyundai', model_slug: 'elantra', name: 'Comfort', sort_order: 1,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 123,
    transmission: 'automatic', drive: 'fwd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...STD_SAFETY, 'apple_carplay', 'wireless_charging', 'heated_seats_front',
               'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
  {
    make_slug: 'hyundai', model_slug: 'elantra', name: 'Premium', sort_order: 2,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 123,
    transmission: 'automatic', drive: 'fwd',
    seats: 'leather', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats',
               'panoramic_roof', 'ambient_lighting', 'keyless_entry', 'push_start',
               'led_lights', 'digital_cluster', 'heated_steering'],
  },
  {
    make_slug: 'hyundai', model_slug: 'elantra', name: 'N Line', sort_order: 3,
    engine_type: 'petrol', engine_cc: 1591, engine_hp: 204,
    transmission: 'dct', drive: 'fwd',
    seats: 'leatherette', screen_size: 10.25,
    features: [...FULL_SAFETY, 'apple_carplay', 'wireless_carplay', 'wireless_charging',
               'heated_seats_front', 'keyless_entry', 'push_start', 'led_lights', 'digital_cluster'],
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function upsertTrim(trim: TrimRow) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_trims?make_slug=eq.${trim.make_slug}&model_slug=eq.${trim.model_slug}&name=eq.${encodeURIComponent(trim.name)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(trim),
    },
  );
  return res.ok || res.status === 204 || res.status === 201;
}

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  let ok = 0, fail = 0;
  for (const trim of TRIMS) {
    const success = await upsertTrim(trim);
    if (success) {
      console.log(`✓ ${trim.make_slug}/${trim.model_slug} — ${trim.name} (${trim.engine_hp ?? '?'}hp)`);
      ok++;
    } else {
      console.error(`✗ ${trim.make_slug}/${trim.model_slug} — ${trim.name}`);
      fail++;
    }
  }
  console.log(`\nDone. Upserted: ${ok}, Failed: ${fail}`);
}

run();
