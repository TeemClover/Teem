"""Check actual downloadable PDF text, structure and ZIP contents, not HTML sources."""
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from pypdf import PdfReader

root=Path(__file__).resolve().parents[2]/'start'
catalog=json.loads((root/'catalog.json').read_text())
def normalized(text):
    # Thai shaping may place nikhahit before a tone mark in decomposed sara-am.
    # Both spellings retain the same letters; compare their logical form.
    text=re.sub('\u0e4d([\u0e48-\u0e4b])\u0e32',r'\1'+'\u0e33',text)
    return re.sub(r'\s+','',unicodedata.normalize('NFKC',text))

for ep in catalog['episodes']:
    folder=root/'files'/ep['slug']
    pdf=folder/(ep['id']+'-ai-starter.pdf')
    reader=PdfReader(pdf)
    text='\n'.join(page.extract_text() for page in reader.pages)
    assert len(reader.pages)==3,(ep['id'],'page count')
    assert not reader.is_encrypted and '/StructTreeRoot' in reader.trailer['/Root']
    assert '\x00' not in text and '\ufffd' not in text,(ep['id'],'broken Unicode')
    content=[ep['id'],ep['title'],ep['outcome'],ep['prompt'],ep['action'],*ep['fields'],*ep['clip_points'],
             'ถ้าข้อมูลไม่พอ ให้ถามทีละข้อสั้น ๆ ก่อน','ห้ามแต่งลูกค้า ยอดขาย รีวิว']
    for part in content:
        assert normalized(part) in normalized(text),(ep['id'],'lost text',part)
    for page in reader.pages:
        for ref in page['/Resources']['/Font'].values():
            font=ref.get_object()
            desc=font['/DescendantFonts'][0]['/FontDescriptor']
            assert '/FontFile2' in desc,(ep['id'],'font not embedded')
    with zipfile.ZipFile(folder/(ep['id']+'-starter-kit.zip')) as kit:
        assert len(kit.namelist())==7
        assert kit.read(pdf.name)==pdf.read_bytes()
        assert kit.read(ep['id']+'-prompt.txt')==(folder/(ep['id']+'-prompt.txt')).read_bytes()
print('PASS: all 30 PDFs retain complete topic content and Thai marks, embedded fonts, tagged structure and matching seven-file ZIPs')
