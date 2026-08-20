#!/usr/bin/env python3
"""Turn the decor PNG pack into a web-sized .webp library.

Three things happen here and nothing else:
  1. every asset is trimmed to its own ink, so nobody ships padding;
  2. the sheets that still hold several elements are split on alpha;
  3. everything is written as lossy webp with the alpha channel kept.

The PNGs stay the master. This only produces what the pages load.
"""
import os, json
from PIL import Image
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'xty/assets/decor/_source')
OUT = os.path.join(ROOT, 'xty/assets/decor')
QUALITY = 82
ALPHA_FLOOR = 24      # below this a pixel is background, not soft edge
MIN_BLOB = 250        # smaller than this is dust from the cut, not an element

# Only the sheets that genuinely hold separate pieces. Tabs that touch each
# other are one picture and stay one picture.
SPLIT = {
  '01_Brand/05_RGBS_ActivityIcons':      ('brand', ['activity-fire', 'activity-leaf', 'activity-water', 'activity-craft']),
  '03_UI_Stickers/12_RGBS_RibbonTabs':   ('sticker', ['ribbon-tabs-warm', 'ribbon-tabs-cool']),
  '03_UI_Stickers/16_SpeechBubbles_Mini_Set': ('sticker', ['bubble-mini-me', 'bubble-mini-heart', 'bubble-mini-clover', 'bubble-mini-dots']),
  '03_UI_Stickers/17_Activity_Circle_Buttons': ('sticker', ['button-fire', 'button-leaf', 'button-water', 'button-craft']),
  '03_UI_Stickers/20_Blank_Ribbon_Labels': ('sticker', ['ribbon-blank-wide', 'ribbon-blank-short']),
  '04_Stationery/01_Clips_And_Pins_Set':  ('stationery', ['clip-paper', 'pin-red', 'pin-blue', 'pin-yellow', 'clip-binder']),
  '04_Stationery/02_Washi_Tapes_Set':     ('stationery', ['washi-kraft', 'washi-gingham-pink', 'washi-gingham-green', 'washi-stars-blue', 'washi-stripe-yellow']),
  '04_Stationery/03_Colored_Pencils_Set': ('stationery', ['pencil-red', 'pencil-green', 'pencil-grey']),
  '05_Doodles/11_Color_Scribbles_Set':    ('doodle', ['scribble-red', 'scribble-green', 'scribble-blue', 'scribble-grey',
                                                      'scribble-yellow', 'scribble-pink', 'scribble-green-soft', 'scribble-blue-soft']),
}

# Everything else, renamed to what it is rather than what number it was.
KEEP = {
  '01_Brand/01_Primary_Notebook_Icon':      ('brand', 'notebook-mark'),
  '01_Brand/02_DualStroke_HeartMark':       ('brand', 'heart-mark'),
  '01_Brand/03_ME_SpeechBubble':            ('brand', 'me-bubble'),
  '01_Brand/04_FourLeaf_Clover_Heritage':   ('brand', 'clover-heritage'),

  '02_Mascots/01_WhiteCat_Pencil_Wink':     ('mascot', 'cat-pencil-wink'),
  '02_Mascots/02_WhiteCat_Sleeping_OnBook': ('mascot', 'cat-asleep-on-book'),
  '02_Mascots/03_WhiteCat_Holding_TeamBook':('mascot', 'cat-holding-book'),
  '02_Mascots/04_WhiteCat_Playing_Yarn':    ('mascot', 'cat-yarn'),
  '02_Mascots/05_WhiteCat_Looking_Up':      ('mascot', 'cat-looking-up'),
  '02_Mascots/06_WhiteCat_Peeking_Box':     ('mascot', 'cat-in-box'),
  '02_Mascots/07_WhiteCat_Holding_Clover':  ('mascot', 'cat-holding-clover'),
  '02_Mascots/08_WhiteCat_Sleeping_Calm':   ('mascot', 'cat-asleep'),

  '03_UI_Stickers/01_Blank_SpeechBubble':   ('sticker', 'bubble-blank'),
  '03_UI_Stickers/02_Heart_SpeechBubble':   ('sticker', 'bubble-heart'),
  '03_UI_Stickers/03_Note_Paperclip':       ('sticker', 'note-clipped'),
  '03_UI_Stickers/04_Yellow_StickyNote':    ('sticker', 'sticky-yellow'),
  '03_UI_Stickers/05_Heart_StickyNote':     ('sticker', 'sticky-heart'),
  '03_UI_Stickers/06_Ribbon_Note':          ('sticker', 'ribbon-note'),
  '03_UI_Stickers/07_TornTape_Clover':      ('sticker', 'tape-clover'),
  '03_UI_Stickers/08_Reaction_LetsGo':      ('sticker', 'reaction-lets-go'),
  '03_UI_Stickers/09_Reaction_GoodJob':     ('sticker', 'reaction-good-job'),
  '03_UI_Stickers/10_Reaction_SeeYouTomorrow': ('sticker', 'reaction-see-you-tomorrow'),
  '03_UI_Stickers/11_Reaction_OnTheSamePage':  ('sticker', 'reaction-same-page'),
  '03_UI_Stickers/13_String_Tags':          ('sticker', 'tags-on-string'),
  '03_UI_Stickers/14_Reaction_Heart':       ('sticker', 'reaction-heart'),
  '03_UI_Stickers/15_Reaction_Like':        ('sticker', 'reaction-like'),
  '03_UI_Stickers/18_Activity_Tabs_WithIcons': ('sticker', 'activity-tabs-icons'),
  '03_UI_Stickers/19_Activity_Tabs_Plain':  ('sticker', 'activity-tabs-plain'),
  '03_UI_Stickers/21_LetsGo_PaperNote':     ('sticker', 'note-lets-go'),
  '03_UI_Stickers/22_Heart_Bubble_Note':    ('sticker', 'note-heart'),
  '03_UI_Stickers/23_Clover_Sticky':        ('sticker', 'sticky-clover'),
  '03_UI_Stickers/24_Label_Team':           ('sticker', 'label-team'),
  '03_UI_Stickers/25_Label_Progress':       ('sticker', 'label-progress'),
  '03_UI_Stickers/26_Label_Memory':         ('sticker', 'label-memory'),
  '03_UI_Stickers/27_Label_Together':       ('sticker', 'label-together'),

  '04_Stationery/04_Coffee_Clover':         ('stationery', 'coffee-clover'),
  '04_Stationery/05_Open_Notebook':         ('stationery', 'notebook-open'),
  '04_Stationery/06_Closed_Brown_Notebook': ('stationery', 'notebook-closed'),
  '04_Stationery/07_RGBS_Cards_Fan':        ('stationery', 'cards-fan'),
  '04_Stationery/08_TeamBook_Notebook_WithStrap': ('stationery', 'notebook-strapped'),
  '04_Stationery/09_Coffee_Clover_Foam':    ('stationery', 'coffee-foam'),
  '04_Stationery/10_Clover_Memory_Jar':     ('stationery', 'memory-jar'),
  '04_Stationery/11_Open_Notebook_Large':   ('stationery', 'notebook-open-large'),
  '04_Stationery/12_Wood_Pencil':           ('stationery', 'pencil'),
  '04_Stationery/13_PhotoStack_Clipped':    ('stationery', 'photo-stack'),
  '04_Stationery/14_Feather_Pen':           ('stationery', 'feather-pen'),
  '04_Stationery/15_Dream_Do_Share_Signpost': ('stationery', 'signpost'),
  '04_Stationery/16_Clover_WaxSeal':        ('stationery', 'wax-seal'),

  '05_Doodles/01_Star_Outline':             ('doodle', 'star'),
  '05_Doodles/02_Heart_Outline':            ('doodle', 'heart'),
  '05_Doodles/03_Clover_Outline':           ('doodle', 'clover'),
  '05_Doodles/04_PaperPlane_Outline':       ('doodle', 'plane-outline'),
  '05_Doodles/05_Music_Note':               ('doodle', 'music-note'),
  '05_Doodles/06_Flower_Doodle':            ('doodle', 'flower'),
  '05_Doodles/07_Leaves_Doodle':            ('doodle', 'leaves'),
  '05_Doodles/08_PaperPlane_Blue':          ('doodle', 'plane'),
  '05_Doodles/09_Sprout':                   ('doodle', 'sprout'),
  '05_Doodles/10_Footprint':                ('doodle', 'footprint'),
  '05_Doodles/12_PaperPlane_Path':          ('doodle', 'plane-path'),
  '05_Doodles/13_Heart_Path_Doodle':        ('doodle', 'heart-path'),
}


