// Local test adapter for Pages. The actual API and Stat guard execute inside workerd.
import { onRequest as api } from '../../functions/api/core7/[[path]].js';
import { onRequest as stat } from '../../functions/stat/_middleware.js';

export default {
  fetch(request, env, execution) {
    const pathname = new URL(request.url).pathname;
    const context = { request, env, waitUntil: promise => execution.waitUntil(promise), params: { path: pathname.slice('/api/core7/'.length).split('/') }, next: () => env.ASSETS.fetch(request) };
    if (pathname.startsWith('/api/core7/')) return api(context);
    if (pathname.startsWith('/stat/')) return stat(context);
    return env.ASSETS.fetch(request);
  },
};
