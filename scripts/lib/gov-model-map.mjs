/**
 * Our make/model slug → Ministry of Transport commercial name (kinuy_mishari), shared by
 * scripts/seed-trims-israel-gov.mjs (trims from the WLTP model list) and
 * scripts/sync-gov-prices.mjs (importer list prices).
 */
export const MODEL_MAP = [
  // Toyota
  { make: 'toyota', model: 'corolla',       q: 'COROLLA',        filterNot: ['CROSS', 'VERSO'] },
  { make: 'toyota', model: 'corolla-cross', q: 'COROLLA CROSS' },
  { make: 'toyota', model: 'yaris',         q: 'YARIS',          filterNot: ['CROSS', 'VERSO'] },
  { make: 'toyota', model: 'yaris-cross',   q: 'YARIS CROSS' },
  { make: 'toyota', model: 'chr',           q: 'C-HR' },
  { make: 'toyota', model: 'camry',         q: 'CAMRY' },
  { make: 'toyota', model: 'prius',         q: 'PRIUS' },
  { make: 'toyota', model: 'bz4x',          q: 'BZ4X' },
  { make: 'toyota', model: 'rav4',          q: 'RAV 4' },
  { make: 'toyota', model: 'hilux',         q: 'HILUX' },
  { make: 'toyota', model: 'land-cruiser',  q: 'LAND CRUISER' },
  // Hyundai
  { make: 'hyundai', model: 'tucson',       q: 'TUCSON' },
  { make: 'hyundai', model: 'kona',         q: 'KONA' },
  { make: 'hyundai', model: 'i20',          q: 'I 20',  minYear: 2019 },
  { make: 'hyundai', model: 'i30',          q: 'I 30',  minYear: 2019 },
  { make: 'hyundai', model: 'santa-fe',     q: 'SANTA FE' },
  { make: 'hyundai', model: 'sonata',       q: 'SONATA' },
  { make: 'hyundai', model: 'ioniq-5',      q: 'IONIQ 5' },
  { make: 'hyundai', model: 'ioniq-6',      q: 'IONIQ 6' },
  { make: 'hyundai', model: 'elantra',      q: 'ELANTRA' },
  { make: 'hyundai', model: 'bayon',        q: 'BAYON' },
  { make: 'hyundai', model: 'venue',        q: 'VENUE' },
  { make: 'hyundai', model: 'staria',       q: 'STARIA' },
  // KIA
  { make: 'kia', model: 'cerato',           q: 'CERATO' },
  { make: 'kia', model: 'picanto',          q: 'PICANTO', minYear: 2017 },
  { make: 'kia', model: 'stonic',           q: 'STONIC' },
  { make: 'kia', model: 'seltos',           q: 'SELTOS' },
  { make: 'kia', model: 'sorento',          q: 'SORENTO', minYear: 2018 },
  { make: 'kia', model: 'carnival',         q: 'CARNIVAL' },
  { make: 'kia', model: 'niro',             q: 'NIRO' },
  { make: 'kia', model: 'ev6',              q: 'EV6' },
  { make: 'kia', model: 'ev9',              q: 'EV9' },
  { make: 'kia', model: 'ceed',             q: 'CEED' },
  { make: 'kia', model: 'sportage',         q: 'SPORTAGE' },
  // Nissan
  { make: 'nissan', model: 'juke',          q: 'JUKE' },
  { make: 'nissan', model: 'x-trail',       q: 'X-TRAIL' },
  { make: 'nissan', model: 'leaf',          q: 'LEAF' },
  { make: 'nissan', model: 'kicks',         q: 'KICKS' },
  // Mazda
  { make: 'mazda', model: 'mazda3',         q: 'MAZDA3' },
  { make: 'mazda', model: 'cx30',           q: 'CX-30' },
  { make: 'mazda', model: 'cx3',            q: 'CX-3',           filterNot: ['CX-30', 'CX-35'] },
  { make: 'mazda', model: 'cx5',            q: 'CX-5' },
  { make: 'mazda', model: 'mazda6',         q: 'MAZDA6' },
  { make: 'mazda', model: 'mx5',            q: 'MX-5' },
  // VW
  { make: 'volkswagen', model: 'polo',      q: 'POLO',           filterNot: ['CROSS'] },
  { make: 'volkswagen', model: 'golf',      q: 'GOLF' },
  { make: 'volkswagen', model: 'tiguan',    q: 'TIGUAN' },
  { make: 'volkswagen', model: 'troc',      q: 'T-ROC' },
  { make: 'volkswagen', model: 'taigo',     q: 'TAIGO' },
  { make: 'volkswagen', model: 'id3',       q: 'ID.3' },
  { make: 'volkswagen', model: 'id4',       q: 'ID.4' },
  // Skoda
  { make: 'skoda', model: 'octavia',        q: 'OCTAVIA', minYear: 2010 },
  { make: 'skoda', model: 'kodiaq',         q: 'KODIAQ' },
  { make: 'skoda', model: 'karoq',          q: 'KAROQ' },
  { make: 'skoda', model: 'kamiq',          q: 'KAMIQ' },
  { make: 'skoda', model: 'fabia',          q: 'FABIA', minYear: 2017 },
  { make: 'skoda', model: 'enyaq',          q: 'ENYAQ' },
  { make: 'skoda', model: 'scala',          q: 'SCALA' },
  // Seat/Cupra
  { make: 'seat',  model: 'arona',          q: 'ARONA' },
  { make: 'seat',  model: 'ibiza',          q: 'IBIZA', minYear: 2013 },
  { make: 'seat',  model: 'leon',           q: 'LEON',           filterNot: ['CUPRA'], minYear: 2013 },
  { make: 'seat',  model: 'ateca',          q: 'ATECA',          filterNot: ['CUPRA'] },
  { make: 'cupra', model: 'formentor',      q: 'FORMENTOR' },
  { make: 'cupra', model: 'born',           q: 'BORN' },
  { make: 'cupra', model: 'ateca',          q: 'CUPRA ATECA' },
  // Audi
  { make: 'audi',  model: 'q3',             q: 'Q3' },
  { make: 'audi',  model: 'q5',             q: 'Q5' },
  // Renault
  { make: 'renault', model: 'clio',         q: 'CLIO' },
  { make: 'renault', model: 'megane',       q: 'MEGANE', minYear: 2020 },
  { make: 'renault', model: 'arkana',       q: 'ARKANA' },
  { make: 'renault', model: 'zoe',          q: 'ZOE' },
  // Dacia
  { make: 'dacia', model: 'duster',         q: 'DUSTER' },
  { make: 'dacia', model: 'sandero',        q: 'SANDERO' },
  { make: 'dacia', model: 'spring',         q: 'SPRING' },
  // Mitsubishi
  { make: 'mitsubishi', model: 'eclipse-cross', q: 'ECLIPSE CROSS' },
  { make: 'mitsubishi', model: 'outlander',     q: 'OUTLANDER' },
  { make: 'mitsubishi', model: 'asx',           q: 'ASX' },
  { make: 'mitsubishi', model: 'colt',          q: 'COLT' },
  // Subaru
  { make: 'subaru', model: 'forester',      q: 'FORESTER' },
  { make: 'subaru', model: 'outback',       q: 'OUTBACK' },
  { make: 'subaru', model: 'xv',            q: 'XV' },
  { make: 'subaru', model: 'impreza',       q: 'IMPREZA' },
  // Suzuki
  { make: 'suzuki', model: 'vitara',        q: 'VITARA' },
  { make: 'suzuki', model: 'scross',        q: 'S-CROSS' },
  { make: 'suzuki', model: 'swift',         q: 'SWIFT' },
  { make: 'suzuki', model: 'jimny',         q: 'JIMNY' },
  // Volvo
  { make: 'volvo', model: 'xc40',           q: 'XC40' },
  { make: 'volvo', model: 'xc60',           q: 'XC60' },
  { make: 'volvo', model: 'xc90',           q: 'XC90' },
  { make: 'volvo', model: 's60',            q: 'S60' },
  { make: 'volvo', model: 'ex30',           q: 'EX30' },
  // Lexus
  { make: 'lexus', model: 'nx',             q: 'NX' },
  { make: 'lexus', model: 'rx',             q: 'RX' },
  { make: 'lexus', model: 'es',             q: 'ES' },
  { make: 'lexus', model: 'is',             q: 'IS' },
  { make: 'lexus', model: 'ux',             q: 'UX' },
  // Jeep
  { make: 'jeep',  model: 'compass',        q: 'JEEP COMPASS' },
  { make: 'jeep',  model: 'avenger',        q: 'AVENGER' },
  { make: 'jeep',  model: 'wrangler',       q: 'WRANGLER' },
  { make: 'jeep',  model: 'renegade',       q: 'RENEGADE' },
  // Honda
  { make: 'honda', model: 'crv',            q: 'CRV 2.0' },
  { make: 'honda', model: 'civic',          q: 'CIVIC' },
  // MG
  { make: 'mg',    model: 'mg-zs',          q: 'MG ZS' },
  { make: 'mg',    model: 'mg4',            q: 'MG4' },
  { make: 'mg',    model: 'hs',             q: 'MG HS' },
  // Peugeot — careful with 208/2008/3008 prefix matching
  { make: 'peugeot', model: '208',          q: '208',            peugeotExact: true },
  { make: 'peugeot', model: '2008',         q: '2008' },
  { make: 'peugeot', model: '3008',         q: '3008' },
  { make: 'peugeot', model: '5008',         q: '5008' },
  // Opel
  { make: 'opel',  model: 'corsa',          q: 'CORSA' },
  { make: 'opel',  model: 'mokka',          q: 'MOKKA' },
  { make: 'opel',  model: 'astra',          q: 'ASTRA' },
  { make: 'opel',  model: 'grandland',      q: 'GRANDLAND' },
];

/**
 * Check whether a record's kinuy_mishari matches the model entry.
 * Handles peugeotExact flag, filterNot, and general substring matching.
 */
export function recordMatchesModel(rec, entry) {
  const commercial = (rec.kinuy_mishari ?? '').toUpperCase().trim();
  const q = entry.q.toUpperCase();

  // Peugeot 208 exact match: must start with "208 " or equal "208"
  if (entry.peugeotExact) {
    if (commercial !== q && !commercial.startsWith(q + ' ')) return false;
  } else {
    if (!commercial.includes(q)) return false;
  }

  // Apply filterNot
  if (entry.filterNot) {
    for (const notTerm of entry.filterNot) {
      if (commercial.includes(notTerm.toUpperCase())) return false;
    }
  }

  return true;
}
