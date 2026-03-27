/**
 * Curated Sketchfab 3D model UIDs — every UID verified via actual Sketchfab URL.
 * Only EXACT car matches are stored — no nearest-alternative fallbacks.
 * Keys MUST match the model slugs in src/data/cars.ts exactly.
 * Sources: SQUIR3D, slowpoly, Ddiaz Design, zifir3d, VeesGuy, autoactiva, Nazh Design
 * Key: `${makeSlug}/${modelSlug}` using cars.ts slugs
 */

export interface SketchfabModel {
  uid: string;
  name: string;
  viewerUrl: string;
}

const MODELS: Record<string, { uid: string; name: string }> = {
  // ── Toyota ────────────────────────────────────────────────────────────────
  'toyota/corolla':       { uid: 'de9012121c0844039fb26a4ff2c75028', name: 'Toyota Corolla 2022' },
  'toyota/rav4':          { uid: '18c2af638eaf4b13a3bb31f38278bdc3', name: 'Toyota RAV4 2022' },
  'toyota/camry':         { uid: '147a0afe465144b5a474dc2f8c0a42cc', name: 'Toyota Camry Hybrid SE 2021' },
  'toyota/yaris':         { uid: 'b702373da1274645a8c57da1cac8bf4d', name: 'Toyota Yaris 2020' },
  'toyota/chr':           { uid: 'f426a2f495fc41c8aaef33574d232567', name: 'Toyota C-HR GR Sport 2021' },
  'toyota/hilux':         { uid: 'cb3d6d74f597429e99d8972e58d5040f', name: 'Toyota Hilux Double Cab 2021' },
  'toyota/land-cruiser':  { uid: '3dfcd7904cdb4e52afa3ce59fa59e1a5', name: 'Toyota Land Cruiser 300 2022' },
  'toyota/prius':         { uid: 'ad0d925cb51040798d96f166db8c7f80', name: 'Toyota Prius 2020' },

  // ── Hyundai ───────────────────────────────────────────────────────────────
  'hyundai/tucson':       { uid: 'c564f16d7d3b4b2e8cb3b9a5624bd25e', name: 'Hyundai Tucson 2021' },
  'hyundai/elantra':      { uid: '4c34d10b2fec4f97bac984720b2bbe23', name: 'Hyundai Elantra 2021' },
  'hyundai/ioniq-5':      { uid: '53f1b0e8d2e4473ab543b7f0c67a258a', name: 'Hyundai Ioniq 5 2022' },
  'hyundai/kona':         { uid: 'fb7e9f8863d641cfbf05878585bbb96c', name: 'Hyundai Kona Electric 2022' },
  'hyundai/santa-fe':     { uid: '88ee39c0cae946b1aa231a18d6dc0693', name: 'Hyundai Santa Fe 2021' },
  'hyundai/i30':          { uid: 'e6099de2b6e44a5ca55352c9bb07a671', name: 'Hyundai i30 Hatchback 2021' },
  'hyundai/i20':          { uid: 'bbb0e7acef044b9996424249fb78a274', name: 'Hyundai i20 2021' },

  // ── Kia ───────────────────────────────────────────────────────────────────
  'kia/sportage':         { uid: '0c45e4e1f8a04b709128f98ee11a022a', name: 'Kia Sportage 2022' },
  'kia/ceed':             { uid: '84d3ae3f2e3e4a1780d2707d777e849a', name: 'Kia Ceed Sportswagon 2019' },
  'kia/ev6':              { uid: '7fd159fe0eeb4ab58f1b1231faae8b4d', name: 'Kia EV6 2022' },
  'kia/niro':             { uid: 'cdb4746fe49b4333ade5160051a2846d', name: 'Kia Niro 2023' },
  'kia/sorento':          { uid: '3f3c0aab11124020ae0cf045361f241c', name: 'Kia Sorento 2021' },
  'kia/picanto':          { uid: '2ee6e3d9ad1047bcb95d9c0581f7e6fa', name: 'Kia Picanto 2021' },

  // ── Mazda (slugs from cars.ts: cx5, cx30, no dashes) ─────────────────────
  'mazda/cx5':            { uid: 'ea176c6ebe814be3b06641bf038f8642', name: 'Mazda CX-5 2020' },
  'mazda/mazda3':         { uid: 'c0040e9d66fd4eb1b6df14a69df2bc86', name: 'Mazda 3 Sedan 2019' },
  'mazda/cx30':           { uid: '664e1e0e8c8e48a99ac4ebccbff51b4e', name: 'Mazda CX-30 2021' },

  // ── Volkswagen (slug from cars.ts: troc, no dash) ─────────────────────────
  'volkswagen/golf':      { uid: 'd3bf90a94b19445cb98ef17ba3b701a9', name: 'Volkswagen Golf R 2022' },
  'volkswagen/tiguan':    { uid: '0a26d3337427406d85d4781f8be73bc1', name: 'Volkswagen Tiguan 2021' },
  'volkswagen/polo':      { uid: '761bc2f96a414fa0952b0bd22ae55f9e', name: 'Volkswagen Polo' },
  'volkswagen/id4':       { uid: 'c0705c87f37d4386b784ec9abd2d0eb6', name: 'Volkswagen ID.4' },
  'volkswagen/troc':      { uid: 'c1af0ef4607844299a01364537b2c71a', name: 'Volkswagen T-Roc MK1 2017-2027' },

  // ── Skoda ─────────────────────────────────────────────────────────────────
  'skoda/octavia':        { uid: 'd46ed94b10b14e65a9a5320dc36c1ac4', name: 'Skoda Octavia 2021' },
  'skoda/karoq':          { uid: '7e359874ebe744158eddc37c9da8f487', name: 'Skoda Karoq 2019' },
  'skoda/kodiaq':         { uid: 'ad0fb4edf2c245338ddfcc9639555584', name: 'Skoda Kodiaq 2022' },

  // ── Honda (slug from cars.ts: hrv, no dash) ───────────────────────────────
  'honda/civic':          { uid: 'db60ed8ca5074803b8225fd213c423ea', name: 'Honda Civic Sedan 2022' },
  'honda/hrv':            { uid: 'd448457840894bb49b0db7cb63c703e9', name: 'Honda HR-V 2022' },
  'honda/jazz':           { uid: '8f1d1c30fd4a4c58a9afa09c6243cfe2', name: 'Honda Jazz 2020' },

  // ── BMW (slugs from cars.ts: series3, series5, x1, x3, x5) ──────────────
  'bmw/series3':          { uid: '82534fdddd7e46e4bdb202d6c1d3c0e7', name: 'BMW 3 Series 2023' },
  'bmw/x3':               { uid: 'b5c660d8e39340538a06561eaca69b5f', name: 'BMW X3 xDrive 30i 2022' },
  'bmw/x5':               { uid: 'f69204b6a40046e39368c4442d054060', name: 'BMW X5 2023' },

  // ── Mercedes ──────────────────────────────────────────────────────────────
  'mercedes/c-class':     { uid: '27d0ec784ceb4c80a03cc17ebea8acb4', name: 'Mercedes-Benz C-Class 2022' },
  'mercedes/a-class':     { uid: '1d9002fa93fa445bafba7775b6828348', name: 'Mercedes-Benz A-Class 2021' },
  'mercedes/glc':         { uid: '8f74d836e6c74d9883aadf9001bed546', name: 'Mercedes-Benz GLC 2023' },

  // ── Ford ──────────────────────────────────────────────────────────────────
  'ford/kuga':            { uid: 'c20c731dd32f4b3fb18011ead3ee06f6', name: 'Ford Kuga / Escape 2020' },

  // ── Nissan ────────────────────────────────────────────────────────────────
  'nissan/qashqai':       { uid: '2d00c5a73d5b4ab3a95db1fcb3fa4243', name: 'Nissan Qashqai 2022' },
  'nissan/leaf':          { uid: '780a52f031944609b80c1a00e990c0c5', name: 'Nissan Leaf' },
  'nissan/juke':          { uid: 'be7be035cfcf4e78a0e246bc0b5607d3', name: 'Nissan Juke 2020' },

  // ── Peugeot ───────────────────────────────────────────────────────────────
  'peugeot/3008':         { uid: '933d6034e0204610a23b61aac2491b98', name: 'Peugeot 3008 2021' },
  'peugeot/2008':         { uid: '586191a2cc3c4b858d91f965ca431d8f', name: 'Peugeot 2008 2020' },

  // ── Renault ───────────────────────────────────────────────────────────────
  'renault/megane':       { uid: '7811a173dd394d5eb05bce05a6b60b44', name: 'Renault Megane E-Tech' },

  // ── Subaru ────────────────────────────────────────────────────────────────
  'subaru/forester':      { uid: '847134597cf7475da0cf4f38598804ed', name: 'Subaru Forester 2019' },
  'subaru/outback':       { uid: '6d1badf2a3124ebabcfe08077474739e', name: 'Subaru Outback 2014-2019' },

  // ── Mitsubishi ────────────────────────────────────────────────────────────
  'mitsubishi/outlander':      { uid: '45be773263054877bf128e86c06e9af7', name: 'Mitsubishi Outlander 2022' },
  'mitsubishi/eclipse-cross':  { uid: 'dc9a010d743140e6857897441b665a9d', name: 'Mitsubishi Eclipse Cross 2022' },

  // ── Audi ──────────────────────────────────────────────────────────────────
  'audi/a3':              { uid: 'abdbd52f4ea249508fbc167db4b93941', name: 'Audi A3 S-Line 2021' },
  'audi/q5':              { uid: 'e89edf4f02ea4a0bbfb4fff7e9f1d7a4', name: 'Audi Q5 2021' },

  // ── Suzuki ────────────────────────────────────────────────────────────────
  'suzuki/vitara':        { uid: '48ebe0fdaeae459e9b43b55e68a858c1', name: 'Suzuki Vitara 2018-2024' },
  'suzuki/swift':         { uid: 'beb15f9a28174dd79d0cab0c87fd0488', name: 'Suzuki Swift 2021' },
  'suzuki/scross':        { uid: 'fdfbcea62a7a490db85becfc0983604d', name: 'Suzuki S-Cross 2022' },
  'suzuki/jimny':         { uid: '2c95627ba090412b88883733bcaee568', name: 'Suzuki Jimny 2019' },

  // ── Hyundai (additions) ────────────────────────────────────────────────
  'hyundai/sonata':       { uid: 'b1aefd7e65ac4562b0c976e66b045a54', name: 'Hyundai Sonata 2020' },

  // ── Mazda (additions) ─────────────────────────────────────────────────
  // mazda6: Estate model was wrong (Israeli market has sedans) — removed until verified UID found
  'mazda/mx5':            { uid: 'a6b5e948430241008f3bee23c2f63624', name: 'Mazda MX-5 2019' },

  // ── Volkswagen (additions) ────────────────────────────────────────────
  'volkswagen/passat':    { uid: 'f60b7b26af2f44358dbeff033d244e8b', name: 'Volkswagen Passat 2021' },

  // ── Skoda (additions) ─────────────────────────────────────────────────
  'skoda/superb':         { uid: 'b41979349dc14884906ac8e6c7b51bd9', name: 'Skoda Superb 2020' },

  // ── Honda (additions) ─────────────────────────────────────────────────
  'honda/crv':            { uid: '58185c81be4f44d8a9263729ffe13c6a', name: 'Honda CR-V 2021' },

  // ── BMW (additions) ───────────────────────────────────────────────────
  'bmw/series1':          { uid: 'ec91e167beb347b7a962fed023c2fd2d', name: 'BMW 1 Series F20 2019' },
  'bmw/series5':          { uid: 'c2910a4e0d154f2ebdc41e6265eaaac3', name: 'BMW 5 Series G30 LCI 2020' },
  'bmw/x1':               { uid: '4ca3a2247af44e51919074565ed93486', name: 'BMW X1 xDrive 2020' },
  'bmw/ix3':              { uid: '18a952b3599f4f81ade570eb0ceccdf4', name: 'BMW iX3 2021' },

  // ── Mercedes (additions) ──────────────────────────────────────────────
  'mercedes/e-class':     { uid: '136ecd58732b4f88b0bcd3cb74a71e54', name: 'Mercedes-Benz E-Class 2022' },
  'mercedes/gla':         { uid: 'ab7b5df3ba634f38a14effde3d542466', name: 'Mercedes-Benz GLA-Class 2020' },

  // ── Audi (additions) ──────────────────────────────────────────────────
  // 'audi/a4' — removed: UID 60bb579ccc474effa132342b4f1cab47 showed wrong cars
  'audi/a6':              { uid: 'c9b7cf9c176b458785edd0b12e235364', name: 'Audi A6 C8' },
  'audi/q3':              { uid: '97dccbc18cfb4f1e973fc75e278c6f66', name: 'Audi Q3 2023' },
  'audi/etron':           { uid: '4602d4d118b24577881e21c63eaa5340', name: 'Audi e-tron 2020' },

  // ── Ford (additions) ──────────────────────────────────────────────────
  'ford/fiesta':          { uid: '890f9f3c4e2444f58658d3e3e58ed556', name: 'Ford Fiesta ST 2019' },
  'ford/focus':           { uid: 'ef1dd0c316ec4151853cd2f8ee8411b4', name: 'Ford Focus MK3 Hatchback' },
  'ford/ranger':          { uid: '7dcc4fb472ab4e7eb8ae19ad036e2bf9', name: 'Ford Ranger Raptor 2019' },

  // ── Peugeot (additions) ───────────────────────────────────────────────
  'peugeot/208':          { uid: 'c3a458884cf7434fa99b2172c96061a4', name: 'Peugeot 208 2021' },
  'peugeot/308':          { uid: '0d9c9c265bec42678bfc269c1a8cebc3', name: 'Peugeot 308 2022' },
  'peugeot/5008':         { uid: '7224a5836c874e609936977f7ff54f82', name: 'Peugeot 5008' },
  'peugeot/e208':         { uid: 'a4f8becd0740468ca0c12cf403e4a42e', name: 'Peugeot e-208 2020' },

  // ── Renault (additions) ───────────────────────────────────────────────
  'renault/clio':         { uid: 'a5fe97bea44040dfa25a7082a54073b0', name: 'Renault Clio 2023' },
  'renault/arkana':       { uid: '15593fcc375a424aa1c41d4e54a2666c', name: 'Renault Arkana 2020' },
  'renault/zoe':          { uid: 'ffa8a5d60a7e4713855bacdea8bb3565', name: 'Renault Zoe' },

  // ── Volvo ─────────────────────────────────────────────────────────────
  'volvo/xc60':           { uid: 'eb8ce77c64c04339983cdf30593abca3', name: 'Volvo XC60' },
  'volvo/xc90':           { uid: 'e91e35e356ea456ca2c682efe36360b2', name: 'Volvo XC90 Inscription' },
  'volvo/s60':            { uid: '345df71c1d584992b809c15d64e1a790', name: 'Volvo S60' },
  'volvo/ex30':           { uid: 'c5be588ea33d44cc8d2690ffdba389a4', name: 'Volvo EX30' },

  // ── Jeep ──────────────────────────────────────────────────────────────
  'jeep/renegade':        { uid: '9cc773cb7f6e4f10893ea460aa11654b', name: 'Jeep Renegade 2021' },
  'jeep/compass':         { uid: '7181289a07794a6ead28ffd56bfbbc1d', name: 'Jeep Compass 2021' },
  'jeep/wrangler':        { uid: '7247a74596224c3dadc219836430279c', name: 'Jeep Wrangler Rubicon 2023' },

  // ── Subaru (additions) ────────────────────────────────────────────────
  'subaru/impreza':       { uid: '065804733fa245c6b1b10ca2de44099d', name: 'Subaru Impreza WRX 2022' },
  'subaru/xv':            { uid: '6d5fdd1c63914345ad5b9737e7345800', name: 'Subaru XV 2018' },

  // ── Kia (additions) ───────────────────────────────────────────────────
  'kia/cerato':           { uid: '9edf724941444ed0af9c455973958295', name: 'Kia Forte (Cerato) 2019' },

  // ── Skoda (additions) ─────────────────────────────────────────────────
  'skoda/fabia':          { uid: '1706bfcbe59740dda0855c54a6a6f8a2', name: 'Skoda Fabia Scoutline 2019' },

  // ── Mercedes (additions) ──────────────────────────────────────────────
  'mercedes/glb':         { uid: '898264565b824b008bcea3f59c0817e3', name: 'Mercedes-Benz GLB 2020' },
  'mercedes/eqc':         { uid: '8db43b629ca9466599fe388ed755a1fd', name: 'Mercedes-Benz EQC 2020' },

  // ── Volvo (additions) ─────────────────────────────────────────────────
  'volvo/xc40':           { uid: 'c6c616c37d024d7b8f35720b179e58ef', name: 'Volvo XC40 Recharge 2020' },

  // ── Mitsubishi (additions) ────────────────────────────────────────────
  'mitsubishi/asx':       { uid: 'ea53d188017741bf88cd9f10296ae95b', name: 'Mitsubishi ASX 2020' },

  // ── Jeep (additions) ──────────────────────────────────────────────────
  'jeep/cherokee':        { uid: '8011de1b2845470287981aa914a3f1e7', name: 'Jeep Cherokee 2019' },
};

export function findCarModel(makeSlug: string, modelSlug: string): SketchfabModel | null {
  const entry = MODELS[`${makeSlug}/${modelSlug}`];
  if (!entry) return null;
  return {
    uid: entry.uid,
    name: entry.name,
    viewerUrl: `https://sketchfab.com/models/${entry.uid}`,
  };
}
