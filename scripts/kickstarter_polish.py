from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageOps

VERSION = "20260803-polish-v5"
ROOT = Path(__file__).resolve().parents[1]
STORY_DIR = ROOT / "kickstarter" / "assets" / "story"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_public_terms(text: str) -> str:
    replacements = (
        ("CORE7BO5", "CORE7 Set"),
        ("Quick Plays", "CORE7 Matches"),
        ("Quick Play", "CORE7 Match"),
        ("Standard Match", "CORE7 Set"),
        ("Standard Format", "CORE7 Set"),
        ("Best-of-5", "first-to-three Matches"),
        ("Body. Mind. Soul. Craft.", "Body. Soul. Mind. Craft."),
        ("BODY · MIND · SOUL · CRAFT", "BODY · SOUL · MIND · CRAFT"),
        ("Body / Mind / Soul / Craft", "Body / Soul / Mind / Craft"),
        ("Red, Blue, Green and Gray", "Red, Green, Blue and Gray"),
        ("RED, BLUE, GREEN and GRAY", "RED, GREEN, BLUE and GRAY"),
    )
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def repair_story_images() -> None:
    names = [
        "removing-rules.webp",
        "one-box-ritual.webp",
        "first-meeting.webp",
        "core7bo5-memory.webp",
        "founder-daughter.webp",
        "built-to-ship.webp",
    ]
    for name in names:
        path = STORY_DIR / name
        if not path.exists():
            raise FileNotFoundError(path)
        with Image.open(path) as source:
            image = ImageOps.fit(
                source.convert("RGB"),
                (1200, 750),
                method=Image.Resampling.LANCZOS,
            )
            temp = path.with_suffix(".repair.webp")
            image.save(temp, "WEBP", quality=78, method=6)
        temp.replace(path)

    old = STORY_DIR / "core7bo5-memory.webp"
    new = STORY_DIR / "core7-set-memory.webp"
    shutil.copy2(old, new)
    old.unlink()


def story_section() -> str:
    figures = [
        (
            "removing-rules",
            "Nothing left to remove",
            "Three colors created the rules. The empty Gray card created the game.",
            "Early prototypes reduced to three colors and one intentionally empty Gray card.",
        ),
        (
            "one-box-ritual",
            "Choose seven. Share twenty-one.",
            "One compact box creates two complete hands without a second deck.",
            "One player chooses seven cards and offers the remaining twenty-one.",
        ),
        (
            "first-meeting",
            "A shared feeling before a shared language",
            "The luck was meeting. Everything after that is a decision.",
            "Two people meet and begin a myClover Match together.",
        ),
        (
            "core7-set-memory",
            "Same hand. Win three Matches.",
            "A CORE7 Set locks the same seven cards until one player wins three Matches.",
            "The same locked seven-card hands repeat across a CORE7 Set.",
        ),
    ]
    cards = "".join(
        f'''<figure data-story-id="{asset}"><img src="/kickstarter/assets/story/{asset}.webp?v={VERSION}" width="1200" height="750" loading="lazy" decoding="async" alt="{alt}"><figcaption><strong>{title}</strong><span>{body}</span></figcaption></figure>'''
        for asset, title, body, alt in figures
    )
    return f'''
    <section id="visual-story" class="ks-story-static">
      <div class="wrap">
        <div class="ks-story-static-head">
          <p class="eyebrow" data-story-kicker>THE VISUAL STORY</p>
          <h2 data-story-title>A game this small should be seen—not buried in paragraphs.</h2>
          <p data-story-lead>Six images trace the system from removing rules to first meetings, repeated play, production and the table where it began.</p>
        </div>
        <div class="ks-story-static-grid">{cards}</div>
      </div>
    </section>
'''


