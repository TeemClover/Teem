/* TeamBook PET compatibility bridge.
   The standalone Vercel project inherited the working XTY_PET_* switches.
   Normalize them into TeamBook names before loading the real PET handler so
   scheduled wakes and direct replies keep working during the project split. */

export const config = { maxDuration: 300 };

function bridge(primary, legacy) {
  if (!process.env[primary] && process.env[legacy]) process.env[primary] = process.env[legacy];
}

export default async function handler(req, res) {
  bridge('TEAMBOOK_PET_AI', 'XTY_PET_AI');
  bridge('TEAMBOOK_PET_VISION', 'XTY_PET_VISION');
  bridge('TEAMBOOK_PET_TEXT_MODEL', 'XTY_PET_TEXT_MODEL');
  bridge('TEAMBOOK_PET_VISION_MODEL', 'XTY_PET_VISION_MODEL');
  bridge('TEAMBOOK_PET_WAKE_CONCURRENCY', 'XTY_PET_WAKE_CONCURRENCY');

  const mod = await import('./teambook-pet.js');
  return mod.default(req, res);
}
