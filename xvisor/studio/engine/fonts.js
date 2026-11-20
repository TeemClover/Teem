// Self-hosted OFL fonts already in the repo (assets/fonts). Canvas text only uses a face after it has loaded,
// so the preview, the in-browser export and the offline demo render all wait on this before drawing.
const THAI_RANGE = 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC';
const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const FACES = [
  ['XS Kanit', '800', '/assets/fonts/reel/kanit-800-thai.woff2', THAI_RANGE],
  ['XS Kanit', '800', '/assets/fonts/reel/kanit-800-latin.woff2', LATIN_RANGE],
  ['XS Mitr', '600', '/assets/fonts/reel/mitr-600-thai.woff2', THAI_RANGE],
  ['XS Mitr', '600', '/assets/fonts/reel/mitr-600-latin.woff2', LATIN_RANGE],
  ['XS Anuphan', '600', '/assets/fonts/site/anuphan-thai-600.woff2', THAI_RANGE],
  ['XS Anuphan', '600', '/assets/fonts/site/anuphan-latin-600.woff2', LATIN_RANGE]
];

export const FONT = {
  display: '"XS Kanit","Kanit","Noto Sans Thai","Thonburi",sans-serif',
  body: '"XS Mitr","Mitr","Noto Sans Thai","Thonburi",sans-serif',
  label: '"XS Anuphan","Anuphan","Noto Sans Thai","Thonburi",sans-serif'
};

let ready = null;
export function loadFonts() {
  if (ready) return ready;
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return (ready = Promise.resolve(false));
  ready = Promise.all(FACES.map(([family, weight, url, unicodeRange]) => {
    const face = new FontFace(family, `url(${url}) format("woff2")`, { weight, unicodeRange, display: 'block' });
    document.fonts.add(face);
    return face.load().catch(() => null);
  })).then(faces => faces.every(Boolean));
  return ready;
}
