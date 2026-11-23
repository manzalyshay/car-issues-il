"""
Contact sheet of 3D model previews for a visual check (missing wheels, wrong car, unfinished).
Usage: python3 -I scripts/3d-audit/sheet.py out.png issues.json [kind] [start] [count]
Draws `count` (default 24) entries of issues.json from `start`, optionally only one kind
(e.g. unseen), 4 per row, each labelled with its index, car, years, faces, textures and MB.
"""
import json, sys, io, os, ssl, urllib.request
from PIL import Image, ImageDraw, ImageFont
ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
def get(u): return urllib.request.urlopen(u, context=ctx, timeout=30).read()
out, src = sys.argv[1], sys.argv[2]
kind = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
count = int(sys.argv[5]) if len(sys.argv) > 5 else 24
items = [(i, x) for i, x in enumerate(json.load(open(src))) if x.get('uid') and (kind is None or x['kind'] == kind)][start:start + count]
W, H, COLS = 320, 180, 4
rows = (len(items) + COLS - 1) // COLS
can = Image.new('RGB', (COLS * W, rows * (H + 42)), (255, 255, 255)); d = ImageDraw.Draw(can)
for k, (idx, x) in enumerate(items):
    X, Y = (k % COLS) * W, (k // COLS) * (H + 42)
    try:
        a = json.loads(get(f"https://api.sketchfab.com/v3/models/{x['uid']}"))
        ims = [t for t in a['thumbnails']['images'] if t['width'] <= 640]
        im = Image.open(io.BytesIO(get(max(ims, key=lambda t: t['width'])['url']))).convert('RGB')
        can.paste(im.resize((W - 6, H - 6)), (X + 3, Y + 3))
    except Exception as e:
        d.text((X + 8, Y + 80), f'no preview: {e}'[:40], fill=(200, 0, 0), font=F)
    d.text((X + 6, Y + H), f"#{idx} {x['car']} {x.get('years', '')}"[:38], fill=(0, 0, 0), font=FB)
    d.text((X + 6, Y + H + 19), f"{x['kind']} {x.get('page', '')} · {x.get('faces')} f · {x.get('tex')} tex · {x.get('mb')} MB"[:44], fill=(90, 90, 90), font=F)
can.save(out)
print(f'{len(items)} drawn')
