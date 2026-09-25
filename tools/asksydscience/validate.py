#!/usr/bin/env python3
"""Offline demo integrity checks; this is not a browser/accessibility audit."""
import json
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "asksydscience"
DATA = json.loads((Path(__file__).parent / "site.th.json").read_text())
HOUSE = json.loads((Path(__file__).parent / "house-copy.json").read_text())
HTML = (PUBLIC / "index.html").read_text()
STYLES = {name: (PUBLIC / name).read_text() for name in ("style.css", "house.css", "house-experiences.css")}
SCRIPTS = {name: (PUBLIC / name).read_text() for name in ("app.js", "house-experiences.js", "studio/studio.js")}
CSS = "\n".join(STYLES.values())
JS = "\n".join(SCRIPTS[name] for name in ("app.js", "house-experiences.js"))
STUDIO_HTML = (PUBLIC / "studio/index.html").read_text()
STUDIO_CSS = (PUBLIC / "studio/studio.css").read_text()
PROFILE_URL = "https://www.tiktok.com/@asksydscience"
# Exact reviewed pages, never domain-wide permission for arbitrary destinations.
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


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes, self.stack = [], []

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


doc = Document()
doc.feed(HTML)
studio_doc = Document()
studio_doc.feed(STUDIO_HTML)
ids = [n["attrs"]["id"] for n in doc.nodes if n["attrs"].get("id")]
by_id = {n["attrs"]["id"]: n for n in doc.nodes if n["attrs"].get("id")}
checks, failures, warnings = [], [], []


def check(name, condition, detail=""):
    checks.append(name)
    if not condition:
        failures.append(f"{name}: {detail}" if detail else name)


def compact(value):
    return re.sub(r"\s+", "", value)


def readable(node, value):
    return compact(value) in compact(" ".join(node["text"]))


