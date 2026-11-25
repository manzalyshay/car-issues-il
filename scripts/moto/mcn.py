#!/usr/bin/env python3
"""Collect MCN (motorcyclenews.com) expert verdicts and owners' reviews per motorcycle model.

  python3 -I scripts/moto/mcn.py OUT_DIR

Reads the review pages listed in MCN_PAGES, writes OUT_DIR/mcn.json:
{"make/model": [{url, title, expert_rating, verdict, highlights, owners: {count, ratings{}, service_cost},
                 reviews: [{rating, headline, date, version, year, text, details{area: [rating, text]}}]}]}
These are the source material for the Hebrew summaries (scripts/moto/summaries.json).
"""
import html, json, os, re, sys, time, urllib.request

MCN_PAGES = {
    'honda/forza-300': ['honda/nss300-forza/2018'],
    'honda/forza-750': ['honda/nss750-forza/2021', 'honda/nss750-forza/2025'],
    'honda/x-adv': ['honda/x-adv/2017', 'honda/x-adv/2021', 'honda/x-adv/2025'],
    'honda/pcx-125': ['honda/pcx125/2021'],
    'honda/nc750x': ['honda/nc750x/2014', 'honda/nc750x/2021', 'honda/nc750x/2025'],
    'honda/cb500x': ['honda/cb500x/2013', 'honda/cb500x/2019', 'honda/cb500x/2022'],
    'honda/nx500': ['honda/nx500/2024'],
    'honda/africa-twin': ['honda/crf1000l-africa-twin/2018', 'honda/crf1100l-africa-twin/2020',
                          'honda/crf1100l-africa-twin-adventure-sports/2020', 'honda/crf1100l-africa-twin-es/2024'],
    'honda/transalp-750': ['honda/xl750-transalp/2023'],
    'honda/hornet-750': ['honda/cb750-hornet/2023'],
    'honda/cb650r': ['honda/cb650r/2019'],
    'honda/cbr650r': ['honda/cbr650r/2019'],
    'honda/crf300l': ['honda/crf300l/2021'],
    'yamaha/tmax': ['yamaha/tmax-500/2012', 'yamaha/tmax-560/2020'],
    'yamaha/xmax-300': ['yamaha/xmax-300/2017'],
    'yamaha/xmax-400': ['yamaha/xmax-400/2018'],
    'yamaha/nmax-125': ['yamaha/nmax-125/2015', 'yamaha/nmax-125/2021'],
    'yamaha/tricity-300': ['yamaha/tricity-300/2020'],
    'yamaha/tenere-700': ['yamaha/tenere-700/2019', 'yamaha/tenere-700/2025'],
    'yamaha/mt-07': ['yamaha/mt-07/2014', 'yamaha/mt-07/2018'],
    'yamaha/mt-09': ['yamaha/mt-09/2014'],
    'kymco/ak-550': ['kymco/ak-550/2018'],
    'kymco/x-town': ['kymco/x-town-300/2017'],
    'kymco/downtown': ['kymco/downtown-300/2010'],
    'ktm/exc': ['ktm/exc450/2010', 'ktm/excf350/2011'],
    'ktm/390-adventure': ['ktm/390-adventure/2020'],
    'ktm/390-duke': ['ktm/390-duke/2017', 'ktm/390-duke/2024'],
    'ktm/890-adventure': ['ktm/890-adventure/2021'],
    'ktm/1290-super-adventure': ['ktm/1290-super-adventure-s/2017', 'ktm/1290-super-adventure-s/2021'],
    'piaggio/mp3': ['piaggio/mp3-300/2022', 'piaggio/mp3-530/2022', 'piaggio/mp3-400/2009', 'piaggio/mp3-lt-300/2011'],
    'piaggio/beverly': ['piaggio/beverly-300/2011'],
    'vespa/gts': ['piaggio/vespa-gts300/2009', 'piaggio/vespa-gts300/2022'],
    'bmw/r-1250-gs': ['bmw/r1250gs/2019', 'bmw/r1250gs-adventure/2019'],
    'bmw/r-1300-gs': ['bmw/r1300gs/2024', 'bmw/r1300gs-adventure/2024'],
    'bmw/r-1200-gs': ['bmw/r1200gs/2013', 'bmw/r1200gs/2017', 'bmw/r1200gs-adventure/2014', 'bmw/r1200gs-adventure/2018'],
    'bmw/f-850-gs': ['bmw/f850gs/2018', 'bmw/f850gs-adventure/2019'],
    'bmw/f-750-gs': ['bmw/f750gs/2018'],
    'bmw/c-400': ['bmw/c400gt/2019', 'bmw/c400x/2018'],
    'kawasaki/z900': ['kawasaki/z900/2017', 'kawasaki/z900/2020', 'kawasaki/z900/2025'],
    'kawasaki/z650': ['kawasaki/z650/2017', 'kawasaki/z650/2020'],
    'kawasaki/ninja-650': ['kawasaki/ninja-650/2017', 'kawasaki/ninja-650/2020'],
    'kawasaki/versys-650': ['kawasaki/versys-650/2010', 'kawasaki/versys-650/2015', 'kawasaki/versys-650/2022'],
    'kawasaki/versys-1000': ['kawasaki/versys-1000/2019', 'kawasaki/versys-1000/2021'],
    'kawasaki/vulcan-s': ['kawasaki/vulcan-s/2015'],
    'suzuki/v-strom-650': ['suzuki/dl650-v-strom/2011', 'suzuki/dl650-v-strom-xt/2017'],
    'suzuki/v-strom-250': ['suzuki/dl250-v-strom/2017'],
    'suzuki/burgman-400': ['suzuki/burgman-400/2017', 'suzuki/burgman-400/2022'],
    'benelli/trk-502': ['benelli/trk-502/2017'],
}
BASE = 'https://www.motorcyclenews.com/bike-reviews/'


