/**
 * A letter follows the reader's scroll, without a second clock or animation loop.
 * The controller calls read() before its frame's writes, then render(snapshot).
 * Only untransformed anchors are measured; their children carry the paper and photo.
 */
const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => value * value * (3 - 2 * value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const mix = (from, to, progress) => from + (to - from) * progress;
const cssNumber = value => String(Math.round(value * 10000) / 10000);

function arrival(top, height, start, end) {
  // Missing layout must leave the content open, rather than hide it behind a flap.
  if (!finite(top) || !finite(height) || height <= 0) return 1;
  return smooth(clamp((start - top / height) / (start - end)));
}

function anchorTop(anchor) {
  const top = anchor?.getBoundingClientRect?.()?.top;
  return finite(top) ? top : null;
}

export function createLetterMotion({element} = {}) {
  const letter = element?.querySelector?.('[data-letter-anchor]');
  const photo = element?.querySelector?.('[data-photo-anchor]');

  return {
    read() {
      const height = element?.ownerDocument?.defaultView?.innerHeight
        ?? globalThis.innerHeight;
      return {
        height: finite(height) && height > 0 ? height : null,
        letterTop: anchorTop(letter),
        photoTop: anchorTop(photo),
      };
    },

    render(frame, {settled = false} = {}) {
      if (!element?.style?.setProperty) return;
      const height = frame?.height;
      const paper = settled ? 1 : arrival(frame?.letterTop, height, 1.03, .52);
      const sticker = settled ? 1 : arrival(frame?.letterTop, height, .85, .5);
      const photograph = settled ? 1 : arrival(frame?.photoTop, height, 1.03, .6);
      const values = {
        '--letter-y': `${cssNumber(mix(36, 0, paper))}px`,
        '--letter-turn': `${cssNumber(mix(-3, 0, paper))}deg`,
        '--letter-fold': `${cssNumber(mix(85, 0, paper))}deg`,
        '--letter-fold-shade': cssNumber(mix(.85, 0, paper)),
        '--letter-sticker-y': `${cssNumber(mix(-50, 0, sticker))}px`,
        '--letter-sticker-turn': `${cssNumber(mix(20, -12, sticker))}deg`,
        '--letter-sticker-scale': cssNumber(mix(1.2, 1, sticker)),
        '--letter-sticker-opacity': cssNumber(sticker),
        '--letter-photo-y': `${cssNumber(mix(-120, 0, photograph))}px`,
        '--letter-photo-turn': `${cssNumber(mix(3, -2, photograph))}deg`,
        '--letter-photo-opacity': cssNumber(mix(.15, 1, photograph)),
      };
      for (const [name, value] of Object.entries(values)) element.style.setProperty(name, value);
    },
  };
}
