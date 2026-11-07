/**
 * Finds a freely licensed photo for a news article. Source-site images (e.g.
 * cdn.motor1.com) are not ours to republish, so articles get, in order:
 *   1. a Wikimedia Commons photo of the car they are about, with attribution;
 *   2. the site's own catalogue photo of that exact model (also Commons-licensed,
 *      stored in car_images with its author and license).
 * An article with neither stays without a photo and is not listed (see getLatestNews).
 */
import { runWorkersAI } from '@/lib/workersAi';
import { getAllMakes } from '@/lib/carsDb';
import { getImagesForCar } from '@/lib/carImages';
import { matchCatalogModel, stripYears } from '@/lib/newsCatalogMatch';

export interface NewsImage {
  url: string;
  author: string | null;
  license: string;
  sourceUrl: string;
}

const UA = 'CarIssuesBot/1.0 (https://carissues.co.il)';

export { isUsableNewsImage } from './newsImageUrl';

const BAD_FILE = /interior|dashboard|engine|cockpit|logo|badge|emblem|wheel|seat|detail|steering|\.svg|\.gif/i;

/** Ask the model for a short Commons search query naming the car in the headline. */
async function carQueryFromTitle(titleEn: string): Promise<string | null> {
  const prompt =
    'Name the single car (make and model, optionally generation) that this automotive news headline is about, ' +
    'as a short Wikimedia Commons search query of 2-5 words. If no specific car, name the most relevant car of the brand mentioned. ' +
    'Reply with the query only.\n\nHeadline: ' + titleEn;
  const raw = await runWorkersAI([{ role: 'user', content: prompt }], { max_tokens: 20, temperature: 0 });
  const q = raw?.split('\n')[0].replace(/["'`.*]/g, '').trim();
  return q && q.length <= 60 ? q : null;
}

/** Fallback: leading capitalised words of the headline (usually "Make Model"). */
function heuristicQuery(titleEn: string): string | null {
  const words = titleEn.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const caps: string[] = [];
  for (const w of words) {
    if (/^[A-Z0-9]/.test(w)) caps.push(w);
    else if (caps.length) break;
    if (caps.length === 3) break;
  }
  return caps.length ? caps.join(' ') : null;
}

/** The catalogue's own photo of the exact model in the headline, or null. */
export async function findCatalogImage(titleEn: string | null): Promise<NewsImage | null> {
  if (!titleEn) return null;
  const match = matchCatalogModel(titleEn, await getAllMakes());
  if (!match) return null;
  const images = await getImagesForCar(match.makeSlug, match.modelSlug);
  // Licensed photos only; prefer landscape (news cards are wide).
  const licensed = images.filter((img) => img.url && img.license);
  const img = licensed.find((i) => !i.width || !i.height || i.width >= i.height * 1.2) ?? licensed[0];
  if (!img) return null;
  return { url: img.url, author: img.author, license: img.license!, sourceUrl: img.source_url ?? img.url };
}

async function searchCommons(query: string): Promise<NewsImage | null> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '8',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '960',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  type Page = {
    index?: number; title: string;
    imageinfo?: { thumburl?: string; descriptionurl?: string; width?: number; height?: number;
      extmetadata?: Record<string, { value?: string }> }[];
  };
  const data = await res.json() as { query?: { pages?: Record<string, Page> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl || !ii.descriptionurl || BAD_FILE.test(p.title)) continue;
    if ((ii.width ?? 0) < (ii.height ?? 0) * 1.2) continue; // landscape only
    const license = ii.extmetadata?.LicenseShortName?.value ?? '';
    if (!/CC|public domain|PD/i.test(license)) continue;
    const author = (ii.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 120) || null;
    return { url: ii.thumburl, author, license, sourceUrl: ii.descriptionurl };
  }
  return null;
}

export async function findNewsImage(titleEn: string | null): Promise<NewsImage | null> {
  if (!titleEn) return null;
  const queries = [await carQueryFromTitle(titleEn).catch(() => null), heuristicQuery(titleEn)]
    .flatMap((q) => (q ? [q, stripYears(q)] : []))
    .filter((q, i, arr) => !!q && arr.indexOf(q) === i);
  for (const q of queries) {
    const img = await searchCommons(q).catch(() => null);
    if (img) return img;
  }
  return findCatalogImage(titleEn).catch(() => null);
}
