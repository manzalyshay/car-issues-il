import json,sys,io,ssl,urllib.request
from PIL import Image,ImageDraw,ImageFont
ctx=ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if __import__('os').path.exists('/root/.ccr/ca-bundle.crt') else ssl.create_default_context()
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15); FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',17)
def get(u): return urllib.request.urlopen(u,context=ctx,timeout=30).read()
out=sys.argv[1]; uids=sys.argv[2:]
W,H=400,225; cols=min(3,len(uids)); rows=(len(uids)+cols-1)//cols
can=Image.new('RGB',(cols*W,rows*(H+70)),(255,255,255)); d=ImageDraw.Draw(can)
for k,u in enumerate(uids):
    a=json.loads(get(f'https://api.sketchfab.com/v3/models/{u}')); b=json.loads(get(f'https://sketchfab.com/i/models/{u}'))
    mb=round(max([f.get('modelSize',0) for f in b.get('files') or []] or [0])/1e6,1)
    ims=[x for x in a['thumbnails']['images'] if x['width']<=640]; im=Image.open(io.BytesIO(get(max(ims,key=lambda x:x['width'])['url']))).convert('RGB')
    X,Y=(k%cols)*W,(k//cols)*(H+70); can.paste(im.resize((W-10,H-10)),(X+5,Y+5))
    lab=f'OPTION {chr(65+k)}' if __import__('os').environ.get('NOCUR') else ('CURRENT' if k==0 else f'OPTION {chr(64+k)}')
    d.text((X+8,Y+H),f"{lab}  {a['name'][:32]}",fill=(200,0,0) if k==0 else (0,0,0),font=FB)
    d.text((X+8,Y+H+24),f"{a['faceCount']} faces · {mb} MB · {a['license']['label'] if a.get('license') else '?'}"[:52],fill=(80,80,80),font=F)
    print(lab,u,a['name'],a['user']['username'],mb,a['license']['label'] if a.get('license') else None)
can.save(out)
