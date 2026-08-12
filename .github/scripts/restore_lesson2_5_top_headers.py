from pathlib import Path
import re

LESSONS = {
    'classroom/image-ai.html': 2,
    'classroom/clip-ai.html': 3,
    'classroom/notebooklm.html': 4,
    'classroom/prompts.html': 5,
}

STYLE = '''
<style id="classroom-lesson-header-image-style">
.classroom-lesson-header-image{position:relative;z-index:2;display:block;overflow:hidden;background:#071a10;border-bottom:1px solid rgba(255,255,255,.09)}
.classroom-lesson-header-image img{display:block;width:100%;max-width:100%;height:auto;object-fit:contain}
.head>.classroom-lesson-header-image{width:calc(100% + 68px);max-width:none;margin:-36px -34px 28px}
.hero>.classroom-lesson-header-image{width:calc(100% + (2 * clamp(28px,6vw,46px)));max-width:none;margin:calc(-1 * clamp(28px,6vw,46px)) calc(-1 * clamp(28px,6vw,46px)) 26px}
@media(max-width:560px){
  .head>.classroom-lesson-header-image{width:calc(100% + 44px);margin:-26px -22px 22px}
}
</style>
'''

FIG_RE = re.compile(r'\s*<figure\s+class=["\']classroom-lesson-header-image["\'][^>]*>.*?</figure>\s*', re.S)
HEADER_RE = re.compile(r'(<header\b[^>]*class=["\'][^"\']*\b(?:head|hero)\b[^"\']*["\'][^>]*>)', re.I)

for filename, n in LESSONS.items():
    path = Path(filename)
    s = path.read_text(encoding='utf-8')

    # Remove only the generated top header figure, never the lesson's original hero art below it.
    s = FIG_RE.sub('\n', s)

    if 'id="classroom-lesson-header-image-style"' not in s:
        if '</head>' not in s:
            raise RuntimeError(f'{filename}: </head> missing')
        s = s.replace('</head>', STYLE + '\n</head>', 1)

    m = HEADER_RE.search(s)
    if not m:
        raise RuntimeError(f'{filename}: lesson hero/header not found')

    figure = f'''\n  <figure class="classroom-lesson-header-image">\n    <img src="/classroom/img/header-lesson{n}.jpeg" alt="ภาพหัวบท {n} · AI ใส่ซอส" loading="eager" decoding="async" fetchpriority="high">\n  </figure>\n'''
    s = s[:m.end()] + figure + s[m.end():]

    # Guards: exactly one generated top figure and exactly one expected source inside it.
    if s.count('class="classroom-lesson-header-image"') != 1:
        raise RuntimeError(f'{filename}: expected exactly one top header figure')
    if s.count(f'/classroom/img/header-lesson{n}.jpeg') != 1:
        raise RuntimeError(f'{filename}: expected exactly one header-lesson{n}.jpeg reference')

    path.write_text(s, encoding='utf-8')
    print('restored', filename, '-> header-lesson%d.jpeg' % n)
