#!/usr/bin/env python3
"""Exercise the real Forge generator in a disposable tree, never in this repo.

Run with a Python installation containing Pillow (the generator's dependency):
    python3 scripts/test-forge-generator.py
"""
from contextlib import contextmanager
from html.parser import HTMLParser
from pathlib import Path
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[1]
SLUGS = (
    'ep1-everyone-gets-to-play', 'ep2-the-first-item',
    'ep3-the-item-that-came-back', 'ep4-what-traveled-without-us',
    'ep5-from-answers-to-a-system', 'ep6-the-starter-kit',
    'ep7-a-voice-that-went-further',
)
# Existing JPEG inputs are copied, not regenerated or mocked. SKIP_IMG still
# reads their real dimensions while the complete HTML/quest/redirect build runs.
INPUT_IMAGES = (
    [f'{episode:02}-p{panel}.jpg' for episode in range(1, 8) for panel in range(1, 5)]
    + [f'{episode:02}-thumb.jpg' for episode in range(1, 8)]
    + ['original-thumb.jpg', '00-p1.jpg', '00-p2.jpg']
)


class Elements(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.items = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.items.append((tag, dict(attrs)))

    def select(self, tag, **attrs):
        return [node for kind, node in self.items if kind == tag
                and all(node.get(key) == value for key, value in attrs.items())]

    def by_class(self, tag, name):
        return [node for kind, node in self.items if kind == tag
                and name in node.get('class', '').split()]


def fragment(source, tag, class_name):
    match = re.search(rf'<{tag} class="{class_name}"[\s\S]*?</{tag}>', source)
    if not match:
        raise AssertionError(f'Missing {tag}.{class_name}')
    return re.sub(r'>\s+<', '><', match.group())


def generate(tree):
    generator = tree / 'tools/build.py'
    assert generator.resolve() != (REPO / 'tools/build.py').resolve()
    result = subprocess.run(
        [sys.executable, str(generator)], cwd=tree,
        env={**os.environ, 'SKIP_IMG': '1', 'FORGE_SRC': str(tree / '.forge-src')},
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode:
        raise AssertionError(f'Temporary Forge build failed:\n{result.stdout}\n{result.stderr}')


@contextmanager
def fixture(redirects):
    with tempfile.TemporaryDirectory(prefix='myclover-forge-generator-') as directory:
        tree = Path(directory)
        (tree / 'tools').mkdir()
        (tree / 'forge/img').mkdir(parents=True)
        shutil.copy2(REPO / 'tools/build.py', tree / 'tools/build.py')
        for name in INPUT_IMAGES:
            shutil.copy2(REPO / 'forge/img' / name, tree / 'forge/img' / name)
        if redirects is not None:
            (tree / '_redirects').write_text(redirects, encoding='utf-8', newline='')
        generate(tree)
        yield tree


class ForgeGeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original_redirects = (REPO / '_redirects').read_text(encoding='utf-8')
        cls.fixture_context = fixture(cls.original_redirects)
        cls.tree = cls.fixture_context.__enter__()
        cls.addClassCleanup(cls.fixture_context.__exit__, None, None, None)

    def page(self, slug=''):
        return (self.tree / 'forge' / slug / 'index.html').read_text(encoding='utf-8')

    def test_all_seven_cards_and_bonus_stay_open_without_losing_progress_ids(self):
        document = Elements(self.page())
        body = document.select('body')[0]
        self.assertEqual(body['data-forge-access'], 'open')
        self.assertEqual(body['class'], 'forge-reader-home')
        cards = document.by_class('a', 'ep')
        self.assertEqual(len(cards), 8)
        self.assertEqual([card.get('data-mc-item') for card in cards[:7]],
                         [f'forge:{slug}' for slug in SLUGS])
        self.assertTrue(all('data-mc-seq' not in card for card in cards))
        self.assertEqual(cards[-1]['href'], 'original/')
        self.assertTrue(document.select('a', **{'data-mc-continue': 'forge:'}))
        self.assertTrue(document.select('details', **{'data-mc-done': 'forge'}))
        self.assertTrue(document.select('i', **{'data-mc-bar': 'forge'}))

    def test_every_episode_preserves_the_current_reading_rail(self):
        for slug in SLUGS:
            with self.subTest(slug=slug):
                source = self.page(slug)
                document = Elements(source)
                baseline = (REPO / 'forge' / slug / 'index.html').read_text(encoding='utf-8')
                self.assertEqual(fragment(source, 'nav', 'forge-reader-nav'),
                                 fragment(baseline, 'nav', 'forge-reader-nav'))
                chapters = [node for node in document.select('a') if 'data-forge-chapter' in node]
                self.assertEqual([node['data-forge-chapter'] for node in chapters], list(SLUGS))
                current = [node for node in chapters if node.get('aria-current') == 'page']
                self.assertEqual([node['data-forge-chapter'] for node in current], [slug])
                self.assertEqual(document.select('body')[0]['data-forge-access'], 'open')
                self.assertTrue(document.select('meta', name='mc-item', content=f'forge:{slug}'))
                self.assertTrue(document.select('meta', name='mc-act-view', content='forge-ep-open'))
                self.assertTrue(any('data-mc-end' in node for node in document.select('nav')))
                self.assertEqual(len(document.by_class('a', 'panel'))
                                 + len(document.by_class('div', 'panel')), 4)

    def test_index_and_ep7_continue_directly_into_the_existing_course(self):
        for slug in ('', SLUGS[-1]):
            with self.subTest(slug=slug):
                source = self.page(slug)
                baseline = (REPO / 'forge' / slug / 'index.html').read_text(encoding='utf-8')
                self.assertEqual(fragment(source, 'section', 'forge-next-course'),
                                 fragment(baseline, 'section', 'forge-next-course'))
                document = Elements(source)
                self.assertEqual(document.by_class('a', 'forge-course-start')[0]['href'],
                                 '/classroom/free-ai.html')
                self.assertTrue(document.select('a', href='/classroom/'))
                self.assertTrue(document.select('a', href='/core7/tutorial/?entry=forge',
                                                **{'data-preserve-entry': 'forge'}))
                self.assertFalse(document.by_class('div', 'nextup'))
        self.assertTrue(Elements(self.page(SLUGS[-1])).select('a', href='/frontdoor/'))

    def test_reader_assets_outcomes_and_v1_scripts_are_retained_once(self):
        for slug in ('', *SLUGS):
            with self.subTest(slug=slug):
                document = Elements(self.page(slug))
                for path in ('/assets/front-door/outcomes.js', '/assets/track.js'):
                    self.assertEqual(len(document.select('script', src=path)), 1)
                self.assertEqual(len(document.select('link', href='/forge/reading-rail.css')), 1)
                self.assertEqual(len(document.select('script', src='/forge/reading-rail.js')), int(bool(slug)))
                self.assertTrue(any(node.get('src', '').endswith('/assets/quest.js')
                                    for node in document.select('script')))
        # Unrelated generated intro and paths must not acquire reader opt-outs.
        for path in ('forge/intro/index.html', 'paths/index.html'):
            document = Elements((self.tree / path).read_text(encoding='utf-8'))
            self.assertNotIn('data-forge-access', document.select('body')[0])
            self.assertFalse(document.select('script', src='/forge/reading-rail.js'))

    def test_existing_non_forge_redirect_rules_remain_in_their_original_order(self):
        generated = (self.tree / '_redirects').read_text(encoding='utf-8')
        def rules(source):
            return [line for line in source.splitlines()
                    if line.startswith('/') and not line.startswith('/forge/')]
        self.assertEqual(rules(generated), rules(self.original_redirects))
        sources = [line.split()[0] for line in generated.splitlines() if line.startswith('/')]
        self.assertEqual(sources.count('/forge/ep0-my-own-machine/'), 1)
        self.assertEqual(sources.count('/forge/ep12-a-new-game-a-new-league/*'), 1)

    def test_custom_routes_and_comments_survive_repeated_builds_verbatim(self):
        # Include existing overrides, an unknown Forge alias, CRLF and no final
        # newline. A generator must not silently reset another route owner's work.
        custom = ('# independently owned routes\r\n'
                  '/Xircle /xircle/current.html 200\r\n'
                  '/legacy-home /home/ 302\r\n'
                  '/forge/custom-reading-list/ /forge/ 302\r\n'
                  '# keep this final comment')
        with fixture(custom) as tree:
            first = (tree / '_redirects').read_bytes()
            self.assertTrue(first.startswith(custom.encode('utf-8')))
            self.assertEqual(first.count(b'/Xircle '), 1)
            self.assertNotIn(b'/register/*', first)
            generate(tree)
            self.assertEqual((tree / '_redirects').read_bytes(), first)

    def test_managed_block_preserves_unrelated_rules_even_inside_the_block(self):
        custom = ('# BEGIN tools/build.py Forge redirects\n'
                  '/forge/ep0-my-own-machine/ /obsolete/ 301\n'
                  '# another owner added a rule here\n'
                  '/future-room/ /new-room/ 302\n'
                  '# END tools/build.py Forge redirects\n'
                  '/invite /invite/ 302\n')
        with fixture(custom) as tree:
            first = (tree / '_redirects').read_text(encoding='utf-8')
            self.assertIn('# another owner added a rule here\n/future-room/ /new-room/ 302\n', first)
            self.assertNotIn('/obsolete/', first)
            self.assertEqual(first.count('/forge/ep0-my-own-machine/'), 1)
            generate(tree)
            self.assertEqual((tree / '_redirects').read_text(encoding='utf-8'), first)

    def test_missing_redirect_file_bootstraps_historical_defaults(self):
        with fixture(None) as tree:
            output = (tree / '_redirects').read_text(encoding='utf-8')
            for source in ('/register/*', '/core7/room/*', '/core7/profile/*', '/Xircle', '/invite'):
                self.assertIn(source, [line.split()[0] for line in output.splitlines() if line.startswith('/')])
            self.assertIn('/forge/ep1-everyone-gets-to-play/  301', output)


if __name__ == '__main__':
    unittest.main(verbosity=2)
