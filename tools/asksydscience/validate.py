#!/usr/bin/env python3
"""Offline integrity checks for the six-room demo and the simulated studio."""
import json
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "asksydscience"
CONTENT = ROOT / "tools/asksydscience"
DATA = json.loads((CONTENT / "site.th.json").read_text())
HOUSE = json.loads((CONTENT / "house-copy.json").read_text())
PAGE_FILES = ("index.html", "kitchen/index.html", "mindfulness/index.html", "stories/index.html", "workshop/index.html", "about/index.html")
STYLE_FILES = ("style.css", "house.css", "house-experiences.css", "pages.css", "film-motion.css", "home-editorial.css", "studio/studio.css")
SCRIPT_FILES = ("app.js", "house-experiences.js", "film-motion.js", "studio/studio.js")
FRAGMENT_FILES = ("house-experiences.html", "film-player.html", "home-editorial.html")
PROFILE_URL = "https://www.tiktok.com/@asksydscience"
PRIMARY_SOURCE_URLS = {
    "https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegetarian-diet/",
    "https://www.bda.uk.com/resource/vegetarian-vegan-plant-based-diet.html",
    "https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety",
    "https://www.canada.ca/en/health-canada/services/food-guide/eating-support/cooking/make-healthy-meals-plate.html",
}
VERIFIED_VIDEO_URLS = {
    "https://www.tiktok.com/@asksydscience/video/7265665413449534725",
    "https://www.tiktok.com/@asksydscience/video/7636733330011999509",
    "https://www.tiktok.com/@asksydscience/video/7683811131042860308",
}
sources = HOUSE.get("sources", [])
source_by_id = {item.get("id"): item for item in sources if isinstance(item, dict)}
source_urls = {item.get("url") for item in source_by_id.values()}
video_urls = {item.get("url") for item in HOUSE.get("videos", {}).get("verifiedOriginalLinks", []) if isinstance(item, dict)}
ALLOWED_EXTERNAL = {PROFILE_URL} | (source_urls & PRIMARY_SOURCE_URLS) | (video_urls & VERIFIED_VIDEO_URLS)
TRANSPORT_OR_STORAGE = r"\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker\.register)"
checks, failures, warnings = [], [], []


def check(name, condition, detail=""):
    checks.append(name)
    if not condition:
        failures.append(f"{name}: {detail}" if detail else name)


def required_text(path):
    check(f"Required file exists: {path.relative_to(ROOT)}", path.is_file())
    return path.read_text() if path.is_file() else ""


class Document(HTMLParser):
    def __init__(self, source=""):
        super().__init__(convert_charrefs=True)
        self.nodes, self.stack = [], []
        self.feed(source)
        self.ids = [n["attrs"]["id"] for n in self.nodes if n["attrs"].get("id")]
        self.by_id = {n["attrs"]["id"]: n for n in self.nodes if n["attrs"].get("id")}

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "text": [], "parents": self.stack.copy()}
        self.nodes.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, text):
        for node in self.stack:
            node["text"].append(text)


PAGES = {name: required_text(PUBLIC / name) for name in PAGE_FILES}
DOCUMENTS = {name: Document(source) for name, source in PAGES.items()}
STYLES = {name: required_text(PUBLIC / name) for name in STYLE_FILES}
SCRIPTS = {name: required_text(PUBLIC / name) for name in SCRIPT_FILES}
STUDIO_HTML = required_text(PUBLIC / "studio/index.html")
STUDIO_CSS = STYLES["studio/studio.css"]
studio_doc = Document(STUDIO_HTML)
CSS = "\n".join(value for name, value in STYLES.items() if not name.startswith("studio/"))
JS = "\n".join(value for name, value in SCRIPTS.items() if not name.startswith("studio/"))
by_id = DOCUMENTS["index.html"].by_id


def compact(value):
    return re.sub(r"\s+", "", value)


def readable(node, value):
    return node is not None and compact(value) in compact(" ".join(node["text"]))


