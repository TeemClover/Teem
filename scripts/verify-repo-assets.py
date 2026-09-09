#!/usr/bin/env python3
"""Verify the conversion/relink contract embedded in the single asset report.
Requires Pillow. Optional --base-url checks actual HTTP bodies and MIME types.
Run from any directory; this script never writes images or consumers.
"""
import argparse
import hashlib
import io
import json
import math
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'docs/repo-cleanup-report.md'


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


class ConsumerElements(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.elements = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


def verify_retired_consumer(record, source):
    """A retired use needs an exact, documented replacement in the current UI.

    This retires one historical relink only. The conversion's hashes, original,
    quality, metadata and HTTP checks remain mandatory even if no page uses it.
    """
    label = f"{record['consumer']} -> {record['asset']}"
    check(bool(record.get('reason', '').strip()), f'Undocumented retired consumer: {label}')
    check(Path(record['asset']).name not in source, f'Retired image is active again: {label}')
    current = record['current_element']
    tag, attribute, url = current['tag'], current['attribute'], current['url']
    check((tag, attribute) in {('img', 'src'), ('a', 'href')}, f'Invalid retirement evidence: {label}')
    check(any(kind == tag and attrs.get(attribute) == url
              for kind, attrs in ConsumerElements(source).elements),
          f'Retirement replacement missing: {label} -> {url}')
    target = urlsplit(url)
    check(not target.scheme and not target.netloc, f'Replacement must be repo-local: {label}')
    path = ((ROOT / target.path.lstrip('/')) if target.path.startswith('/')
            else ROOT / Path(record['consumer']).parent / target.path).resolve()
    check(path.is_relative_to(ROOT), f'Replacement leaves repository: {label}')
    check(path.is_file() or (path.is_dir() and (path / 'index.html').is_file()),
          f'Retirement replacement target missing: {label} -> {url}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', help='Local preview or later integration URL')
    args = parser.parse_args()
    block = REPORT.read_text().split('<!-- ASSET_MANIFEST_START -->', 1)[1]
    manifest = json.loads(block.split('```json\n', 1)[1].split('\n```', 1)[0])
    entries = manifest['conversions']
    retirements = {}
    for record in manifest.get('consumer_retirements', []):
        key = (record['asset'], record['consumer'], record['new_url'])
        check(key not in retirements, f'Duplicate retired consumer: {key}')
        retirements[key] = record
    verified_retirements = set()
    # This checkout contains pre-existing Front Door work. Verify only the
    # explicitly recorded asset contract; do not reset or reject unrelated diffs.
    for removed in manifest.get('cleanup', []):
        check(not (ROOT / removed['path']).exists(), f"Root junk remains: {removed['path']}")
        if removed['path'].startswith('activity-'):
            for directory in ['teambook/assets/art/activities', 'xty/assets/art/activities']:
                canonical = ROOT / directory / removed['path']
                check(digest(canonical.read_bytes()) == removed['sha256'], f'Canonical backup changed: {canonical}')
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    text_files = [ROOT / n for n in tracked if n and (ROOT / n).is_file() and (
        Path(n).suffix in {'.html', '.css', '.js', '.mjs', '.ts', '.json', '.webmanifest', '.py', '.yml', '.yaml', '.toml'}
        or n in {'_headers', '_redirects'})]
    text = {str(p.relative_to(ROOT)): p.read_text(errors='replace') for p in text_files}
    requests = 0
    for x in entries:
        old, new = ROOT / x['old'], ROOT / x['new']
        a_bytes, b_bytes = old.read_bytes(), new.read_bytes()
        check(len(a_bytes) == x['old_bytes'] and digest(a_bytes) == x['old_sha256'], f'Original modified: {old}')
        check(len(b_bytes) == x['new_bytes'] and digest(b_bytes) == x['new_sha256'], f'Derivative mismatch: {new}')
        check(a_bytes == subprocess.check_output(['git', 'show', f"{manifest['base']}:{x['old']}"], cwd=ROOT),
              f'Original differs from base: {old}')
        prior = subprocess.run(['git', 'cat-file', '-e', f"{manifest['base']}:{x['new']}"], cwd=ROOT, capture_output=True)
        check(prior.returncode != 0, f'Overwrote a pre-existing derivative: {new}')
        with Image.open(io.BytesIO(a_bytes)) as a, Image.open(io.BytesIO(b_bytes)) as b:
            check(b.format == 'WEBP', f'Not WebP: {new}')
            check(a.size == b.size == tuple(x['dimensions']), f'Dimensions changed: {new}')
            for field in ['icc_profile', 'xmp', 'exif']:
                av, bv = a.info.get(field, b''), b.info.get(field, b'')
                if field == 'exif':
                    av, bv = av.removeprefix(b'Exif\0\0'), bv.removeprefix(b'Exif\0\0')
                check(av == bv, f'{field} changed: {new}')
            aa, bb = a.convert('RGBA'), b.convert('RGBA')
            check(aa.getchannel('A').tobytes() == bb.getchannel('A').tobytes(), f'Alpha changed: {new}')
            if x['lossless']:
                check(aa.tobytes() == bb.tobytes(), f'Lossless pixels changed: {new}')
            else:
                rms = ImageStat.Stat(ImageChops.difference(aa, bb)).rms[:3]
                mse = sum(v*v for v in rms)/3
                psnr = 10*math.log10(255*255/mse) if mse else float('inf')
                check(psnr >= x['psnr'] - 0.02, f'Quality regressed: {new}')
        for update in x['updates']:
            source = (ROOT / update['consumer']).read_text()
            for replacement in update['replacements']:
                key = (x['new'], update['consumer'], replacement['new_url'])
                if key in retirements:
                    verify_retired_consumer(retirements[key], source)
                    verified_retirements.add(key)
                else:
                    check(replacement['new_url'] in source, f"Missing consumer: {update['consumer']} -> {x['new']}")
                old_url, new_url = map(urlsplit, [replacement['old_url'], replacement['new_url']])
                check((old_url.query, old_url.fragment) == (new_url.query, new_url.fragment), 'URL suffix changed')
        allowed = set(x['retained_consumers'])
        for name, source in text.items():
            if Path(x['old']).name not in source:
                continue
            check(name in allowed, f'Unreviewed old filename reference: {name}: {x["old"]}')
            if name.endswith('.html'):
                lines = [line for line in source.splitlines() if Path(x['old']).name in line]
                check(all(re.search(r'<meta\b[^>]*(?:property|name)=[\"\'](?:og:|twitter:)', line) for line in lines),
                      f'Old runtime reference outside preserved social metadata: {name}')
        if args.base_url:
            suffixes = {'', '?asset_qa=1#preserved-fragment'}
            for update in x['updates']:
                for replacement in update['replacements']:
                    u = urlsplit(replacement['new_url'])
                    suffixes.add(('?' + u.query if u.query else '') + ('#' + u.fragment if u.fragment else ''))
            for suffix in sorted(suffixes):
                with urlopen(args.base_url.rstrip('/') + '/' + x['new'] + suffix, timeout=15) as response:
                    check(response.status == 200, f'HTTP failure: {new}')
                    check(response.headers.get_content_type() == 'image/webp', f'Wrong HTTP MIME: {new}')
                    check(response.read() == b_bytes, f'Fallback HTML or wrong body: {new}')
                requests += 1
    check(verified_retirements == set(retirements), 'Retired consumer does not match an exact historical relink')
    print(f'PASS: {len(entries)} originals, derivatives, metadata/alpha checks and consumer contracts '
          f'({len(verified_retirements)} explicitly retired uses verified); {requests} HTTP responses.')


if __name__ == '__main__':
    main()
