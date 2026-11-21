// Market repair prices (Israel). Source data Jan–Jul 2025, checked 2026-11-19;
// +2% uplift applied 2026-11-21 and rounded to whole shekels (incl. distribution
// thresholds and garage rates). Distribution percentages unchanged. Prices incl. VAT.

export type DistSegment =
  | { share: string; kind: 'between'; low: number; high: number }
  | { share: string; kind: 'above'; value: number }
  | { share: string; kind: 'below'; value: number };

export type RepairPriceCategory = 'service' | 'brakes' | 'engine' | 'electrical' | 'tires' | 'body' | 'brand';

export interface RepairPrice {
  id: number;
  nameHe: string;
  nameEn: string;
  category: RepairPriceCategory;
  avg: number;
  min: number;
  max: number;
  dist: DistSegment[];
  sourceDate: string; // YYYY-MM-DD
}

const between = (share: string, low: number, high: number): DistSegment => ({ share, kind: 'between', low, high });
const above = (share: string, value: number): DistSegment => ({ share, kind: 'above', value });
const below = (share: string, value: number): DistSegment => ({ share, kind: 'below', value });

export const REPAIR_PRICES: RepairPrice[] = [
  { id: 1, nameHe: 'טיפול תקופתי לרכב פרטי (שמנים ופילטרים)', nameEn: 'Periodic service, private car (oils & filters)', category: 'service', avg: 759, min: 617, max: 1017, dist: [between('30%', 612, 663)], sourceDate: '2025-07-08' },
  { id: 2, nameHe: 'תיקון וטיפול תקופתי כולל', nameEn: 'Full periodic service & repair', category: 'service', avg: 1558, min: 898, max: 2405, dist: [below('87%', 2040)], sourceDate: '2025-07-08' },
  { id: 3, nameHe: 'החלפת רפידות בלמים קדמיים', nameEn: 'Front brake pads replacement', category: 'brakes', avg: 1214, min: 787, max: 1907, dist: [below('88%', 1530)], sourceDate: '2025-07-06' },
  { id: 4, nameHe: 'החלפת צלחות ורפידות בלמים קדמיים', nameEn: 'Front brake rotors & pads replacement', category: 'brakes', avg: 1217, min: 932, max: 1560, dist: [above('67%', 1122)], sourceDate: '2025-06-12' },
  { id: 5, nameHe: 'החלפת רצועת טיימינג', nameEn: 'Timing belt replacement', category: 'engine', avg: 2281, min: 1313, max: 4028, dist: [between('30%', 1531, 1836)], sourceDate: '2025-06-09' },
  { id: 6, nameHe: 'החלפת רצועת טיימינג ומשאבת מים', nameEn: 'Timing belt & water pump replacement', category: 'engine', avg: 2355, min: 1949, max: 3142, dist: [above('60%', 2142)], sourceDate: '2025-06-29' },
  { id: 7, nameHe: 'החלפת שרשרת טיימינג', nameEn: 'Timing chain replacement', category: 'engine', avg: 3936, min: 2805, max: 5834, dist: [above('63%', 3162)], sourceDate: '2025-06-10' },
  { id: 8, nameHe: 'החלפת משאבת מים', nameEn: 'Water pump replacement', category: 'engine', avg: 1581, min: 842, max: 3443, dist: [above('70%', 1122)], sourceDate: '2025-06-24' },
  { id: 9, nameHe: 'החלפת אלטרנטור', nameEn: 'Alternator replacement', category: 'electrical', avg: 1522, min: 1010, max: 2504, dist: [above('73%', 1122)], sourceDate: '2025-07-01' },
  { id: 10, nameHe: 'החלפת רדיאטור', nameEn: 'Radiator replacement', category: 'engine', avg: 1964, min: 954, max: 3366, dist: [above('73%', 1530)], sourceDate: '2025-07-09' },
  { id: 11, nameHe: 'החלפת תושבת מנוע', nameEn: 'Engine mount replacement', category: 'engine', avg: 971, min: 657, max: 1515, dist: [above('63%', 816)], sourceDate: '2025-07-03' },
  { id: 12, nameHe: 'החלפת משאבת דלק', nameEn: 'Fuel pump replacement', category: 'engine', avg: 1476, min: 985, max: 2006, dist: [between('שליש', 918, 1122), between('שליש', 1531, 1734)], sourceDate: '2025-06-15' },
  { id: 13, nameHe: 'החלפת סליל הצתה', nameEn: 'Ignition coil replacement', category: 'electrical', avg: 668, min: 500, max: 1338, dist: [above('50%', 612)], sourceDate: '2025-07-14' },
  { id: 14, nameHe: 'החלפת פלאגים וסליל הצתה', nameEn: 'Spark plugs & ignition coil replacement', category: 'electrical', avg: 1149, min: 542, max: 1797, dist: [between('37%', 1123, 1326)], sourceDate: '2025-07-09' },
  { id: 15, nameHe: 'מילוי גז במזגן הרכב', nameEn: 'A/C gas refill', category: 'electrical', avg: 361, min: 262, max: 657, dist: [between('40%', 255, 306)], sourceDate: '2025-07-04' },
  { id: 16, nameHe: 'החלפת מדחס מזגן', nameEn: 'A/C compressor replacement', category: 'electrical', avg: 2671, min: 1838, max: 3310, dist: [below('96%', 3264)], sourceDate: '2025-07-10' },
  { id: 17, nameHe: 'התקנת מצבר חדש', nameEn: 'New battery installation', category: 'electrical', avg: 685, min: 617, max: 819, dist: [below('80%', 714)], sourceDate: '2025-07-03' },
  { id: 18, nameHe: 'תיקון פנצ׳ר (שירותי דרך, מוסך נייד)', nameEn: 'Puncture repair (roadside, mobile garage)', category: 'tires', avg: 323, min: 269, max: 393, dist: [between('50%', 317, 367)], sourceDate: '2025-06-29' },
  { id: 19, nameHe: 'תיקון פנצ׳ר בגלגל', nameEn: 'Wheel puncture repair', category: 'tires', avg: 345, min: 168, max: 426, dist: [above('36%', 367)], sourceDate: '2025-02-12' },
  { id: 20, nameHe: 'תיקון פנצ׳ר בבית הלקוח', nameEn: 'Puncture repair at customer\'s home', category: 'tires', avg: 395, min: 327, max: 525, dist: [between('50%', 326, 377)], sourceDate: '2025-01-14' },
  { id: 21, nameHe: 'תיקון פגוש אחורי', nameEn: 'Rear bumper repair', category: 'body', avg: 902, min: 463, max: 1575, dist: [above('67%', 612)], sourceDate: '2025-07-09' },
  { id: 22, nameHe: 'צביעת פגוש', nameEn: 'Bumper painting', category: 'body', avg: 990, min: 561, max: 1683, dist: [above('74%', 714)], sourceDate: '2025-06-24' },
  { id: 23, nameHe: 'צביעת דלת', nameEn: 'Door painting', category: 'body', avg: 1415, min: 785, max: 2132, dist: [between('33%', 1123, 1326)], sourceDate: '2025-06-18' },
  { id: 24, nameHe: 'החלפת קלאץ׳ (טויוטה בלבד)', nameEn: 'Clutch replacement (Toyota only)', category: 'brand', avg: 2731, min: 1234, max: 4203, dist: [between('40%', 2449, 2856)], sourceDate: '2025-06-24' },
  { id: 25, nameHe: 'טיפול 10,000 (הונדה בלבד)', nameEn: '10,000 km service (Honda only)', category: 'brand', avg: 953, min: 539, max: 1838, dist: [between('33%', 715, 918)], sourceDate: '2025-07-01' },
];

