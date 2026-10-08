"""Import supplied episodes 11–20 using v002's selected-page manifest.

Requires Pillow. Originals are read only; the site receives optimized WebP files.
Usage: python import-somchai.py --source /path/to/Somchai
"""
import argparse
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--site', type=Path, default=Path(__file__).parent)
args = parser.parse_args()
site = args.site.resolve()
asset_root = site / 'assets/somchai/v002'
summaries = [
    'ดำย้อนเล่าชีวิตกลางป่าและเหตุที่ต้องพาครอบครัวหนีภัย ก่อนมาพบมนุษย์กับสวนที่เปลี่ยนชีวิตของพวกเขา',
    'สวนเริ่มอยู่ตัว แต่เครื่องปรุงและของใช้ยังขาดอีกมาก สมชายจึงออกสำรวจพร้อมเครื่องมือวิเศษและผู้ช่วยขนดำ',
    'การเดินทางพาสมชายไปพบลำธาร หากนำน้ำกลับมาถึงบ้านได้ ทั้งสวนและชีวิตประจำวันคงสบายขึ้น',
    'สมชายเริ่มสร้างรางส่งน้ำทีละช่วง แต่ระหว่างลงมือ เขาก็นึกถึงฤดูหนาวที่ยังไม่เคยเจอในโลกนี้',
    'หน้าหนาวอาจมาถึงเร็วกว่าที่คิด สมชายเร่งเก็บอาหาร ขณะสมาชิกใหม่ที่คาดไม่ถึงปรากฏตัวใกล้รางส่งน้ำ',
    'แมงมุมชื่อเบาะกลายเป็นเพื่อนร่วมบ้านที่มีฝีมือไม่ธรรมดา สมชายได้ของใช้ใหม่ ก่อนหิมะจะปกคลุมสวน',
    'หิมะทำให้ทุกชีวิตต้องปรับตัว สมชายหาอะไรทำและทดลองมื้อเผ็ดร้อน ขณะรอให้ความหนาวผ่านไป',
    'เมื่อความอบอุ่นกลับมา สมชายเดินหน้าขยายสวนและค้นพบความเปลี่ยนแปลงของลูกหมาที่เติบโตขึ้น',
    'ลูก ๆ มาเรียงแถวเหมือนจะบอกลา บ้านที่คึกคักกลับเงียบลง จนการกลับมาครั้งใหม่พาแขกมาด้วย',
    'เมื่อเหล่าลูกหมาพาคู่กลับบ้าน สมชายต้องขยายที่อยู่รับครอบครัวใหญ่ และเรียนรู้นิสัยของสมาชิกใหม่',
]
episodes, jobs = [], []
for n in range(11, 21):
    source_dir = args.source / f'episode_{n}' / 'v002'
    manifest = json.loads((source_dir / 'manifest.json').read_text())
    selected = sorted(manifest['selected_png_pages'], key=lambda p: p['page'])
    assert manifest['episode'] == n
    assert [p['page'] for p in selected] == list(range(1, manifest['story_pages'] + 2))
    episode = {'episode': n, 'title': manifest['title'], 'summary': summaries[n - 11], 'pages': []}
    for item in selected:
        source = source_dir / item['selected_file']
        raw = source.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        assert digest == item['sha256'], f'Manifest mismatch: {source}'
        with Image.open(source) as image:
            width, height = image.size
        if item['page'] == 1:
            relative = f'assets/covers/episode-{n:02}.webp'
            episode['cover'] = f'./assets/somchai/v002/{relative}'
            episode['coverSize'] = {'width': width, 'height': height}
            card = f'assets/covers/episode-{n:02}-card.webp'
            episode['card'] = f'./assets/somchai/v002/{card}'
            episode['cardSize'] = {'width': 397, 'height': round(height * 397 / width)}
            jobs.append((source, card, episode['cardSize'], 82, digest))
        else:
            page = item['page'] - 1
            relative = f'episodes/{n:02}/pages/{page:03}.webp'
            episode['pages'].append({'image': 'somchai/v002/' + relative[:-5], 'width': width, 'height': height,
                'title': f"ตอน {n} {manifest['title']} — เนื้อหาหน้า {page}", 'embeddedText': True})
        jobs.append((source, relative, {'width': width, 'height': height}, 84, digest))
    episodes.append(episode)

def convert(job):
    source, relative, size, quality, digest = job
    target = asset_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        if image.size != (size['width'], size['height']):
            image = image.resize((size['width'], size['height']), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=quality, method=6)
    with Image.open(target) as check:
        check.load()
        assert check.size == (size['width'], size['height'])
    return {'file': relative, 'source': f"Somchai/{source.parent.parent.name}/v002/{source.name}",
        'sourceSha256': digest, 'sourceBytes': source.stat().st_size,
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size,
        'width': size['width'], 'height': size['height'], 'quality': quality}

with ThreadPoolExecutor(max_workers=4) as pool:
    files = list(pool.map(convert, jobs))
masters = [f for f in files if not f['file'].endswith('-card.webp')]
source_bytes, webp_bytes = sum(f['sourceBytes'] for f in masters), sum(f['bytes'] for f in masters)
receipt = {'version': 'v002', 'episodeRange': [11, 20], 'episodes': 10,
    'storyPages': sum(len(e['pages']) for e in episodes), 'covers': 10,
    'source': 'User-supplied Somchai/episode_11–20/v002, selected_png_pages in each manifest',
    'delivery': 'WebP quality 84, native dimensions; card thumbnails quality 82, 397px wide. Originals unchanged.',
    'sourceBytes': source_bytes, 'webpBytes': webp_bytes,
    'reductionPercent': round((1-webp_bytes/source_bytes)*100, 1), 'files': files}
(site / 'somchai-episodes-11-20.js').write_text('// Imported from user-supplied v002 manifests; no duplicate cover in chapter pages.\nexport const somchaiNewEpisodes = ' + json.dumps(episodes, ensure_ascii=False, indent=2) + ';\n')
(site / 'docs/somchai-v002.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in receipt.items() if k != 'files'}, ensure_ascii=False))
