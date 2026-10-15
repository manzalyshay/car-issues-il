// English labels for Israeli Ministry of Transport vehicle data (shared by the
// lookup page's metadata and its client view).
import type { Vehicle } from './vehicleLookup';

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

export function translateValue(raw: string, map: Record<string, string>): string {
  if (!raw) return raw;
  if (map[raw]) return map[raw];
  for (const [key, val] of Object.entries(map)) {
    if (raw.includes(key)) return val;
  }
  return raw;
}

const HEBREW = /[\u0590-\u05FF]/;

/** Make shown above the model on carissues.net. Never Hebrew. */
export function englishMakeLabel(v: Pick<Vehicle, 'makeHe' | 'makeEn' | 'country'>): string {
  if (v.makeEn) return v.makeEn;
  if (!HEBREW.test(v.makeHe)) return v.makeHe.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return '';
}

/** Commercial model name without a leading make (the registry often stores "MAZDA 2"). */
export function englishModelName(v: Pick<Vehicle, 'name' | 'makeEn'>): string {
  const name = (v.name || '').trim();
  if (v.makeEn && name.toUpperCase().startsWith(v.makeEn.toUpperCase() + ' ')) return name.slice(v.makeEn.length).trim();
  return name;
}

/** "Mazda 2" style full name for English titles; falls back to the registry name, never Hebrew. */
export function englishVehicleName(v: Pick<Vehicle, 'name' | 'makeHe' | 'makeEn' | 'country'>): string {
  const make = englishMakeLabel(v), model = englishModelName(v);
  return [make, model].filter(Boolean).join(' ') || v.name || 'Vehicle';
}
