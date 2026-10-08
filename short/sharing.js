// A cancelled native share should never silently copy anything to the clipboard.
export async function shareLink(data, {platform = globalThis.navigator, preferNative = true} = {}) {
  if (preferNative && typeof platform?.share === 'function') {
    try {
      if (!platform.canShare || platform.canShare(data)) {
        await platform.share(data);
        return 'shared';
      }
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await platform.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'manual';
  }
}