def name_origin_section() -> str:
    return '''
    <section id="name-origin" class="name-origin section-dark">
      <div class="wrap name-origin-grid">
        <div class="name-origin-mark reveal" aria-hidden="true"><span>4</span><b>→</b><span>7</span></div>
        <div class="name-origin-copy reveal">
          <p id="nameOriginKicker" class="eyebrow">THE NAME</p>
          <h2 id="nameOriginTitle">myClover is luck<br><em>you choose to carry.</em></h2>
          <p id="nameOriginBody">The name began with a four-leaf clover and the idea of “my lucky seven”: the seven words you choose to carry into a meeting.</p>
          <blockquote id="nameOriginQuote">The luck was meeting.<br>The game is all decisions.</blockquote>
          <div class="name-origin-chips"><span>FOUR-LEAF CLOVER</span><span>MY LUCKY SEVEN</span><span>SEVEN CHOSEN WORDS</span></div>
        </div>
      </div>
    </section>
'''


def patch_index() -> None:
    html = read("kickstarter/index.html")
    html = re.sub(r"20260803-[A-Za-z0-9-]+", VERSION, html)
    html = html.replace("/core7/assets/card-back-core7.png", "/core7/assets/card-back-core7.webp")
    html = html.replace("/core7/assets/core7-rules-overview.png", "/core7/assets/core7-rules-overview.webp")
    html = replace_public_terms(html)
    html = re.sub(r"\bBO5\b", "SET", html)

    html = html.replace(
        "A 32-card game you can teach in ten seconds. No draw luck. No random outcomes. Every result comes from the two humans across the table.",
        "A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.",
    )
    html = html.replace(
        "28 word cards · 4 rule cards · 0% RNG · 1 box for two complete hands",
        "28 word cards · 4 rule cards · 0% RNG · 100% DECISIONS · 1 box for two complete hands",
    )

    old_buttons = '<button class="energy-button active red" data-energy="RED"><span>●</span> RED · BODY</button><button class="energy-button blue" data-energy="BLUE"><span>●</span> BLUE · MIND</button><button class="energy-button green" data-energy="GREEN"><span>●</span> GREEN · SOUL</button><button class="energy-button gray" data-energy="GRAY"><span>●</span> GRAY · CRAFT</button>'
    new_buttons = '<button class="energy-button active red" data-energy="RED"><span>●</span> RED · BODY</button><button class="energy-button green" data-energy="GREEN"><span>●</span> GREEN · SOUL</button><button class="energy-button blue" data-energy="BLUE"><span>●</span> BLUE · MIND</button><button class="energy-button gray" data-energy="GRAY"><span>●</span> GRAY · CRAFT</button>'
    html = html.replace(old_buttons, new_buttons)

    # Replace any previous dynamic/static Visual Story block with one stable static block.
    html = re.sub(
        r'\s*<section id="visual-story"[\s\S]*?</section>\s*',
        "\n" + story_section() + "\n",
        html,
        count=1,
    )
    if 'id="visual-story"' not in html:
        anchor = '    <section class="language section-dark">'
        if anchor not in html:
            raise RuntimeError("Language section anchor missing")
        html = html.replace(anchor, story_section() + "\n" + anchor, 1)

    if 'id="name-origin"' not in html:
        anchor = '    <section id="game" class="game section-dark">'
        if anchor not in html:
            raise RuntimeError("Game section anchor missing")
        html = html.replace(anchor, name_origin_section() + "\n" + anchor, 1)

    founder_figure = f'''<figure class="ks-story-inline" data-story-inline="founder"><img src="/kickstarter/assets/story/founder-daughter.webp?v={VERSION}" width="1200" height="750" loading="lazy" decoding="async" alt="A father and daughter test handmade cards together"><figcaption><strong>The table where the game began</strong><span>The system was designed by one creator. The game was discovered by removing rules together with his daughter.</span></figcaption></figure>'''
    if 'data-story-inline="founder"' not in html:
        anchor = '<div class="founder-story reveal">'
        if anchor not in html:
            raise RuntimeError("Founder anchor missing")
        html = html.replace(anchor, founder_figure + anchor, 1)

    shipping_figure = f'''<figure class="ks-story-inline" data-story-inline="shipping"><img src="/kickstarter/assets/story/built-to-ship.webp?v={VERSION}" width="1200" height="750" loading="lazy" decoding="async" alt="A controlled card production setup with proofs and color checks"><figcaption><strong>Built to ship, not to spiral</strong><span>One compact box, controlled proofs and no production complexity hiding inside stretch goals.</span></figcaption></figure>'''
    if 'data-story-inline="shipping"' not in html:
        anchor = '</div></div></section>\n\n    <section class="faq section-cream">'
        if anchor not in html:
            raise RuntimeError("Risk section anchor missing")
        html = html.replace(anchor, shipping_figure + '</div></div></section>\n\n    <section class="faq section-cream">', 1)

    html = re.sub(
        r'<article class="quick">[\s\S]*?</article>',
        '<article class="quick"><span>CORE7 MATCH</span><h3>Win 3 Rounds.</h3><p>One complete Match. Choose in secret, reveal together, and become the first player to win three Rounds.</p></article>',
        html,
        count=1,
    )
    html = re.sub(
        r'<article class="standard">[\s\S]*?</article>',
        '<article class="standard"><span>CORE7 SET · LOCKED HAND</span><h3>Same hand. Win 3 Matches.</h3><p>Lock the same CORE7 hand for the whole Set. Reset those seven cards after every Match. First to win three Matches wins the Set.</p></article>',
        html,
        count=1,
    )

    html = html.replace("CORE7 · CORE7 MATCH", "CORE7 · MATCH")
    html = html.replace("A CORE7 Match creates the first impression.<br>CORE7 Set strengthens it.", "A CORE7 Match creates the first impression.<br>A CORE7 Set strengthens it.")
    write("kickstarter/index.html", html)


