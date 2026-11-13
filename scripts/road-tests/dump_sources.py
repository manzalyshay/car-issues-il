import json,sys,os
sys.path.insert(0,'scripts/il-fleet')
import fleet
rows=fleet.d1("""SELECT p.make_slug, p.model_slug, p.score_key, p.set_index, p.years, p.sources
FROM pro_review_scores p
WHERE (p.hidden IS NULL OR p.hidden != 1)
  AND NOT EXISTS (SELECT 1 FROM model_synthesis s WHERE s.make_slug=p.make_slug AND s.model_slug=p.model_slug)
ORDER BY p.make_slug, p.model_slug, p.set_index""")
out=[]
for r in rows:
    try: src=json.loads(r['sources'] or '[]')
    except Exception: src=[]
    for s in src:
        if s.get('url'): out.append([r['make_slug']+'/'+r['model_slug'], r['score_key'], r['set_index'], s.get('site') or '', s['url']])
json.dump(out,open(sys.argv[1],'w'),indent=0)
from collections import Counter
print('sets',len(rows),'models',len({(r['make_slug'],r['model_slug']) for r in rows}),'articles',len(out))
print(Counter(o[3] for o in out).most_common(30))
