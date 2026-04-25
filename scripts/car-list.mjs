/**
 * Shared car list for scraper scripts.
 * Mirrors src/data/cars.ts — update both when adding models.
 */

const Y = 2025;
const range = (from, to = Y) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const CAR_LIST = [
  // Toyota
  { make: 'toyota', model: 'corolla',      years: range(2014) },
  { make: 'toyota', model: 'camry',        years: range(2015) },
  { make: 'toyota', model: 'yaris',        years: range(2014) },
  { make: 'toyota', model: 'rav4',         years: range(2013) },
  { make: 'toyota', model: 'hilux',        years: range(2015) },
  { make: 'toyota', model: 'chr',          years: range(2017) },
  { make: 'toyota', model: 'prius',        years: range(2016) },
  { make: 'toyota', model: 'land-cruiser', years: range(2016) },
  // Hyundai
  { make: 'hyundai', model: 'tucson',  years: range(2014) },
  { make: 'hyundai', model: 'i20',      years: range(2014) },
  { make: 'hyundai', model: 'i30',      years: range(2014) },
  { make: 'hyundai', model: 'sonata',   years: range(2015) },
  { make: 'hyundai', model: 'santa-fe', years: range(2013) },
  { make: 'hyundai', model: 'ioniq-5',  years: range(2021) },
  { make: 'hyundai', model: 'kona',     years: range(2017) },
  { make: 'hyundai', model: 'elantra',  years: range(2014) },
  // Kia
  { make: 'kia', model: 'sportage', years: range(2014) },
  { make: 'kia', model: 'ceed',     years: range(2014) },
  { make: 'kia', model: 'cerato',   years: range(2014) },
  { make: 'kia', model: 'sorento',  years: range(2014) },
  { make: 'kia', model: 'picanto',  years: range(2014) },
  { make: 'kia', model: 'ev6',      years: range(2021) },
  { make: 'kia', model: 'niro',     years: range(2017) },
  // Mazda
  { make: 'mazda', model: 'mazda3', years: range(2014) },
  { make: 'mazda', model: 'mazda6', years: range(2014) },
  { make: 'mazda', model: 'cx5',    years: range(2013) },
  { make: 'mazda', model: 'cx30',   years: range(2019) },
  { make: 'mazda', model: 'mx5',    years: range(2015) },
  // Volkswagen
  { make: 'volkswagen', model: 'golf',   years: range(2014) },
  { make: 'volkswagen', model: 'polo',   years: range(2014) },
  { make: 'volkswagen', model: 'passat', years: range(2014) },
  { make: 'volkswagen', model: 'tiguan', years: range(2014) },
  { make: 'volkswagen', model: 'troc',   years: range(2018) },
  { make: 'volkswagen', model: 'id4',    years: range(2021) },
  // Skoda
  { make: 'skoda', model: 'octavia', years: range(2013) },
  { make: 'skoda', model: 'kodiaq',  years: range(2016) },
  { make: 'skoda', model: 'superb',  years: range(2015) },
  { make: 'skoda', model: 'karoq',   years: range(2018) },
  { make: 'skoda', model: 'fabia',   years: range(2014) },
  // Honda
  { make: 'honda', model: 'civic', years: range(2014) },
  { make: 'honda', model: 'hrv',   years: range(2016) },
  { make: 'honda', model: 'crv',   years: range(2014) },
  { make: 'honda', model: 'jazz',  years: range(2014) },
  // Suzuki
  { make: 'suzuki', model: 'swift',  years: range(2014) },
  { make: 'suzuki', model: 'vitara', years: range(2015) },
  { make: 'suzuki', model: 'scross', years: range(2014) },
  { make: 'suzuki', model: 'jimny',  years: range(2018) },
  // BMW
  { make: 'bmw', model: 'series1', years: range(2014) },
  { make: 'bmw', model: 'series3', years: range(2013) },
  { make: 'bmw', model: 'series5', years: range(2013) },
  { make: 'bmw', model: 'x1',      years: range(2014) },
  { make: 'bmw', model: 'x3',      years: range(2014) },
  { make: 'bmw', model: 'x5',      years: range(2014) },
  { make: 'bmw', model: 'ix3',     years: range(2021) },
  // Mercedes (A-Class split)
  { make: 'mercedes', model: 'a180',    years: range(2013) },
  { make: 'mercedes', model: 'a200',    years: range(2015) },
  { make: 'mercedes', model: 'a220',    years: range(2019) },
  { make: 'mercedes', model: 'a250',    years: range(2014) },
  { make: 'mercedes', model: 'a35-amg', years: range(2019) },
  { make: 'mercedes', model: 'a45-amg', years: range(2013) },
  // Mercedes (C-Class split)
  { make: 'mercedes', model: 'c180',    years: range(2012, 2021) },
  { make: 'mercedes', model: 'c200',    years: range(2014) },
  { make: 'mercedes', model: 'c220d',   years: range(2014) },
  { make: 'mercedes', model: 'c300',    years: range(2015) },
  { make: 'mercedes', model: 'c300d',   years: range(2018) },
  { make: 'mercedes', model: 'c43-amg', years: range(2015) },
  { make: 'mercedes', model: 'c63-amg', years: range(2014) },
  // Mercedes (other)
  { make: 'mercedes', model: 'e-class', years: range(2013) },
  { make: 'mercedes', model: 'gla',     years: range(2014) },
  { make: 'mercedes', model: 'glb',     years: range(2019) },
  { make: 'mercedes', model: 'glc',     years: range(2015) },
  { make: 'mercedes', model: 'eqc',     years: range(2020) },
  // Audi
  { make: 'audi', model: 'a3',    years: range(2013) },
  { make: 'audi', model: 'a4',    years: range(2013) },
  { make: 'audi', model: 'a6',    years: range(2013) },
  { make: 'audi', model: 'q3',    years: range(2013) },
  { make: 'audi', model: 'q5',    years: range(2013) },
  { make: 'audi', model: 'etron', years: range(2020) },
  // Ford
  { make: 'ford', model: 'fiesta', years: range(2013, 2023) },
  { make: 'ford', model: 'focus',  years: range(2013, 2022) },
  { make: 'ford', model: 'kuga',   years: range(2013) },
  { make: 'ford', model: 'puma',   years: range(2020) },
  { make: 'ford', model: 'ranger', years: range(2013) },
  // Nissan
  { make: 'nissan', model: 'qashqai', years: range(2014) },
  { make: 'nissan', model: 'juke',    years: range(2014) },
  { make: 'nissan', model: 'note',    years: range(2014) },
  { make: 'nissan', model: 'leaf',    years: range(2014) },
  // Peugeot
  { make: 'peugeot', model: '208',  years: range(2013) },
  { make: 'peugeot', model: '2008', years: range(2013) },
  { make: 'peugeot', model: '308',  years: range(2013) },
  { make: 'peugeot', model: '3008', years: range(2016) },
  { make: 'peugeot', model: '5008', years: range(2017) },
  { make: 'peugeot', model: 'e208', years: range(2020) },
  // Renault
  { make: 'renault', model: 'clio',   years: range(2014) },
  { make: 'renault', model: 'megane', years: range(2014) },
  { make: 'renault', model: 'kadjar', years: range(2015) },
  { make: 'renault', model: 'arkana', years: range(2020) },
  { make: 'renault', model: 'zoe',    years: range(2015) },
  // Volvo
  { make: 'volvo', model: 'xc40', years: range(2018) },
  { make: 'volvo', model: 'xc60', years: range(2013) },
  { make: 'volvo', model: 'xc90', years: range(2015) },
  { make: 'volvo', model: 's60',  years: range(2013) },
  { make: 'volvo', model: 'ex30', years: range(2023) },
  // Jeep
  { make: 'jeep', model: 'renegade', years: range(2015) },
  { make: 'jeep', model: 'compass',  years: range(2017) },
  { make: 'jeep', model: 'wrangler', years: range(2013) },
  { make: 'jeep', model: 'cherokee', years: range(2014, 2023) },
  // Mitsubishi
  { make: 'mitsubishi', model: 'outlander',     years: range(2013) },
  { make: 'mitsubishi', model: 'eclipse-cross', years: range(2018) },
  { make: 'mitsubishi', model: 'asx',           years: range(2014) },
  // Subaru
  { make: 'subaru', model: 'forester', years: range(2013) },
  { make: 'subaru', model: 'outback',  years: range(2013) },
  { make: 'subaru', model: 'xv',       years: range(2013) },
  { make: 'subaru', model: 'impreza',  years: range(2013) },
  // BYD
  { make: 'byd', model: 'atto3',    years: range(2022) },
  { make: 'byd', model: 'seal',     years: range(2023) },
  { make: 'byd', model: 'dolphin',  years: range(2023) },
  { make: 'byd', model: 'han',      years: range(2023) },
  { make: 'byd', model: 'sealion6', years: range(2024) },
  // MG
  { make: 'mg', model: 'mg-zs', years: range(2018) },
  { make: 'mg', model: 'mg4',   years: range(2023) },
  { make: 'mg', model: 'mg5',   years: range(2021) },
  { make: 'mg', model: 'hs',    years: range(2020) },
  // Chery
  { make: 'chery', model: 'tiggo7',  years: range(2021) },
  { make: 'chery', model: 'tiggo8',  years: range(2021) },
  { make: 'chery', model: 'arrizo6', years: range(2020) },
  // Geely
  { make: 'geely', model: 'coolray', years: range(2020) },
  { make: 'geely', model: 'emgrand', years: range(2019) },
  // Fiat
  { make: 'fiat', model: 'fiat-500',  years: range(2012) },
  { make: 'fiat', model: 'fiat-500e', years: range(2021) },
  { make: 'fiat', model: 'tipo',      years: range(2016) },
  { make: 'fiat', model: 'tipo-cross', years: range(2021) },
  { make: 'fiat', model: 'fiat-500x', years: range(2015) },
  { make: 'fiat', model: 'panda',     years: range(2012) },
  { make: 'fiat', model: 'ducato',    years: range(2015) },
  { make: 'fiat', model: 'doblo',     years: range(2013) },
  // Chevrolet
  { make: 'chevrolet', model: 'spark',       years: range(2012, 2022) },
  { make: 'chevrolet', model: 'cruze',       years: range(2010, 2020) },
  { make: 'chevrolet', model: 'captiva',     years: range(2009, 2020) },
  { make: 'chevrolet', model: 'equinox',     years: range(2015) },
  { make: 'chevrolet', model: 'trailblazer', years: range(2020) },
  { make: 'chevrolet', model: 'malibu',      years: range(2013, 2023) },
  { make: 'chevrolet', model: 'tahoe',       years: range(2015) },
  { make: 'chevrolet', model: 'colorado',    years: range(2015) },
  { make: 'chevrolet', model: 'camaro',      years: range(2015, 2024) },
  // Tesla
  { make: 'tesla', model: 'model-3', years: range(2017) },
  { make: 'tesla', model: 'model-y', years: range(2020) },
  { make: 'tesla', model: 'model-s', years: range(2015) },
  { make: 'tesla', model: 'model-x', years: range(2016) },
  // Alfa Romeo
  { make: 'alfa-romeo', model: 'giulia',     years: range(2016) },
  { make: 'alfa-romeo', model: 'stelvio',    years: range(2017) },
  { make: 'alfa-romeo', model: 'tonale',     years: range(2022) },
  { make: 'alfa-romeo', model: 'giulietta',  years: range(2010, 2020) },
  // Land Rover
  { make: 'land-rover', model: 'defender',            years: range(2020) },
  { make: 'land-rover', model: 'discovery',            years: range(2017) },
  { make: 'land-rover', model: 'discovery-sport',      years: range(2015) },
  { make: 'land-rover', model: 'range-rover',          years: range(2013) },
  { make: 'land-rover', model: 'range-rover-sport',    years: range(2013) },
  { make: 'land-rover', model: 'range-rover-evoque',   years: range(2012) },
  { make: 'land-rover', model: 'range-rover-velar',    years: range(2017) },
  // Porsche
  { make: 'porsche', model: 'cayenne',   years: range(2013) },
  { make: 'porsche', model: 'macan',     years: range(2014) },
  { make: 'porsche', model: '911',       years: range(2013) },
  { make: 'porsche', model: 'panamera',  years: range(2017) },
  { make: 'porsche', model: 'taycan',    years: range(2020) },
];
