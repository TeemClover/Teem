import { database, sendJson } from './_lib/core.js';
import { createBodymestoryHandler } from './_lib/bodymestory-handler.js';

export default createBodymestoryHandler({ database, sendJson });
