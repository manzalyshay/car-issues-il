/** True when a stored news image may be shown on the site (source-site photos are not ours to republish). */
export function isUsableNewsImage(url: string | null | undefined): url is string {
  return !!url && !url.includes('cdn.motor1.com');
}
