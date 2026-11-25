/**
 * Motorcycle reviews and follows share the reviews / model_follows tables with cars,
 * stored under the make key `moto-<make>` so car queries (which look rows up against
 * car_makes) never pick them up. Safe to import from client components.
 */
export const MOTO_KEY_PREFIX = 'moto-';
export const motoKey = (makeSlug: string) => `${MOTO_KEY_PREFIX}${makeSlug}`;
export const isMotoKey = (makeKey: string) => makeKey.startsWith(MOTO_KEY_PREFIX);
/** Public page of a bike or car from the make key stored with a review / follow. */
export const vehiclePath = (makeKey: string, modelSlug: string) =>
  isMotoKey(makeKey)
    ? `/motorcycles/${makeKey.slice(MOTO_KEY_PREFIX.length)}/${modelSlug}`
    : `/cars/${makeKey}/${modelSlug}`;
