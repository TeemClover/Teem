#!/usr/bin/env python3
"""Publish the free preview of the AI ใส่ซอส field guide: its first pages only.

The full guide stays a locked course file inside /learn. This script renders at most
PREVIEW_PAGES pages of a local copy of the PDF to web images and writes a manifest the
reader at /book/ai-sauce/ loads. The PDF itself is never copied into the repository.

    pip install pymupdf
    python3 tools/build-ebook-preview.py "/path/to/AI_SAUCE_FIELD_GUIDE.pdf"

Re-running replaces the previous preview atomically (old page images are removed).
"""
from pathlib import Path
import json
import sys

PREVIEW_PAGES = 10  # hard cap: the rest of the guide belongs to the course
WIDTHS = {"": 1200, "-m": 720}
QUALITY = 82
REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "book" / "ai-sauce" / "pages"


def main(pdf_path: str, out: Path = OUT) -> dict:
    import pymupdf as fitz

    doc = fitz.open(pdf_path)
    total = doc.page_count
    count = min(PREVIEW_PAGES, total)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("p*.jpg"):
        old.unlink()
    pages = []
    for i in range(count):
        page = doc[i]
        entry = {}
        for suffix, width in WIDTHS.items():
            zoom = width / page.rect.width
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            name = f"p{i + 1:02d}{suffix}.jpg"
            pix.save(out / name, jpg_quality=QUALITY)
            entry["src" if not suffix else "srcMobile"] = name
            if not suffix:
                entry["width"], entry["height"] = pix.width, pix.height
        pages.append(entry)
    manifest = {"title": "คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น", "totalPages": total, "pages": pages}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    m = main(sys.argv[1])
    print(f"Preview: {len(m['pages'])} of {m['totalPages']} pages → {OUT.relative_to(REPO)}")
