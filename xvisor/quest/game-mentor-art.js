// Both guides are drawn from the same cover-derived atlas, in portraits and scenes.
// Loading is optional: callers keep their code-drawn character until the asset is ready.
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

export function drawMentorSprite(ctx, id, centerX, footY, height = 90, onReady) {
  if (!["teem", "ako"].includes(id)) return false;
  const image = loadedAtlas(onReady);
  if (!image) return false;
  const half = image.naturalWidth / 2;
  const width = height * half / image.naturalHeight;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, id === "ako" ? half : 0, 0, half, image.naturalHeight, centerX - width / 2, footY - height, width, height);
  ctx.restore();
  return true;
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
