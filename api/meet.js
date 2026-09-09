/* Production Meet endpoint. The shared handler keeps validation, schema and
   notification ordering identical in production and isolated local review. */
import { database, sendJson } from './_lib/core.js';
import { createMeetHandler } from './_lib/meet-handler.js';

export { ensureMeetSchema, createMeetHandler } from './_lib/meet-handler.js';
export default createMeetHandler({ database, sendJson });
