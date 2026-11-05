"""
Count cars on the road in Israel per site model, from the Ministry of Transport open data.

Source: data.gov.il resource 5e87a7a1-2f6f-41c1-8aec-7216d52a6cf6
("מאגר כמויות כלי רכב לפי תוצר, דגם ושנת יצור", updated daily). Field mispar_rechavim_pailim is the
number of active vehicles for each make / model code / year. Private (P) and commercial (M) are both counted.

Input: models.json and makes.json exported from D1 (raw query result is fine):
  models.json = SELECT make_slug, slug, name_en, active_vehicles_il FROM car_models
  makes.json  = SELECT slug, name_he FROM car_makes
Usage: python3 -I scripts/il-fleet/fleet.py models.json makes.json out_dir
   or: python3 -I scripts/il-fleet/fleet.py --d1 out_dir [--apply]
       (reads the two tables from D1 over the REST API with CLOUDFLARE_API_TOKEN, and with --apply
        writes the new counts and today's date to car_models; this is what the GitHub workflow runs)
Writes out_dir/counts.json, out_dir/unmatched.txt (biggest registry names not matched to any model),
out_dir/update.sql (one UPDATE of car_models.active_vehicles_il for every model) and out_dir/rollback.sql.

Matching: the registry make (tozar, Hebrew) maps to a site make; the commercial name (kinuy_mishari),
upper-cased with spaces/dashes removed, is matched to the site model whose name or slug it starts with
(longest wins, so COROLLA CROSS goes to corolla-cross, not corolla). Extra rules live in aliases.json.
"""
import json, os, re, ssl, sys, time, collections, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
RESOURCE = '5e87a7a1-2f6f-41c1-8aec-7216d52a6cf6'
API = 'https://data.gov.il/api/3/action/datastore_search'

ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def rows(path):
    d = json.load(open(path))
    return d[0]['results'] if isinstance(d, list) and d and isinstance(d[0], dict) and 'results' in d[0] else d


def fetch_registry():
    out, off = [], 0
    while True:
        q = urllib.parse.urlencode({'resource_id': RESOURCE, 'limit': 32000, 'offset': off,
                                    'fields': 'sug_degem,tozar,tozeret_nm,kinuy_mishari,mispar_rechavim_pailim'})
        for attempt in range(4):
            try:
                req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': 'carissues-bot/1.0 (https://carissues.co.il)'})
                r = json.load(urllib.request.urlopen(req, context=ctx, timeout=180))['result']
                break
            except Exception:
                if attempt == 3: raise
                time.sleep(2 ** (attempt + 1))
        out += r['records']; off += len(r['records'])
        if not r['records'] or off >= r['total']:
            return out, r['total']


CF_ACCOUNT = os.environ.get('CLOUDFLARE_ACCOUNT_ID') or 'da4220321e156152ca7f02ca93059557'
D1_ID = os.environ.get('D1_DATABASE_ID') or '090762ad-b029-4883-b827-9376cdee1ed2'


def d1(sql):
    token = os.environ['CLOUDFLARE_API_TOKEN']
    req = urllib.request.Request(
        f'https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_ID}/query',
        data=json.dumps({'sql': sql}).encode(), method='POST',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, context=ctx, timeout=120))
    if not r.get('success'): raise SystemExit(f'D1 error: {r.get("errors")}')
    return r['result'][0]['results']


def norm(s):
    return re.sub(r"[\s\-_.'’׳`]+", '', (s or '').upper())


def norm_he(s):
    return re.sub(r"[\s\-_.'’׳`\"״]+", '', s or '')


