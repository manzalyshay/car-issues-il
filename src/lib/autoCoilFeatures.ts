/**
 * auto.co.il trim rows (car_trims.auto_co_il_id set) store the version page's equipment
 * table as a Hebrew object in `features` ({"עזרי חנייה": "חיישני חניה אחוריים + מצלמת רוורס",
 * "מערכת זיהוי תמרורים": "כן", ...}) instead of TRIM_FEATURES keys. This maps that object to
 * the keys the trim UI shows, plus the seat material and screen size it implies.
 *
 * Rule of thumb: a row title present with any value means the car has it (the sync script
 * stores ticked items as "כן" and leaves crossed-out items out); value text refines it.
 */
import type { FeatureKey, TrimSpec } from '@/data/cars';

type Equipment = Record<string, unknown>;

export interface AutoCoilDerived {
  features: FeatureKey[];
  seats?: TrimSpec['seats'];
  screenSize?: number;
}

export function isAutoCoilEquipment(v: unknown): v is Equipment {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function deriveFromAutoCoil(eq: Equipment): AutoCoilDerived {
  const get = (k: string): string | null => {
    const v = eq[k];
    if (v == null || v === '' || v === false) return null;
    return String(v);
  };
  const has = (k: string) => get(k) != null;
  // Free-text lists ("אבזור נוסף כלול במחיר" etc.) plus every value, for keyword checks
  const allText = Object.entries(eq).map(([k, v]) => `${k}: ${v ?? ''}`).join(' | ');
  const extra = [get('אבזור נוסף כלול במחיר'), get('אבזור בטיחותי נוסף')].filter(Boolean).join(', ');

  const f = new Set<FeatureKey>();
  const connectivity = get('קישוריות') ?? '';
  if (/carplay|android auto/i.test(connectivity) || /carplay|android auto/i.test(extra)) f.add('apple_carplay');
  if (/(carplay|android auto)[^,]{0,25}אלחוטי|אלחוטי[^,]{0,25}(carplay|android auto)/i.test(allText)) f.add('wireless_carplay');
  if (/טעינה אלחוטית|טעינה אלחוטי|משטח טעינה/.test(allText)) f.add('wireless_charging');
  if (/(לוח|צג) (מחוונים|שעונים) (דיגיטלי|דיגיטאלי)|קוקפיט דיגיטלי/.test(allText)) f.add('digital_cluster');
  if (/תצוגה עילית|תצוגה עלית|\bHUD\b|head.?up/i.test(allText)) f.add('hud');
  const audio = get('מערכת שמע') ?? '';
  if (/harman|bose|jbl|meridian|bang|b&o|burmester|krell|infinity|beats|bowers|sony|focal|akg|premium|פרימיום|פרמיום/i.test(`${audio} ${extra}`)) f.add('premium_audio');

  if (has('מערכת לבלימת חרום עצמאית') || has('מערכת לבלימת חירום עצמאית')) f.add('aeb');
  if (/שמירת מרחק|אדפטיבי/.test(get('בקרת שיוט') ?? '')) f.add('adaptive_cruise');
  if (/שמירת נתיב|היגוי/.test(get('מערכת להתרעת סטייה מנתיב') ?? '') || /שמירת נתיב/.test(extra)) f.add('lane_keep');
  if (has('מערכת לניטור רכב בשטח מת') || /שטח מת|נקודה עיוורת|שטחים מתים/.test(extra)) f.add('blind_spot');
  if (has('מערכת זיהוי תמרורים') || /זיהוי תמרורים/.test(extra)) f.add('traffic_sign');
  const parking = get('עזרי חנייה') ?? '';
  if (/מצלמ/.test(parking) || /מצלמת רוורס|מצלמה אחורית/.test(extra)) f.add('rear_camera');
  if (/360|היקפי/.test(`${parking} ${extra}`)) f.add('camera_360');
  if (/חיישני/.test(parking)) f.add('parking_sensors');

  if (/חימום מושבים|מושבים (קדמיים )?מחוממים|מושבי[^,]{0,15}מחוממים|חימום למושב/.test(allText)) f.add('heated_seats_front');
  if (/(חימום|מחוממים)[^,]{0,25}(אחורי|שורה שנייה|שורה 2)/.test(allText)) f.add('heated_seats_rear');
  if (/אוורור (ל)?מושב|מושבים מאווררים|מושבי[^,]{0,15}מאווררים|קירור (ל)?מושב|מושבים מקוררים/.test(allText)) f.add('ventilated_seats');
  if (/חשמלי/.test(get('כוונון מושבים') ?? '')) f.add('electric_seats');
  if (/זיכרון/.test(allText)) f.add('memory_seats');
  const roof = get('סוג גג שמש') ?? '';
  if (/פנורמי|פנוראמי/.test(roof)) f.add('panoramic_roof');
  else if (roof) f.add('sunroof');
  if (has('כניסה ללא מפתח')) f.add('keyless_entry');
  if (/הנעה|התנעה/.test(get('כניסה ללא מפתח') ?? '') || /(התנעה|הנעה) (בלחיצ|בכפתור|ללא מפתח)|כפתור (התנעה|הנעה)/.test(extra)) f.add('push_start');
  if (has('תאורת אווירה')) f.add('ambient_lighting');
  if (/LED/i.test(get('סוג פנסי חזית') ?? '') || /מטריקס|matrix|פנסי חזית LED|פנסי LED מלאים/i.test(extra)) f.add('led_lights');
  if (has('חיישני תאורה')) f.add('auto_lights');
  if (/הגה מחומם|חימום (ל)?הגה|חימום גלגל ההגה/.test(allText)) f.add('heated_steering');

  const upholstery = get('ריפוד') ?? '';
  let seats: TrimSpec['seats'];
  if (/דמוי|טבעוני|סינטטי|אקו|אלקנטרה|בשילוב/.test(upholstery)) seats = 'leatherette';
  else if (/עור/.test(upholstery)) seats = 'leather';
  else if (/בד/.test(upholstery)) seats = 'fabric';

  // 'מערכת מולטימדיה עם מסך "12.3' / 'מסך מגע "10.25' (inches; the quote mark can sit either side)
  let screenSize: number | undefined;
  const m = extra.match(/(?:מולטימדיה|מסך מגע|מסך מרכזי)[^,]{0,30}?(\d{1,2}(?:\.\d{1,2})?)\s*(?:["״]|אינץ)?/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 5 && n <= 20) screenSize = n;
  }
  return { features: [...f], seats, screenSize };
}
