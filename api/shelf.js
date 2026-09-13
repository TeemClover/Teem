import { database } from './_lib/core.js';
import { currentBackofficeSession, ensureBackofficeSchema } from './_lib/backoffice-auth.js';
import { createShelfHandler } from './_lib/shelf-handler.js';
import { createSqlShelfRepository, ensureShelfSchema } from './_lib/shelf-store.js';
import { readShelfCatalog, readShelfSource } from './_lib/shelf-content.js';

export { createShelfHandler } from './_lib/shelf-handler.js';

let repositoryPromise;

export default createShelfHandler({
  async getRepository() {
    // Reuse the stateless Neon client per function instance; schema readiness
    // remains attached to this particular client, never another database.
    if (!repositoryPromise) repositoryPromise = (async () => {
      const sql = database();
      await ensureShelfSchema(sql);
      return createSqlShelfRepository(sql);
    })().catch(error => { repositoryPromise = undefined; throw error; });
    return repositoryPromise;
  },
  readCatalog: readShelfCatalog,
  readSource: readShelfSource,
  async isAdmin(req, repository) {
    await ensureBackofficeSchema(repository.sql);
    return Boolean(await currentBackofficeSession(repository.sql, req));
  },
});
