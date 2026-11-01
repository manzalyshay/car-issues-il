/**
 * Small in-memory cache for translating short English automotive phrases
 * (known-issue titles, etc.) to Hebrew for display on the Hebrew site.
 * Keyed by the English string itself so repeated titles across models/vehicles
 * reuse one translation per Worker isolate lifetime instead of re-calling the
 * model every time.
 */
// Read env at call time: on Cloudflare Workers process.env isn't populated when the module loads.
const geminiUrl = (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

// Every known_issues title currently in D1, translated once by hand (reviewed automotive
// Hebrew). These are served directly - no AI call - so fault lists never fall back to
// English. Only a title added after this list falls through to the AI translators below.
// When new known_issues titles are scraped, add their translations here.
const STATIC_TITLES_HE: Record<string, string> = {
  "\"Check Hybrid Engine System\" Error": "שגיאת \"בדוק מערכת הנעה היברידית\"",
  "'Change Oil' Warning Repeatedly Sounds": "התראת החלפת שמן חוזרת שוב ושוב",
  "A/C Leakage": "דליפה במזגן",
  "A/C Stopped Working": "המזגן הפסיק לעבוד",
  "A/C Works Intermitently": "המזגן עובד לסירוגין",
  "All The Electronics Are Faulty": "תקלות בכל מערכות החשמל",
  "Back Lights": "תקלה בפנסים האחוריים",
  "Bad Pressure Plate": "תקלה בצלחת המצמד",
  "Blind Collision Warning Shuts Down": "התרעת השטח המת מפסיקה לפעול",
  "Blown Head Gasket, Main Bearing Failure": "אטם ראש שרוף וכשל במסבים הראשיים",
  "Bluetooth Phone": "תקלה בחיבור הבלוטות' לטלפון",
  "Bouncy Suspension": "מתלים קופצניים",
  "Brake Light Not Working": "פנס הבלם לא עובד",
  "Brake Replacement Light (Early)": "נורית החלפת בלמים נדלקת מוקדם",
  "Bright, Misaligned Headlights": "פנסים קדמיים מסנוורים ולא מכוונים",
  "Broken Head Bolts": "ברגי ראש מנוע שבורים",
  "Broken Timing Chain Guide": "מוביל שרשרת תזמון שבור",
  "Built-In Bluetooth Problem": "תקלה בבלוטות' המובנה",
  "Cam Shaft Bolts Sheared Off": "ברגי גל הזיזים נקטעו",
  "Car Caught Fire": "הרכב עלה באש",
  "Car Stalls Out Randomly": "הרכב נכבה באופן אקראי",
  "Car Will Not Engage Awd, Stuck In Rwd Only": "ההנעה הכפולה לא משתלבת, הרכב תקוע בהנעה אחורית",
  "Catastrophic Engine Failure": "קריסה מוחלטת של המנוע",
  "Charger Cable Fried": "כבל הטעינה נשרף",
  "Condensation In Head Lights": "עיבוי לחות בפנסים הקדמיים",
  "Control Arm /Bushing Failure": "בלאי בזרועות המתלה ובתותבים",
  "Coolant Hose Slip": "צינור נוזל הקירור משתחרר",
  "Coolant Pump Failure": "כשל במשאבת המים",
  "Crack In Passenger Engine Mount": "סדק בתושבת המנוע בצד הנוסע",
  "Cracked Rim": "חישוק סדוק",
  "Cracked Rims": "חישוקים סדוקים",
  "Cvt Transmission Overheated": "התחממות יתר של תיבת ה-CVT",
  "Death Wobble": "רעידות חזקות בהגה במהירות (Death Wobble)",
  "Defective Cam Belt": "רצועת תזמון פגומה",
  "Design Flaw - Rigidity": "פגם תכנוני בקשיחות המרכב",
  "Died While Driving": "הרכב נכבה תוך כדי נסיעה",
  "Dies While Driving": "הרכב נכבה תוך כדי נסיעה",
  "Doesn't Accelerate From Low Speed": "הרכב לא מאיץ ממהירות נמוכה",
  "Door Handle Broke Off": "ידית הדלת נשברה",
  "Drive Shaft Broke": "גל ההנעה נשבר",
  "Driver Attention Warning (Daw) Too Sensitive, Can't Disable": "התרעת עייפות הנהג רגישה מדי ולא ניתנת לכיבוי",
  "Drivers Side Mirror Is Melted/Melting": "מראת הצד של הנהג נמסה",
  "Engine Blew Due To \"Oil Consuption\"": "המנוע נהרס בגלל צריכת שמן",
  "Engine Failure": "כשל במנוע",
  "Engine Overheating": "התחממות יתר של המנוע",
  "Engine Seized": "המנוע ננעל",
  "Engine Sputtered And Stalled Out While Driving": "המנוע גמגם ונכבה תוך כדי נסיעה",
  "Engine Stalls/Shuts Off While Driving": "המנוע נכבה תוך כדי נסיעה",
  "Engine Uses Excessive Oil": "המנוע צורך שמן מוגבר",
  "Evaporator/Condenser Failure": "כשל במאייד או במעבה של המזגן",
  "Excessive Oil Consumption": "צריכת שמן מוגברת",
  "Excessive Oil Consumption, Destroyed The Turbo": "צריכת שמן מוגברת שהרסה את הטורבו",
  "Foggy Substance On Windshield": "משקע ערפילי על השמשה הקדמית",
  "Front Windows Vibrate Even If Opened Only Slightly": "החלונות הקדמיים רועדים גם כשהם פתוחים מעט",
  "Fuel Gauge Not Working": "מד הדלק לא עובד",
  "Fuel Pump Leak": "דליפה במשאבת הדלק",
  "Gearbox Failure": "כשל בתיבת ההילוכים",
  "Glow Light Appears, Cruise Control Lost": "נורית חימום מוקדם נדלקת ובקרת השיוט מתנתקת",
  "Glow Light Comes On And Cruise Control Cancelled": "נורית חימום מוקדם נדלקת ובקרת השיוט מתבטלת",
  "Head Cracked All Cylenders Near Sparkplug": "סדקים בראש המנוע ליד המצתים בכל הצילינדרים",
  "Head Has To Be Replaced": "נדרשה החלפת ראש מנוע",
  "Hesitation At Acceleration": "היסוס בהאצה",
  "Hev Code": "קוד תקלה במערכת ההיברידית",
  "Hood Shakes": "מכסה המנוע רועד",
  "Horn No Longer Functioning": "הצופר הפסיק לעבוד",
  "Hub Failure": "כשל ברכזת הגלגל",
  "Intake Cam Valve Control Solenoid Problem_engine Light Came": "תקלה בסולנואיד בקרת שסתום גל הזיזים, נורית מנוע נדלקה",
  "Intermittent Shudder When Taking Off": "רעידות לסירוגין בזינוק",
  "Jerking/Shuddering/Hesitation When Accelerating": "טלטולים, רעידות והיסוס בהאצה",
  "Leaking Coolant": "דליפת נוזל קירור",
  "Leaking Coolant, Cracked Intake Manifold Gasket": "דליפת נוזל קירור ואטם סעפת יניקה סדוק",
  "Leaking Sunroof. Water Everywhere": "גג נפתח דולף, מים בכל הרכב",
  "Limited Transmission Function": "תיבת ההילוכים עוברת למצב חירום",
  "Long Crank Time When Starting": "התנעה ארוכה",
  "Loss Of Power Steering": "אובדן הגה כוח",
  "Loss Of Power While Accelerating": "אובדן כוח בהאצה",
  "Lost All Power While Driving": "אובדן כוח מוחלט תוך כדי נסיעה",
  "Noisy Interior": "רעש בתא הנוסעים",
  "Noisy Seat": "רעשים מהמושב",
  "Not Shifting Properly": "החלפת הילוכים לא תקינה",
  "Not Working Properly": "לא פועל כראוי",
  "Oil Consumption -- Defective Pistons And Piston Rings": "צריכת שמן בגלל בוכנות וטבעות בוכנה פגומות",
  "Paint Chipping": "צבע מתקלף בשבבים",
  "Paint Fading": "דהיית צבע",
  "Paint Work Peeling": "קילוף צבע",
  "Personal Settings (Door Locks)": "תקלה בהגדרות האישיות של נעילת הדלתות",
  "Poor Tow Bar Design": "תכנון לקוי של וו הגרירה",
  "Power Steering Failure": "כשל בהגה הכוח",
  "Power Steering Going Out Intermittently": "הגה הכוח מתנתק לסירוגין",
  "Premature Ball Joint Wear": "בלאי מוקדם במפרקים הכדוריים",
  "Premature Brake Wear": "בלאי מוקדם בבלמים",
  "Premature Clutch Wear": "בלאי מוקדם במצמד",
  "Premature Tire Wear": "בלאי מוקדם בצמיגים",
  "Problem With Fuel Injectors And Ecm": "תקלה במזרקי הדלק ובמחשב המנוע",
  "Radiator Blew": "הרדיאטור התפוצץ",
  "Radiator Leak": "דליפה ברדיאטור",
  "Radiator Leaks Into Transmission": "הרדיאטור דולף לתוך תיבת ההילוכים",
  "Radiator Pump Defective": "משאבת המים פגומה",
  "Radio Presets Are Erased After A Few Days": "תחנות הרדיו השמורות נמחקות אחרי כמה ימים",
  "Rear Axle Corroded": "קורוזיה בסרן האחורי",
  "Rear Hatchdoor Stays Unlocked Up To 20' Away": "הדלת האחורית נשארת לא נעולה כשמתרחקים מהרכב",
  "Safety Mode": "מצב בטיחות",
  "Shudder, Vibration": "רעידות",
  "Slipping": "החלקה בתיבת ההילוכים",
  "Spontaneous Acceleration": "האצה ספונטנית",
  "Squealing From Brakes": "חריקות מהבלמים",
  "Steering Defective Warning": "התראת תקלה בהגה",
  "Stick Shifter Sticks": "ידית ההילוכים נתקעת",
  "Strong Fuel Odor": "ריח דלק חזק",
  "Sudden Unintended Acceleration": "האצה פתאומית לא רצונית",
  "Sunroof Jammed": "הגג הנפתח נתקע",
  "Sunroof Leaks Into Comfort Control Module": "הגג הנפתח דולף לתוך מודול הבקרה",
  "TIPM Failure": "כשל במודול החשמל המרכזי (TIPM)",
  "Tensoner Belt Failing": "כשל במותחן הרצועה",
  "Thermostat Failure": "כשל בתרמוסטט",
  "Thermostat Unit Is Broken": "התרמוסטט שבור",
  "Throttle Body Needs Replacement": "נדרשה החלפת מצערת",
  "Timing Belt Broke, Engine Was Destroyed": "רצועת התזמון נקרעה והמנוע נהרס",
  "Timing Chain Broke": "שרשרת התזמון נקרעה",
  "Timing Chain Failed": "כשל בשרשרת התזמון",
  "Timing Chain Failure": "כשל בשרשרת התזמון",
  "Timing Chain, Cylinder Zero Compression": "תקלה בשרשרת התזמון ואפס דחיסה בצילינדר",
  "Tipm Failure": "כשל במודול החשמל המרכזי (TIPM)",
  "Tire Pressure Monitoring System Warning": "התראת מערכת ניטור לחץ האוויר בצמיגים",
  "Transmission Failed": "כשל בתיבת ההילוכים",
  "Transmission Failure": "כשל בתיבת ההילוכים",
  "Transmission Failure (4L60E)": "כשל בתיבת ההילוכים (4L60E)",
  "Transmission Malfunction Service Now": "התראת תקלה בתיבת ההילוכים, נדרש טיפול",
  "Transmission Stopped Shifting Properly": "תיבת ההילוכים הפסיקה להחליף הילוכים כראוי",
  "Transmission Stopped Working": "תיבת ההילוכים הפסיקה לעבוד",
  "Transmission Warning Light": "נורית אזהרה של תיבת ההילוכים",
  "Trim Around Doors (Bronze) Discoloring/Tarnishing": "הקישוט סביב הדלתות דוהה ומשנה צבע",
  "Turbo Charger Failed": "כשל במגדש הטורבו",
  "Turbo Charger Not Working": "מגדש הטורבו לא עובד",
  "Turbo Compressor Came Apart": "מדחס הטורבו התפרק",
  "Unintended Acceleration": "האצה לא רצונית",
  "V-Belt Went Into Cambelt": "רצועת האביזרים נכנסה לרצועת התזמון",
  "Warning Parking Sensor Error See Owners Manual": "התראת תקלה בחיישני החניה",
  "Warped Brakes": "דיסקיות בלם מעוותות",
  "Water Pump Leak": "דליפה במשאבת המים",
  "Wheel Falling Off": "גלגל משתחרר מהרכב",
  "Windshield Breaks": "השמשה הקדמית נסדקת",
  "Won't Start": "הרכב לא מתניע",
};

const g = globalThis as typeof globalThis & {
  _heTitleCache?: Map<string, string>;
};
function cache(): Map<string, string> {
  if (!g._heTitleCache) {
    g._heTitleCache = new Map(Object.entries(STATIC_TITLES_HE));
  }
  return g._heTitleCache;
}

function buildPrompt(items: string[]): string {
  return `Translate each of the following short car-fault/issue titles from English to concise, natural Hebrew automotive terminology. Return ONLY a JSON array of strings in the same order, no extra text.\n\nInput: ${JSON.stringify(items)}`;
}

async function translateViaGemini(items: string[]): Promise<string[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(geminiUrl(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(items) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as string[];
  return Array.isArray(parsed) && parsed.length === items.length ? parsed : null;
}

async function translateViaMistral(items: string[]): Promise<string[] | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      temperature: 0.1,
      max_tokens: 1200,
      messages: [{ role: 'user', content: buildPrompt(items) }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as string[];
  return Array.isArray(parsed) && parsed.length === items.length ? parsed : null;
}

/** Translates via Gemini first, falling back to Mistral (e.g. when Gemini's free-tier
 * daily quota is exhausted) - both are existing, already-configured capabilities in
 * this codebase, not a new translation source. */
/** Synchronous lookup in the reviewed translation list; returns null when there's none. */
export function staticHebrewTitle(en: string): string | null {
  return STATIC_TITLES_HE[en] ?? null;
}

export async function translateTitlesToHebrew(items: string[]): Promise<string[]> {
  const c = cache();
  const missing = items.filter((it) => it && !c.has(it));
  if (missing.length) {
    let translated: string[] | null = null;
    try { translated = await translateViaGemini(missing); } catch { /* try next */ }
    if (!translated) {
      try { translated = await translateViaMistral(missing); } catch { /* fall through - untranslated items keep their English title below */ }
    }
    if (translated) missing.forEach((orig, i) => c.set(orig, translated![i]));
  }
  return items.map((it) => c.get(it) ?? it);
}
