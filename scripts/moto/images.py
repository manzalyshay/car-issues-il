#!/usr/bin/env python3
"""Find freely licensed Wikimedia Commons photos for each motorcycle model.

  python3 -I scripts/moto/images.py OUT_DIR

Writes OUT_DIR/candidates.json: {"make/model": [{url, thumb, title, author, license, width, height, source_url}]}.
A photo is a candidate only when its file title names the model (spaces/dashes ignored)
and its license is CC / public domain. Candidates are checked by eye before loading
(scripts/moto/load_images.py takes the approved list).
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'CarIssuesIL/1.0 (https://carissues.co.il)'}
PER_MODEL = 8
FREE = re.compile(r'^(CC|Public domain|PD|CC0)', re.I)
SKIP = re.compile(r'logo|badge|icon|emblem|engine|motor\b|dashboard|cockpit|speedo|detail|parts|crash|accident|police|polizia|museum|toy|model kit|lego|drawing|sketch', re.I)

# Search names and the token a file title must contain (normalised: lower case, no spaces/dashes)
OVERRIDES = {
    'honda/x-adv': (['Honda X-ADV'], ['xadv']),
    'honda/transalp-750': (['Honda XL750 Transalp', 'Honda Transalp 750'], ['transalp']),
    'honda/hornet-750': (['Honda CB750 Hornet', 'Honda Hornet 750'], ['hornet']),
    'yamaha/tmax': (['Yamaha TMAX', 'Yamaha T-Max'], ['tmax']),
    'yamaha/tenere-700': (['Yamaha Tenere 700', 'Yamaha Ténéré 700'], ['tenere700', 'ténéré700']),
    'sym/joymax-z': (['SYM Joymax Z'], ['joymaxz']),
    'kymco/movie': (['Kymco Movie'], ['movie']),
    'kymco/dink': (['Kymco Dink', 'Kymco Grand Dink'], ['dink']),
    'ktm/exc': (['KTM EXC', 'KTM 250 EXC', 'KTM 300 EXC'], ['exc']),
    'bmw/c-400': (['BMW C 400 GT', 'BMW C 400 X'], ['c400']),
    'zontes/368': (['Zontes 368'], ['zontes']),
    'sur-ron/ultra-bee': (['Sur-Ron Ultra Bee', 'Surron Ultra Bee'], ['ultrabee']),
    'piaggio/x-evo': (['Piaggio X Evo', 'Piaggio X-Evo'], ['xevo']),
    'vespa/gts': (['Vespa GTS'], ['gts']),
    'vespa/primavera': (['Vespa Primavera'], ['primavera']),
    'vespa/sprint': (['Vespa Sprint'], ['sprint']),
}


def norm(s):
    return re.sub(r'[\s_\-.]+', '', s.lower())


def search(q):
    p = {'action': 'query', 'generator': 'search', 'gsrnamespace': '6', 'gsrsearch': f'{q} filetype:bitmap',
         'gsrlimit': '30', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': '960', 'format': 'json'}
    req = urllib.request.Request(f'{API}?{urllib.parse.urlencode(p)}', headers=UA)
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=60)).get('query', {}).get('pages', {}).values()
        except Exception as e:
            print(f'  retry {q}: {e}', file=sys.stderr)
            time.sleep(60 * (attempt + 1))
    return []


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    spec = json.load(open(os.path.join(HERE, 'models.json')))
    makes = {m['slug']: m for m in spec['makes']}
    path = os.path.join(out, 'candidates.json')
    result = json.load(open(path)) if os.path.exists(path) else {}  # re-runs only fill models with < 3 photos
    for mo in spec['models']:
        key = f"{mo['make']}/{mo['slug']}"
        if len(result.get(key, [])) >= 3:
            continue
        make_en = makes[mo['make']]['en']
        queries, tokens = OVERRIDES.get(key, ([f"{make_en} {mo['en']}"], [norm(mo['en'])]))
        make_token = norm(make_en)
        seen, found = set(), []
        for q in queries:
            for page in search(q):
                info = (page.get('imageinfo') or [{}])[0]
                title = page.get('title', '')
                meta = info.get('extmetadata', {})
                lic = meta.get('LicenseShortName', {}).get('value', '')
                n = norm(title)
                if info.get('url') in seen or not info.get('url'):
                    continue
                if not any(t in n for t in tokens) or (make_token not in n and key not in OVERRIDES):
                    continue
                if SKIP.search(title) or not FREE.match(lic) or (info.get('width') or 0) < 800:
                    continue
                if (info.get('width') or 1) < (info.get('height') or 0):  # portrait shots crop badly in the hero
                    continue
                seen.add(info['url'])
                found.append({
                    'url': info['url'], 'thumb': info.get('thumburl') or info['url'],
                    'title': title.replace('File:', '').rsplit('.', 1)[0].replace('_', ' '),
                    'author': html.unescape(re.sub(r'<[^>]+>', '', meta.get('Artist', {}).get('value', ''))).strip()[:200],
                    'license': lic[:100], 'width': info.get('width'), 'height': info.get('height'),
                    'source_url': info.get('descriptionurl'),
                })
            time.sleep(8)
        result[key] = found[:PER_MODEL]
        print(f'{len(result[key]):2}  {key}', file=sys.stderr)
        json.dump(result, open(path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
