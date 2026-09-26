# -*- coding: utf-8 -*-
"""Build the public demo from shareable Thai copy; no private kit documents ship."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'tools/asksydscience/site.th.json'
d = json.loads(DATA.read_text())
house_experiences = (ROOT / 'tools/asksydscience/house-experiences.html').read_text()
def e(value): return escape(str(value), quote=True)
def lines(value): return e(value).replace('\n', '<br>')
def arrow(): return '<span aria-hidden="true">↗</span>'
def leaf(): return '<svg viewBox="0 0 44 44" aria-hidden="true" class="leaf"><path d="M21 39C23 23 29 12 38 5C39 21 33 29 22 30M21 32C10 30 5 23 6 12C17 16 22 22 21 32"/><path d="M21 39L29 19M21 32L13 22"/></svg>'
def img(name, alt, cls='', eager=False, responsive=False):
    width, height = (1536, 1024) if name.startswith('sydney-') else (1200, 900) if name in ['podcast-photo', 'mountain-moment'] else (1600, 1067)
    attrs = 'fetchpriority="high"' if eager else 'loading="lazy"'
    srcset = f' srcset="/asksydscience/assets/{name}-800.webp 800w, /asksydscience/assets/{name}.webp {width}w" sizes="(max-width: 700px) 100vw, 65vw"' if responsive else ''
    return f'<img class="{cls}" src="/asksydscience/assets/{name}.webp"{srcset} alt="{e(alt)}" width="{width}" height="{height}" {attrs} decoding="async">'

filters = ''.join(f'<button type="button" data-filter="{f["value"]}" aria-pressed="{str(f["value"]=="all").lower()}">{e(f["label"])}</button>' for f in d['storiesIntro']['filters'])
story_cards, story_templates = [], []
for i,s in enumerate(d['stories']):
    name=s['image'].removesuffix('.webp')
    source_links = ''.join(f'<a href="{e(source["url"])}" target="_blank" rel="noopener noreferrer">{e(source["title"])} <span aria-hidden="true">↗</span><span class="sr-only">{e(d["ui"]["newTab"])}</span></a>' for source in s['sources'])
    source_note = f'<div class="story-sources"><small>อ่านที่มาของความรู้</small>{source_links}</div>' if source_links else ''
    story_cards.append(f'''<article class="story-card reveal" data-topic="{s['topic']}">
    <button type="button" class="polaroid film-poster" data-house-film="{s['film']}" aria-label="เล่นเรื่อง {e(s['title'].replace(chr(10),' '))}">
      <div class="story-photo">{img(name,d['ui']['storyImageAlt'])}<span class="image-index">0{i+1}</span><span class="photo-open" aria-hidden="true">▶</span><span class="film-type">เรื่องเล่าภาพเคลื่อนไหว</span></div>
      <span class="photo-caption">{e(d['editorial']['storyCaptions'][i])}</span>
    </button>
    <div class="story-meta"><span>{e(s['topicLabel'])}</span><span>{e(d['ui']['sampleBadge'])}</span></div>
    <h3><a href="#story-note-{s['id']}" data-story="{s['id']}">{lines(s['title'])}</a></h3>
    <p>{e(s['summary'])}</p>
    <details id="story-note-{s['id']}" class="story-inline"><summary>{e(d['ui']['readStory'])}</summary><p>{e(s['detail'])}</p>{source_note}<p>{e(d['dialogs']['sampleFooter'])}</p></details>
    <button class="text-link js-only" data-story="{s['id']}">{e(d['editorial']['read'])} {arrow()}</button>
    </article>''')
    story_templates.append(f'''<template id="story-{s['id']}" data-title="{e(s['title'].replace(chr(10),' '))}"><span class="status-pill">{e(d['dialogs']['sampleTag'])}</span><p class="dialog-lead">{e(s['summary'])}</p><p>{e(s['detail'])}</p><div class="reflection"><small>{e(d['editorial']['reflectionLabel'])}</small><p>{e(d['editorial']['reflections'][i])}</p></div>{source_note}<p class="fineprint">{e(d['dialogs']['sampleFooter'])}</p></template>''')
original_clips=''.join(f'<a href="{e(v["url"])}" target="_blank" rel="noopener noreferrer"><span class="original-play" aria-hidden="true">▶</span><span>{e(v["editorialTopic"])}<small>TikTok · @asksydscience</small></span><span aria-hidden="true">↗</span><span class="sr-only">{e(d["ui"]["newTab"])}</span></a>' for v in d['originalVideos'])
weeks=''.join(f'''<section class="week-panel" id="week-{w['n']}" aria-labelledby="week-tab-{w['n']}"><div class="week-top"><span class="serif">0{w['n']}</span><span class="status-pill">{e(w['mode'])}</span></div><h3>{e(w['title'])}</h3><p>{e(w['text'])}</p><div class="week-note">{leaf()}<span>{e(w['note'])}</span></div></section>''' for w in d['workshop']['weeks'])
tabs=''.join(f'<button id="week-tab-{w["n"]}" data-week="{w["n"]}" aria-controls="week-{w["n"]}"><span>0{w["n"]}</span><small>{e(w["mode"])}</small></button>' for w in d['workshop']['weeks'])
trust=''.join(f'<div><span class="trust-index">0{i+1}</span><h3>{e(t["title"])}</h3><p>{e(t["text"])}</p></div>' for i,t in enumerate(d['trust']['items']))
faq=''.join(f'<details><summary>{e(x["q"])}<span aria-hidden="true">+</span></summary><p>{e(x["a"])}</p></details>' for x in d['faq'])
register_steps=''.join(f'<li><span>0{i+1}</span>{e(x)}</li>' for i,x in enumerate(d['dialogs']['registrationSteps']))

ui_json = json.dumps(d['ui'], ensure_ascii=False).replace('<', '\\u003c')

home_editorial = (ROOT / 'tools/asksydscience/home-editorial.html').read_text().replace('{{leaf}}', leaf())

stories_section=f'''<section class="stories section" id="stories" aria-labelledby="stories-title"><div class="wrap"><div class="section-heading reveal"><div><div class="section-marker"><span>03</span><i></i><small>THE LIVING ROOM</small></div><h1 id="stories-title">{e(d['storiesIntro']['title'])}</h1><p>{e(d['storiesIntro']['body'])}</p></div><div class="margin-note">{lines(d['editorial']['storiesNote'])}{leaf()}</div></div><div class="filter-row"><div class="filters" role="group" aria-label="{e(d['ui']['topicFilter'])}">{filters}</div><span id="story-count" aria-live="polite">{e(d['ui']['resultPrefix'])}3{e(d['ui']['resultSuffix'])}</span></div><div class="story-grid">{''.join(story_cards)}</div><div class="editorial-note"><span aria-hidden="true">◌</span><p>{e(d['storiesIntro']['draftNote'])}<br><span>{e(d['editorial']['storyImageNotice'])}</span></p></div><div class="original-shelf"><div><span class="kicker">MEET SYD, IN HER OWN WORDS</span><h3>จากช่องของซิด</h3><p>แวะดูวิธีเล่าเรื่องของซิด ผ่านคลิปต้นฉบับบน TikTok</p></div><div class="original-clips">{original_clips}</div></div></div></section>'''

workshop_section=f'''<section class="workshop section" id="workshop" aria-labelledby="workshop-title"><div class="wrap"><div class="section-heading reveal"><div><div class="section-marker"><span>04</span><i></i><small>LEARNING TOGETHER</small></div><h1 id="workshop-title">{e(d['editorial']['workshopHeading'])}</h1><p>{e(d['workshop']['name'])}</p></div><span class="status-pill">{e(d['workshop']['statusLabel'])}</span></div><div class="workshop-grid"><div class="workshop-art reveal">{img('home-studio','ภาพ AI ประกอบเดโม มุมบ้านมีโต๊ะไม้ สมุด และต้นไม้ในแสงธรรมชาติ',responsive=True)}<div class="book"><div class="book-top">{leaf()}<small>A LITTLE JOURNEY WITH SYD</small></div><div class="book-title">A little<br><em>more present.</em></div><div class="book-photo">{img('sydney-mindfulness',d['ui']['storyImageAlt'])}</div><p>{lines(d['editorial']['bookSubtitle'])}</p><small>{e(d['editorial']['bookStatus'])}</small></div><div class="art-label">{e(d['editorial']['imageNotice'])}</div></div><div class="workshop-plan reveal"><span class="kicker">LEARN A LITTLE. LIVE A LITTLE.</span><h3 class="plan-title">{e(d['workshop']['titleLines'][0])}<br>{e(d['workshop']['titleLines'][1])}</h3><p>{e(d['workshop']['body'])}</p><div class="format-line">{e(d['workshop']['format'])}</div><div class="week-tabs" role="tablist" aria-label="{e(d['ui']['weekTablist'])}">{tabs}</div><div class="week-panels">{weeks}</div><button class="button" data-dialog="registration">{e(d['workshop']['cta'])}<span aria-hidden="true">→</span></button><p class="followup-note">{e(d['workshop']['followupNote'])}</p><p class="fineprint">{e(d['workshop']['detailDisclaimer'])}</p><noscript><p>{e(d['dialogs']['registrationBody'])}</p></noscript></div></div></div></section>'''

picks_section=f'''<section class="picks section" id="picks" aria-labelledby="picks-title"><div class="wrap picks-grid"><div class="reveal"><div class="section-marker"><span>05</span><i></i><small>THE LITTLE SHELF</small></div><h2 id="picks-title">{e(d['picks']['title'])}</h2><p class="section-body">{e(d['picks']['body'])}</p><button class="text-link" data-dialog="picks">{e(d['picks']['cta'])} {arrow()}</button><noscript><p>{e(d['dialogs']['picksBody'])}</p></noscript></div><div class="shelf-note reveal"><div class="botanical" aria-hidden="true">{leaf()}</div><span class="kicker">A LITTLE SOMETHING, WITH CARE</span><h3>{e(d['picks']['emptyTitle'])}</h3><p>{e(d['picks']['emptyBody'])}</p><span class="handnote">{e(d['editorial']['shelfNote'])} ♡</span></div></div></section>'''

about_section=f'''<section class="about section" id="about" aria-labelledby="about-title"><div class="about-image">{img('sydney-reading-lived',d['editorial']['studioAlt'],responsive=True)}</div><div class="wrap about-content"><div class="letter reveal"><span class="kicker">A NOTE FROM SYD</span>{leaf()}<h1 id="about-title">{e(d['about']['title'])}<br><span>{e(d['about']['subtitle'])}</span></h1><p>{e(d['about']['body'])}</p><p>{e(d['editorial']['aboutClosing'])}</p><span class="signature">With love, Syd ♡</span><a class="text-link" href="{e(d['links']['tiktok'])}" target="_blank" rel="noopener noreferrer">{e(d['about']['profileLinkLabel'])} {arrow()}<span class="sr-only">{e(d['ui']['newTab'])}</span></a></div></div><div class="art-label">{e(d['editorial']['imageNotice'])}</div></section>'''

trust_section=f'''<section class="trust section wrap"><div class="trust-heading reveal"><span class="kicker">ROOTED IN SCIENCE. GROWN WITH CARE.</span><h2>{e(d['trust']['title'])}</h2></div><div class="trust-grid reveal">{trust}</div></section>'''

faq_section=f'''<section class="faq wrap"><div><span class="kicker">BEFORE YOU SETTLE IN</span><h2>{e(d['ui']['faqTitle'])}</h2><span class="handnote">{e(d['editorial']['faqNote'])} ♡</span></div><div class="faq-list">{faq}</div></section>'''

registration_template=f'''<template id="template-registration" data-title="{e(d['dialogs']['registrationTitle'])}"><p class="dialog-lead">{e(d['dialogs']['registrationBody'])}</p><ol class="registration-steps">{register_steps}</ol><p class="status-pill">{e(d['workshop']['statusLabel'])}</p><p class="fineprint">{e(d['dialogs']['registrationNotice'])}</p></template>
'''
picks_template=f'''<template id="template-picks" data-title="{e(d['dialogs']['picksTitle'])}"><p class="dialog-lead">{e(d['dialogs']['picksBody'])}</p><div class="reflection">{leaf()}<p>{e(d['picks']['emptyBody'])}</p></div></template>
'''

ROOM_LABELS = {'kitchen':'ห้องครัวซิดนีย์', 'mindfulness':'ห้องพระและเจริญสติ', 'stories':'ห้องนั่งเล่น', 'workshop':'เรียนรู้ด้วยกัน', 'about':'รู้จักซิด'}
PAGE_ORDER = ['kitchen', 'mindfulness', 'stories', 'workshop']
PLAYER = (ROOT / 'tools/asksydscience/film-player.html').read_text()
# Room bodies are kept separate from the shared animation player.
kitchen_body, rest = house_experiences.split('<section class="hx-room hx-mindfulness"', 1)
mindfulness_body = '<section class="hx-room hx-mindfulness"' + rest.split('<dialog ', 1)[0]
def primary_heading(markup, heading_id):
    return markup.replace(f'<h2 id="{heading_id}">',f'<h1 id="{heading_id}">',1).replace('</h2>','</h1>',1)
kitchen_body = primary_heading(kitchen_body, 'kitchen-title')
mindfulness_body = primary_heading(mindfulness_body, 'mindfulness-title')

def navigation(page):
    return ''.join(f'<a href="/asksydscience/{n["id"]}/"' + (' aria-current="page" class="is-active"' if page == n['id'] else '') + f'>{e(n["label"])}</a>' for n in d['nav'])

def page_document(page, body, page_templates=''):
    title = d['meta']['title'] if page == 'home' else ROOM_LABELS[page] + ' | AskSydScience'
    menu = navigation(page)
    breadcrumb = '' if page == 'home' else f'<nav class="room-breadcrumb wrap" aria-label="เส้นทางในบ้าน"><a href="/asksydscience/">← กลับเข้าบ้าน</a><span aria-hidden="true">/</span><span>{e(ROOM_LABELS[page])}</span></nav>'
    onward = ''
    if page in PAGE_ORDER:
        next_page = PAGE_ORDER[(PAGE_ORDER.index(page)+1) % len(PAGE_ORDER)]
        onward=f'<aside class="room-onward wrap"><span class="kicker">TAKE ANOTHER LITTLE STEP</span><a href="/asksydscience/{next_page}/">แวะต่อที่{e(ROOM_LABELS[next_page])}<span aria-hidden="true">→</span></a><a class="onward-home" href="/asksydscience/">กลับไปเลือกห้อง</a></aside>'
    home_styles = '<link rel="stylesheet" href="/asksydscience/home-editorial.css">' if page == 'home' else ''
    home_footer = f'<div class="ed-footer-note"><p>{lines(d["editorial"]["footerMessage"])}</p>{leaf()}</div>' if page == 'home' else ''
    return f'''<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f6f4eb"><meta name="description" content="{e(d['meta']['description'])}"><title>{e(title)}</title>
<link rel="icon" href="/asksydscience/favicon.svg" type="image/svg+xml"><link rel="preload" href="/asksydscience/assets/fonts/ibm-plex-sans-thai-thai-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/asksydscience/style.css"><link rel="stylesheet" href="/asksydscience/house.css"><link rel="stylesheet" href="/asksydscience/house-experiences.css"><link rel="stylesheet" href="/asksydscience/pages.css"><link rel="stylesheet" href="/asksydscience/film-motion.css">{home_styles}
<script id="site-ui" type="application/json">{ui_json}</script><script src="/asksydscience/app.js" defer></script><script src="/asksydscience/house-experiences.js" defer></script><script src="/asksydscience/film-motion.js" defer></script></head>
<body data-page="{page}"><a class="skip-link" href="#main">{e(d['ui']['skip'])}</a>
<div class="demo-strip"><span>A MINDFUL HOME, BY SYD</span><span>{e(d['editorial']['demoLabel'])}<i aria-hidden="true"></i></span></div>
<header id="site-header"><div class="nav-wrap"><a class="wordmark" href="/asksydscience/" aria-label="{e(d['ui']['home'])}">AskSydScience{leaf()}</a><nav class="desktop-nav" aria-label="{e(d['ui']['mainNav'])}">{menu}</nav><a class="header-hello" href="/asksydscience/about/">รู้จักซิด<span aria-hidden="true">↗</span></a><button class="menu-toggle js-only" id="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="{e(d['ui']['menu'])}"><span></span><span></span></button></div><nav id="mobile-menu" aria-label="{e(d['ui']['mobileNav'])}" hidden>{menu}<a href="/asksydscience/about/">รู้จักซิด</a><a href="/asksydscience/#rooms">{e(d['editorial']['start'])}</a></nav><div id="reading-progress" aria-hidden="true"></div></header>
<main id="main">{breadcrumb}{body}{onward}</main>
<footer class="house-footer">{home_footer}<div class="wrap"><div class="house-footer-brand"><a class="wordmark" href="/asksydscience/">AskSydScience</a><p>A healthier you. A kinder world.</p></div><nav aria-label="ท้ายบ้าน"><a href="/asksydscience/about/">รู้จักซิด</a><a href="{e(d['links']['tiktok'])}" target="_blank" rel="noopener noreferrer">TikTok ↗<span class="sr-only">{e(d['ui']['newTab'])}</span></a><a class="studio-link" href="/asksydscience/studio/">ลองดูหลังบ้าน ↗</a></nav><small>{e(d['notice'])}</small></div></footer>
<dialog id="detail-dialog" aria-labelledby="dialog-title"><div class="dialog-shell"><button class="dialog-close" data-close-dialog aria-label="{e(d['dialogs']['close'])}">×</button><span class="kicker">ASK SYD SCIENCE · A LIVING HOME</span><h2 id="dialog-title"></h2><div id="dialog-content"></div></div></dialog>
{page_templates}

{PLAYER}
</body></html>'''

pages = {
    'home': (home_editorial, ''),
    'kitchen': (kitchen_body, ''),
    'mindfulness': (mindfulness_body, ''),
    'stories': (stories_section, ''.join(story_templates)),
    'workshop': (workshop_section + faq_section, registration_template),
    'about': (about_section + trust_section + picks_section, picks_template),
}
for page, (body, templates) in pages.items():
    target = ROOT / 'asksydscience' / ('' if page == 'home' else page) / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    output = page_document(page, body, templates)
    target.write_text(output)
    print(f'Built {target.relative_to(ROOT)} ({len(output.encode()):,} bytes)')
