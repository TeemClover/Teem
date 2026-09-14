// Copy this endpoint and ai-source*.js helpers into the existing Teem repository.
// core.js remains the existing, unchanged Neon connection and JSON response helper.
import { database, sendJson } from './_lib/core.js';
import { createAiSourceHandler } from './_lib/ai-source-handler.js';
import { createLearnCommerce } from './_lib/learn-commerce.js';
export default createAiSourceHandler({ database, sendJson, school: createLearnCommerce() });
