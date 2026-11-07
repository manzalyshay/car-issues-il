/** True when a stored news image may be shown on the site (source-site photos are not ours to republish). */
export function isUsableNewsImage(url: string | null | undefined): url is string {
  return !!url && !SOURCE_SITE_HOSTS.some((h) => url.includes(h));
}

/** Image hosts of the news sources themselves: their photos are not ours to republish. */
export const SOURCE_SITE_HOSTS = ['motor1.com', 'hearstapps.com'];

/** SQL condition matching isUsableNewsImage, for queries that list articles. */
export const USABLE_IMAGE_SQL =
  `(image_url IS NOT NULL AND image_url != '' ${SOURCE_SITE_HOSTS.map((h) => `AND image_url NOT LIKE '%${h}%'`).join(' ')})`;
