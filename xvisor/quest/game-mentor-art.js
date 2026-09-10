// Teem and Ako speak from outside the game world. This atlas is for portraits only.
// Loading is optional: callers keep an identity-matched portrait fallback until ready.
export const MENTOR_ASSET_URL = new URL("./assets/teem-ako-guides-v2.png", import.meta.url).href;
let atlas = null;
const listeners = new Set();
function loadedAtlas(onReady) {
  if (typeof Image === "undefined") return null;
  if (!atlas) {
    atlas = new Image();
    atlas.addEventListener("load", () => { for (const listener of listeners) listener(); listeners.clear(); });
    atlas.addEventListener("error", () => listeners.clear());
    atlas.src = MENTOR_ASSET_URL;
  }
  if (atlas.complete && atlas.naturalWidth) return atlas;
  if (onReady) listeners.add(onReady);
  return null;
}

export function drawMentorPortrait(ctx, id, x, y, size, onReady) {
  const image = loadedAtlas(onReady);
  if (!image) return false;
  const crop = id === "ako" ? [753, 64, 395, 420] : [170, 24, 372, 395];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, ...crop, x, y, size, size);
  ctx.restore();
  return true;
}
