/** Shared Hebrew->English value translation maps for the vehicle-lookup UI. */

export const OWNERSHIP_LABEL: Record<string, string> = {
  'פרטי':    'פרטי',
  'סוחר':    'סוחר',
  'ליסינג':  'ליסינג',
  'השכרה':   'השכרה',
  'החכר':    'ליסינג',
  'חברה':    'חברה',
  'מדינה':   'מדינה',
  'עירייה':  'עירייה',
  'צבא':     'צבא',
  'עסקי':    'עסקי',
};

export const OWNERSHIP_EN: Record<string, string> = {
  'פרטי':   'Private',
  'סוחר':   'Dealer',
  'ליסינג': 'Leasing',
  'השכרה':  'Rental',
  'החכר':   'Leasing',
  'חברה':   'Company',
  'מדינה':  'Government',
  'עירייה': 'Municipality',
  'צבא':    'Military',
  'עסקי':   'Business',
};

export const COLOR_EN: Record<string, string> = {
  'לבן':       'White',
  'שחור':      'Black',
  'כסוף':      'Silver',
  'אפור':      'Gray',
  'כסוף/אפור': 'Silver/Gray',
  'כחול':      'Blue',
  'אדום':      'Red',
  'ירוק':      'Green',
  'צהוב':      'Yellow',
  'חום':       'Brown',
  'כתום':      'Orange',
  'סגול':      'Purple',
  'זהוב':      'Gold',
  'בז':        'Beige',
  'ורוד':      'Pink',
  'טורקיז':    'Turquoise',
  'לא רשום':   'Not recorded',
};

export const FUEL_EN: Record<string, string> = {
  'בנזין':        'Gasoline',
  'דיזל':         'Diesel',
  'חשמל':         'Electric',
  'גז':           'Gas (LPG)',
  'היברידי':      'Hybrid',
  'היברידי-חשמל': 'Plug-in Hybrid',
  'בנזין/גז':     'Gasoline/LPG',
  'מימן':         'Hydrogen',
};

export const ORIGIN_EN: Record<string, string> = {
  'החכר':        'Lease',
  'ליסינג':      'Lease',
  'השכרה':       'Rental',
  'יפן':         'Japan',
  'גרמניה':      'Germany',
  'דרום קוריאה': 'South Korea',
  'קוריאה':      'South Korea',
  'צרפת':        'France',
  'ספרד':        'Spain',
  'איטליה':      'Italy',
  'ארה"ב':       'USA',
  'ארהב':        'USA',
  'סין':         'China',
  'שבדיה':       'Sweden',
  'הונגריה':     'Hungary',
  'רומניה':      'Romania',
  'בלגיה':       'Belgium',
  'אנגליה':      'UK',
  'בריטניה':     'UK',
  'הולנד':       'Netherlands',
  'פולין':       'Poland',
  'מקסיקו':      'Mexico',
  'סלובקיה':     'Slovakia',
  'אוסטריה':     'Austria',
  'פורטוגל':     'Portugal',
  'תורכיה':      'Turkey',
  'טורקיה':      'Turkey',
  'דרום אפריקה': 'South Africa',
  'הודו':        'India',
  'תאילנד':      'Thailand',
};

export function translateValue(raw: string, map: Record<string, string>): string {
  if (!raw) return raw;
  if (map[raw]) return map[raw];
  for (const [key, val] of Object.entries(map)) {
    if (raw.includes(key)) return val;
  }
  return raw;
}

export function normalizeOwnership(raw: string, isHe = true): string {
  if (!raw) return raw;
  const map = isHe ? OWNERSHIP_LABEL : OWNERSHIP_EN;
  if (map[raw]) return map[raw];
  for (const [key, label] of Object.entries(map)) {
    if (raw.includes(key)) return label;
  }
  return raw;
}
