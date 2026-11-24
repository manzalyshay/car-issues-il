#!/usr/bin/env python3
"""Build SQL that loads the motorcycle AI summaries into expert_reviews.

  python3 -I scripts/moto/load_summaries.py MCN_JSON OUT.sql

MCN_JSON is the mcn.json written by scripts/moto/mcn.py. Text comes from scripts/moto/summaries.json;
owner/expert ratings, review counts and source links are computed from MCN_JSON. One general row
(year NULL) per model under make key 'moto-<make>'. Re-running replaces those rows.
"""
import json, os, re, sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
AREAS_HE = {
    'Ride quality & brakes': 'נוחות ובלמים', 'Engine': 'מנוע', 'Reliability & build quality': 'אמינות ואיכות בנייה',
    'Value vs rivals': 'תמורה למחיר', 'Equipment': 'ציוד',
}
OTHER = re.compile(r'transalp|nx ?500|africa|forza|x-?adv|nc ?750|tracer|xsr|niken|cb ?650|cbr|duke|super duke|gs ?adv|r ?1200 ?rt|ninja|versys|tenere|mt-?\d', re.I)


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def keep(review, model_en):
    """Drop reviews MCN filed under the wrong bike (their version/headline names another model)."""
    own = re.sub(r'[^a-z0-9]', '', model_en.lower())
    v = (review['version'] or '') + ' ' + review['headline']
    m = OTHER.search(v)
    return not (m and re.sub(r'[^a-z0-9]', '', m.group(0).lower()) not in own and own not in re.sub(r'[^a-z0-9]', '', v.lower()))


def main():
    mcn = json.load(open(sys.argv[1]))
    texts = json.load(open(os.path.join(HERE, 'summaries.json')))
    names = {f"{m['make']}/{m['slug']}": m['en'] for m in json.load(open(os.path.join(HERE, 'models.json')))['models']}
    keys = [k for k in texts if not k.startswith('_')]
    lines = ["DELETE FROM expert_reviews WHERE make_slug LIKE 'moto-%' AND year IS NULL;"]
    for key in keys:
        pages = mcn[key]
        reviews = [r for p in pages for r in p['reviews'] if keep(r, names[key])]
        rated = [r['rating'] for r in reviews if r['rating']]
        owner = round(sum(rated) / len(rated), 2) if rated else None
        areas = {}
        for r in reviews:
            for a, (sc, _) in r['details'].items():
                if sc and a in AREAS_HE:
                    areas.setdefault(a, []).append(sc)
        experts = [p['expert_rating'] for p in pages if p.get('expert_rating')]
        expert = round(sum(experts) / len(experts), 2) if experts else None
        t = texts[key]
        data = {
            'kind': 'moto-mcn', 'ownerRating': owner, 'ownerCount': len(reviews), 'expertRating': expert,
            'areas': [{'label': AREAS_HE[a], 'score': round(sum(v) / len(v), 1)} for a, v in areas.items()],
            'tests': [{'title': p['title'], 'rating': p.get('expert_rating')} for p in pages],
            'generatedAt': date.today().isoformat(),
        }
        sources = [{'name': f"MCN - {p['title']}", 'url': p['url']} for p in pages]
        mk, mo = key.split('/')
        score = round(owner * 2, 1) if owner else (round(expert * 2, 1) if expert else None)
        lines.append(
            'INSERT INTO expert_reviews (id, make_slug, model_slug, year, source_name, source_url, summary_he, '
            'global_score, top_score, pros, cons, global_post_count, sources_list, model_data_json) VALUES '
            f"(lower(hex(randomblob(16))), {q('moto-' + mk)}, {q(mo)}, NULL, 'MCN (Motorcycle News)', {q(pages[0]['url'])}, "
            f"{q(t['summary'])}, {q(score)}, {q(score)}, {q(json.dumps(t['pros'], ensure_ascii=False))}, "
            f"{q(json.dumps(t['cons'], ensure_ascii=False))}, {len(reviews)}, "
            f"{q(json.dumps(sources, ensure_ascii=False, separators=(',', ':')))}, {q(json.dumps(data, ensure_ascii=False, separators=(',', ':')))});")
    open(sys.argv[2], 'w').write('\n'.join(lines) + '\n')
    print(f'{len(keys)} summaries -> {sys.argv[2]}')


if __name__ == '__main__':
    main()