def main(models_path, makes_path, out_dir, apply=False):
    al = json.load(open(os.path.join(HERE, 'aliases.json')))
    if models_path == '--d1':
        models = d1('SELECT make_slug, slug, name_en, active_vehicles_il FROM car_models')
        makes = d1('SELECT slug, name_he FROM car_makes')
    else:
        models = rows(models_path)
        makes = rows(makes_path)

    he_make = {norm_he(m['name_he']): m['slug'] for m in makes}
    he_make.update({norm_he(k): v for k, v in al['makes'].items()})

    keys = collections.defaultdict(list)  # registry make -> [(key, 'make/slug')]
    for m in models:
        mk, s = m['make_slug'], m['slug']
        for k in {norm(m['name_en']), norm(s), norm(s.replace(mk, '', 1)) if s.startswith(mk) else ''}:
            if k: keys[mk].append((k, f'{mk}/{s}'))
    for regmk, cars in al['models'].items():  # "make" or "registry make>site make" -> {slug: [names]}
        for car, names in cars.items():
            for n in names: keys[regmk].append((norm(n), car))
    for mk in keys: keys[mk].sort(key=lambda t: -len(t[0]))
    exclude = {mk: [norm(x) for x in v] for mk, v in al.get('exclude', {}).items()}
    classes = al.get('class_rules', {})
    prefixes = al.get('prefixes', {})
    site = {f"{m['make_slug']}/{m['slug']}" for m in models}

    def ok(c, k, bounds):
        # A key ending in a digit must not run into another digit ("308" must not match "3008"),
        # unless the registry name had a space there ("FIAT 500 1.2").
        if not c.startswith(k): return False
        if k[-1].isdigit() and len(c) > len(k) and c[len(k)].isdigit() and len(k) not in bounds: return False
        return True

    def match(mk, raw):
        up = (raw or '').upper().strip()
        parts = [p for p in re.split(r"[\s\-_.'’׳`]+", up) if p]
        kin = ''.join(parts)
        pos, bounds = 0, set()
        for p in parts: pos += len(p); bounds.add(pos)
        cands = [(kin, bounds)]
        for pre in [norm(mk)] + [norm(x) for x in prefixes.get(mk, []) + prefixes.get('*', [])]:
            if pre and kin.startswith(pre) and len(kin) > len(pre):
                cands.append((kin[len(pre):], {b - len(pre) for b in bounds if b > len(pre)}))
        for c, b in cands:
            if any(c.startswith(e) for e in exclude.get(mk, [])): return None
        for c, b in cands:
            hit = next((car for k, car in keys[mk] if ok(c, k, b)), None)
            if not hit:
                for pre, slug in sorted(classes.get(mk, {}).items(), key=lambda t: -len(t[0])):
                    if c.startswith(pre) and len(c) > len(pre) and c[len(pre)].isdigit():
                        hit = slug; break
            if hit:
                if 'COUPE' in kin and f'{hit}-coupe' in site: hit = f'{hit}-coupe'
                if kin.endswith('SUV') and f'{hit}-suv' in site: hit = f'{hit}-suv'
                return hit
        return None

    reg, total = fetch_registry()
    counts = collections.Counter()
    unmatched = collections.Counter()
    matched_total = 0
    for x in reg:
        n = x['mispar_rechavim_pailim'] or 0
        if not n: continue
        mkh = x['tozar'] or (x['tozeret_nm'] or '').split(' ')[0]
        mk = he_make.get(norm_he(mkh))
        hit = match(mk, x['kinuy_mishari']) if mk else None
        if hit:
            counts[hit] += n; matched_total += n
        else:
            unmatched[f'{mkh} | {x["kinuy_mishari"]}'] += n

    os.makedirs(out_dir, exist_ok=True)
    old = {f"{m['make_slug']}/{m['slug']}": m.get('active_vehicles_il') for m in models}
    json.dump(dict(counts), open(os.path.join(out_dir, 'counts.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(out_dir, 'unmatched.txt'), 'w') as f:
        for k, n in unmatched.most_common(300): f.write(f'{n}\t{k}\n')
    def case_sql(values):
        whens = ' '.join(f"WHEN '{c}' THEN {v}" for c, v in sorted(values.items()))
        return (f"UPDATE car_models SET active_vehicles_il = CASE make_slug || '/' || slug {whens} "
                f"ELSE active_vehicles_il END, active_vehicles_il_as_of = '{time.strftime('%Y-%m-%d')}';\n")
    # One statement for every site model (0 when the registry has none on the road), plus the rollback.
    open(os.path.join(out_dir, 'update.sql'), 'w').write(case_sql({c: counts.get(c, 0) for c in old}))
    open(os.path.join(out_dir, 'rollback.sql'), 'w').write(case_sql({c: old[c] if old[c] is not None else 'NULL' for c in old}))
    print(f'registry active vehicles: {sum((x["mispar_rechavim_pailim"] or 0) for x in reg):,} ({total:,} rows)')
    print(f'matched to site models: {matched_total:,}')
    print('biggest changes vs current value:')
    diffs = sorted(old, key=lambda c: -abs(counts.get(c, 0) - (old[c] or 0)))
    for c in diffs[:40]: print(f'  {c:<32} {old[c] or 0:>8} -> {counts.get(c, 0):>8}')
    print('biggest unmatched registry names:')
    for k, n in unmatched.most_common(25): print(f'  {n:>7}  {k}')


    # Safety net: refuse to write if the registry or the matching looks broken.
    if apply:
        if total < 50000 or matched_total < 3_000_000:
            raise SystemExit(f'Not applying: registry rows {total:,}, matched {matched_total:,} look wrong')
        d1(open(os.path.join(out_dir, 'update.sql')).read().strip().rstrip(';'))
        print('applied to D1')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--d1':
        main('--d1', None, a[1], apply='--apply' in a)
    else:
        main(*a[:3])