def safe_svg_texture(value):
    """Allow the self-contained noise texture, not active SVG or linked resources."""
    if not value.startswith("data:image/svg+xml,"):
        return False
    markup = unquote(value.split(",", 1)[1])
    if len(markup) > 65536 or re.search(r"<!DOCTYPE|<!ENTITY", markup, re.I):
        return False
    try:
        tree = ElementTree.fromstring(markup)
    except ElementTree.ParseError:
        return False
    ids = {element.attrib.get("id") for element in tree.iter()}
    for element in tree.iter():
        if element.tag.rsplit("}", 1)[-1] not in {"svg", "filter", "feTurbulence", "rect"}:
            return False
        for key, attribute in element.attrib.items():
            if key.lower().startswith("on") or key.rsplit("}", 1)[-1].lower() in {"href", "style"}:
                return False
            if "url(" in attribute and not (re.fullmatch(r"url\(#[\w-]+\)", attribute) and attribute[5:-1] in ids):
                return False
    return True


def css_references(css):
    # A quoted data URI can contain single quotes, whitespace and its own url().
    for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)''', css):
        yield next(value for value in match.groups() if value is not None)


def local_reference(value, context, allow_external=False, document_ids=None, base=PUBLIC, allow_texture=False):
    """Resolve root/relative URLs and fragments against the actual target page."""
    document_ids = by_id if document_ids is None else document_ids
    parsed = urlsplit(value)
    if parsed.scheme == "data" and allow_texture:
        check(f"Self-contained inline SVG texture ({context})", safe_svg_texture(value))
        return
    if parsed.scheme or parsed.netloc:
        check(f"Approved external destination ({context})", allow_external and value in ALLOWED_EXTERNAL, value)
        return
    if not parsed.path:
        check(f"Real fragment target ({context})", bool(parsed.fragment) and unquote(parsed.fragment) in document_ids, value)
        return
    resolved = ((ROOT / unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else (base / unquote(parsed.path))).resolve()
    if resolved.is_dir():
        resolved /= "index.html"
    safe = resolved.is_file() and resolved.is_relative_to(PUBLIC.resolve())
    check(f"Existing local asset ({context})", safe, value)
    if parsed.fragment:
        target_ids = Document(resolved.read_text()).by_id if safe and resolved.suffix in {".html", ".svg"} else {}
        check(f"Known target-page fragment ({context})", unquote(parsed.fragment) in target_ids, value)


def json_node(document, ident):
    node = document.by_id.get(ident)
    try:
        return json.loads("".join(node["text"])) if node else None
    except json.JSONDecodeError:
        return None


def descendant_links(document, container):
    return {node["attrs"].get("href") for node in document.nodes if node["tag"] == "a" and any(parent is container for parent in node["parents"])}


check("Demo metadata remains honest", DATA["mode"] == "demo" and DATA["contentApproval"] == "proposed" and DATA["publicReleaseApproved"] is False)
check("Unknown destinations stay null", all(DATA["links"][key] is None for key in ("youtube", "line", "workshopForm", "checkout")))
check("TikTok records the profile and sample-clip review", DATA["links"]["tiktok"] == PROFILE_URL and DATA["links"]["tiktokStatus"] == "profile_and_sample_clips_reviewed_2026_09_25")
check("House copy remains an editorial proposal", HOUSE.get("status") == "editorial_proposal")
check("Primary sources are exact reviewed URLs", bool(source_urls) and source_urls <= PRIMARY_SOURCE_URLS and len(source_by_id) == len(sources) and all(item.get("id") and item.get("title") and item.get("reviewedAt") for item in source_by_id.values()))
check("Original clips are exactly the three reviewed destinations", video_urls == VERIFIED_VIDEO_URLS and len(HOUSE.get("videos", {}).get("verifiedOriginalLinks", [])) == 3)
check("No invented inventory or registration facts", DATA["picks"]["products"] == [] and all(DATA["workshop"][key] is None for key in ("date", "priceTHB", "capacity", "registrationUrl")))
check("Story drafts do not claim real media", len(DATA["stories"]) == 3 and all(s["demoOnly"] and s["status"] == "proposed" and s["contentApproval"] == "proposed" and s["videoUrl"] is None for s in DATA["stories"]))
for story in DATA["stories"]:
    references = story.get("sources")
    check(f"Story {story['id']} uses shared primary-source records", isinstance(references, list) and all(isinstance(ref, dict) and ref.get("id") in source_by_id and ref.get("url") in ALLOWED_EXTERNAL and all(ref.get(key) == source_by_id[ref["id"]].get(key) for key in ("title", "url")) for ref in references))
check("Workshop preserves the proposed 4-week structure", DATA["workshop"]["status"] == "planning" and [w["mode"] for w in DATA["workshop"]["weeks"]] == ["ออนไลน์"] * 3 + ["พบกัน"])

for name, script in SCRIPTS.items():
    check(f"No browser persistence or data transport: {name}", re.search(TRANSPORT_OR_STORAGE, script) is None)
check("Shared interactive copy remains in content markup", re.search(r"[\u0e00-\u0e7f]", JS) is None and "#site-ui" in SCRIPTS["app.js"])
check("Focus treatment and native detail fallback are present", ":focus-visible" in CSS and ".js .story-inline" in CSS and ".js-only{display:none}" in CSS.replace(" ", ""))
for name in ("house-experiences", "film-motion"):
    check(f"{name} respects motion and hidden pages", "prefers-reduced-motion" in STYLES[name + ".css"] and "prefers-reduced-motion" in SCRIPTS[name + ".js"] and "visibilitychange" in SCRIPTS[name + ".js"] and "pagehide" in SCRIPTS[name + ".js"])

room_group_pages = {"hx-vegetables": "kitchen/index.html", "hx-grains": "kitchen/index.html", "hx-protein": "kitchen/index.html", "hx-duration": "mindfulness/index.html"}
film_keys = {"welcome", "kitchen", "mindfulness"}
for page, document in DOCUMENTS.items():
    content, page_ids = PAGES[page], document.by_id
    check(f"One h1 and Thai language: {page}", sum(n["tag"] == "h1" for n in document.nodes) == 1 and any(n["tag"] == "html" and n["attrs"].get("lang") == "th" for n in document.nodes))
    check(f"Unique ids: {page}", len(document.ids) == len(set(document.ids)))
    check(f"Noindex: {page}", any(n["tag"] == "meta" and n["attrs"].get("name") == "robots" and "noindex" in n["attrs"].get("content", "") for n in document.nodes))
    check(f"No forms, free text or embedded media: {page}", not any(n["tag"] in {"form", "textarea", "select", "iframe", "embed", "object", "video", "audio"} for n in document.nodes))
    check(f"Arabic numerals only: {page}", re.search(r"[๐-๙]", content) is None)
    check(f"Shared labels match source: {page}", json_node(document, "site-ui") == DATA["ui"])
    check(f"Shared room/film copy exists: {page}", isinstance(json_node(document, "house-experiences-copy"), dict))
    films = [n for n in document.nodes if "data-film-id" in n["attrs"]]
    check(f"Three complete local films: {page}", {n["attrs"]["data-film-id"] for n in films} == film_keys and len(films) == 3)
    check(f"Film durations match the 28-second timeline: {page}", all(n["attrs"].get("data-duration") == "28" for n in films))
    sound = page_ids.get("hx-film-sound")
    check(f"Film sound starts off: {page}", sound is not None and sound["attrs"].get("aria-pressed") == "false")
    inputs = [n for n in document.nodes if n["tag"] == "input"]
    for node in inputs:
        attrs = node["attrs"]
        radio = attrs.get("type") == "radio" and room_group_pages.get(attrs.get("name")) == page and bool(attrs.get("value"))
        seek = attrs.get("type") == "range" and attrs.get("id") == "hx-film-seek" and attrs.get("min") == "0" and attrs.get("max") == "28" and attrs.get("step") == "0.1"
        volume = attrs.get("type") == "range" and attrs.get("id") == "hx-film-volume" and attrs.get("min") == "0" and attrs.get("max") == "100" and attrs.get("value", "").isdigit() and 0 <= int(attrs.get("value", "-1")) <= 100 and bool(attrs.get("aria-label"))
        check(f"Only appropriate room choices or bounded film controls: {page}", (radio or seek or volume) and not any(key in attrs for key in ("form", "formaction", "formmethod", "autocomplete")), str(attrs))
    check(f"One local film scrubber: {page}", sum(n["attrs"].get("id") == "hx-film-seek" for n in inputs) == 1)
    check(f"One labelled local volume control: {page}", sum(n["attrs"].get("id") == "hx-film-volume" for n in inputs) == 1)
    for group, group_page in room_group_pages.items():
        options = [n for n in inputs if n["attrs"].get("name") == group]
        if page == group_page:
            check(f"Labelled choices and one default: {page}:{group}", len(options) == 3 and sum("checked" in n["attrs"] for n in options) == 1 and all(any(parent["tag"] == "label" for parent in n["parents"]) for n in options))
        else:
            check(f"No unrelated room controls: {page}:{group}", not options)
    for node in document.nodes:
        attrs = node["attrs"]
        context = page + ":" + attrs.get("id", node["tag"])
        for attr in ("href", "src", "poster", "xlink:href"):
            if attr in attrs:
                local_reference(attrs[attr], f"{context}.{attr}", node["tag"] == "a" and attr == "href", document_ids=page_ids, base=(PUBLIC / page).parent)
        for ref in attrs.get("srcset", "").split(","):
            if ref.strip():
                local_reference(ref.strip().split()[0], f"{context}.srcset", document_ids=page_ids, base=(PUBLIC / page).parent)
        for attr in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
            for target in attrs.get(attr, "").split():
                check(f"Accessible reference {context}.{attr}", target in page_ids, target)
        for value in attrs.values():
            for target in re.findall(r"url\(\s*#([^)\s]+)\s*\)", value or ""):
                check(f"Self-contained SVG definition ({context})", target in page_ids, target)
        if node["tag"] == "img":
            check(f"Image text and dimensions ({context})", "alt" in attrs and bool(attrs.get("width")) and bool(attrs.get("height")))
        if "data-story" in attrs:
            check(f"Story action template ({context})", "story-" + attrs["data-story"] in page_ids)
        if "data-dialog" in attrs:
            check(f"Dialog action template ({context})", "template-" + attrs["data-dialog"] in page_ids)
        if "data-house-film" in attrs:
            check(f"Film action has a local story ({context})", attrs["data-house-film"] in film_keys)
        check(f"No inline handlers or transport attributes ({context})", not any(key.lower().startswith("on") or key.lower() in {"ping", "formaction"} for key in attrs))
        if node["tag"] == "script" and "src" not in attrs:
            check(f"Inline script is data only ({context})", attrs.get("type") == "application/json")

home_doc = DOCUMENTS["index.html"]
room_routes = {"/asksydscience/" + slug + "/" for slug in ("kitchen", "mindfulness", "stories", "workshop")}
doors = [n for n in home_doc.nodes if "house-door" in n["attrs"].get("class", "").split()]
check("Home is an entrance with four real room doors", len(doors) == 4 and {n["attrs"].get("href") for n in doors} == room_routes)
check("Home does not duplicate the full room sections", not ({"kitchen", "mindfulness", "stories", "workshop", "about", "picks"} & set(home_doc.by_id)) and not any(n["attrs"].get("id", "").startswith(("week-", "story-note-")) for n in home_doc.nodes))
for slug in ("kitchen", "mindfulness", "stories", "workshop", "about"):
    check(f"Room content is present on its own page: {slug}", slug in DOCUMENTS[slug + "/index.html"].by_id)
for page, document in DOCUMENTS.items():
    links = {urlsplit(n["attrs"].get("href", "")).path for n in document.nodes if n["tag"] == "a"}
    check(f"Home and all rooms are reachable: {page}", room_routes | {"/asksydscience/", "/asksydscience/about/"} <= links)

practice_doc = DOCUMENTS["mindfulness/index.html"]
check("Practice durations stay bounded", {n["attrs"].get("value") for n in practice_doc.nodes if n["attrs"].get("name") == "hx-duration"} == {"60", "180", "300"})
check("Mindfulness has a readable no-JS practice", any(n["tag"] == "noscript" and "hx-nojs-note" in " ".join(child["attrs"].get("class", "") for child in practice_doc.nodes if any(parent is n for parent in child["parents"])) for n in practice_doc.nodes))

story_doc = DOCUMENTS["stories/index.html"]
for story in DATA["stories"]:
    fallback = story_doc.by_id.get("story-note-" + story["id"])
    template = story_doc.by_id.get("story-" + story["id"])
    check(f"Story {story['id']} readable without JS in stories room", fallback is not None and fallback["tag"] == "details" and readable(fallback, story["detail"]) and "hidden" not in fallback["attrs"])
    for source in story.get("sources", []):
        if isinstance(source, dict):
            for label, container in (("fallback", fallback), ("dialog", template)):
                check(f"Story {story['id']} cites {source.get('id')} in {label}", source.get("url") in descendant_links(story_doc, container))
check("Reviewed clips link from the stories room", VERIFIED_VIDEO_URLS <= {n["attrs"].get("href") for n in story_doc.nodes if n["tag"] == "a"})
workshop_doc = DOCUMENTS["workshop/index.html"]
for week in DATA["workshop"]["weeks"]:
    fallback = workshop_doc.by_id.get(f"week-{week['n']}")
    check(f"Week {week['n']} readable without JS in workshop room", fallback is not None and readable(fallback, week["text"]) and "hidden" not in fallback["attrs"])
for page, key in (("workshop/index.html", "registrationBody"), ("about/index.html", "picksBody")):
    check(f"No-JS explanation in {page}: {key}", any(n["tag"] == "noscript" and readable(n, DATA["dialogs"][key]) for n in DOCUMENTS[page].nodes))

for name, css in STYLES.items():
    if name.startswith("studio/"):
        continue
    for ref in css_references(css):
        local_reference(ref, name, base=(PUBLIC / name).parent, allow_texture=True)
allowed_files = set(PAGE_FILES) | set(STYLE_FILES) | set(SCRIPT_FILES) | {"favicon.svg", "README.md", "studio/index.html"}
allowed_asset_ext = {".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg", ".woff2", ".ttf"}
for path in PUBLIC.rglob("*"):
    if path.is_file():
        rel = path.relative_to(PUBLIC)
        valid = str(rel) in allowed_files or (rel.parts[0] == "assets" and (path.suffix.lower() in allowed_asset_ext or path.name == "OFL.txt"))
        check(f"Only public deliverables ship: {rel}", valid and path.resolve().is_relative_to(PUBLIC.resolve()))
public_copy = "\n".join(PAGES.values()) + STUDIO_HTML
check("No private brief/transcript markers in public copy", not any(marker in public_copy for marker in ("Sydney Project brief", "MASTER_BUILD_BRIEF", "file_000000", "turn1file0", "commission", "oidcJwt", "AGENTS.md")))

# Studio is a separate, explicitly simulated interface. Its only editable text is
# content/brief copy; it has no contact, health, registration or payment fields.
studio_ids = [n["attrs"]["id"] for n in studio_doc.nodes if n["attrs"].get("id")]
studio_by_id = {n["attrs"]["id"]: n for n in studio_doc.nodes if n["attrs"].get("id")}
check("Studio ids are unique", len(studio_ids) == len(set(studio_ids)))
check("Studio is Thai, noindex and clearly fictional", any(n["tag"] == "html" and n["attrs"].get("lang") == "th" for n in studio_doc.nodes) and any(n["tag"] == "meta" and n["attrs"].get("name") == "robots" and "noindex" in n["attrs"].get("content", "") for n in studio_doc.nodes) and "ข้อมูลสมมติทั้งหมด" in STUDIO_HTML)
check("Studio keeps form records separate from click sessions", "ไม่ได้จับคู่กับ 52 sessions" in STUDIO_HTML and "คนละแหล่งกับเว็บ" in STUDIO_HTML)
check("Studio has four local panels", {n["attrs"].get("id") for n in studio_doc.nodes if n["attrs"].get("role") == "tabpanel"} == {"ss-panel-overview", "ss-panel-content", "ss-panel-workshop", "ss-panel-brief"})
check("Studio contains five fictional roster IDs", {n["attrs"]["data-ss-person"] for n in studio_doc.nodes if "data-ss-person" in n["attrs"]} == {"001", "002", "003", "004", "005"})
check("Studio has no host-only dependencies", re.search(r"window\.openai|\bTweak\b|\blucide\b", STUDIO_HTML + SCRIPTS["studio/studio.js"]) is None)
for node in studio_doc.nodes:
    attrs = node["attrs"]
    context = "studio." + attrs.get("id", node["tag"])
    check(f"No embedded media or executable inline code ({context})", node["tag"] not in {"iframe", "embed", "object", "video", "audio"} and not any(key.lower().startswith("on") or key.lower() in {"ping", "formaction"} for key in attrs) and not (node["tag"] == "script" and "src" not in attrs))
    for attr in ("href", "src", "poster"):
        if attr in attrs:
            local_reference(attrs[attr], f"{context}.{attr}", document_ids=studio_by_id, base=PUBLIC / "studio")
    for attr in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
        for target in attrs.get(attr, "").split():
            check(f"Accessible reference {context}.{attr}", target in studio_by_id, target)
    if node["tag"] in {"input", "textarea", "select"}:
        permitted = ((node["tag"] == "input" and attrs.get("id") == "ss-story-title" and attrs.get("type", "text") == "text" and attrs.get("maxlength") == "100")
                     or (node["tag"] == "textarea" and attrs.get("id") == "ss-brief-text" and attrs.get("maxlength") == "600")
                     or (node["tag"] == "select" and attrs.get("id") == "ss-status-" + attrs.get("data-ss-person", "") and attrs.get("data-ss-person") in {"001", "002", "003", "004", "005"}))
        check(f"Studio inputs remain bounded demo fields ({context})", permitted)
    if node["tag"] == "form":
        check(f"Studio form never submits ({context})", attrs.get("id") in {"ss-content-form", "ss-brief-form"} and not any(key in attrs for key in ("action", "method", "target")) and f"find('#{attrs.get('id')}').addEventListener('submit', (event) => event.preventDefault())" in SCRIPTS["studio/studio.js"])
    if node["tag"] == "button":
        check(f"Studio buttons cannot submit ({context})", attrs.get("type") == "button")
for ref in css_references(STUDIO_CSS):
    local_reference(ref, "studio.CSS", document_ids=studio_by_id, base=PUBLIC / "studio")

# Simple fallback selectors only; this is not a browser cascade audit.
def top_level_rules(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    start = 0
    while (opening := css.find("{", start)) != -1:
        selector, depth, end = css[start:opening].strip(), 1, opening + 1
        while end < len(css) and depth:
            depth += (css[end] == "{") - (css[end] == "}")
            end += 1
        if not selector.startswith("@"):
            yield selector, css[opening + 1:end - 1]
        start = end


ready_classes = "js|hx-ready|hx-film-ready"
hidden_selectors = [s.strip() for selector, body in top_level_rules(CSS)
                    if re.search(r"\bdisplay\s*:\s*none\b", body)
                    for s in selector.split(",") if re.match(r"html:not\(\.(?:" + ready_classes + r")\)\s", s.strip())]


def hidden_without_js(node):
    for item in [node] + node["parents"]:
        attrs = item["attrs"]
        if "js-only" in attrs.get("class", "").split():
            return True
        for selector in hidden_selectors:
            target = re.sub(r"^html:not\(\.(?:" + ready_classes + r")\)\s+", "", selector).strip()
            if target.startswith(".") and target[1:] in attrs.get("class", "").split():
                return True
            if re.fullmatch(r"\[[\w-]+\]", target) and target[1:-1] in attrs:
                return True
    return False


for page, document in DOCUMENTS.items():
    for attr in ("data-dialog", "data-intention", "data-filter", "data-week", "data-house-film"):
        controls = [n for n in document.nodes if n["tag"] == "button" and attr in n["attrs"]]
        check(f"No inert no-JS controls: {page}:{attr}", all(hidden_without_js(n) for n in controls))

story_grid_index = next((i for i, n in enumerate(story_doc.nodes) if "story-grid" in n["attrs"].get("class", "").split()), -1)
draft_note_index = next((i for i, n in enumerate(story_doc.nodes) if n["tag"] == "p" and readable(n, DATA["storiesIntro"]["draftNote"])), -1)
if "ด้านล่าง" in DATA["storiesIntro"]["draftNote"] and draft_note_index > story_grid_index >= 0:
    warnings.append("The story draft note refers to cards below but is placed after them; use location-neutral wording.")

# Rebuild every generated page in isolation, never modify the public working copy.
with tempfile.TemporaryDirectory(prefix="asksydscience-validate-") as directory:
    scratch = Path(directory)
    (scratch / "tools/asksydscience").mkdir(parents=True)
    (scratch / "asksydscience").mkdir()
    builder = scratch / "tools/build-asksydscience.py"
    builder.write_text((ROOT / "tools/build-asksydscience.py").read_text())
    for name in ("site.th.json", "house-copy.json") + FRAGMENT_FILES:
        source = CONTENT / name
        check(f"Rebuild dependency exists: {name}", source.is_file())
        if source.is_file():
            (scratch / "tools/asksydscience" / name).write_text(source.read_text())
    rebuilt = subprocess.run([sys.executable, str(builder)], capture_output=True, text=True)
    check("Disposable build succeeds", rebuilt.returncode == 0, rebuilt.stderr.strip())
    for page in PAGE_FILES:
        output = scratch / "asksydscience" / page
        check(f"Generated page matches clean rebuild: {page}", rebuilt.returncode == 0 and output.is_file() and output.read_text() == PAGES[page], "Rerun tools/build-asksydscience.py after source changes.")

result = {"status": "fail" if failures else "pass_with_warnings" if warnings else "pass", "checks": len(checks), "failures": failures, "warnings": warnings, "scope": "Static offline integrity only; no browser, live URLs, content-rights or medical-evidence verification."}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
