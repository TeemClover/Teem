/* myClover runtime dispatcher
   Course pages use an isolated, failure-tolerant runtime.
   Everything else keeps the existing global runtime unchanged.
*/
/* track-core.js ไม่ได้ export ชื่อไหนออกมา และไม่มีไฟล์ไหนในบ้านนี้ import trackAct
   ถ้า re-export ทิ้งไว้ โมดูลนี้จะพังตั้งแต่ instantiate แล้ว runtime ข้างล่างจะไม่ถูกโหลดเลย */
import '/assets/track-core.js';

const path = location.pathname;
const isCoursePage = (
  /^\/classroom\/(?:lesson-0|free-ai|image-ai|clip-ai|notebooklm|prompts|first-web|full-lessons)(?:\.html)?$/.test(path) ||
  /^\/classroom\/sauce-cup\/?(?:index\.html)?$/.test(path)
);

const runtime = isCoursePage
  ? '/assets/course-runtime.js?v=20260811-restore-e166'
  : '/assets/track-legacy.js?v=20260811-split1';

import(runtime).catch(error => {
  console.error('[myClover runtime] failed to load', runtime, error);
});
