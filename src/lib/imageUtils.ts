/**
 * Returns an appropriately-sized Wikimedia thumbnail URL.
 * Works for both full-res URLs and existing thumbnail URLs by rewriting the width segment.
 *
 * Wikimedia thumb format:
 *   https://upload.wikimedia.org/wikipedia/commons/thumb/{h1}/{h2}/{file}/{width}px-{file}
 *
 * For non-Wikimedia URLs, returns the original unchanged.
 */
export function wikiThumb(url: string | null | undefined, widthPx: number): string | null {
  if (!url) return null;

  // Already a wikimedia thumbnail — just replace the width segment
  const thumbMatch = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/thumb\/[^/]+\/[^/]+\/(.+))\/\d+px-(.+)$/
  );
  if (thumbMatch) {
    const [, base, , file] = thumbMatch;
    return `${base}/${widthPx}px-${file}`;
  }

  // Full-res wikimedia URL — convert to thumb
  const fullMatch = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/([^/]+))\/([^/]+)\/([^/]+)\/(.+)$/
  );
  if (fullMatch) {
    const [, origin, repo, h1, h2, file] = fullMatch;
    return `${origin}/thumb/${h1}/${h2}/${file}/${widthPx}px-${file}`;
  }

  return url;
}
