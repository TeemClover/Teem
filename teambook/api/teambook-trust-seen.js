/* Dedicated route for member Seen inside trust-mode books.
   The legacy catch-all /api/teambook/party/:code/confirm intentionally
   rejects non-confirm books. Trust books still allow Seen as a social action,
   so route those clicks to the trust-aware handler directly. */
export { default } from './teambook/party/[code]/confirm.js';
