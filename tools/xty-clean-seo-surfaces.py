from pathlib import Path
import re

ROOT = Path('.')

BLOCKS = {
    'xty/index.html': [
        ('<!-- XTY SEO DISCOVERY -->', '<!-- /XTY SEO DISCOVERY -->'),
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
    'xty/public/index.html': [
        ('<!-- XTY PUBLIC DISCOVERY -->', '<!-- /XTY PUBLIC DISCOVERY -->'),
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
    'xty/about/index.html': [
        ('<!-- XTY ABOUT DISCOVERY -->', '<!-- /XTY ABOUT DISCOVERY -->'),
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
    'xty/about/why/index.html': [
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
    'xty/about/how/index.html': [
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
    'xty/about/what/index.html': [
        ('<!-- XTY CONTEXT LINKS -->', '<!-- /XTY CONTEXT LINKS -->'),
    ],
}


def strip_block(text, start, end):
    pattern = re.escape(start) + r'.*?' + re.escape(end) + r'\s*'
    return re.sub(pattern, '', text, flags=re.S)


for rel, blocks in BLOCKS.items():
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    before = text
    for start, end in blocks:
        text = strip_block(text, start, end)

    # Visible SEO helper styles are no longer needed on play/story surfaces.
    text = text.replace('<link rel="stylesheet" href="/xty/_shared/seo.css?v=1">\n', '')

    # Keep discovery available as a quiet footer route on About pages only.
    if rel.startswith('xty/about/') and '<footer class="about-footer">' in text and '/xty/ideas/' not in text:
        text = text.replace('</footer>', '<a href="/xty/ideas/">ไอเดียตั้งตี้</a></footer>', 1)

    if rel == 'xty/index.html':
        text = text.replace(
            '<title>XTY — หาตี้ สร้างตี้ หาเพื่อนทำกิจกรรม | วิ่ง อ่านหนังสือ ทำเป้าหมายด้วยกัน</title>',
            '<title>XTY — ตั้งตี้ทำอะไรก็ได้</title>'
        )
        text = text.replace(
            'content="XTY — หาตี้ สร้างตี้ หาเพื่อนทำกิจกรรม | วิ่ง อ่านหนังสือ ทำเป้าหมายด้วยกัน"',
            'content="XTY — ตั้งตี้ทำอะไรก็ได้"'
        )
        text = text.replace(
            'content="XTY พื้นที่ตั้งตี้ 2–5 คนสำหรับทำของจริงด้วยกัน หาตี้สาธารณะ หาเพื่อนวิ่ง ออกกำลังกาย ลดน้ำหนัก อ่านหนังสือ เรียน ทำโปรเจกต์ งานอาสา แล้วกลับมา Commit ให้กัน"',
            'content="ชวนเพื่อนมาตั้งตี้ ทำของจริง แล้วกลับมา Commit ด้วยกัน จะตั้งตี้เองหรือเข้าตี้ของเพื่อนก็ได้"'
        )
        text = text.replace(
            '"name":"XTY — หาตี้ สร้างตี้ หาเพื่อนทำกิจกรรม"',
            '"name":"XTY — ตั้งตี้ทำอะไรก็ได้"'
        )
        text = text.replace(
            '"description":"XTY พื้นที่ตั้งตี้ 2–5 คนสำหรับทำของจริงด้วยกัน หาตี้สาธารณะ หาเพื่อนวิ่ง ออกกำลังกาย ลดน้ำหนัก อ่านหนังสือ เรียน ทำโปรเจกต์ งานอาสา แล้วกลับมา Commit ให้กัน"',
            '"description":"ชวนเพื่อนมาตั้งตี้ ทำของจริง แล้วกลับมา Commit ด้วยกัน"'
        )

    if rel == 'xty/public/index.html':
        text = text.replace(
            '<title>หาตี้ หาเพื่อนทำกิจกรรม — กลุ่มวิ่ง อ่านหนังสือ ออกกำลังกาย | XTY</title>',
            '<title>หาตี้สาธารณะ — XTY</title>'
        )
        text = text.replace(
            'content="หาตี้ หาเพื่อนทำกิจกรรม — กลุ่มวิ่ง อ่านหนังสือ ออกกำลังกาย | XTY"',
            'content="หาตี้สาธารณะ — XTY"'
        )
        text = text.replace(
            'content="หาตี้สาธารณะใน XTY อ่านรายละเอียดและ Party Log ก่อนเข้าร่วม ใช้หาเพื่อนทำกิจกรรม เช่น วิ่ง ออกกำลังกาย อ่านหนังสือ เรียน ทำโปรเจกต์ แชร์ความรู้ และงานอาสา"',
            'content="เปิดดูตี้สาธารณะ อ่านรายละเอียดและ Party Log ก่อนตัดสินใจว่าจะเข้าร่วมไหม"'
        )
        text = text.replace(
            '"name":"หาตี้ หาเพื่อนทำกิจกรรม — กลุ่มวิ่ง อ่านหนังสือ ออกกำลังกาย"',
            '"name":"หาตี้สาธารณะ — XTY"'
        )
        text = text.replace(
            '"description":"หาตี้สาธารณะใน XTY อ่านรายละเอียดและ Party Log ก่อนเข้าร่วม ใช้หาเพื่อนทำกิจกรรม เช่น วิ่ง ออกกำลังกาย อ่านหนังสือ เรียน ทำโปรเจกต์ แชร์ความรู้ และงานอาสา"',
            '"description":"เปิดดูตี้สาธารณะ อ่านรายละเอียดและ Party Log ก่อนตัดสินใจว่าจะเข้าร่วมไหม"'
        )

    if text != before:
        path.write_text(text, encoding='utf-8')
        print('updated', rel)

# Put long-tail discovery in the sitemap instead of on top of the product UI.
sitemap = ROOT / 'sitemap.xml'
text = sitemap.read_text(encoding='utf-8')
if 'https://www.myclover.com/xty/ideas/' not in text:
    block = '''  <url>\n    <loc>https://www.myclover.com/xty/ideas/</loc>\n    <lastmod>2026-08-15</lastmod>\n  </url>\n'''
    text = text.replace('</urlset>', block + '</urlset>')
    sitemap.write_text(text, encoding='utf-8')
    print('updated sitemap.xml')
