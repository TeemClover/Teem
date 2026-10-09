#!/usr/bin/env python3
"""Replace public Somchai artwork with compressed 01–100 v002 release."""
import argparse,hashlib,json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageOps
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--site',type=Path,default=Path(__file__).parent);a=p.parse_args();site=a.site;source=a.source
series=json.loads((source/'series.json').read_text());assert [e['episode'] for e in series['episodes']]==list(range(1,101))
root=site/'assets/somchai/100-v002';jobs=[]
for e in series['episodes']:
 ep=e['episode'];assert len(e['pages'])==e['story_pages']
 for rel in e['pages']:jobs.append((rel,rel,720,82))
 jobs += [(e['cover'],f'covers/episode-{ep:02}.webp',720,82),(e['cover'],f'covers/episode-{ep:02}-card.webp',360,80),(e['cover'],f'covers/episode-{ep:02}-thumb.webp',200,78)]
def convert(job):
 rel,out,width,q=job;src=source/rel;raw=src.read_bytes()
 with Image.open(src) as original:
  im=ImageOps.exif_transpose(original).convert('RGB');width=min(width,im.width);im=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS);dst=root/out;dst.parent.mkdir(parents=True,exist_ok=True);im.save(dst,format='WEBP',quality=q,method=4)
 with Image.open(dst) as check:check.load();assert check.size==im.size
 b=dst.read_bytes();return {'file':out,'source':rel,'sourceBytes':len(raw),'sourceSha256':hashlib.sha256(raw).hexdigest(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'width':im.width,'height':im.height}
files=[]
with ThreadPoolExecutor(max_workers=6) as pool:
 for i,f in enumerate(pool.map(convert,jobs),1):
  files.append(f)
  if i%100==0:print(f'Optimized {i}/{len(jobs)}',flush=True)
lookup={f['file']:f for f in files};episodes=[]
for e in series['episodes']:
 ep=e['episode'];cover=f'covers/episode-{ep:02}.webp';card=cover.replace('.webp','-card.webp');thumb=cover.replace('.webp','-thumb.webp');size=lambda x:{k:lookup[x][k] for k in ['width','height']}
 episodes.append({'episode':ep,'title':e['title'],'cover':'./assets/somchai/100-v002/'+cover,'card':'./assets/somchai/100-v002/'+card,'thumb':'./assets/somchai/100-v002/'+thumb,'coverSize':size(cover),'cardSize':size(card),'thumbSize':size(thumb),'pages':[{'image':'somchai/100-v002/'+rel.removesuffix('.webp'),**size(rel),'embeddedText':True,'title':f"ตอน {ep} {e['title']} — หน้า {i+1}"} for i,rel in enumerate(e['pages'])]})
(site/'somchai-episodes.js').write_text('// Canonical replacement: user-supplied somchai-01-100-v002.\nexport const somchaiEpisodes = '+json.dumps(episodes,ensure_ascii=False,indent=2)+';\n')
unique={f['source']:f['sourceBytes'] for f in files};receipt={'source':'Somchai/somchai-01-100-v002','edition':'100-v002','date':'2026-10-09','episodes':100,'storyPages':sum(len(e['pages']) for e in episodes),'sourceBytes':sum(unique.values()),'webpBytes':sum(f['bytes'] for f in files),'compression':{'readerWidth':720,'readerQuality':82,'cardWidth':360,'thumbnailWidth':200},'files':files};receipt['reductionPercent']=round(100*(1-receipt['webpBytes']/receipt['sourceBytes']),1)
(site/'docs/somchai-100-v002.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in receipt.items() if k!='files'},flush=True)
