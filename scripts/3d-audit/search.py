import json,sys,re,ssl,urllib.request,urllib.parse
ctx=ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if __import__('os').path.exists('/root/.ccr/ca-bundle.crt') else ssl.create_default_context()
def get(u): return json.load(urllib.request.urlopen(u,context=ctx,timeout=30))
pat=re.compile(sys.argv[1],re.I); seen=set()
for q in sys.argv[2:]:
  for x in get('https://api.sketchfab.com/v3/search?'+urllib.parse.urlencode({'type':'models','q':q,'count':24})).get('results',[]):
    if x['uid'] in seen or not pat.search(x['name']): continue
    seen.add(x['uid'])
    if (x.get('faceCount') or 0)<50000: continue
    try: mb=round(max([f.get('modelSize',0) for f in get(f"https://sketchfab.com/i/models/{x['uid']}").get('files') or []] or [0])/1e6,1)
    except Exception: mb='?'
    print(x['uid'],x['faceCount'],mb,'MB',x['likeCount'],'likes',x['user']['username'],'|',x['name'],'|',(x.get('license') or {}).get('label'))
