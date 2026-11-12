import type { Recall } from '@/app/api/recalls/route';

/** A production window wider than this many years is too vague to place on a model-year chart. */
export const IL_MAX_SPAN = 6;

/**
 * Model years an Israeli recall notice applies to. Israeli notices carry a production
 * window, not a model year, so a notice counts once for every year in `covered` that
 * falls inside the window. Returns [] when the window is unknown or too wide.
 */
export function ilRecallYears(r: Pick<Recall, 'buildBegin' | 'buildEnd'>, covered: number[]): number[] {
  const b = parseInt((r.buildBegin || '').slice(0, 4));
  const e = parseInt((r.buildEnd || '').slice(0, 4));
  if (isNaN(b) || isNaN(e) || e < b || e - b + 1 > IL_MAX_SPAN) return [];
  return covered.filter(y => y >= b && y <= e);
}