def text(s):
    s = re.sub(r'<br\s*/?>', '\n', s)
    return re.sub(r'[ \t]+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def rating(s):
    m = re.search(r'([\d.]+) out of 5', s)
    return float(m.group(1)) if m else None


def section(page, start, end):
    i = page.find(start)
    if i < 0:
        return ''
    j = page.find(end, i + len(start))
    return page[i:j if j > 0 else i + 20000]


def parse(page, url):
    title = text(re.search(r'<title>(.*?)</title>', page, re.S).group(1)) if '<title>' in page else ''
    out = {'url': url, 'title': title.split('|')[0].strip()}
    ov = section(page, 'Overall rating', '</section>')
    out['expert_rating'] = rating(ov)
    paras = [text(p) for p in re.findall(r'<p[^>]*>(.*?)</p>', ov, re.S)]
    out['verdict'] = ' '.join(p for p in paras if len(p) > 40)[:1200]
    hl = section(page, 'Highlights', '</ul>')
    out['highlights'] = [text(li) for li in re.findall(r'<li[^>]*>(.*?)</li>', hl, re.S)][:6]
    summ = section(page, 'review__owners-reviews-summary"', '</table>')
    m = re.search(r'(\d+)\s*owners?', text(section(page, 'review__owners-reviews-summary__intro', '</div>')))
    ratings = {}
    for lab, val in re.findall(r'__item__label">(.*?)</th>\s*<td[^>]*>(.*?)</td>', summ, re.S):
        lab = text(lab).rstrip(':')
        ratings[lab] = rating(val) if 'out of 5' in val else text(val)
    out['owners'] = {'count': int(m.group(1)) if m else 0, 'ratings': ratings}
    reviews = []
    for block in page.split('<div class="review__owners-review">')[1:]:
        block = block.split('<div class="review__owners-review">')[0]
        info = dict((text(k).rstrip(':'), text(v)) for k, v in re.findall(r'__info">\s*([^<]+?)<strong>(.*?)</strong>', block, re.S))
        body = ''
        bm = re.search(r'</p>\s*<p>(.*?)</p>\s*<div class="review__owners-review__details-container', block, re.S) \
            or re.search(r'</div>\s*<p>(.*?)</p>\s*<div class="review__owners-review__details-container', block, re.S)
        if bm:
            body = text(bm.group(1))
        details = {}
        for d in re.findall(r'<div class="review__owners-review__detail">(.*?)</div>\s*(?=<div class="review__owners-review__detail"|</div>)', block, re.S):
            t = re.search(r'__detail__title">(.*?)</strong>', d, re.S)
            tx = re.search(r'__detail__text">(.*?)</', d, re.S)
            if t:
                details[text(t.group(1))] = [rating(d), text(tx.group(1)) if tx else '']
        head = re.search(r'__headline">(.*?)</strong>', block, re.S)
        date = re.search(r'published-info">\s*<strong>(.*?)</strong>', block, re.S)
        reviews.append({'rating': rating(block[:600]), 'headline': text(head.group(1)) if head else '',
                        'date': text(date.group(1)) if date else '', 'version': info.get('Version', ''),
                        'year': info.get('Year', ''), 'text': body[:1500], 'details': details})
    out['reviews'] = reviews
    return out


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    result = {}
    for key, pages in MCN_PAGES.items():
        result[key] = []
        for p in pages:
            url = BASE + p + '/'
            try:
                page = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read().decode('utf8', 'ignore')
                result[key].append(parse(page, url))
            except Exception as e:
                print(f'  {url}: {e}', file=sys.stderr)
            time.sleep(1)
        n = sum(len(x['reviews']) for x in result[key])
        print(f'{n:3} owner reviews  {key}', file=sys.stderr)
    json.dump(result, open(os.path.join(out_dir, 'mcn.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
