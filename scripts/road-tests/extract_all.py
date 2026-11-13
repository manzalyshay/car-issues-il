import json,sys,os,re,html,hashlib
src=json.load(open(sys.argv[1])); hd=sys.argv[2]
MARK=re.compile(r"^(cons|against|lows|the bad|bad stuff|what'?s not so good|what we don'?t like|we don'?t like|weaknesses|minus|not so good|dislikes|negatives)\s*:?$",re.I)
STOP=re.compile(r"^(pros|for|highs|the good|good stuff|what'?s good|verdict|rating|share|related|advertisement|read more|overview|price|our verdict|model tested|rivals|find out more|is it any good|most popular|get offers|automatic|manual|specs|by |written by|reviewed by)\b",re.I)
SKIP=re.compile(r"(pric|expensive|cost|£|\$|€|value|afford|pricey|options (can|quickly)|list of options|"
 r"\blooks?\b|styling|design|divisive|polaris|ugly|handsome|"
 r"only one|just one|no (manual|diesel|hybrid|electric|plug-in|pure|estate|four-wheel|4wd|awd|seven|7|hot|petrol|longer|gearbox)|petrol only|diesel only|"
 r"discontinued|retired|line-?up|not available|not offered|exists|carried over|replaced|successor|"
 r"badge|name|brand|dealer|warrant|resale|depreciat|insurance|tax\b|BIK|company car)",re.I)
def text_lines(p):
    h=open(p,encoding='utf8',errors='ignore').read()
    h=re.sub(r'(?is)<(script|style|noscript|svg)\b.*?</\1>',' ',h)
    h=re.sub(r'(?i)<(br|/p|/li|/div|/h\d|/dt|/dd|/span|/tr|/td)[^>]*>','\n',h)
    t=html.unescape(re.sub(r'<[^>]+>','',h))
    return [x for x in (re.sub(r'\s+',' ',l).strip() for l in t.split('\n')) if x]
def items_after(lines,j):
    got=[]
    for y in lines[j+1:j+9]:
        if STOP.match(y) or MARK.match(y): break
        if len(y)>130 or (len(y)>70 and re.search(r'\.\s+[A-Z]',y)): break
        if len(y)<6: continue
        got.append(y)
    return got
def split_line(y):
    # Top Gear / Car and Driver style: one line, comma separated
    parts=[p.strip(' .;') for p in re.split(r',\s+(?=[a-z])|;\s*',y)] if (',' in y or ';' in y) else [y.strip(' .')]
    return [p[0].upper()+p[1:] for p in parts if len(p)>=6]
res={}
for model,key,si,site,url in src:
    if 'icar.co.il' in url: continue
    p=os.path.join(hd,hashlib.md5(url.encode()).hexdigest()+'.html')
    if not os.path.exists(p): continue
    L=text_lines(p); found=[]
    for j,x in enumerate(L):
        if MARK.match(x):
            g=items_after(L,j)
            if g: found=g; break
    pts=[]
    for y in found:
        for q in split_line(y):
            if not SKIP.search(q) and q not in pts: pts.append(q)
    if pts: res.setdefault(f'{model}|{key}|{si}',[]).extend([site,url,q] for q in pts)
# per set: max 5, round-robin across sources
out={}
for k,v in res.items():
    by={}
    for site,url,q in v: by.setdefault(url,[]).append((site,url,q))
    lists=list(by.values()); pick=[]; seen=set()
    while len(pick)<5 and any(lists):
        for l in lists:
            if l and len(pick)<5:
                s=l.pop(0); low=s[2].lower()
                if low not in seen: seen.add(low); pick.append(s)
    out[k]=pick
json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False,indent=0)
models={k.split('|')[0] for k in out}
allm={s[0] for s in src}
print('sets with findings',len(out),'models',len(models),'of',len(allm),'findings',sum(len(v) for v in out.values()))
open(sys.argv[4],'w').write('\n'.join(sorted(allm-models)))