def trim(im):
    """Crop to the ink. Padding is bytes nobody asked for and it also makes
       a sticker impossible to position by its own edges."""
    box = im.getchannel('A').point(lambda v: 255 if v > ALPHA_FLOOR else 0).getbbox()
    return im.crop(box) if box else im


def write(im, group, name, manifest):
    os.makedirs(f'{OUT}/{group}', exist_ok=True)
    path = f'{OUT}/{group}/{name}.webp'
    im.save(path, 'WEBP', quality=QUALITY, method=6, exact=False)
    manifest.append({'group': group, 'name': name, 'w': im.width, 'h': im.height,
                     'kb': round(os.path.getsize(path) / 1024, 1)})


def pieces(im):
    """Separate elements, left to right, top row first."""
    mask = np.array(im)[:, :, 3] > ALPHA_FLOOR
    lab, n = ndimage.label(mask)
    boxes = ndimage.find_objects(lab)
    out = []
    for i, box in enumerate(boxes):
        if box is None:
            continue
        ys, xs = box
        if int(mask[box].sum()) < MIN_BLOB:
            continue                       # dust from the cut
        out.append((ys.start, xs.start, box, i + 1))
    # Read like a page: rows first, then left to right within a row.
    if out:
        heights = [b[2][0].stop - b[2][0].start for b in out]
        row = max(heights) * 0.6
        out.sort(key=lambda b: (round(b[0] / row), b[1]))
    for _, _, box, label_id in out:
        cut = np.array(im).copy()
        cut[:, :, 3] = np.where(lab == label_id, cut[:, :, 3], 0)
        yield trim(Image.fromarray(cut, 'RGBA').crop(
            (box[1].start, box[0].start, box[1].stop, box[0].stop)))


def main():
    manifest = []
    for stem, (group, name) in KEEP.items():
        write(trim(Image.open(f'{SRC}/{stem}.png').convert('RGBA')), group, name, manifest)
    for stem, (group, names) in SPLIT.items():
        im = Image.open(f'{SRC}/{stem}.png').convert('RGBA')
        got = list(pieces(im))
        if len(got) != len(names):
            raise SystemExit(f'{stem}: expected {len(names)} pieces, found {len(got)}')
        for piece, name in zip(got, names):
            write(piece, group, name, manifest)
    manifest.sort(key=lambda m: (m['group'], m['name']))
    print(json.dumps(manifest, indent=0))
    print(f"\n{len(manifest)} files, {round(sum(m['kb'] for m in manifest))} KB total")


if __name__ == '__main__':
    main()