export const REPAIR_PRICE_CATEGORY_ORDER: RepairPriceCategory[] = ['service', 'brakes', 'engine', 'electrical', 'tires', 'body', 'brand'];

export const REPAIR_PRICE_CATEGORY_LABELS: Record<RepairPriceCategory, { he: string; en: string }> = {
  service: { he: '🔧 טיפולים תקופתיים', en: '🔧 Periodic Service' },
  brakes: { he: '🛑 בלמים', en: '🛑 Brakes' },
  engine: { he: '⚙️ מנוע וקירור', en: '⚙️ Engine & Cooling' },
  electrical: { he: '⚡ חשמל, הצתה ומיזוג', en: '⚡ Electrical, Ignition & A/C' },
  tires: { he: '🛞 פנצ׳רים', en: '🛞 Punctures' },
  body: { he: '🎨 פחחות וצבע', en: '🎨 Body & Paint' },
  brand: { he: '🏷️ לפי יצרן', en: '🏷️ By Manufacturer' },
};

export const GARAGE_RATES: { he: string; en: string; min: number; max: number; perHour?: boolean }[] = [
  { he: 'שעת עבודה במוסך', en: 'Garage labor hour', min: 255, max: 344, perHour: true },
  { he: 'בדיקת רכב לפני טסט (ללא תיקון)', en: 'Pre-inspection (test) check, no repair', min: 161, max: 237 },
  { he: 'בדיקת רכב משפחתי לפני קנייה', en: 'Pre-purchase inspection, family car', min: 378, max: 557 },
  { he: 'בדיקת מחשב רכב (ללא תיקון)', en: 'Car computer diagnostic, no repair', min: 187, max: 257 },
];

export const REPAIR_PRICES_NOTES = {
  he: [
    'המחירים הועלו ב־2% ועוגלו לשקל שלם, לרבות ספי ההתפלגות ותעריפי המוסכים. אחוזי ההתפלגות לא שונו.',
    'נתוני המקור מינואר עד יולי 2025. ההתאמה אינה בדיקת מחירים חדשה או הצעת מחיר.',
    'גודל המדגם ודגמי הרכבים אינם מפורטים. אין להשוות ישירות בין דיווחים לשירותים נפרדים.',
    'נתוני הפנצ׳ר מתייחסים לשירותי דרך ולתיקון, לא להחלפת צמיג.',
    'נתונים לפי יצרן מתייחסים רק ליצרן המצוין.',
    'תעריפי מוסכים שפורסמו הם נתוני מחירון, לא תשלומי לקוחות.',
  ],
  en: [
    'Prices were raised by 2% and rounded to whole shekels, including distribution thresholds and garage rates. Distribution percentages were not changed.',
    'Source data is from January to July 2025. The adjustment is not a new price survey or a quote.',
    'Sample size and car models are not specified. Reports for separate services should not be compared directly.',
    'Puncture data refers to roadside service and repair, not tire replacement.',
    'Manufacturer-specific data applies only to the manufacturer named.',
    'Published garage rates are price-list figures, not customer payments.',
  ],
  footerHe: 'נתוני המקור נבדקו ב־19 בנובמבר 2026. תוספת 2% הוחלה ב־21 בנובמבר 2026. כל המחירים כוללים מע״מ.',
  footerEn: 'Source data checked on November 19, 2026. The 2% uplift was applied on November 21, 2026. All prices include VAT.',
};
