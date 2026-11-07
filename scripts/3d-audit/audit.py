"""
Flag problem 3D models (car_3d_models) and order them by cars on the road in Israel.

Input: two JSON files exported from D1 (raw query result is fine):
  models.json   = SELECT make_slug, model_slug, sketchfab_uid, sketchfab_name, year_from, year_to
                  FROM car_3d_models WHERE hidden IS NOT 1
  counts.json   = SELECT make_slug || '/' || slug AS k, active_vehicles_il AS n FROM car_models
Usage: python3 -I scripts/3d-audit/audit.py models.json counts.json out.json

For each car it picks the entry the model page shows (same rules as src/lib/sketchfab.ts:
title filters, then open-ended entry, else highest year_from) and flags it when:
  broken  - Sketchfab API has no such model (deleted / private)
  crude   - under 30k faces, or no textures and under 80k faces
  heavy   - geometry over 20 MB (slow to load)
Cars with no visible 3D model at all are listed as "missing" when they have over 5,000 on the road.
Skips anything listed in reviewed.json (deliberate keeps). Keep the title rules in sync with UNSUITABLE_3D_TITLES / MISASSIGNED_3D_TITLES in src/lib/sketchfab.ts.
"""
import json, re, sys, ssl, os, urllib.request, collections, concurrent.futures as cf

UNSUITABLE = [r'\blow[ -]?poly\b', r'\b(?:dashboard|cockpit)\b', r'\(interior\)',
              r'\binterior\s+(?:only|scene)\b', r"\basset(?:s|'s)?\s+pack\b", r'\b(?:rally\s*1|e-racer|gt2)\b']
MISASSIGNED = {'alfa-romeo/tonale': [r'\bconcept\b'], 'byd/sealion6': [r'\bsealion\s*7\b'], 'chery/arrizo6': [r'\barrizo\s*8\b'],
  'cupra/ateca': [r'\bseat\s+ateca\b'], 'cupra/born': [r'\bvolkswagen\s+id[ .-]?3\b'], 'fiat/500': [r'\boutlaw\b'],
  'fiat/500e': [r'\b500e\s+2013\b'], 'land-rover/range-rover-velar': [r'\bland\s+rover\s+range\s+rover\s+2022\b'],
  'mercedes/c43-amg': [r'\bamg\s+gt2\b'], 'mercedes/eqa': [r'\beqs\s+580\b'], 'mercedes/eqe-suv': [r'\beqs[_ -]?suv\b'],
  'mini/countryman': [r'\bvuitton\b'], 'opel/corsa': [r'\b1995\b'], 'seat/leon': [r'\be-racer\b'],
  'volkswagen/id4': [r'\bid[ .-]?3\b'], 'volkswagen/taigo': [r'\bvirtus\b']}
ALLOWED = {'e4087350c4d84d8391de09b405c96488'}

def rows(path):
    d = json.load(open(path))
    return d[0]['results'] if isinstance(d, list) and d and 'results' in d[0] else d

ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()
def get(u):
    # Sketchfab rate-limits bursts; retry, and only a 404 means the model is really gone.
    import time
    for attempt in range(5):
        try: return json.load(urllib.request.urlopen(u, context=ctx, timeout=30))
        except urllib.error.HTTPError as e:
            if e.code == 404: return {'_err': '404', '_gone': True}
        except Exception: pass
        time.sleep(2 * (attempt + 1))
    return {'_err': 'unreachable'}

def shown(k, es):
    es = [e for e in es if e['sketchfab_uid'] in ALLOWED or not (
        any(re.search(p, e['sketchfab_name'], re.I) for p in UNSUITABLE) or
        any(re.search(p, e['sketchfab_name'], re.I) for p in MISASSIGNED.get(k, [])))]
    if not es: return None
    oe = [e for e in es if e['year_to'] is None]
    return oe[0] if oe else max(es, key=lambda e: e['year_from'] or -1e9)

def info(uid):
    a = get(f'https://api.sketchfab.com/v3/models/{uid}')
    b = get(f'https://sketchfab.com/i/models/{uid}')
    mb = round(max([f.get('modelSize', 0) for f in b.get('files') or []] or [0]) / 1e6, 1)
    return dict(faces=a.get('faceCount'), tex=a.get('textureCount'), mb=mb, broken=bool(a.get('_gone')), unchecked=a.get('_err') == 'unreachable')

models, counts, out = sys.argv[1], sys.argv[2], sys.argv[3]
n = {r['k']: r['n'] or 0 for r in rows(counts)}
g = collections.defaultdict(list)
for r in rows(models): g[f"{r['make_slug']}/{r['model_slug']}"].append(r)
picks = {k: shown(k, es) for k, es in g.items()}
with cf.ThreadPoolExecutor(4) as ex:
    infos = dict(zip(picks, ex.map(lambda m: info(m['sketchfab_uid']) if m else None, picks.values())))
rev = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reviewed.json')))
issues = []
for k, m in picks.items():
    i = infos[k]
    if m is None: kind = 'missing'
    elif i['broken']: kind = 'broken'
    elif i['unchecked']: continue  # Sketchfab didn't answer; check again next run
    elif (i['faces'] or 0) < 30000 or (i['tex'] == 0 and (i['faces'] or 0) < 80000): kind = 'crude'
    elif i['mb'] > 20: kind = 'heavy'
    else: continue
    if (m and m['sketchfab_uid'] in rev['uids']) or (kind == 'missing' and k in rev['missing_ok']): continue
    issues.append(dict(car=k, kind=kind, on_road=n.get(k, 0), uid=m and m['sketchfab_uid'], name=m and m['sketchfab_name'], **(i or {})))
for k, c in n.items():
    if k not in g and c > 5000 and k not in rev['missing_ok']: issues.append(dict(car=k, kind='missing', on_road=c))
issues.sort(key=lambda x: -x['on_road'])
json.dump(issues, open(out, 'w'), indent=1)
for x in issues: print(f"{x['on_road']:>7} {x['kind']:<8} {x['car']:<30} {x.get('name') or ''} {x.get('faces') or ''} {x.get('mb') or ''}")