def local_reference(value, context, allow_external=False, document_ids=None, base=PUBLIC):
    document_ids = by_id if document_ids is None else document_ids
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        check(f"Approved external destination ({context})", allow_external and value in ALLOWED_EXTERNAL, value)
        return
    if not parsed.path:
        check(f"Real fragment target ({context})", bool(parsed.fragment) and unquote(parsed.fragment) in document_ids, value)
        return
    resolved = (ROOT / unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else (base / unquote(parsed.path))
    if resolved.is_dir():
        resolved /= "index.html"
    check(f"Existing local asset ({context})", resolved.is_file() and resolved.resolve().is_relative_to(PUBLIC.resolve()), value)
    if parsed.fragment:
        if resolved.is_file() and resolved.suffix == ".html":
            target_doc = Document()
            target_doc.feed(resolved.read_text())
            target_ids = {n["attrs"].get("id") for n in target_doc.nodes}
        else:
            target_ids = document_ids
        check(f"Known document fragment ({context})", unquote(parsed.fragment) in target_ids, value)


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
check("One h1 and Thai document language", sum(n["tag"] == "h1" for n in doc.nodes) == 1 and any(n["tag"] == "html" and n["attrs"].get("lang") == "th" for n in doc.nodes))
check("Unique document ids", len(ids) == len(set(ids)))
check("Demo is noindex", any(n["tag"] == "meta" and n["attrs"].get("name") == "robots" and "noindex" in n["attrs"].get("content", "") for n in doc.nodes))
check("Main page has no forms, free-text collection or embedded media", not any(n["tag"] in {"form", "textarea", "select", "iframe", "embed", "object", "video", "audio"} for n in doc.nodes))
room_groups = {"hx-vegetables", "hx-grains", "hx-protein", "hx-duration"}
room_inputs = [n for n in doc.nodes if n["tag"] == "input"]
for node in room_inputs:
    attrs = node["attrs"]
    radio = attrs.get("type") == "radio" and attrs.get("name") in room_groups and bool(attrs.get("value"))
    seek = attrs.get("type") == "range" and attrs.get("id") == "hx-film-seek" and attrs.get("min") == "0" and attrs.get("max") == "20" and attrs.get("step") == "0.1"
    check("Room controls are only local radio choices or the film timeline", (radio or seek) and not any(key in attrs for key in ("form", "formaction", "formmethod", "autocomplete")), str(attrs))
for group in room_groups:
    options = [n for n in room_inputs if n["attrs"].get("name") == group]
    check(f"Room choice group has labels and one default: {group}", len(options) == 3 and sum("checked" in n["attrs"] for n in options) == 1 and all(any(parent["tag"] == "label" for parent in n["parents"]) for n in options))
check("Practice durations stay bounded", {n["attrs"].get("value") for n in room_inputs if n["attrs"].get("name") == "hx-duration"} == {"60", "180", "300"})
check("One local film scrubber", sum(n["attrs"].get("id") == "hx-film-seek" for n in room_inputs) == 1)
check("Arabic numerals only", re.search(r"[๐-๙]", HTML) is None)
for name, script in SCRIPTS.items():
    check(f"No browser persistence or data transport: {name}", re.search(TRANSPORT_OR_STORAGE, script) is None)
check("Reduced-motion fallback is present", "prefers-reduced-motion" in CSS and "prefers-reduced-motion" in JS)
check("Focus treatment and native detail fallback are present", ":focus-visible" in CSS and ".js .story-inline" in CSS and ".js-only{display:none}" in CSS.replace(" ", ""))
ui_node = by_id.get("site-ui")
try:
    rendered_ui = json.loads("".join(ui_node["text"])) if ui_node else None
except json.JSONDecodeError:
    rendered_ui = None
check("Generated interactive labels match content source", rendered_ui == DATA["ui"])
check("Thai interactive copy comes from shared content", re.search(r"[\u0e00-\u0e7f]", JS) is None and "#site-ui" in JS)
check("Room effects respect reduced motion and page visibility", "prefers-reduced-motion" in STYLES["house-experiences.css"] and "prefers-reduced-motion" in SCRIPTS["house-experiences.js"] and "visibilitychange" in SCRIPTS["house-experiences.js"] and "pagehide" in SCRIPTS["house-experiences.js"])
film_ids = {n["attrs"]["data-film-id"] for n in doc.nodes if "data-film-id" in n["attrs"]}
check("Three local editorial films exist", film_ids == {"welcome", "kitchen", "mindfulness"})

for node in doc.nodes:
    attrs = node["attrs"]
    context = attrs.get("id", node["tag"])
    for attr in ("href", "src", "poster"):
        if attr in attrs:
            local_reference(attrs[attr], f"{context}.{attr}", node["tag"] == "a" and attr == "href")
    for ref in attrs.get("srcset", "").split(","):
        if ref.strip():
            local_reference(ref.strip().split()[0], f"{context}.srcset")
    for attr in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
        for target in attrs.get(attr, "").split():
            check(f"Accessible reference {context}.{attr}", target in by_id, target)
    if node["tag"] == "img":
        check("Every image has alternative text and dimensions", "alt" in attrs and bool(attrs.get("width")) and bool(attrs.get("height")))
    if "data-story" in attrs:
        check("Story action has a real template", "story-" + attrs["data-story"] in by_id)
    if "data-dialog" in attrs:
        check("Dialog action has a real template", "template-" + attrs["data-dialog"] in by_id)
    if "data-house-film" in attrs:
        check("Film action has a real local story", attrs["data-house-film"] in film_ids)
    check(f"No inline event handlers or transport attributes ({context})", not any(key.lower().startswith("on") or key.lower() in {"ping", "formaction"} for key in attrs))
    if node["tag"] == "script" and "src" not in attrs:
        check(f"Inline script is data only ({context})", attrs.get("type") == "application/json")

for ref in re.findall(r"url\(\s*['\"]?([^)'\"]+)", CSS):
    local_reference(ref, "CSS")
for story in DATA["stories"]:
    fallback = by_id.get("story-note-" + story["id"])
    check(f"Story {story['id']} readable without JS", fallback is not None and fallback["tag"] == "details" and readable(fallback, story["detail"]) and "hidden" not in fallback["attrs"])
for week in DATA["workshop"]["weeks"]:
    fallback = by_id.get(f"week-{week['n']}")
    check(f"Week {week['n']} readable without JS", fallback is not None and readable(fallback, week["text"]) and "hidden" not in fallback["attrs"])
for key in ("registrationBody", "picksBody"):
    check(f"No-JS explanation for {key}", any(n["tag"] == "noscript" and readable(n, DATA["dialogs"][key]) for n in doc.nodes))

allowed_files = {"index.html", "style.css", "app.js", "house.css", "house-experiences.css", "house-experiences.js", "favicon.svg", "README.md", "studio/index.html", "studio/studio.css", "studio/studio.js"}
allowed_asset_ext = {".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg", ".woff2"}
for path in PUBLIC.rglob("*"):
    if not path.is_file():
        continue
    rel = path.relative_to(PUBLIC)
    valid = str(rel) in allowed_files or (rel.parts[0] == "assets" and (path.suffix.lower() in allowed_asset_ext or path.name == "OFL.txt"))
    check(f"Only public deliverables ship: {rel}", valid and path.resolve().is_relative_to(PUBLIC.resolve()))
check("No private brief/transcript markers in rendered copy", not any(marker in HTML + STUDIO_HTML for marker in ("Sydney Project brief", "MASTER_BUILD_BRIEF", "file_000000", "turn1file0", "commission", "oidcJwt", "AGENTS.md")))

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
for ref in re.findall(r"url\(\s*['\"]?([^) '\"]+)", STUDIO_CSS):
    local_reference(ref, "studio.CSS", document_ids=studio_by_id, base=PUBLIC / "studio")

rendered_links = {n["attrs"].get("href") for n in doc.nodes if n["tag"] == "a"}
check("Reviewed original clips link to their source pages", VERIFIED_VIDEO_URLS <= rendered_links)
for story in DATA["stories"]:
    fallback = by_id.get("story-note-" + story["id"])
    template = by_id.get("story-" + story["id"])
    for source in story.get("sources", []):
        if not isinstance(source, dict):
            continue
        for label, container in (("fallback", fallback), ("dialog", template)):
            links = {node["attrs"].get("href") for node in doc.nodes if node["tag"] == "a" and any(parent is container for parent in node["parents"])}
            check(f"Story {story['id']} cites {source.get('id')} in {label}", source.get("url") in links)

# Read top-level rules throughout the file, including globals after @media.
# This deliberately verifies simple fallback selectors, not a browser cascade.
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


hidden_selectors = [s.strip() for selector, body in top_level_rules(CSS)
                    if re.search(r"\bdisplay\s*:\s*none\b", body)
                    for s in selector.split(",") if s.strip().startswith(("html:not(.js) ", "html:not(.hx-ready) "))]


def hidden_without_js(node):
    for item in [node] + node["parents"]:
        attrs = item["attrs"]
        if "js-only" in attrs.get("class", "").split():
            return True
        for selector in hidden_selectors:
            target = re.sub(r"^html:not\(\.(?:js|hx-ready)\)\s+", "", selector).strip()
            if target.startswith(".") and target[1:] in attrs.get("class", "").split():
                return True
            if re.fullmatch(r"\[[\w-]+\]", target) and target[1:-1] in attrs:
                return True
    return False


for attr in ("data-dialog", "data-intention", "data-filter", "data-week", "data-house-film"):
    controls = [n for n in doc.nodes if n["tag"] == "button" and attr in n["attrs"]]
    check(f"No inert no-JS controls: {attr}", all(hidden_without_js(n) for n in controls))

story_grid_index = next((i for i, n in enumerate(doc.nodes) if "story-grid" in n["attrs"].get("class", "").split()), -1)
draft_note_index = next((i for i, n in enumerate(doc.nodes) if n["tag"] == "p" and readable(n, DATA["storiesIntro"]["draftNote"])), -1)
if "ด้านล่าง" in DATA["storiesIntro"]["draftNote"] and draft_note_index > story_grid_index >= 0:
    warnings.append("Story draft note says 'หัวข้อด้านล่าง' but appears after the cards; use location-neutral wording such as 'หัวข้อในแกลเลอรีนี้'.")

# Rebuild a disposable copy, never overwrite a concurrently edited public page.
with tempfile.TemporaryDirectory(prefix="asksydscience-validate-") as directory:
    scratch = Path(directory)
    (scratch / "tools/asksydscience").mkdir(parents=True)
    (scratch / "asksydscience").mkdir()
    builder = scratch / "tools/build-asksydscience.py"
    builder.write_text((ROOT / "tools/build-asksydscience.py").read_text())
    (scratch / "tools/asksydscience/site.th.json").write_text(json.dumps(DATA, ensure_ascii=False))
    (scratch / "tools/asksydscience/house-copy.json").write_text(json.dumps(HOUSE, ensure_ascii=False))
    (scratch / "tools/asksydscience/house-experiences.html").write_text((ROOT / "tools/asksydscience/house-experiences.html").read_text())
    result = subprocess.run([sys.executable, str(builder)], capture_output=True, text=True)
    output = scratch / "asksydscience/index.html"
    check("Generated output matches a clean rebuild", result.returncode == 0 and output.is_file() and output.read_text() == HTML,
          result.stderr.strip() or "Rerun tools/build-asksydscience.py after editing source copy or builder.")

result = {"status": "fail" if failures else "pass_with_warnings" if warnings else "pass", "checks": len(checks), "failures": failures, "warnings": warnings, "scope": "Static offline integrity only; no browser, live URLs, content-rights or medical-evidence verification."}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