def patch_distilled() -> None:
    js = read("kickstarter/kickstarter-distilled.js")
    js = re.sub(r"const VERSION = '[^']+';", f"const VERSION = '{VERSION}';", js, count=1)
    js = js.replace("core7bo5-memory", "core7-set-memory")
    js = replace_public_terms(js)
    js = js.replace("0% RNG. 100% decisions.", "0% RNG. 100% DECISIONS.")
    js = js.replace(
        "['core7-set-memory','Same hand. Stronger memory.','CORE7 Set keeps the seven cards fixed while the humans learn each other.'",
        "['core7-set-memory','Same hand. Win three Matches.','A CORE7 Set locks the same seven cards until one player wins three Matches.'",
    )
    js = js.replace(
        "'CORE7 Set ล็อกเจ็ดใบเดิม ขณะที่มนุษย์สองคนค่อย ๆ เรียนรู้กัน'",
        "'CORE7 Set ล็อกเจ็ดใบเดิมจนกว่าจะมีคนชนะสาม Matches ขณะที่มนุษย์สองคนค่อย ๆ เรียนรู้กัน'",
    )
    js = js.replace(
        'loading="lazy" decoding="async" alt=""',
        'loading="lazy" decoding="async" width="1200" height="750" alt=""',
    )

    name_copy = '''
    const nameCopy = thai ? {
      kicker:'ที่มาของชื่อ',
      title:'myClover คือโชค<br><em>ที่เราเลือกพกไปด้วย</em>',
      body:'ชื่อเริ่มจากโคลเวอร์สี่แฉก และแนวคิด “my lucky seven” — เจ็ดคำที่เราเลือกถือไปพบคนตรงหน้า',
      quote:'ดวงถูกใช้ไปหมดแล้วตอนที่เราได้มาเจอกัน<br>ที่เหลือคือการตัดสินใจของเรา'
    } : {
      kicker:'THE NAME',
      title:'myClover is luck<br><em>you choose to carry.</em>',
      body:'The name began with a four-leaf clover and the idea of “my lucky seven”: the seven words you choose to carry into a meeting.',
      quote:'The luck was meeting.<br>The game is all decisions.'
    };
    const nameKicker = document.getElementById('nameOriginKicker');
    const nameTitle = document.getElementById('nameOriginTitle');
    const nameBody = document.getElementById('nameOriginBody');
    const nameQuote = document.getElementById('nameOriginQuote');
    if(nameKicker) nameKicker.textContent = nameCopy.kicker;
    if(nameTitle) nameTitle.innerHTML = nameCopy.title;
    if(nameBody) nameBody.textContent = nameCopy.body;
    if(nameQuote) nameQuote.innerHTML = nameCopy.quote;
'''
    marker = "    const labels = thai"
    if "const nameCopy = thai" not in js:
        if marker not in js:
            raise RuntimeError("Language-copy marker missing")
        js = js.replace(marker, name_copy + "\n" + marker, 1)
    write("kickstarter/kickstarter-distilled.js", js)


