#!/usr/bin/env python3
"""Import the supplied web-ready v003 artwork / v004 Thai story, byte-for-byte."""
import argparse, hashlib, json, shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--site',type=Path,default=Path(__file__).parent);a=p.parse_args()
source=a.source.resolve();site=a.site.resolve();series=json.loads((source/'series.json').read_text());manifest={f['file']:f for f in json.loads((source/'ASSET_MANIFEST.json').read_text())['files']}
summaries=[
'สมาชิกในบ้านเพิ่มขึ้น สมชายต้องขยายแปลงผัก แต่คลองส่งน้ำยังไม่เสร็จและเหล่าลูกหมาก็ชวนให้วุ่นอยู่ทุกวัน',
'ลมหนาวเริ่มมา สมชายเตรียมเสบียงและบ้านให้อบอุ่น ก่อนที่ป่าต่างโลกจะเข้าสู่ฤดูที่เขายังไม่เคยเจอ',
'แขกแปลกหน้าหวาดกลัวชาวสวนกลางป่า การพบกันครั้งนี้จะเป็นจุดเริ่มต้นของมิตรภาพ หรือความเข้าใจผิดครั้งใหญ่?',
'ราตรี แวมไพร์สาวผู้มาเยือน มีเรื่องราวและความต้องการของตัวเอง ชีวิตเงียบ ๆ ของสมชายเริ่มไม่เงียบอีกแล้ว',
'ฤดูหนาวผ่านไป สวนกลับมามีชีวิต แต่ฤดูใบไม้ผลิครั้งนี้มีงานและเรื่องชวนปวดหัวรอสมชายมากกว่าเดิม',
'สัญญาณผิดปกติทางเหนือพาแขกมีปีกมาถึงสวน สมชายต้องทำความรู้จักผู้มาเยือนที่ไม่ธรรมดาอีกคน',
'ทิพย์เริ่มลงหลักปักฐาน จำนวนคนในบ้านเพิ่มขึ้น พร้อมกับงานและความสัมพันธ์ที่ค่อย ๆ เปลี่ยนไป',
'กลุ่มเอลฟ์ชั้นสูงเดินทางมาถึง ความสามารถของพวกเธออาจช่วยเปลี่ยนสวนเล็ก ๆ ให้กลายเป็นชุมชน',
'เอลฟ์ตัวจริงไม่เหมือนภาพในหัวสมชาย เมื่อวิถีชีวิตของพวกเธอทำให้ความเชื่อเดิมของเขาต้องเปลี่ยน',
'สมชายชวนเล่นหมากฮอสและหมากรุกไทย ความทรงจำวัยเรียนกลายเป็นความสนุกใหม่ที่แบ่งปันได้ในต่างโลก'
]
files=[];episodes=[];dest=site/'assets/somchai/v003'
def copy(rel):
 src=source/rel;raw=src.read_bytes();sha=hashlib.sha256(raw).hexdigest();m=manifest[rel]
 assert sha==m['sha256'] and len(raw)==m['bytes'],rel
 with Image.open(src) as im: im.load();size={'width':im.width,'height':im.height};assert im.format=='WEBP'
 out=dest/rel;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,out)
 files.append({'file':rel,'sha256':sha,'bytes':len(raw),**size});return size
assert [e['episode'] for e in series['episodes']]==list(range(21,31))
for e,summary in zip(series['episodes'],summaries):
 ep=e['episode'];cover=e['cover'];card=cover.replace('.webp','-card.webp');cs=copy(cover);ts=copy(card);pages=[]
 assert [x['page'] for x in e['pages']]==list(range(1,len(e['pages'])+1))
 for page in e['pages']:
  size=copy(page['file']);assert size=={k:page[k] for k in ['width','height']}
  pages.append({'image':'somchai/v003/'+page['file'].removesuffix('.webp'),**size,'embeddedText':True,'title':f"ตอน {ep} {e['title']} — หน้า {page['page']}"})
 episodes.append({'episode':ep,'title':e['title'],'summary':summary,'cover':'./assets/somchai/v003/'+cover,'card':'./assets/somchai/v003/'+card,'coverSize':cs,'cardSize':ts,'pages':pages})
(site/'somchai-episodes-21-30.js').write_text('// Supplied artwork v003 / Thai adaptation v004; preserve source WebP bytes.\nexport const somchaiEpisodes21to30 = '+json.dumps(episodes,ensure_ascii=False,indent=2)+';\n')
receipt={'source':'Somchai/somchai_episodes_21_30','artworkVersion':'v003','textVersion':'v004','imported':'2026-10-08','episodes':10,'storyPages':sum(len(e['pages']) for e in episodes),'covers':10,'cards':10,'webpBytes':sum(f['bytes'] for f in files),'conversion':'Already WebP; verified against source manifest and copied without recompression','files':files}
(site/'docs/somchai-v003.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in receipt.items() if k!='files'})
