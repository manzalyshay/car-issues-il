"""US (NHTSA) recalls for the motorcycles, written to OUT (default nhtsa_recalls.json).

For each bike in nhtsa_map.json, asks NHTSA's recallsByVehicle for every US name of
the bike and every model year the site covers. Output: {"campaigns": {id: {...}},
"links": {"make/model": [ids]}}. Hebrew text is added separately and loaded into
recalls_cache by load_nhtsa.py.
Usage: python3 scripts/moto/nhtsa.py YEARS_JSON [OUT]
  YEARS_JSON: {"make/model": [years]} (SELECT make_slug||'/'||slug, years FROM moto_models)
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request, concurrent.futures as cf

here = os.path.dirname(__file__)
names = {k: v for k, v in json.load(open(os.path.join(here, 'nhtsa_map.json'))).items() if not k.startswith('_')}
years = json.load(open(sys.argv[1]))
out_path = sys.argv[2] if len(sys.argv) > 2 else 'nhtsa_recalls.json'

def fetch(make, model, year):
    u = ('https://api.nhtsa.gov/recalls/recallsByVehicle?make=' + urllib.parse.quote(make)
         + '&model=' + urllib.parse.quote(model) + f'&modelYear={year}')
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(u, timeout=30)).get('results') or []
        except urllib.error.HTTPError as e:
            if e.code == 400:  # NHTSA's answer when it has no recalls for that bike and year
                return []
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    print('FAILED', make, model, year, file=sys.stderr)
    return []

jobs = [(bike, *n.split('|'), y) for bike, ns in names.items() for n in ns for y in years[bike]]
campaigns, links = {}, {}
with cf.ThreadPoolExecutor(8) as ex:
    for (bike, make, model, y), rows in zip(jobs, ex.map(lambda j: fetch(*j[1:]), jobs)):
        for r in rows:
            cid = r.get('NHTSACampaignNumber')
            if not cid:
                continue
            c = campaigns.setdefault(cid, {
                'id': cid, 'date': r.get('ReportReceivedDate', ''), 'component': r.get('Component', ''),
                'summary': r.get('Summary', ''), 'consequence': r.get('Consequence', ''),
                'remedy': r.get('Remedy', ''), 'manufacturer': r.get('Manufacturer', ''), 'years': []})
            if y not in c['years']:
                c['years'].append(y)
            if cid not in links.setdefault(bike, []):
                links[bike].append(cid)
json.dump({'campaigns': campaigns, 'links': links}, open(out_path, 'w'), ensure_ascii=False, indent=1)
print(len(campaigns), 'campaigns;', {k: len(v) for k, v in sorted(links.items())})
