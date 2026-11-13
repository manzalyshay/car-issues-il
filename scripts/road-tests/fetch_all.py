import json,sys,os,ssl,urllib.request,concurrent.futures as cf,hashlib
src=json.load(open(sys.argv[1])); outd=sys.argv[2]
ctx=ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
def get(u):
    f=os.path.join(outd,hashlib.md5(u.encode()).hexdigest()+'.html')
    if os.path.exists(f) and os.path.getsize(f)>5000: return u,'cached'
    try:
        req=urllib.request.Request(u,headers={'User-Agent':UA,'Accept-Language':'en-GB,en;q=0.9'})
        b=urllib.request.urlopen(req,context=ctx,timeout=30).read()
        open(f,'wb').write(b); return u,'ok %d'%len(b)
    except Exception as e: return u,'ERR '+str(e)[:60]
urls=sorted({s[4] for s in src if 'icar.co.il' not in s[4]})
res=[]
with cf.ThreadPoolExecutor(8) as ex:
    for u,st in ex.map(get,urls): res.append((u,st))
from collections import Counter
print(len(urls),'urls', Counter(st.split()[0] for u,st in res))
for u,st in res:
    if st.startswith('ERR'): print(st,u)
