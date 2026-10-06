// Current end-to-end verification entry point.
import {createPreviewServer} from './preview.mjs';
const server=createPreviewServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.SHORT_BASE_URL ||= `http://127.0.0.1:${server.address().port}`;
try {
  await import('./verify-app.mjs');
  await import('./verify-state.mjs');
} finally {await new Promise(resolve=>server.close(resolve));}
