"""SQL that loads the motorcycles' US (NHTSA) recalls into recalls_cache.

Input: the output of nhtsa.py and a Hebrew file {campaign id: [component, summary,
consequence, remedy]}. Campaigns missing from the Hebrew file are skipped (used for ones
that never reached owners and for aftermarket parts). Each campaign is linked to its
bikes in recalls_cache_models under the make key 'moto-<make>', which is how the
motorcycle pages find them (getRecallsFromCache).
Usage: python3 scripts/moto/load_nhtsa.py NHTSA_JSON HEBREW_JSON > out.sql
"""
import json, re, sys

data = json.load(open(sys.argv[1]))
he = json.load(open(sys.argv[2]))

def q(s):
    return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"

def date(raw):
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', (raw or '').strip())
    return f'{m[1].zfill(2)}/{m[2].zfill(2)}/{m[3]}' if m else (raw or '')

def title(component):
    last = (component or '').split(':')[-1].strip()
    return re.sub(r'\b\w+', lambda w: w[0].capitalize(), last.lower())

bikes = {}
for bike, ids in data['links'].items():
    for cid in ids:
        bikes.setdefault(cid, []).append(bike)

for cid, c in data['campaigns'].items():
    if cid not in he:
        continue
    comp_he, sum_he, con_he, rem_he = he[cid]
    make, model = bikes[cid][0].split('/')
    print('INSERT INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he, '
          'component_en, summary_en, consequence_en, remedy_en, manufacturer, recall_year) VALUES ('
          + ', '.join(q(v) for v in [cid, 'moto-' + make, model, date(c['date']), comp_he, sum_he, con_he, rem_he,
                                    title(c['component']), c['summary'], c['consequence'], c['remedy'],
                                    c['manufacturer']]) + f", {min(c['years'])}) ON CONFLICT(id) DO NOTHING;")
    for bike in bikes[cid]:
        mk, mo = bike.split('/')
        print(f"INSERT OR IGNORE INTO recalls_cache_models (id, make, model) VALUES ({q(cid)}, {q('moto-' + mk)}, {q(mo)});")
