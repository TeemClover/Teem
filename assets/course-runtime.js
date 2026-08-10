/* myClover · AI ใส่ซอส — isolated canonical course runtime
   Baseline: e16610d (Fix first Sauce tooltip across lessons).
   One module may fail without taking the other lesson enhancements down.
*/

const path = location.pathname;
const isCoursePage = (
  /^\/classroom\/(?:lesson-0|free-ai|image-ai|clip-ai|notebooklm|prompts|first-web|full-lessons)(?:\.html)?$/.test(path) ||
  /^\/classroom\/sauce-cup\/?(?:index\.html)?$/.test(path)
);

if (isCoursePage) {
  const V='20260811-restore-e166';
  const modules = [
    `/assets/account.js?v=${V}`,
    `/assets/stat-report.js?v=${V}`,
    `/assets/ai-sauce-course.js?v=${V}`,
    `/assets/main-course-route.js?v=${V}`,
    `/assets/sauce-cup-entry.js?v=${V}`,
    `/assets/lesson-one-subquests.js?v=${V}`,
    `/assets/lesson1-polite-language.js?v=${V}`,
    `/assets/lesson1-downloadable-md.js?v=${V}`,
    `/assets/lesson6-boss-transition.js?v=${V}`,
    `/assets/course-nav-names.js?v=${V}`,
    `/assets/details-fix.js?v=${V}`,
    `/assets/notebooklm-page.js?v=${V}`,
    `/assets/notebooklm-hero-position.js?v=${V}`,
    `/assets/prompts-season.js?v=${V}`,
    `/assets/prompts-utility.js?v=${V}`,
    `/assets/prompts-chef.js?v=${V}`,
    `/assets/prompts-eko-tasting.js?v=${V}`,
    `/assets/prompts-svg-polish.js?v=${V}`,
    `/assets/prompts-plain-language.js?v=${V}`,
    `/assets/prompts-genesis-generic.js?v=${V}`,
    `/assets/lesson2-svg-redesign.js?v=${V}`,
    `/assets/course-svg-motion.js?v=${V}`,
    `/assets/sauce-first-tooltip.js?v=${V}`,
    `/assets/course-dungeon-route.js?v=${V}`,
  ];

  (async () => {
    for (const src of modules) {
      try {
        await import(src);
      } catch (error) {
        console.error('[myClover course runtime] skipped broken module:', src, error);
      }
    }
    document.documentElement.dataset.courseRuntime = 'e166-restored';
  })();
}
