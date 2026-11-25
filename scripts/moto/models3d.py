#!/usr/bin/env python3
"""Find Sketchfab 3D models for each motorcycle model (public search API, no token).

  python3 -I scripts/moto/models3d.py OUT_DIR

Writes OUT_DIR/candidates3d.json: {"make/model": [{uid, name, author, license, faces, thumb, likes}]}.
Only embeddable models whose license allows commercial use (no NC / ND) and whose name names
the model (spaces/dashes ignored) are kept. Candidates are checked by eye before loading.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'CarIssuesIL/1.0 (https://carissues.co.il)', 'Accept': 'application/json'}
BAD = re.compile(r'low[ -]?poly|\bhelmet\b|\bengine\b|\bwheel\b|\bpart\b|\btoy\b|\blego\b|\bkeychain\b|\bminiature\b', re.I)
TOKENS = {
    'honda/x-adv': ['xadv'], 'yamaha/tmax': ['tmax'], 'yamaha/tenere-700': ['tenere700', 'tenere', 't7'],
    'sym/joymax-z': ['joymaxz'], 'ktm/exc': ['exc'], 'bmw/c-400': ['c400'], 'sur-ron/ultra-bee': ['ultrabee'],
    'honda/transalp-750': ['transalp'], 'honda/hornet-750': ['hornet'], 'piaggio/x-evo': ['xevo'],
    'vespa/gts': ['gts'], 'vespa/primavera': ['primavera'], 'vespa/sprint': ['sprint'], 'zontes/368': ['368'],
    'honda/africa-twin': ['africatwin', 'crf1100', 'crf1000'],
}
MAKE_ALIASES = {'sur-ron': ['surron', 'sur-ron'], 'bmw': ['bmw'], 'royal-enfield': ['royalenfield'], 'cfmoto': ['cfmoto', 'cf moto']}


def norm(s):
    return re.sub(r'[\s_\-.]+', '', s.lower().replace('é', 'e'))


def search(q):
    url = 'https://api.sketchfab.com/v3/search?' + urllib.parse.urlencode({'type': 'models', 'q': q, 'count': 24, 'sort_by': '-likeCount'})
    for attempt in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60)).get('results', [])
        except Exception as e:
            print(f'  retry {q}: {e}', file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    return []


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    spec = json.load(open(os.path.join(HERE, 'models.json')))
    makes = {m['slug']: m for m in spec['makes']}
    result = {}
    for mo in spec['models']:
        key = f"{mo['make']}/{mo['slug']}"
        make_en = makes[mo['make']]['en']
        tokens = TOKENS.get(key, [norm(mo['en'])])
        make_tokens = [norm(a) for a in MAKE_ALIASES.get(mo['make'], [make_en])]
        found, seen = [], set()
        for q in [f'{make_en} {mo["en"]}', mo['en'] if len(mo['en']) > 4 else f'{make_en} {mo["en"]} motorcycle']:
            for r in search(q):
                n = norm(r.get('name', ''))
                lic = (r.get('license') or {}).get('label', '') if isinstance(r.get('license'), dict) else str(r.get('license') or '')
                if r['uid'] in seen or not any(t in n for t in tokens):
                    continue
                if not any(m in n for m in make_tokens) and key not in TOKENS:
                    continue
                if 'NonCommercial' in lic or 'NoDerivs' in lic or 'NoDerivatives' in lic:
                    continue
                if BAD.search(r.get('name', '')) or r.get('isAgeRestricted'):
                    continue
                seen.add(r['uid'])
                thumbs = sorted((r.get('thumbnails') or {}).get('images', []), key=lambda i: abs((i.get('width') or 0) - 640))
                found.append({'uid': r['uid'], 'name': r['name'], 'author': (r.get('user') or {}).get('displayName', ''),
                              'license': lic, 'faces': r.get('faceCount'), 'likes': r.get('likeCount'),
                              'thumb': thumbs[0]['url'] if thumbs else None})
            time.sleep(1.5)
        result[key] = found[:4]
        print(f'{len(result[key])}  {key}  {[f["name"][:40] for f in result[key][:2]]}', file=sys.stderr)
    json.dump(result, open(os.path.join(out, 'candidates3d.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
