from pathlib import Path
import re

TARGETS = {
    "classroom/image-ai.html": ("header-lesson2.jpeg", "ภาพหัวบท 2 · AI ใส่ซอส", "hero-stage"),
    "classroom/clip-ai.html": ("header-lesson3.jpeg", "ภาพหัวบท 3 · AI ใส่ซอส", "hero-stage"),
    "classroom/notebooklm.html": ("header-lesson4.jpeg", "ภาพหัวบท 4 · AI ใส่ซอส", None),
    "classroom/prompts.html": ("header-lesson5.jpeg", "ภาพหัวบท 5 · AI ใส่ซอส", "heroimg"),
}

HEADER_STYLE = '''<style id="classroom-lesson-header-image-style">
.classroom-lesson-header-image{position:relative;z-index:2;display:block;overflow:hidden;background:#071a10;border-bottom:1px solid rgba(255,255,255,.09)}
.classroom-lesson-header-image img{display:block;width:100%;max-width:100%;height:auto;object-fit:contain}
.head>.classroom-lesson-header-image{width:calc(100% + 68px);max-width:none;margin:-36px -34px 28px}
.hero>.classroom-lesson-header-image{width:calc(100% + (2 * clamp(28px,6vw,46px)));max-width:none;margin:calc(-1 * clamp(28px,6vw,46px)) calc(-1 * clamp(28px,6vw,46px)) 26px}
@media(max-width:560px){
  .head>.classroom-lesson-header-image{width:calc(100% + 44px);margin:-26px -22px 22px}
}
</style>'''

STYLE_RE = re.compile(r'\n*<style id="classroom-lesson-header-image-style">.*?</style>\s*', re.S)
FIGURE_RE = re.compile(r'\s*<figure class="classroom-lesson-header-image"[^>]*>.*?</figure>\s*', re.S)


def remove_hero_stage(text: str, filename: str) -> str:
    marker = '<div class="hero-stage"'
    start = text.find(marker)
    if start == -1:
        return text
    end = text.find('</header>', start)
    if end == -1:
        raise SystemExit(f"{filename}: hero-stage found without </header>")
    chunk = text[start:end]
    if '<section' in chunk or '<header' in chunk:
        raise SystemExit(f"{filename}: unsafe hero-stage boundary")
    return text[:start] + text[end:]


def normalize_page(filename: str, image_name: str, alt_text: str, legacy: str | None) -> None:
    path = Path(filename)
    text = path.read_text(encoding="utf-8")

    # Remove any prior copies first so the result is deterministic.
    text = STYLE_RE.sub("\n", text)
    text = FIGURE_RE.sub("\n", text)

    # Remove the old generated hero illustration. The static raster below becomes
    # the single visual attached to the green hero, matching lesson 1.
    if legacy == "hero-stage":
        text = remove_hero_stage(text, filename)
    elif legacy == "heroimg":
        text = re.sub(r'\s*<div class="heroimg"[^>]*>\s*</div>\s*', "\n", text, count=1)

    if '</head>' not in text:
        raise SystemExit(f"{filename}: missing </head>")
    text = text.replace('</head>', HEADER_STYLE + '\n\n</head>', 1)

    head_marker = '<header class="head">'
    if text.count(head_marker) != 1:
        raise SystemExit(f"{filename}: expected exactly one head, found {text.count(head_marker)}")

    figure = (
        '\n  <figure class="classroom-lesson-header-image">\n'
        f'    <img src="/classroom/img/{image_name}" alt="{alt_text}" loading="eager" decoding="async" fetchpriority="high">\n'
        '  </figure>\n'
    )
    text = text.replace(head_marker, head_marker + figure, 1)

    if text.count('<figure class="classroom-lesson-header-image">') != 1:
        raise SystemExit(f"{filename}: static figure count != 1")
    if text.count('/classroom/img/' + image_name) != 1:
        raise SystemExit(f"{filename}: header image ref count != 1")
    if legacy == "hero-stage" and '<div class="hero-stage"' in text:
        raise SystemExit(f"{filename}: legacy hero-stage remains")
    if legacy == "heroimg" and '<div class="heroimg"' in text:
        raise SystemExit(f"{filename}: legacy heroimg remains")

    path.write_text(text, encoding="utf-8")
    print("normalized", filename)


