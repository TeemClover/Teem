"""Build the public demo from shareable Thai copy; no private kit documents ship."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'tools/asksydscience/site.th.json'
d = json.loads(DATA.read_text())
def e(value): return escape(str(value), quote=True)
def lines(value): return e(value).replace('\n', '<br>')
def arrow(): return '<span aria-hidden="true">↗</span>'
def leaf(): return '<svg viewBox="0 0 44 44" aria-hidden="true" class="leaf"><path d="M21 39C23 23 29 12 38 5C39 21 33 29 22 30M21 32C10 30 5 23 6 12C17 16 22 22 21 32"/><path d="M21 39L29 19M21 32L13 22"/></svg>'
def img(name, alt, cls='', eager=False, responsive=False):
    width, height = (1200, 900) if name in ['podcast-photo', 'mountain-moment'] else (1600, 1067)
    attrs = 'fetchpriority="high"' if eager else 'loading="lazy"'
    srcset = f' srcset="/asksydscience/assets/{name}-800.webp 800w, /asksydscience/assets/{name}.webp 1600w" sizes="(max-width: 700px) 100vw, 65vw"' if responsive else ''
    return f'<img class="{cls}" src="/asksydscience/assets/{name}.webp"{srcset} alt="{e(alt)}" width="{width}" height="{height}" {attrs} decoding="async">'

nav = ''.join(f'<a href="#{n["id"]}" data-section-link>{e(n["label"])}</a>' for n in d['nav'])
rooms = ''.join(f'<a class="room-link" href="#{r["id"]}" data-room="{r["id"]}"><span class="room-number">{r["n"]}</span><span><strong>{e(r["title"])}</strong><small>{e(r["text"])}</small></span>{arrow()}</a>' for r in d['rooms'])
filters = ''.join(f'<button type="button" data-filter="{f["value"]}" aria-pressed="{str(f["value"]=="all").lower()}">{e(f["label"])}</button>' for f in d['storiesIntro']['filters'])
story_cards, story_templates = [], []
for i,s in enumerate(d['stories']):
    name=s['image'].removesuffix('.webp')
    story_cards.append(f'''<article class="story-card reveal" data-topic="{s['topic']}">
    <a class="polaroid" href="#story-note-{s['id']}" data-story="{s['id']}" aria-label="{e(s['title'].replace(chr(10),' '))}">
      <div class="story-photo">{img(name,d['ui']['storyImageAlt'])}<span class="image-index">0{i+1}</span><span class="photo-open" aria-hidden="true">↗</span></div>
      <span class="photo-caption">{e(d['editorial']['storyCaptions'][i])}</span>
    </a>
    <div class="story-meta"><span>{e(s['topicLabel'])}</span><span>{e(d['ui']['sampleBadge'])}</span></div>
    <h3><a href="#story-note-{s['id']}" data-story="{s['id']}">{lines(s['title'])}</a></h3>
    <p>{e(s['summary'])}</p>
    <details id="story-note-{s['id']}" class="story-inline"><summary>{e(d['ui']['readStory'])}</summary><p>{e(s['detail'])}</p><p>{e(d['dialogs']['sampleFooter'])}</p></details>
    <button class="text-link js-only" data-story="{s['id']}">{e(d['editorial']['read'])} {arrow()}</button>
    </article>''')
    story_templates.append(f'''<template id="story-{s['id']}" data-title="{e(s['title'].replace(chr(10),' '))}"><span class="status-pill">{e(d['dialogs']['sampleTag'])}</span><p class="dialog-lead">{e(s['summary'])}</p><p>{e(s['detail'])}</p><div class="reflection"><small>{e(d['editorial']['reflectionLabel'])}</small><p>{e(d['editorial']['reflections'][i])}</p></div><p class="fineprint">{e(d['dialogs']['sampleFooter'])}</p></template>''')
weeks=''.join(f'''<section class="week-panel" id="week-{w['n']}" aria-labelledby="week-tab-{w['n']}"><div class="week-top"><span class="serif">0{w['n']}</span><span class="status-pill">{e(w['mode'])}</span></div><h3>{e(w['title'])}</h3><p>{e(w['text'])}</p><div class="week-note">{leaf()}<span>{e(w['note'])}</span></div></section>''' for w in d['workshop']['weeks'])
tabs=''.join(f'<button id="week-tab-{w["n"]}" data-week="{w["n"]}" aria-controls="week-{w["n"]}"><span>0{w["n"]}</span><small>{e(w["mode"])}</small></button>' for w in d['workshop']['weeks'])
intentions=''.join(f'<button data-intention="{x["id"]}" data-note="{e(x["note"])}" aria-pressed="false"><span aria-hidden="true">{x["icon"]}</span>{e(x["label"])}{arrow()}</button>' for x in d['editorial']['intentions'])
trust=''.join(f'<div><span class="trust-index">0{i+1}</span><h3>{e(t["title"])}</h3><p>{e(t["text"])}</p></div>' for i,t in enumerate(d['trust']['items']))
faq=''.join(f'<details><summary>{e(x["q"])}<span aria-hidden="true">+</span></summary><p>{e(x["a"])}</p></details>' for x in d['faq'])
register_steps=''.join(f'<li><span>0{i+1}</span>{e(x)}</li>' for i,x in enumerate(d['dialogs']['registrationSteps']))

ui_json = json.dumps(d['ui'], ensure_ascii=False).replace('<', '\\u003c')
html=f'''<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f6f4eb"><meta name="description" content="{e(d['meta']['description'])}"><title>{e(d['meta']['title'])}</title>
<link rel="icon" href="/asksydscience/favicon.svg" type="image/svg+xml"><link rel="preload" href="/asksydscience/assets/fonts/ibm-plex-sans-thai-thai-600.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/asksydscience/style.css"><script id="site-ui" type="application/json">{ui_json}</script><script src="/asksydscience/app.js" defer></script></head>
<body><a class="skip-link" href="#main">{e(d['ui']['skip'])}</a>
<div class="demo-strip"><span>A LIVING HOME, BY SYD</span><span>{e(d['editorial']['demoLabel'])}<i aria-hidden="true"></i></span></div>
<header id="site-header"><div class="nav-wrap"><a class="wordmark" href="#home" aria-label="{e(d['ui']['home'])}">AskSydScience{leaf()}</a><nav class="desktop-nav" aria-label="{e(d['ui']['mainNav'])}">{nav}</nav><a class="header-hello" href="#about">{e(d['editorial']['hello'])}<span aria-hidden="true">↗</span></a><button class="menu-toggle js-only" id="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="{e(d['ui']['menu'])}"><span></span><span></span></button></div><nav id="mobile-menu" aria-label="{e(d['ui']['mobileNav'])}" hidden>{nav}<a href="#welcome">{e(d['editorial']['start'])}</a></nav><div id="reading-progress" aria-hidden="true"></div></header>
<main id="main">
<section class="hero" id="home" aria-labelledby="hero-title"><div class="hero-art">{img('hero-home',d['editorial']['heroAlt'],eager=True,responsive=True)}</div><div class="hero-wash"></div><div class="hero-inner wrap"><div class="hero-copy"><div class="eyebrow-pill">{e(d['hero']['eyebrow'])}{leaf()}</div><h1 id="hero-title">{e(d['hero']['headlineLines'][0])}<br>{e(d['hero']['headlineLines'][1])}</h1><p class="hero-sub">{e(d['hero']['subheadline'])}</p><p class="hero-body">{e(d['hero']['body'])}</p><div class="hero-actions"><a class="button" href="#welcome">{e(d['hero']['primary'])}<span aria-hidden="true">→</span></a><a class="text-link" href="#workshop">{e(d['hero']['secondary'])}</a></div><div class="handnote">{lines(d['hero']['handnote'])}<span>— Syd ♡</span></div></div></div><div class="hero-caption">{e(d['editorial']['imageNotice'])}</div><a class="scroll-note" href="#welcome"><span aria-hidden="true">↓</span> TAKE A LITTLE LOOK AROUND</a></section>
<nav class="rooms wrap" aria-label="{e(d['ui']['roomsNav'])}">{rooms}</nav>
<section class="welcome wrap reveal" id="welcome"><div><span class="kicker">MAKE YOURSELF AT HOME</span><h2>{e(d['editorial']['welcomeTitle'])}</h2><p>{e(d['editorial']['welcomeBody'])}</p></div><div class="intention"><div class="intention-options">{intentions}</div><p id="intention-note" aria-live="polite">{e(d['editorial']['intentionHint'])}</p></div></section>
<section class="stories section" id="stories" aria-labelledby="stories-title"><div class="wrap"><div class="section-heading reveal"><div><div class="section-marker"><span>01</span><i></i><small>PODCAST & STORIES</small></div><h2 id="stories-title">{e(d['storiesIntro']['title'])}</h2><p>{e(d['storiesIntro']['body'])}</p></div><div class="margin-note">{lines(d['editorial']['storiesNote'])}{leaf()}</div></div><div class="filter-row"><div class="filters" role="group" aria-label="{e(d['ui']['topicFilter'])}">{filters}</div><span id="story-count" aria-live="polite">{e(d['ui']['resultPrefix'])}3{e(d['ui']['resultSuffix'])}</span></div><div class="story-grid">{''.join(story_cards)}</div><div class="editorial-note"><span aria-hidden="true">◌</span><p>{e(d['storiesIntro']['draftNote'])}<br><span>{e(d['editorial']['storyImageNotice'])}</span></p></div></div></section>
<section class="workshop section" id="workshop" aria-labelledby="workshop-title"><div class="wrap"><div class="section-heading reveal"><div><div class="section-marker"><span>02</span><i></i><small>COURSES & LITTLE GIFTS</small></div><h2 id="workshop-title">{e(d['editorial']['workshopHeading'])}</h2><p>{e(d['workshop']['name'])}</p></div><span class="status-pill">{e(d['workshop']['statusLabel'])}</span></div><div class="workshop-grid"><div class="workshop-art reveal">{img('home-studio',d['editorial']['studioAlt'],responsive=True)}<div class="book"><div class="book-top">{leaf()}<small>A LITTLE JOURNEY WITH SYD</small></div><div class="book-title">Searching<br><em>Herself</em></div><div class="book-photo">{img('mountain-moment',d['ui']['storyImageAlt'])}</div><p>{lines(d['editorial']['bookSubtitle'])}</p><small>{e(d['editorial']['bookStatus'])}</small></div><div class="art-label">{e(d['editorial']['imageNotice'])}</div></div><div class="workshop-plan reveal"><span class="kicker">LEARN A LITTLE. LIVE A LITTLE.</span><h3 class="plan-title">{e(d['workshop']['titleLines'][0])}<br>{e(d['workshop']['titleLines'][1])}</h3><p>{e(d['workshop']['body'])}</p><div class="format-line">{e(d['workshop']['format'])}</div><div class="week-tabs" role="tablist" aria-label="{e(d['ui']['weekTablist'])}">{tabs}</div><div class="week-panels">{weeks}</div><button class="button" data-dialog="registration">{e(d['workshop']['cta'])}<span aria-hidden="true">→</span></button><p class="fineprint">{e(d['workshop']['detailDisclaimer'])}</p><noscript><p>{e(d['dialogs']['registrationBody'])}</p></noscript></div></div></div></section>
<section class="picks section" id="picks" aria-labelledby="picks-title"><div class="wrap picks-grid"><div class="reveal"><div class="section-marker"><span>03</span><i></i><small>THOUGHTFULLY CHOSEN</small></div><h2 id="picks-title">{e(d['picks']['title'])}</h2><p class="section-body">{e(d['picks']['body'])}</p><button class="text-link" data-dialog="picks">{e(d['picks']['cta'])} {arrow()}</button><noscript><p>{e(d['dialogs']['picksBody'])}</p></noscript></div><div class="shelf-note reveal"><div class="botanical" aria-hidden="true">{leaf()}</div><span class="kicker">A LITTLE SOMETHING, WITH CARE</span><h3>{e(d['picks']['emptyTitle'])}</h3><p>{e(d['picks']['emptyBody'])}</p><span class="handnote">{e(d['editorial']['shelfNote'])} ♡</span></div></div></section>
<section class="about section" id="about" aria-labelledby="about-title"><div class="about-image">{img('home-studio',d['editorial']['studioAlt'],responsive=True)}</div><div class="wrap about-content"><div class="letter reveal"><span class="kicker">A NOTE FROM SYD</span>{leaf()}<h2 id="about-title">{e(d['about']['title'])}<br><span>{e(d['about']['subtitle'])}</span></h2><p>{e(d['about']['body'])}</p><p>{e(d['editorial']['aboutClosing'])}</p><span class="signature">With love, Syd ♡</span><a class="text-link" href="{e(d['links']['tiktok'])}" target="_blank" rel="noopener noreferrer">{e(d['about']['profileLinkLabel'])} {arrow()}<span class="sr-only">{e(d['ui']['newTab'])}</span></a></div></div><div class="art-label">{e(d['editorial']['imageNotice'])}</div></section>
<section class="trust section wrap"><div class="trust-heading reveal"><span class="kicker">ROOTED IN SCIENCE. GROWN WITH CARE.</span><h2>{e(d['trust']['title'])}</h2></div><div class="trust-grid reveal">{trust}</div></section>
<section class="faq wrap"><div><span class="kicker">BEFORE YOU SETTLE IN</span><h2>{e(d['ui']['faqTitle'])}</h2><span class="handnote">{e(d['editorial']['faqNote'])} ♡</span></div><div class="faq-list">{faq}</div></section>
</main>
<footer><div class="footer-wave" aria-hidden="true"></div><div class="wrap"><div class="footer-top">{leaf()}<p>{lines(d['editorial']['footerMessage'])}</p><a class="wordmark" href="#home">AskSydScience</a><span class="kicker">{e(d['footer']['tagline'])}</span></div><div class="footer-bottom"><span>{e(d['notice'])}</span><button data-dialog="review">{e(d['footer']['reviewCta'])}<span aria-hidden="true">↗</span></button><a href="#home" aria-label="{e(d['ui']['home'])}">↑</a></div></div></footer>
<dialog id="detail-dialog" aria-labelledby="dialog-title"><div class="dialog-shell"><button class="dialog-close" data-close-dialog aria-label="{e(d['dialogs']['close'])}">×</button><span class="kicker">ASK SYD SCIENCE · A LIVING HOME</span><h2 id="dialog-title"></h2><div id="dialog-content"></div></div></dialog>
{''.join(story_templates)}
<template id="template-registration" data-title="{e(d['dialogs']['registrationTitle'])}"><p class="dialog-lead">{e(d['dialogs']['registrationBody'])}</p><ol class="registration-steps">{register_steps}</ol><p class="status-pill">{e(d['workshop']['statusLabel'])}</p><p class="fineprint">{e(d['dialogs']['registrationNotice'])}</p></template>
<template id="template-picks" data-title="{e(d['dialogs']['picksTitle'])}"><p class="dialog-lead">{e(d['dialogs']['picksBody'])}</p><div class="reflection">{leaf()}<p>{e(d['picks']['emptyBody'])}</p></div></template>
<template id="template-review" data-title="{e(d['dialogs']['reviewTitle'])}"><p>{e(d['dialogs']['reviewBody'])}</p><div id="review-counts" aria-live="polite"></div><button class="button button-outline" data-reset-counts>{e(d['ui']['resetCounts'])}</button></template>
</body></html>'''
(ROOT/'asksydscience/index.html').write_text(html)
print(f'Built asksydscience/index.html ({len(html.encode()):,} bytes)')