def patch_runtime_files() -> None:
    base = read("kickstarter/kickstarter-base.js")
    base = base.replace(
        "'fh-red-courage',\n    'fh-blue-clarity',\n    'fh-green-balance',\n    'fh-gray-build',",
        "'fh-red-courage',\n    'fh-green-balance',\n    'fh-blue-clarity',\n    'fh-gray-build',",
    )
    base = base.replace(
        "'fh-red-desire',\n    'fh-blue-perspective',\n    'fh-green-discipline',\n    'fh-gray-observe',",
        "'fh-red-desire',\n    'fh-green-discipline',\n    'fh-blue-perspective',\n    'fh-gray-observe',",
    )
    base = base.replace("FIRST_HAND.forEach(cardData => {", "['RED','GREEN','BLUE','GRAY'].flatMap(color => FIRST_HAND.filter(cardData => cardData.color === color)).forEach(cardData => {")
    write("kickstarter/kickstarter-base.js", base)

    campaign = read("kickstarter/kickstarter.js")
    campaign = re.sub(r"import './kickstarter-base\.js\?v=[^']+';", f"import './kickstarter-base.js?v={VERSION}';", campaign, count=1)
    campaign = campaign.replace("/core7/assets/card-back-core7.png", "/core7/assets/card-back-core7.webp")
    campaign = replace_public_terms(campaign)
    campaign = campaign.replace("cardSVG('fh-red-courage',{width:360})", "cardSVG('fh-red-passion',{width:360})")
    campaign = campaign.replace("COURAGE · ความกล้า", "PASSION · แรงปรารถนา")
    campaign = campaign.replace("One seven-card hand. Up to five fast games.", "One locked seven-card hand. First to win three Matches.")
    campaign = campaign.replace("Play up to five compact matches with the same information space.", "Play Matches with the same locked hand until someone wins three.")
    write("kickstarter/kickstarter.js", campaign)


