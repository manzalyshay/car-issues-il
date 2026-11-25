#!/usr/bin/env python3
"""Build SQL that loads scripts/moto/models.json (+ fleet counts) into moto_makes / moto_models.

  python3 -I scripts/moto/seed.py COUNTS_JSON OUT.sql

COUNTS_JSON is the counts.json written by scripts/moto/fleet.py. The SQL replaces both
tables' rows (DELETE + INSERT), so re-running after editing models.json is safe.
Rollback: DELETE FROM moto_models; DELETE FROM moto_makes;
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = {
    'honda': 'https://cdn.simpleicons.org/honda',
    'yamaha': 'https://cdn.simpleicons.org/yamahamotorcorporation',
    'bmw': 'https://cdn.simpleicons.org/bmw',
    'suzuki': 'https://cdn.simpleicons.org/suzuki',
    'ktm': 'https://cdn.simpleicons.org/ktm',
    'piaggio': 'https://cdn.simpleicons.org/piaggiogroup',
    'vespa': 'https://cdn.simpleicons.org/vespa',
}


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    counts = json.load(open(sys.argv[1]))
    spec = json.load(open(os.path.join(HERE, 'models.json')))
    as_of = datetime.date.today().isoformat()
    # Brands ordered by bikes on the road, models by count within the brand
    per_make = {}
    for mo in spec['models']:
        per_make[mo['make']] = per_make.get(mo['make'], 0) + counts[f"{mo['make']}/{mo['slug']}"]['count']
    make_rows = [
        f"({q(m['slug'])}, {q(m['he'])}, {q(m['en'])}, {q(m['country'])}, {q(LOGOS.get(m['slug'], ''))}, "
        f"{q(json.dumps(m.get('recallMakes', [])))}, {i})"
        for i, m in enumerate(sorted(spec['makes'], key=lambda m: -per_make.get(m['slug'], 0)))]
    models = sorted(spec['models'], key=lambda mo: -counts[f"{mo['make']}/{mo['slug']}"]['count'])
    model_rows = []
    for i, mo in enumerate(models):
        c = counts[f"{mo['make']}/{mo['slug']}"]
        cc = c.get('cc') if mo['category'] != 'electric' and c.get('cc') else [None, None]
        model_rows.append(
            f"({q(mo['make'])}, {q(mo['slug'])}, {q(mo['he'])}, {q(mo['en'])}, {q(mo['category'])}, "
            f"{q(json.dumps(c['years'], separators=(',', ':')))}, {q(json.dumps(mo.get('trims', [])))}, {q(cc[0])}, {q(cc[1])}, "
            f"{q(json.dumps(mo.get('recall', [])))}, {q(c['count'])}, {q(as_of)}, {i})")
    sql = ('DELETE FROM moto_models;\nDELETE FROM moto_makes;\n'
           'INSERT INTO moto_makes (slug, name_he, name_en, country, logo_url, recall_makes, sort_order) VALUES\n'
           + ',\n'.join(make_rows) + ';\n'
           'INSERT INTO moto_models (make_slug, slug, name_he, name_en, category, years, trims, cc_min, cc_max, '
           'recall_patterns, active_vehicles_il, active_vehicles_il_as_of, sort_order) VALUES\n'
           + ',\n'.join(model_rows) + ';\n')
    open(sys.argv[2], 'w').write(sql)
    print(f'{len(spec["makes"])} makes, {len(models)} models -> {sys.argv[2]}')


if __name__ == '__main__':
    main()
