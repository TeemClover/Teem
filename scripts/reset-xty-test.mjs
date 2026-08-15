import { database } from '../api/_lib/core.js';

const CONFIRMATION = 'DELETE_XTY_TEST_DATA';
const production = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

if (production) {
  throw new Error('Refusing to reset XTY while the environment is marked production.');
}
if (process.env.XTY_RESET_CONFIRM !== CONFIRMATION) {
  throw new Error(`Set XTY_RESET_CONFIRM=${CONFIRMATION} to run the XTY-only test reset.`);
}

const sql = database();
const tables = [
  'xty_confirmations', 'xty_reactions', 'xty_posts', 'xty_party_events',
  'xty_level_events', 'xty_card_rewards', 'xty_card_ownership',
  'xty_members', 'xty_parties', 'xty_progression',
];

for (const table of tables) await sql.query(`DELETE FROM ${table}`);
console.log(`Reset complete: ${tables.length} XTY tables cleared. Account, session, auth, and non-XTY progress were not touched.`);
