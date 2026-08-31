export const SAVE_KEY = "xvisorQuestContinueV4";
export const SAVE_VERSION = 5;
export const LEGACY_SAVE_VERSIONS = Object.freeze([4]);

export function hasQuestSave(storage) {
  if (!storage) return false;
  try {
    return Boolean(storage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}
