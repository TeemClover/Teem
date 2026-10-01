// Published free lessons and the resources used by them. New files do not
// become public merely because they are added under /classroom/.
export const INDEXED_CLASSROOM_FILES = [
  'index.html', 'lesson-0.html', 'free-ai.html', 'image-ai.html', 'clip-ai.html',
  'notebooklm.html', 'prompts.html', 'first-web.html', 'full-lessons.html',
  'sauce-cup/index.html', 'dungeon/index.html', 'awaken/index.html',
  'awaken/notebook/index.html',
];
const publicFiles = new Set([...INDEXED_CLASSROOM_FILES,
  'dungeon/force-reset.html', 'awaken/legacy.html', 'awaken/legacy-snapshot.html',
  'AI-SAUCE-COURSE-MASTER.md', 'lv5/vault-data.js',
  'lv4/myclover-growth-blueprint.pdf', 'lv4/myclover_GLHF_7C_GrowthOS_Source.md',
  'examples/main-source-example.md', 'examples/lesson6-smart-resume.html',
  'media/lesson3-source-example.mp4',
]);
export const isPublicClassroomFile = file => publicFiles.has(file);
export const PUBLIC_CLASSROOM_HEADERS = { 'Cache-Control': 'public, max-age=0, must-revalidate' };
export const classroomURL = file => '/classroom/' + file.replace(/(^|\/)index\.html$/, '$1');
