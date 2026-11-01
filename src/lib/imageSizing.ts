/**
 * Shared image-sizing helper for every place that renders a Wikimedia Commons
 * car photo (hero, galleries, homepage/category cards, OG images). Requests the
 * Commons thumbnail endpoint at the exact pixel width the UI actually needs,
 * instead of always re-using whichever derivative (or original) happens to be
 * stored on the row - no new service, this is Commons' own thumb convention
 * (upload.wikimedia.org/.../thumb/<h1>/<h2>/<file>/<width>px-<file>).
 */

// Commons serves the same thumb path off more than one hostname - upload.wikimedia.org
// is the canonical one, but thumburl values returned by the API (iiurlwidth) sometimes
// resolve to thumb.wikimedia.org instead. Both must be recognized, or thumbnail_url
// rows built from the latter silently pass through unresized.
const COMMONS_THUMB_RE = /^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+))\/\d+px-\2(\?.*)?$/;
const COMMONS_ORIGINAL_RE = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?]+))/;

// Commons rejects any width not in its configured $wgThumbnailSteps and returns
// a 400 for direct thumb-URL requests at an arbitrary width ("Use thumbnail
// sizes listed on https://w.wiki/GHai") - confirmed empirically against several
// files in this project. Every requested width is snapped up to the nearest of
// these, never passed through as-is.
const THUMBNAIL_STEPS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

export function snapToThumbnailStep(width: number): number {
  return THUMBNAIL_STEPS.find((s) => s >= width) ?? THUMBNAIL_STEPS[THUMBNAIL_STEPS.length - 1];
}

/**
 * Returns a Commons thumbnail URL at (the nearest valid step >=) `width` for
 * any Commons original or thumb URL. Non-Commons URLs (local /images/... paths,
 * other hosts) are returned unchanged - this is additive sizing, never a new
 * source of truth.
 */
export function sizedImageUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  const step = snapToThumbnailStep(width);
  const thumbMatch = url.match(COMMONS_THUMB_RE);
  if (thumbMatch) {
    const [, base, filename] = thumbMatch;
    return `${base}/${step}px-${filename}`;
  }
  const originalMatch = url.match(COMMONS_ORIGINAL_RE);
  if (originalMatch) {
    const [, , h1, h2, filename] = originalMatch;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h1}/${h2}/${filename}/${step}px-${filename}`;
  }
  return url;
}

/** Given an image's known original width/height, the height a sizedImageUrl()
 * derivative at `targetWidth` will actually render at (Commons preserves aspect
 * ratio) - used to declare accurate og:image:width/height instead of a fixed
 * 1200x630 that doesn't match what's actually served. */
export function scaledHeight(origWidth: number, origHeight: number, targetWidth: number): number {
  return Math.round((origHeight / origWidth) * targetWidth);
}