def guard_lesson4_runtime() -> None:
    path = Path("assets/notebooklm-hero-position.js")
    text = path.read_text(encoding="utf-8")
    needle = "    if(!head||!figure) return false;\n"
    guard = "    if(head.querySelector(':scope > .classroom-lesson-header-image')) return true;\n"
    if guard not in text:
        if needle not in text:
            raise SystemExit("notebooklm-hero-position.js: expected guard insertion point missing")
        text = text.replace(needle, needle + guard, 1)
    path.write_text(text, encoding="utf-8")


def add_runtime_duplicate_guard() -> None:
    path = Path("assets/classroom-hero-consistency.js")
    text = path.read_text(encoding="utf-8")

    if "STATIC_HEADER_ART" not in text:
        text += r'''

const STATIC_HEADER_ART = {
  'learn:image-ai': ['header-lesson2.jpeg', 'lv2-taste.jpeg'],
  'learn:clip-ai': ['header-lesson3.jpeg', 'lv3-cook.jpeg'],
  'learn:notebooklm': ['header-lesson4.jpeg', 'lv4-split.jpeg'],
  'learn:prompts': ['header-lesson5.jpeg', 'lv5-season.jpeg']
};

function removeDuplicateLessonHeaderArt() {
  const id = document.querySelector('meta[name="mc-item"]')?.content;
  const names = STATIC_HEADER_ART[id];
  if (!names) return;
  const head = document.querySelector('header.head, .head');
  const keep = head?.querySelector(':scope > .classroom-lesson-header-image img');
  if (!head || !keep) return;

  document.querySelectorAll('img').forEach(img => {
    if (img === keep) return;
    let pathname = '';
    try { pathname = new URL(img.currentSrc || img.src, location.href).pathname; } catch { return; }
    if (!names.some(name => pathname.endsWith('/' + name))) return;
    const wrapper = img.closest('figure, picture, .classroom-lesson-header-image, .lesson-header-image, .lesson-chef-art');
    if (wrapper && !head.contains(wrapper)) wrapper.remove();
    else if (!head.contains(img)) img.remove();
  });

  head.querySelectorAll(':scope > .classroom-lesson-header-image').forEach((node, index) => {
    if (index > 0) node.remove();
  });
}
'''

    old = """function startHeroConsistency() {
  applyConsistentHero();
  setTimeout(applyConsistentHero, 250);
  setTimeout(applyConsistentHero, 1000);
}"""
    new = """function startHeroConsistency() {
  applyConsistentHero();
  removeDuplicateLessonHeaderArt();
  setTimeout(() => { applyConsistentHero(); removeDuplicateLessonHeaderArt(); }, 250);
  setTimeout(() => { applyConsistentHero(); removeDuplicateLessonHeaderArt(); }, 1000);
  setTimeout(removeDuplicateLessonHeaderArt, 2200);
}"""
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit("classroom-hero-consistency.js: startHeroConsistency block not found")

    path.write_text(text, encoding="utf-8")


def verify() -> None:
    for filename, (image_name, _, legacy) in TARGETS.items():
        text = Path(filename).read_text(encoding="utf-8")
        assert text.count('<figure class="classroom-lesson-header-image">') == 1, filename
        assert text.count('/classroom/img/' + image_name) == 1, filename
        if legacy == "hero-stage":
            assert '<div class="hero-stage"' not in text, filename
        if legacy == "heroimg":
            assert '<div class="heroimg"' not in text, filename
    assert "head.querySelector(':scope > .classroom-lesson-header-image')" in Path("assets/notebooklm-hero-position.js").read_text(encoding="utf-8")
    assert "STATIC_HEADER_ART" in Path("assets/classroom-hero-consistency.js").read_text(encoding="utf-8")
    print("verification OK")


for args in TARGETS.items():
    filename, values = args
    normalize_page(filename, *values)

guard_lesson4_runtime()
add_runtime_duplicate_guard()
verify()
