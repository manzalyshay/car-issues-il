/**
 * Print the public URLs (both hosts) affected by a change, for manual IndexNow /
 * Search Console submission after a deploy. Does not submit anything.
 *
 * Usage:
 *   node --experimental-strip-types scripts/changed-urls.ts toyota/corolla-cross kia/sportage
 *   node --experimental-strip-types scripts/changed-urls.ts --path /cars/compare --path /vehicle-lookup
 *   node --experimental-strip-types scripts/changed-urls.ts --curated     # every top + searched compare page
 *   add --host co.il or --host net to print one host only
 *
 * Model args print: model page, /issues, the current-year page and every curated
 * compare page involving that model. Year/compare pages for non-curated pairs are not
 * known offline — add them with --path.
 */
import { TOP_COMPARE_PAIRS } from '../src/data/top-compare-pairs.ts';
import { SEARCHED_COMPARE_PAIRS } from '../src/data/searched-compare-pairs.ts';

const HOSTS = { 'co.il': 'https://carissues.co.il', net: 'https://carissues.net' } as const;
const CURRENT_YEAR = new Date().getFullYear();

const args = process.argv.slice(2);
const paths = new Set<string>();
let hosts: (keyof typeof HOSTS)[] = ['co.il', 'net'];
const curated = [...TOP_COMPARE_PAIRS, ...SEARCHED_COMPARE_PAIRS];
const comparePath = (a: string, b: string) => `/cars/compare/${[a, b].sort().join('/')}`;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--path') paths.add(args[++i]);
  else if (a === '--host') hosts = [args[++i] as keyof typeof HOSTS];
  else if (a === '--curated') curated.forEach(([x, y]) => paths.add(comparePath(x, y)));
  else if (/^[a-z0-9-]+\/[a-z0-9-]+$/.test(a)) {
    paths.add(`/cars/${a}`);
    paths.add(`/cars/${a}/issues`);
    paths.add(`/cars/${a}/${CURRENT_YEAR}`);
    for (const [x, y] of curated) if (x === a || y === a) paths.add(comparePath(x, y));
  } else {
    console.error(`Unrecognised argument: ${a}`);
    process.exit(1);
  }
}

for (const h of hosts) {
  console.log(`# ${h}`);
  for (const p of paths) console.log(`${HOSTS[h]}${p}`);
}
