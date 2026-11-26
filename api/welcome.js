import { createWelcomeHandler, createSqlStore } from './_lib/welcome.js';

let store;
export default createWelcomeHandler({
  salt: process.env.WELCOME_RATE_SALT || process.env.DATABASE_URL || process.env.POSTGRES_URL || 'unconfigured',
  async getStore() {
    if (store) return store;
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw Error('Welcome database is not configured');
    const { neon } = await import('@neondatabase/serverless');
    store = createSqlStore(neon(url));
    return store;
  }
});
