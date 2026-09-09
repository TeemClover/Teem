/** Cover-style environments. Code-drawn rooms remain the immediate fallback. */
export const SCENE_ATLAS_URL = new URL('./assets/neighborhood-scenes-v2.png', import.meta.url).href;
const QUADRANTS = Object.freeze({ office: [0, 0], academy: [0, 0], kitchen: [1, 0], studio: [0, 1], garden: [1, 1], community: [1, 1] });

export function createSceneAtlas(onReady) {
  let image = null;
  let destroyed = false;
  const loaded = () => { if (!destroyed) onReady?.(); };
  const failed = () => { /* The fallback remains visible when the asset is unavailable. */ };
  function draw(context, location) {
    if (destroyed || !QUADRANTS[location] || typeof Image === 'undefined') return false;
    if (!image) {
      image = new Image();
      image.addEventListener('load', loaded);
      image.addEventListener('error', failed);
      image.src = SCENE_ATLAS_URL;
    }
    if (!image.complete || !image.naturalWidth) return false;
    const [column, row] = QUADRANTS[location];
    const width = image.naturalWidth / 2, height = image.naturalHeight / 2;
    context.save();
    context.imageSmoothingEnabled = false;
    // Trim the dividing grid, preserving each quadrant's full aspect ratio.
    context.drawImage(image, column * width + 1, row * height + 1, width - 2, height - 2, 0, 0, 384, 216);
    context.restore();
    return true;
  }
  function destroy() {
    destroyed = true;
    image?.removeEventListener('load', loaded);
    image?.removeEventListener('error', failed);
    image = null;
  }
  return { draw, destroy };
}
