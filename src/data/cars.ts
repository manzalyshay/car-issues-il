export interface CarModel {
  slug: string;
  nameHe: string;
  nameEn: string;
  years: number[];
  category: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'electric';
}

export interface CarMake {
  slug: string;
  nameHe: string;
  nameEn: string;
  country: string;
  logoEmoji: string;
  popular: boolean;
  models: CarModel[];
}

const currentYear = 2025;
const recentYears = (from: number, to: number = currentYear) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i).reverse();

export const carDatabase: CarMake[] = [
  {
    slug: 'toyota',
    nameHe: 'טויוטה',
    nameEn: 'Toyota',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'corolla', nameHe: 'קורולה', nameEn: 'Corolla', years: recentYears(2014), category: 'sedan' },
      { slug: 'camry',   nameHe: 'קאמרי',  nameEn: 'Camry',   years: recentYears(2015), category: 'sedan' },
      { slug: 'yaris',   nameHe: 'יאריס',  nameEn: 'Yaris',   years: recentYears(2014), category: 'hatchback' },
      { slug: 'rav4',    nameHe: 'RAV4',    nameEn: 'RAV4',    years: recentYears(2013), category: 'suv' },
      { slug: 'hilux',   nameHe: 'הילוקס', nameEn: 'Hilux',   years: recentYears(2015), category: 'pickup' },
      { slug: 'chr',     nameHe: 'C-HR',    nameEn: 'C-HR',    years: recentYears(2017), category: 'suv' },
      { slug: 'prius',   nameHe: 'פריוס',  nameEn: 'Prius',   years: recentYears(2016), category: 'sedan' },
      { slug: 'land-cruiser', nameHe: 'לנד קרוזר', nameEn: 'Land Cruiser', years: recentYears(2016), category: 'suv' },
    ],
  },
  {
    slug: 'hyundai',
    nameHe: 'יונדאי',
    nameEn: 'Hyundai',
    country: 'קוריאה',
    logoEmoji: '🚙',
    popular: true,
    models: [
      { slug: 'tucson',    nameHe: 'טוסון',    nameEn: 'Tucson',    years: recentYears(2014), category: 'suv' },
      { slug: 'i20',       nameHe: 'i20',       nameEn: 'i20',       years: recentYears(2014), category: 'hatchback' },
      { slug: 'i30',       nameHe: 'i30',       nameEn: 'i30',       years: recentYears(2014), category: 'hatchback' },
      { slug: 'sonata',    nameHe: 'סונטה',    nameEn: 'Sonata',    years: recentYears(2015), category: 'sedan' },
      { slug: 'santa-fe',  nameHe: 'סנטה פה', nameEn: 'Santa Fe',  years: recentYears(2013), category: 'suv' },
      { slug: 'ioniq-5',   nameHe: 'איוניק 5', nameEn: 'Ioniq 5',  years: recentYears(2021), category: 'electric' },
      { slug: 'kona',      nameHe: 'קונה',     nameEn: 'Kona',      years: recentYears(2017), category: 'suv' },
      { slug: 'elantra',   nameHe: 'אלנטרה',  nameEn: 'Elantra',   years: recentYears(2014), category: 'sedan' },
    ],
  },
  {
    slug: 'kia',
    nameHe: 'קיה',
    nameEn: 'Kia',
    country: 'קוריאה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'sportage', nameHe: 'ספורטז\'',  nameEn: 'Sportage', years: recentYears(2014), category: 'suv' },
      { slug: 'ceed',     nameHe: 'סיד',       nameEn: "Cee'd",    years: recentYears(2014), category: 'hatchback' },
      { slug: 'cerato',   nameHe: 'סראטו',    nameEn: 'Cerato',   years: recentYears(2014), category: 'sedan' },
      { slug: 'sorento',  nameHe: 'סורנטו',   nameEn: 'Sorento',  years: recentYears(2014), category: 'suv' },
      { slug: 'picanto',  nameHe: 'פיקנטו',   nameEn: 'Picanto',  years: recentYears(2014), category: 'hatchback' },
      { slug: 'ev6',      nameHe: 'EV6',       nameEn: 'EV6',      years: recentYears(2021), category: 'electric' },
      { slug: 'niro',     nameHe: 'נירו',     nameEn: 'Niro',     years: recentYears(2017), category: 'suv' },
    ],
  },
  {
    slug: 'mazda',
    nameHe: 'מאזדה',
    nameEn: 'Mazda',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'mazda3', nameHe: 'מאזדה 3', nameEn: 'Mazda3', years: recentYears(2014), category: 'sedan' },
      { slug: 'mazda6', nameHe: 'מאזדה 6', nameEn: 'Mazda6', years: recentYears(2014), category: 'sedan' },
      { slug: 'cx5',    nameHe: 'CX-5',    nameEn: 'CX-5',   years: recentYears(2013), category: 'suv' },
      { slug: 'cx30',   nameHe: 'CX-30',   nameEn: 'CX-30',  years: recentYears(2019), category: 'suv' },
      { slug: 'mx5',    nameHe: 'MX-5',    nameEn: 'MX-5',   years: recentYears(2015), category: 'coupe' },
    ],
  },
  {
    slug: 'volkswagen',
    nameHe: 'פולקסווגן',
    nameEn: 'Volkswagen',
    country: 'גרמניה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'golf',    nameHe: 'גולף',     nameEn: 'Golf',    years: recentYears(2014), category: 'hatchback' },
      { slug: 'polo',    nameHe: 'פולו',     nameEn: 'Polo',    years: recentYears(2014), category: 'hatchback' },
      { slug: 'passat',  nameHe: 'פאסאט',   nameEn: 'Passat',  years: recentYears(2014), category: 'sedan' },
      { slug: 'tiguan',  nameHe: 'טיגואן',  nameEn: 'Tiguan',  years: recentYears(2014), category: 'suv' },
      { slug: 'troc',    nameHe: 'T-Roc',   nameEn: 'T-Roc',   years: recentYears(2018), category: 'suv' },
      { slug: 'id4',     nameHe: 'ID.4',    nameEn: 'ID.4',    years: recentYears(2021), category: 'electric' },
    ],
  },
  {
    slug: 'skoda',
    nameHe: 'סקודה',
    nameEn: 'Skoda',
    country: 'צ\'כיה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'octavia', nameHe: 'אוקטביה', nameEn: 'Octavia', years: recentYears(2013), category: 'sedan' },
      { slug: 'kodiaq',  nameHe: 'קודיאק',  nameEn: 'Kodiaq',  years: recentYears(2016), category: 'suv' },
      { slug: 'superb',  nameHe: 'סופרב',   nameEn: 'Superb',  years: recentYears(2015), category: 'sedan' },
      { slug: 'karoq',   nameHe: 'קארוק',   nameEn: 'Karoq',   years: recentYears(2018), category: 'suv' },
      { slug: 'fabia',   nameHe: 'פביה',    nameEn: 'Fabia',   years: recentYears(2014), category: 'hatchback' },
    ],
  },
  {
    slug: 'honda',
    nameHe: 'הונדה',
    nameEn: 'Honda',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'civic', nameHe: 'סיוויק', nameEn: 'Civic', years: recentYears(2014), category: 'sedan' },
      { slug: 'hrv',   nameHe: 'HR-V',   nameEn: 'HR-V',  years: recentYears(2016), category: 'suv' },
      { slug: 'crv',   nameHe: 'CR-V',   nameEn: 'CR-V',  years: recentYears(2014), category: 'suv' },
      { slug: 'jazz',  nameHe: 'ג\'אז',  nameEn: 'Jazz',  years: recentYears(2014), category: 'hatchback' },
    ],
  },
  {
    slug: 'suzuki',
    nameHe: 'סוזוקי',
    nameEn: 'Suzuki',
    country: 'יפן',
    logoEmoji: '🚙',
    popular: false,
    models: [
      { slug: 'swift',   nameHe: 'סוויפט',  nameEn: 'Swift',   years: recentYears(2014), category: 'hatchback' },
      { slug: 'vitara',  nameHe: 'ויטארה', nameEn: 'Vitara',  years: recentYears(2015), category: 'suv' },
      { slug: 'scross',  nameHe: 'S-Cross', nameEn: 'S-Cross', years: recentYears(2014), category: 'suv' },
      { slug: 'jimny',   nameHe: 'ג\'ימני', nameEn: 'Jimny',   years: recentYears(2018), category: 'suv' },
    ],
  },
  {
    slug: 'bmw',
    nameHe: 'ב.מ.וו',
    nameEn: 'BMW',
    country: 'גרמניה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'series1', nameHe: 'סדרה 1', nameEn: 'Series 1', years: recentYears(2014), category: 'hatchback' },
      { slug: 'series3', nameHe: 'סדרה 3', nameEn: 'Series 3', years: recentYears(2013), category: 'sedan' },
      { slug: 'series5', nameHe: 'סדרה 5', nameEn: 'Series 5', years: recentYears(2013), category: 'sedan' },
      { slug: 'x1',      nameHe: 'X1',     nameEn: 'X1',       years: recentYears(2014), category: 'suv' },
      { slug: 'x3',      nameHe: 'X3',     nameEn: 'X3',       years: recentYears(2014), category: 'suv' },
      { slug: 'x5',      nameHe: 'X5',     nameEn: 'X5',       years: recentYears(2014), category: 'suv' },
      { slug: 'ix3',     nameHe: 'iX3',    nameEn: 'iX3',      years: recentYears(2021), category: 'electric' },
    ],
  },
  {
    slug: 'mercedes',
    nameHe: 'מרצדס-בנץ',
    nameEn: 'Mercedes-Benz',
    country: 'גרמניה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'a-class', nameHe: 'A-Class', nameEn: 'A-Class', years: recentYears(2013), category: 'hatchback' },
      { slug: 'c-class', nameHe: 'C-Class', nameEn: 'C-Class', years: recentYears(2014), category: 'sedan' },
      { slug: 'e-class', nameHe: 'E-Class', nameEn: 'E-Class', years: recentYears(2013), category: 'sedan' },
      { slug: 'gla',     nameHe: 'GLA',     nameEn: 'GLA',     years: recentYears(2014), category: 'suv' },
      { slug: 'glb',     nameHe: 'GLB',     nameEn: 'GLB',     years: recentYears(2019), category: 'suv' },
      { slug: 'glc',     nameHe: 'GLC',     nameEn: 'GLC',     years: recentYears(2015), category: 'suv' },
      { slug: 'eqc',     nameHe: 'EQC',     nameEn: 'EQC',     years: recentYears(2020), category: 'electric' },
    ],
  },
  {
    slug: 'audi',
    nameHe: 'אאודי',
    nameEn: 'Audi',
    country: 'גרמניה',
    logoEmoji: '🚗',
    popular: true,
    models: [
      { slug: 'a3', nameHe: 'A3', nameEn: 'A3', years: recentYears(2013), category: 'hatchback' },
      { slug: 'a4', nameHe: 'A4', nameEn: 'A4', years: recentYears(2013), category: 'sedan' },
      { slug: 'a6', nameHe: 'A6', nameEn: 'A6', years: recentYears(2013), category: 'sedan' },
      { slug: 'q3', nameHe: 'Q3', nameEn: 'Q3', years: recentYears(2013), category: 'suv' },
      { slug: 'q5', nameHe: 'Q5', nameEn: 'Q5', years: recentYears(2013), category: 'suv' },
      { slug: 'etron', nameHe: 'e-tron', nameEn: 'e-tron', years: recentYears(2020), category: 'electric' },
    ],
  },
  {
    slug: 'ford',
    nameHe: 'פורד',
    nameEn: 'Ford',
    country: 'ארה"ב',
    logoEmoji: '🚙',
    popular: false,
    models: [
      { slug: 'fiesta', nameHe: 'פיאסטה', nameEn: 'Fiesta', years: recentYears(2013, 2023), category: 'hatchback' },
      { slug: 'focus',  nameHe: 'פוקוס',  nameEn: 'Focus',  years: recentYears(2013, 2022), category: 'hatchback' },
      { slug: 'kuga',   nameHe: 'קוגה',   nameEn: 'Kuga',   years: recentYears(2013),       category: 'suv' },
      { slug: 'puma',   nameHe: 'פומה',   nameEn: 'Puma',   years: recentYears(2020),       category: 'suv' },
      { slug: 'ranger', nameHe: 'ריינג\'ר', nameEn: 'Ranger', years: recentYears(2013),     category: 'pickup' },
    ],
  },
  {
    slug: 'nissan',
    nameHe: 'ניסאן',
    nameEn: 'Nissan',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'qashqai', nameHe: 'קשקאי', nameEn: 'Qashqai', years: recentYears(2014), category: 'suv' },
      { slug: 'juke',    nameHe: 'ג\'וק',  nameEn: 'Juke',    years: recentYears(2014), category: 'suv' },
      { slug: 'note',    nameHe: 'נוט',    nameEn: 'Note',    years: recentYears(2014), category: 'hatchback' },
      { slug: 'leaf',    nameHe: 'ליף',    nameEn: 'Leaf',    years: recentYears(2014), category: 'electric' },
    ],
  },
  {
    slug: 'peugeot',
    nameHe: "פיג'ו",
    nameEn: 'Peugeot',
    country: 'צרפת',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: '208',  nameHe: '208',  nameEn: '208',  years: recentYears(2013), category: 'hatchback' },
      { slug: '308',  nameHe: '308',  nameEn: '308',  years: recentYears(2013), category: 'hatchback' },
      { slug: '3008', nameHe: '3008', nameEn: '3008', years: recentYears(2016), category: 'suv' },
      { slug: '5008', nameHe: '5008', nameEn: '5008', years: recentYears(2017), category: 'suv' },
      { slug: 'e208', nameHe: 'e-208', nameEn: 'e-208', years: recentYears(2020), category: 'electric' },
    ],
  },
  {
    slug: 'renault',
    nameHe: 'רנו',
    nameEn: 'Renault',
    country: 'צרפת',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'clio',   nameHe: 'קליאו',  nameEn: 'Clio',   years: recentYears(2014), category: 'hatchback' },
      { slug: 'megane', nameHe: 'מגאן',   nameEn: 'Megane', years: recentYears(2014), category: 'hatchback' },
      { slug: 'kadjar', nameHe: 'קדג\'ר', nameEn: 'Kadjar', years: recentYears(2015), category: 'suv' },
      { slug: 'arkana', nameHe: 'ארקנה',  nameEn: 'Arkana', years: recentYears(2020), category: 'suv' },
      { slug: 'zoe',    nameHe: 'זואי',   nameEn: 'Zoe',    years: recentYears(2015), category: 'electric' },
    ],
  },
  {
    slug: 'volvo',
    nameHe: 'וולוו',
    nameEn: 'Volvo',
    country: 'שוודיה',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'xc40',  nameHe: 'XC40',  nameEn: 'XC40',  years: recentYears(2018), category: 'suv' },
      { slug: 'xc60',  nameHe: 'XC60',  nameEn: 'XC60',  years: recentYears(2013), category: 'suv' },
      { slug: 'xc90',  nameHe: 'XC90',  nameEn: 'XC90',  years: recentYears(2015), category: 'suv' },
      { slug: 's60',   nameHe: 'S60',   nameEn: 'S60',   years: recentYears(2013), category: 'sedan' },
      { slug: 'ex30',  nameHe: 'EX30',  nameEn: 'EX30',  years: recentYears(2023), category: 'electric' },
    ],
  },
  {
    slug: 'jeep',
    nameHe: "ג'יפ",
    nameEn: 'Jeep',
    country: 'ארה"ב',
    logoEmoji: '🚙',
    popular: false,
    models: [
      { slug: 'renegade', nameHe: 'רנגייד',  nameEn: 'Renegade', years: recentYears(2015), category: 'suv' },
      { slug: 'compass',  nameHe: 'קומפס',   nameEn: 'Compass',  years: recentYears(2017), category: 'suv' },
      { slug: 'wrangler', nameHe: 'רנגלר',   nameEn: 'Wrangler', years: recentYears(2013), category: 'suv' },
      { slug: 'cherokee', nameHe: 'צ\'רוקי', nameEn: 'Cherokee', years: recentYears(2014, 2023), category: 'suv' },
    ],
  },
  {
    slug: 'mitsubishi',
    nameHe: 'מיצובישי',
    nameEn: 'Mitsubishi',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'outlander',     nameHe: 'אאוטלנדר',     nameEn: 'Outlander',      years: recentYears(2013), category: 'suv' },
      { slug: 'eclipse-cross', nameHe: 'אקליפס קרוס', nameEn: 'Eclipse Cross',   years: recentYears(2018), category: 'suv' },
      { slug: 'asx',           nameHe: 'ASX',           nameEn: 'ASX',            years: recentYears(2014), category: 'suv' },
    ],
  },
  {
    slug: 'subaru',
    nameHe: 'סובארו',
    nameEn: 'Subaru',
    country: 'יפן',
    logoEmoji: '🚗',
    popular: false,
    models: [
      { slug: 'forester', nameHe: 'פורסטר',  nameEn: 'Forester', years: recentYears(2013), category: 'suv' },
      { slug: 'outback',  nameHe: 'אאוטבק', nameEn: 'Outback',  years: recentYears(2013), category: 'suv' },
      { slug: 'xv',       nameHe: 'XV',       nameEn: 'XV',       years: recentYears(2013), category: 'suv' },
      { slug: 'impreza',  nameHe: 'אימפרזה', nameEn: 'Impreza',  years: recentYears(2013), category: 'hatchback' },
    ],
  },
];

export function getMakeBySlug(slug: string): CarMake | undefined {
  return carDatabase.find((m) => m.slug === slug);
}

export function getModelBySlug(make: CarMake, modelSlug: string): CarModel | undefined {
  return make.models.find((m) => m.slug === modelSlug);
}

export function getPopularMakes(): CarMake[] {
  return carDatabase.filter((m) => m.popular);
}

export function getCategoryLabel(category: CarModel['category']): string {
  const labels: Record<CarModel['category'], string> = {
    sedan: 'סדאן',
    suv: 'SUV',
    hatchback: 'האצ\'בק',
    pickup: 'טנדר',
    van: 'ואן',
    coupe: 'קופה',
    electric: 'חשמלי',
  };
  return labels[category] ?? category;
}
