#!/usr/bin/env python3
"""Count two-wheelers on Israeli roads per site motorcycle model.

Source: data.gov.il two-wheeler registry (resource bf9df4e2-d90d-4c0a-a400-19e15af8e95f),
matched to scripts/moto/models.json by registry make prefix + degem_nm (exact code or regex).

  python3 -I scripts/moto/fleet.py OUT_DIR [--cache registry.json]

Writes OUT_DIR/counts.json (per model: count, years, cc range) and OUT_DIR/unmatched.txt
(largest registry make+degem groups no model claims - candidates to add next).
"""
import collections, json, os, re, sys, urllib.parse, urllib.request

API = 'https://data.gov.il/api/3/action/datastore_search'
RESOURCE = 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f'
FIELDS = 'tozeret_nm,degem_nm,shnat_yitzur,nefach_manoa'
HERE = os.path.dirname(os.path.abspath(__file__))
MIN_YEAR_UNITS = 5  # a model year is listed once at least this many bikes from it are on the road


def download():
    rows, off = [], 0
    while True:
        q = urllib.parse.urlencode({'resource_id': RESOURCE, 'limit': 32000, 'offset': off, 'fields': FIELDS})
        req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': 'carissues-bot/1.0 (https://carissues.co.il)'})
        res = json.load(urllib.request.urlopen(req, timeout=300))['result']
        rows += res['records']
        off += 32000
        print(f'  {len(rows)}/{res["total"]}', file=sys.stderr)
        if off >= res['total']:
            return rows


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip()).upper()


def main():
    out = sys.argv[1]
    cache = sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv else None
    os.makedirs(out, exist_ok=True)
    spec = json.load(open(os.path.join(HERE, 'models.json')))
    makes = {m['slug']: m for m in spec['makes']}
    matchers = []
    for mo in spec['models']:
        prefixes = [mo['registryMake']] if mo.get('registryMake') else makes[mo['make']]['registry']
        matchers.append((mo, prefixes, {norm(c) for c in mo.get('codes', [])},
                         [re.compile(p, re.I) for p in mo.get('patterns', [])]))

    if cache and os.path.exists(cache):
        rows = json.load(open(cache))
    else:
        rows = download()
        if cache:
            json.dump(rows, open(cache, 'w'), ensure_ascii=False)

    hits = collections.defaultdict(list)
    unmatched = collections.Counter()
    double = collections.Counter()
    for r in rows:
        mk, dg = r['tozeret_nm'] or '', norm(r['degem_nm'])
        found = [mo for mo, pre, codes, pats in matchers
                 if any(mk.startswith(p) for p in pre) and (dg in codes or any(p.search(dg) for p in pats))]
        if len(found) > 1:
            double[(mk, dg, tuple(f"{f['make']}/{f['slug']}" for f in found))] += 1
        if found:
            hits[(found[0]['make'], found[0]['slug'])].append(r)
        elif (r['shnat_yitzur'] or 0) >= 2012:
            unmatched[(mk, dg)] += 1

    counts = {}
    for mo, *_ in matchers:
        rs = hits.get((mo['make'], mo['slug']), [])
        by_year = collections.Counter(r['shnat_yitzur'] for r in rs if r['shnat_yitzur'])
        years = sorted(y for y, n in by_year.items() if n >= MIN_YEAR_UNITS and y >= 2005)
        ccs = sorted(r['nefach_manoa'] for r in rs if (r['nefach_manoa'] or 0) > 1)
        counts[f"{mo['make']}/{mo['slug']}"] = {
            'count': len(rs), 'years': years,
            'cc': [ccs[len(ccs) // 20], ccs[-len(ccs) // 20 - 1]] if ccs else None,
        }
        print(f"{len(rs):6}  {mo['make']}/{mo['slug']}  {years[:1]}-{years[-1:]}", file=sys.stderr)

    json.dump(counts, open(os.path.join(out, 'counts.json'), 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(out, 'unmatched.txt'), 'w') as f:
        for (mk, dg), n in unmatched.most_common(200):
            f.write(f'{n:6} | {mk} | {dg}\n')
    if double:
        print('ROWS CLAIMED BY MORE THAN ONE MODEL:', file=sys.stderr)
        for k, n in double.most_common(20):
            print(f'  {n:5} {k}', file=sys.stderr)
    total = sum(len(v) for v in hits.values())
    print(f'matched {total}/{len(rows)} registry rows', file=sys.stderr)


if __name__ == '__main__':
    main()
