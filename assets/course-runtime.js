/* myClover · AI ใส่ซอส — isolated classroom runtime
   Canonical lesson pages must not depend on the whole site's Boss/Forge patch graph.
   Each module loads independently: one broken enhancement must never roll the whole course back.
*/

const path = location.pathname;
const isCoursePage = (
  /^\/classroom\/(?:lesson-0|free-ai|image-ai|clip-ai|notebooklm|prompts|first-web|full-lessons)(?:\.html)?$/.test(path) ||
  /^\/classroom\/sauce-cup\/?(?:index\.html)?$/.test(path)
);

if (isCoursePage) {
  const modules = [
    '/assets/account.js',
    '/assets/stat-report.js',
    '/assets/ai-sauce-course.js',
    '/assets/main-course-route.js',
    '/assets/sauce-cup-entry.js',
    '/assets/lesson-one-subquests.js',
    '/assets/lesson1-polite-language.js',
    '/assets/lesson1-downloadable-md.js',
    '/assets/lesson6-boss-transition.js?v=20260811-course1',
    '/assets/course-nav-names.js',
    '/assets/details-fix.js?v=20260811-course1',
    '/assets/notebooklm-page.js',
    '/assets/notebooklm-hero-position.js',
    '/assets/prompts-season.js',
    '/assets/prompts-utility.js',
    '/assets/prompts-chef.js',
    '/assets/prompts-eko-tasting.js',
    '/assets/prompts-svg-polish.js',
    '/assets/prompts-plain-language.js',
    '/assets/prompts-genesis-generic.js',
    '/assets/lesson2-svg-redesign.js',
    '/assets/course-svg-motion.js',
    '/assets/classroom-hero-consistency.js?v=20260811-course1',
    '/assets/sauce-first-tooltip.js?v=20260811-course1',
  ];

  (async () => {
    for (const src of modules) {
      try {
        await import(src);
      } catch (error) {
        console.error('[myClover course runtime] skipped broken module:', src, error);
      }
    }
    document.documentElement.dataset.courseRuntime = 'ready';
  })();
}
