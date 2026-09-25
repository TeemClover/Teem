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
HTML = (PUBLIC / "index.html").read_text()
CSS = (PUBLIC / "style.css").read_text()
JS = (PUBLIC / "app.js").read_text()
ALLOWED_EXTERNAL = {"https://www.tiktok.com/@asksydscience"}


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


def local_reference(value, context, allow_external=False):
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        check(f"Approved external destination ({context})", allow_external and value in ALLOWED_EXTERNAL, value)
        return
    if not parsed.path:
        check(f"Real fragment target ({context})", bool(parsed.fragment) and unquote(parsed.fragment) in by_id, value)
        return
    resolved = (ROOT / unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else (PUBLIC / unquote(parsed.path))
    check(f"Existing local asset ({context})", resolved.is_file() and resolved.resolve().is_relative_to(PUBLIC.resolve()), value)
    if parsed.fragment:
        check(f"Known document fragment ({context})", unquote(parsed.fragment) in by_id, value)


check("Demo metadata remains honest", DATA["mode"] == "demo" and DATA["contentApproval"] == "proposed" and DATA["publicReleaseApproved"] is False)
check("Unknown destinations stay null", all(DATA["links"][key] is None for key in ("youtube", "line", "workshopForm", "checkout")))
check("Owner-supplied TikTok remains the sole known destination", DATA["links"]["tiktok"] in ALLOWED_EXTERNAL and DATA["links"]["tiktokStatus"] == "owner_supplied_not_live_audited")
check("No invented inventory or registration facts", DATA["picks"]["products"] == [] and all(DATA["workshop"][key] is None for key in ("date", "priceTHB", "capacity", "registrationUrl")))
check("Story drafts do not claim real media", len(DATA["stories"]) == 3 and all(s["demoOnly"] and s["status"] == "proposed" and s["contentApproval"] == "proposed" and s["videoUrl"] is None and s["sources"] == [] for s in DATA["stories"]))
check("Workshop preserves the proposed 4-week structure", DATA["workshop"]["status"] == "planning" and [w["mode"] for w in DATA["workshop"]["weeks"]] == ["ออนไลน์"] * 3 + ["พบกัน"])
check("One h1 and Thai document language", sum(n["tag"] == "h1" for n in doc.nodes) == 1 and any(n["tag"] == "html" and n["attrs"].get("lang") == "th" for n in doc.nodes))
check("Unique document ids", len(ids) == len(set(ids)))
check("Demo is noindex", any(n["tag"] == "meta" and n["attrs"].get("name") == "robots" and "noindex" in n["attrs"].get("content", "") for n in doc.nodes))
check("No form, payment or embedded media UI", not any(n["tag"] in {"form", "input", "textarea", "iframe", "video", "audio"} for n in doc.nodes))
check("Arabic numerals only", re.search(r"[๐-๙]", HTML) is None)
check("No browser persistence or data transport", re.search(r"\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie)", JS) is None)
check("Reduced-motion fallback is present", "prefers-reduced-motion" in CSS and "prefers-reduced-motion" in JS)
check("Focus treatment and native detail fallback are present", ":focus-visible" in CSS and ".js .story-inline" in CSS and ".js-only{display:none}" in CSS.replace(" ", ""))
ui_node = by_id.get("site-ui")
try:
    rendered_ui = json.loads("".join(ui_node["text"])) if ui_node else None
except json.JSONDecodeError:
    rendered_ui = None
check("Generated interactive labels match content source", rendered_ui == DATA["ui"])
check("Thai interactive copy comes from shared content", re.search(r"[\u0e00-\u0e7f]", JS) is None and "#site-ui" in JS)

for node in doc.nodes:
    attrs = node["attrs"]
    context = attrs.get("id", node["tag"])
    for attr in ("href", "src", "poster"):
        if attr in attrs:
            local_reference(attrs[attr], f"{context}.{attr}", node["tag"] == "a" and attr == "href")
    for ref in attrs.get("srcset", "").split(","):
        if ref.strip():
            local_reference(ref.strip().split()[0], f"{context}.srcset")
    for attr in ("aria-controls", "aria-labelledby"):
        for target in attrs.get(attr, "").split():
            check(f"Accessible reference {context}.{attr}", target in by_id, target)
    if node["tag"] == "img":
        check("Every image has alternative text and dimensions", "alt" in attrs and bool(attrs.get("width")) and bool(attrs.get("height")))
    if "data-story" in attrs:
        check("Story action has a real template", "story-" + attrs["data-story"] in by_id)
    if "data-dialog" in attrs:
        check("Dialog action has a real template", "template-" + attrs["data-dialog"] in by_id)

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

allowed_files = {"index.html", "style.css", "app.js", "favicon.svg", "README.md"}
allowed_asset_ext = {".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg", ".woff2"}
for path in PUBLIC.rglob("*"):
    if not path.is_file():
        continue
    rel = path.relative_to(PUBLIC)
    valid = str(rel) in allowed_files or (rel.parts[0] == "assets" and (path.suffix.lower() in allowed_asset_ext or path.name == "OFL.txt"))
    check(f"Only public deliverables ship: {rel}", valid and path.resolve().is_relative_to(PUBLIC.resolve()))
check("No private brief/transcript markers in rendered copy", not any(marker in HTML for marker in ("Sydney Project brief", "MASTER_BUILD_BRIEF", "file_000000", "turn1file0", "commission", "oidcJwt", "AGENTS.md")))

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
                    for s in selector.split(",") if s.strip().startswith("html:not(.js) ")]


def hidden_without_js(node):
    for item in [node] + node["parents"]:
        attrs = item["attrs"]
        if "js-only" in attrs.get("class", "").split():
            return True
        for selector in hidden_selectors:
            target = selector.removeprefix("html:not(.js) ").strip()
            if target.startswith(".") and target[1:] in attrs.get("class", "").split():
                return True
            if re.fullmatch(r"\[[\w-]+\]", target) and target[1:-1] in attrs:
                return True
    return False


for attr in ("data-dialog", "data-intention", "data-filter", "data-week"):
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
    result = subprocess.run([sys.executable, str(builder)], capture_output=True, text=True)
    output = scratch / "asksydscience/index.html"
    check("Generated output matches a clean rebuild", result.returncode == 0 and output.is_file() and output.read_text() == HTML,
          result.stderr.strip() or "Rerun tools/build-asksydscience.py after editing source copy or builder.")

result = {"status": "fail" if failures else "pass_with_warnings" if warnings else "pass", "checks": len(checks), "failures": failures, "warnings": warnings, "scope": "Static offline integrity only; no browser, live URLs, content-rights or medical-evidence verification."}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