def patch_css() -> None:
    path = "kickstarter/kickstarter-static-story.css"
    styles = read(path)
    addition = '''

/* Campaign polish v5 */
.name-origin{padding:110px 0;background:radial-gradient(circle at 18% 35%,rgba(200,156,69,.16),transparent 30%),#062718;color:#fff}
.name-origin-grid{display:grid;grid-template-columns:minmax(190px,.38fr) minmax(0,1fr);gap:70px;align-items:center}
.name-origin-mark{width:min(280px,100%);aspect-ratio:1;display:grid;grid-template-columns:1fr auto 1fr;place-items:center;border:1px solid rgba(236,210,139,.38);border-radius:50%;background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 8px rgba(6,39,24,.8),0 30px 80px rgba(0,0,0,.28)}
.name-origin-mark span{font:600 clamp(3rem,7vw,6rem)/1 Georgia,serif;color:#ecd28b}.name-origin-mark b{color:rgba(255,255,255,.55);font-size:1.4rem}
.name-origin-copy h2{margin:0;font:500 clamp(2.8rem,5.6vw,5.6rem)/.98 Georgia,serif;letter-spacing:-.05em}.name-origin-copy h2 em{color:#ecd28b;font-style:italic}
.name-origin-copy>p:not(.eyebrow){max-width:720px;color:rgba(255,255,255,.72);font-size:1.08rem}.name-origin-copy blockquote{margin:28px 0 26px;padding-left:24px;border-left:3px solid #c89c45;font:500 clamp(1.45rem,3vw,2.45rem)/1.25 Georgia,serif;color:#fff}
.name-origin-chips{display:flex;flex-wrap:wrap;gap:9px}.name-origin-chips span{padding:8px 11px;border:1px solid rgba(236,210,139,.28);border-radius:999px;color:#ecd28b;font-size:.67rem;font-weight:900;letter-spacing:.1em}
.ks-story-static img,.ks-story-inline img{background:#082b1c;color:transparent}.ks-story-static figure{min-width:0}.ks-story-static figcaption{min-height:112px}
@media(max-width:760px){.name-origin{padding:78px 0}.name-origin-grid{grid-template-columns:1fr;gap:34px}.name-origin-mark{width:190px;margin:auto}.name-origin-copy{text-align:center}.name-origin-copy blockquote{padding:0;border-left:0}.name-origin-chips{justify-content:center}}
'''
    if "Campaign polish v5" not in styles:
        styles += addition
    write(path, styles)

    v2 = read("kickstarter/kickstarter-v2.css")
    v2 = re.sub(r"kickstarter-static-story\.css\?v=[^']+", f"kickstarter-static-story.css?v={VERSION}", v2)
    v2 = re.sub(r"kickstarter-failsafe\.css\?v=[^']+", f"kickstarter-failsafe.css?v={VERSION}", v2)
    write("kickstarter/kickstarter-v2.css", v2)


def patch_documents() -> None:
    for path in (ROOT / "core7").rglob("*.md"):
        text = replace_public_terms(path.read_text(encoding="utf-8"))
        text = re.sub(r"\bBO5\b", "CORE7 Set", text)
        path.write_text(text, encoding="utf-8")

    master = ROOT / "core7" / "MYCLOVER-CARDS.md"
    text = master.read_text(encoding="utf-8")
    if "## Locked Public Match Language" not in text:
        block = '''

## Locked Public Match Language

Use this hierarchy in all public-facing copy and documents:

- **Round** — one secret card choice and simultaneous reveal.
- **CORE7 Match** — the first player to win **3 Rounds**.
- **CORE7 Set** — keep the same locked CORE7 hand; the first player to win **3 Matches** wins the Set.

Memory shorthand:

> **3 Round wins = 1 Match win.**
>
> **3 Match wins with the same hand = 1 Set victory.**

Retire the previous format labels from all public material. The public language is now **Round → Match → Set**.
'''
        anchor = "\n# 3."
        text = text.replace(anchor, block + anchor, 1) if anchor in text else block + text
    master.write_text(text, encoding="utf-8")


def patch_vercel() -> None:
    path = ROOT / "vercel.json"
    config = json.loads(path.read_text(encoding="utf-8"))
    headers = config.setdefault("headers", [])
    source = "/kickstarter/assets/story/(.*).webp"
    headers = [item for item in headers if item.get("source") != source]
    headers.append(
        {
            "source": source,
            "headers": [
                {"key": "Content-Type", "value": "image/webp"},
                {"key": "Cache-Control", "value": "public, max-age=31536000, immutable"},
            ],
        }
    )
    config["headers"] = headers
    path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cleanup_automation() -> None:
    for relative in (
        "scripts/kickstarter_polish.py",
        ".github/workflows/one-time-kickstarter-polish.yml",
        ".github/workflows/kickstarter-polish-on-issue.yml",
    ):
        (ROOT / relative).unlink(missing_ok=True)


def main() -> None:
    repair_story_images()
    patch_index()
    patch_distilled()
    patch_runtime_files()
    patch_css()
    patch_documents()
    patch_vercel()
    cleanup_automation()


if __name__ == "__main__":
    main()
