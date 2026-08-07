import { dbAll } from './db';
import type { LookupResult, Vehicle } from './vehicleLookup';
import { EN_MAKE_MAP } from './vehicleLookup';

const DVLA_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiries/v1/vehicles';

interface DvlaResponse {
  registrationNumber?: string;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  make?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;
  fuelType?: string;
  colour?: string;
  monthOfFirstRegistration?: string;
  motExpiryDate?: string;
}

function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function fmtUkPlate(reg: string): string {
  const s = reg.replace(/[\s-]/g, '').toUpperCase();
  if (s.length === 7) return `${s.slice(0, 4)} ${s.slice(4)}`; // AB12 CDE (current format)
  if (s.length === 6) return `${s.slice(0, 3)} ${s.slice(3)}`; // A123 BCD (prefix format)
  return s;
}

const FUEL_MAP: Record<string, string> = {
  'PETROL': 'Petrol',
  'DIESEL': 'Diesel',
  'ELECTRIC': 'Electric',
  'HYBRID ELECTRIC': 'Hybrid',
  'PLUG-IN HYBRID ELECTRIC': 'PHEV',
};

export async function lookupUkVehicle(plate: string): Promise<LookupResult> {
  const apiKey = process.env.DVLA_API_KEY;
  if (!apiKey) return { status: 'error' };

  const reg = plate.replace(/[\s-]/g, '').toUpperCase();
  if (reg.length < 2 || reg.length > 8) return { status: 'not_found' };

  try {
    const res = await fetch(DVLA_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: reg }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error' };

    const d = await res.json() as DvlaResponse;

    const dvlaMake = (d.make ?? '').toUpperCase();
    const makeSlug = EN_MAKE_MAP[dvlaMake] ?? null;

    let dbMatch = null;
    if (makeSlug) {
      const rows = await dbAll<{ make_slug: string }>(
        'SELECT make_slug FROM car_models WHERE make_slug = ? LIMIT 1',
        makeSlug,
      ).catch(() => []);
      if (rows.length) dbMatch = { makeSlug, modelSlug: '', year: d.yearOfManufacture ?? null };
    }

    const vehicle: Vehicle = {
      country: 'uk',
      plate: 0,
      displayPlate: fmtUkPlate(reg),
      name: d.make ? toTitle(d.make) : reg,
      makeHe: d.make ? toTitle(d.make) : reg,
      year: d.yearOfManufacture ?? null,
      color: d.colour ? toTitle(d.colour) : '',
      fuel: FUEL_MAP[d.fuelType ?? ''] ?? (d.fuelType ? toTitle(d.fuelType) : ''),
      ownership: '',
      vin: '',
      lastTestDate: '',
      validUntil: d.motExpiryDate ?? '',
      firstRoad: d.monthOfFirstRegistration ?? '',
      frontTire: '',
      rearTire: '',
      emissionsGroup: null,
      odometer: null,
      hasAccident: null,
      wasRepainted: null,
      origin: null,
      motStatus: d.motStatus ?? null,
      motExpiryDate: d.motExpiryDate ?? null,
      taxStatus: d.taxStatus ?? null,
      taxDueDate: d.taxDueDate ?? null,
      engineCapacity: d.engineCapacity ?? null,
      dbMatch,
    };

    return { status: 'found', vehicle };
  } catch {
    return { status: 'error' };
  }
}
