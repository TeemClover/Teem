import { STATUS, createApi, createLearner, parseRoute, courseRoute, safeAssetUrl, durationLabel, dateLabel, progressSummary, validId } from './learn-core.js?v=learner-ready-4';
import { authRequest, safeReturn, showVerification } from './account-step.js';
import { renderLessonReading } from './lesson-reading.js?v=learner-ready-4';
import { createLessonPlayer } from './lesson-player.js?v=learner-ready-4';
import { renderLessonTools } from './lesson-tools.js?v=companion-6';
import { renderStudentVideoCredits } from './student-video-credits.js?v=student-video-2';

const $ = id => document.getElementById(id);
const el = (tag, text = '', className = '') => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
const api = createApi(window.fetch.bind(window));
const video = $('lesson-video');
const player = createLessonPlayer({ video, overlay: $('player-overlay'), message: $('player-status'), button: $('player-action') });
let learner, activeCourse = null, selectedId = null, lastSaved = 0, progressBusy = false, enrollmentBusy = false, booting = false, verificationVersion = 0;
const lessonLinks = new Map();
let lessonTools = null;
function renderShowcase(cards = []) {
  const container = $('showcase-cards'); container.replaceChildren();
  for (const card of cards) {
    const url = safeAssetUrl(card.url, location.origin); if (!url) continue;
    const figure = el('figure', '', 'showcase-card'), img = el('img');
    img.src = url; img.alt = card.title || 'ตัวอย่างผลงานจากคลาสจริง'; img.loading = 'lazy'; img.decoding = 'async'; img.width = 960; img.height = 540;
    const caption = el('figcaption'); caption.append(el('h4', card.title), el('p', card.description));
    figure.append(img, caption); container.append(figure);
  }
  $('lesson-showcase').hidden = !container.childElementCount;
}
$('showcase-start').addEventListener('click', () => { $('player-action').click(); $('player-wrap').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
function isBossLesson() { return activeCourse?.course?.lessons.find(item => item.id === selectedId)?.type === 'boss'; }
function status(text = '') { $('page-status').textContent = text; }
function showOnly(id) { ['state-panel', 'library', 'classroom'].forEach(key => { $(key).hidden = key !== id; }); }
function action(text, callback, secondary = false) { const b = el('button', text, `button button-${secondary ? 'secondary' : 'primary'}`); b.type = 'button'; b.addEventListener('click', callback); return b; }
function link(text, href, secondary = false) { const a = el('a', text, `button button-${secondary ? 'secondary' : 'primary'}`); a.href = href; return a; }
function courseArt(course, index) {
  const art = el('div', '', 'course-art');
  const fallback = () => {
    art.className = 'course-art'; art.setAttribute('aria-hidden', 'true');
    art.replaceChildren(el('p', 'MYCLOVER / LEARNING', 'course-art-label'), el('p', course.title || 'เรียนรู้แล้วนำไปใช้', 'course-art-title'));
  };
  // Public cover metadata can name only a local, reviewed WebP cover file.
  if (typeof course.coverImage !== 'string' || course.coverImage.trim() !== course.coverImage || !/^\/learn\/assets\/course-covers\/[a-z0-9-]+\.webp$/.test(course.coverImage)) { fallback(); return art; }
  art.className = 'course-art course-art-cover';
  const img = el('img', '', 'course-cover'); img.alt = `ปกคอร์ส ${course.title}`;
  img.width = 1672; img.height = 941; img.loading = index === 0 ? 'eager' : 'lazy'; img.decoding = 'async';
  img.addEventListener('error', fallback, { once: true }); img.src = course.coverImage;
  art.append(img); return art;
}
function badge(state, role) { return el('span', role === 'instructor' ? 'ผู้สอน · เปิดตรวจได้ทุกบท' : STATUS[state]?.label || 'กำลังตรวจสอบ', `badge ${state || ''}`); }
function courseChapters(course) {
  const lessons = [...course.lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
  const seen = new Set(), chapters = [];
  for (const section of course.sections || []) {
    const candidates = Array.isArray(section.lessonIds) ? section.lessonIds.map(id => lessons.find(item => item.id === id)).filter(Boolean)
      : lessons.filter(item => item.sectionId === section.id);
    const parts = candidates.filter(item => !seen.has(item.id) && seen.add(item.id));
    if (parts.length) chapters.push({ ...section, parts });
  }
  const remaining = lessons.filter(item => !seen.has(item.id));
  if (remaining.length) chapters.push({ id: 'course-parts', label: 'ลำดับการเรียน', title: 'เรียนทีละตอน แล้วนำไปใช้', parts: remaining });
  return chapters;
}
function partContext(course, id) {
  const chapters = courseChapters(course), chapter = chapters.find(item => item.parts.some(part => part.id === id));
  return { chapters, chapter, index: chapter?.parts.findIndex(part => part.id === id) ?? -1 };
}
function partName(item) { return item.partTitle || item.title || 'บทเรียน'; }
function renderCourseBonus(bonus) {
  const section=$('course-bonus'); section.replaceChildren(); section.hidden=!bonus;
  if (!bonus) return;
  const cover=el('img','','bonus-cover'); cover.src='/ai-source/assets/ai-sauce-companion-cover-v2.webp'; cover.width=540;cover.height=960;cover.loading='lazy';cover.alt='คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น';section.append(cover);
  const heading=el('h2',bonus.title || 'คู่มือ AI ใส่ซอส + AI ผู้ช่วยงาน'); heading.id='course-bonus-title';
  section.append(el('p','อ่านทบทวน · เปิดผู้ช่วย แล้วลงมือ','eyebrow'),heading);
  if (bonus.description) section.append(el('p',bonus.description));
  const messages={included:'ชุดนี้อยู่ในสิทธิ์ของคุณ ดาวน์โหลดเก็บไว้ แล้วเริ่มจากคู่มือ PDF ได้เลย',not_included:'แพ็กที่คุณสมัครมีบทเรียนและไฟล์ฝึกครบ ส่วนชุดคู่มือ PDF + AI ผู้ช่วยงานนี้ไม่ได้รวมอยู่ในแพ็ก',unverified:'บทเรียนของคุณเปิดได้ตามเดิม กำลังตรวจข้อมูลสิทธิ์ชุดคู่มือ หากซื้อแพ็กที่รวมชุดนี้ ให้ติดต่อผู้สอนเพื่อตรวจสอบ',access_required:'เมื่อยืนยันชำระและเปิดสิทธิ์แล้ว ชุดนี้จะปรากฏตามแพ็กที่คุณสมัคร'};
  section.append(el('p',messages[bonus.status] || messages.unverified,'bonus-status'));
  if (bonus.status==='included') {
    const files=el('div','','bonus-files');
    for (const resource of bonus.resources || []) {
      const href=safeAssetUrl(resource.url,location.origin); if (!href) continue;
      const a=el('a','','resource-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';
      const label=el('span',resource.title || resource.filename || 'ดาวน์โหลด');
      label.append(el('small',/pdf/i.test(resource.mimeType) ? 'PDF · อ่านในมือถือได้' : '.MD · แนบหรือคัดลอกให้ AI ที่คุณใช้อยู่'));
      a.append(label,el('span','↓','resource-arrow'));files.append(a);
    }
    section.append(files,el('p','อ่านหลักคิดใน PDF → แนบไฟล์ผู้ช่วยงาน .md ให้ AI → ช่วยกันเก็บซอส ทำร่าง ชิมและปรับ → บันทึกซอสกับสูตรไว้ใช้ต่อ','bonus-howto'));
  } else if (bonus.status==='unverified') {
    const a=el('a','ให้ผู้สอนตรวจสิทธิ์ ↗');a.href='https://lin.ee/rlSlhzT';a.target='_blank';a.rel='noopener noreferrer';section.append(a);
  }
}
function partStep(item, index, count) { return [`ตอน ${index + 1}${count ? ` จาก ${count}` : ''}`, item.partLabel].filter(Boolean).join(' · '); }
function explainLockedLesson(title) { status(`“${title}” อยู่ในคอร์สเต็ม บัญชีนี้ยังเปิดสิทธิ์ไม่ครบ ดูสถานะการสมัครหรือให้ผู้สอนตรวจสิทธิ์ได้`); $('page-status').scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
async function selectLesson(id) { if (await learner.openLesson(id)) $('lesson-title').scrollIntoView({ block: 'start', behavior: 'auto' }); }
function clearPlayer() {
  lessonTools?.destroy(); lessonTools = null; $('lesson-tools').replaceChildren(); $('lesson-tools').hidden = true; renderShowcase();
  renderStudentVideoCredits($('student-video-credits'));
  player.reset();
  selectedId = null; progressBusy = false; lastSaved = 0;
  video.pause(); video.removeAttribute('src'); video.replaceChildren(); video.load();
  $('player-wrap').hidden = true; $('video-note').hidden = true; $('lesson-body').hidden = true;
  $('lesson-placeholder').hidden = false; $('lesson-placeholder').textContent = 'เลือกบทเรียนจากสารบัญ';
  $('resource-list').replaceChildren(); $('lesson-reading').replaceChildren(); $('save-status').textContent = '';
  $('reading-intro').hidden = true; $('chapter-parts-section').hidden = true; $('chapter-parts-links').replaceChildren();
  $('media-message').hidden = true; $('boss-invitation').hidden = true;
}
function statePanel(title, text, controls = []) {
  verificationVersion += 1;
  status(); showOnly('state-panel'); const panel = $('state-panel'); panel.replaceChildren(el('p', 'MY LEARNING', 'eyebrow'), el('h1', title), el('p', text));
  const row = el('div', '', 'state-actions'); row.append(...controls); panel.append(row);
}
function updateProgress(progress = {}, lessonId) {
  const p = progressSummary(progress); $('course-progress').value = p.percent;
  $('course-progress-label').textContent = p.total ? `${p.completed} / ${p.total} ตอน` : '';
  for (const [id, node] of lessonLinks) {
    if (node.dataset.locked === 'true') continue;
    node.querySelector('.lesson-icon').textContent = progress.lessons?.[id]?.completed ? '✓' : '○';
  }
  if (lessonId && selectedId === lessonId) {
    const completed = progress.lessons?.[lessonId]?.completed === true;
    $('complete-lesson').textContent = completed ? 'เรียนตอนนี้จบแล้ว ✓' : 'เรียนและลองทำตอนนี้แล้ว';
    $('complete-lesson').disabled = completed;
  }
}
function courseNav(data) {
  const course = data.course, nav = $('lesson-navigation'); nav.replaceChildren(); lessonLinks.clear();
  const chapters = courseChapters(course);
  const makeLesson = (item, index) => {
    const a = el('a', '', 'lesson-link'); a.dataset.lessonId = item.id; a.dataset.locked = String(!!item.locked);
    const icon = el('span', item.locked ? '—' : '○', 'lesson-icon'); icon.setAttribute('aria-hidden', 'true');
    const label = el('span', '', 'lesson-link-label');
    label.append(el('small', partStep(item, index), 'lesson-part-label'), el('span', partName(item), 'lesson-name'));
    const sub = [item.locked ? '🔒 คอร์สเต็ม' : item.preview ? 'บทตัวอย่าง' : '', durationLabel(item.durationSeconds)].filter(Boolean).join(' · ');
    if (sub) label.append(el('small', sub, 'lesson-meta')); a.append(icon, label);
    if (item.locked) { a.href = '/ai-source/#offer'; a.setAttribute('aria-label', `${item.title} — ดูสิทธิ์คอร์สเต็ม`); a.addEventListener('click', event => { event.preventDefault(); explainLockedLesson(item.title); }); }
    else { a.href = courseRoute(course.id, item.id); a.addEventListener('click', event => { event.preventDefault(); selectLesson(item.id); }); }
    lessonLinks.set(item.id, a); return a;
  };
  for (const chapter of chapters) {
    const group = el('section', '', 'chapter-group'); group.dataset.sectionId = chapter.id;
    const heading = el('div', '', 'chapter-heading'), title = el('h3', chapter.title || 'บทเรียน');
    title.id = `chapter-${chapter.id}`; group.setAttribute('aria-labelledby', title.id);
    heading.append(el('p', chapter.label || 'บทเรียน', 'chapter-label'), title);
    if (chapter.summary) heading.append(el('p', chapter.summary, 'chapter-summary'));
    const parts = el('ol', '', 'chapter-parts');
    chapter.parts.forEach((item, index) => { const row = el('li'); row.append(makeLesson(item, index)); parts.append(row); });
    group.append(heading, parts); nav.append(group);
  }
  updateProgress(data.progress);
}
const view = {
  clear() { verificationVersion += 1; clearPlayer(); renderCourseBonus(); activeCourse = null; $('account-label').textContent = 'เข้าสู่ระบบ'; $('course-grid').replaceChildren(); $('lesson-navigation').replaceChildren(); lessonLinks.clear(); showOnly(null); },
  clearLesson: clearPlayer,
  loading() { status('กำลังเปิดห้องเรียนของคุณ…'); },
  account(user) { $('account-label').textContent = user?.displayName || user?.email || 'บัญชีของฉัน'; },
  notice(text) { status(text); },
  courses(courses) {
    status();
    if (!courses.length) { statePanel('ห้องเรียนยังว่างอยู่', 'คอร์สที่คุณลงทะเบียนจะปรากฏที่นี่ หากสมัครไว้แล้ว ให้ตรวจว่าใช้อีเมลเดียวกับตอนสมัคร', [action('ตรวจสอบบัญชี', () => window.MC_ACCOUNT?.open('login')), link('กลับหน้าหลัก', '/', true)]); return; }
    showOnly('library'); $('course-count').textContent = `${courses.length} คอร์ส`;
    const grid = $('course-grid'); grid.replaceChildren();
    for (const [index, course] of courses.entries()) {
      const card = el('article', '', 'course-card'), art = courseArt(course, index);
      const body = el('div', '', 'course-card-body'); body.append(badge(course.status, course.access?.role), el('h3', course.title), el('p', course.summary || STATUS[course.status].message));
      const expiry = dateLabel(course.expiresAt); if (expiry && course.status === 'active') body.append(el('div', `เรียนได้ถึง ${expiry}`, 'course-card-meta'));
      const p = progressSummary(course.progress); if (course.status === 'active' && p.total) body.append(el('div', `เรียนจบแล้ว ${p.completed} จาก ${p.total} ตอน`, 'course-card-meta'));
      const label = course.status === 'active' ? 'เปิดห้องเรียน →' : ['registered', 'pending'].includes(course.status) ? 'ดูสถานะการสมัคร →' : 'ดูสถานะคอร์ส →';
      const open = link(label, courseRoute(course.id)); open.addEventListener('click', event => { event.preventDefault(); learner.openCourse(course.id); }); body.append(open); card.append(art, body); grid.append(card);
    }
  },
  courseLoading() { status('กำลังเปิดคอร์ส…'); },
  course(data) {
    activeCourse = data; status(); showOnly('classroom');
    renderCourseBonus(data.bonus);
    $('course-title').textContent = data.course.title; $('course-summary').textContent = data.course.summary || '';
    $('course-format').textContent = `เรียนตามลำดับ ${data.course.lessons.length} ตอน · เข้าใจหลักคิด ลองทำตาม แล้วใช้กับงานจริง`;
    const state = data.access?.status || 'registered'; $('course-access').replaceChildren(badge(state, data.access?.role));
    const expiry = dateLabel(data.access?.expiresAt); if (expiry && state === 'active') $('course-access').append(el('p', `เรียนได้ถึง ${expiry}`));
    const notice = $('access-notice'); notice.hidden = state === 'active'; notice.replaceChildren();
    if (state !== 'active') {
      notice.append(document.createTextNode(STATUS[state]?.message || 'กำลังตรวจสอบสิทธิ์เรียน'));
      if (state === 'registered') { const a = el('a', 'สมัครเรียนเต็มคอร์ส →'); a.href = '/ai-source/#offer'; notice.append(a); }
      else { const a = el('a', 'ติดต่อผู้สอน ↗'); a.href = 'https://lin.ee/rlSlhzT'; a.target = '_blank'; a.rel = 'noopener noreferrer'; notice.append(a); }
    }
    courseNav(data);
  },
  lessonLoading(id) {
    $('lesson-content').setAttribute('aria-busy', 'true'); $('lesson-placeholder').textContent = 'กำลังเปิดบทเรียน…';
    for (const [key, a] of lessonLinks) { if (key === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  },
  lesson(data, course) {
    const item = data.lesson; selectedId = item.id; $('lesson-content').setAttribute('aria-busy', 'false');
    $('lesson-placeholder').hidden = true; $('lesson-body').hidden = false;
    const context = partContext(course.course, item.id), chapter = context.chapter;
    $('lesson-title').textContent = partName(item); $('lesson-summary').textContent = item.summary || '';
    $('lesson-kicker').textContent = [chapter?.label, chapter?.title].filter(Boolean).join(' · ') || 'บทเรียน';
    $('lesson-part').textContent = partStep(item, context.index, chapter?.parts.length);
    const mediaUrl = safeAssetUrl(item.media?.url, location.origin);
    renderShowcase(item.showcase || []);
    if (mediaUrl) {
      video.src = mediaUrl;
      // Current course subtitles are burned in; do not request SRT as an HTML video track.
      for (const caption of item.media.captionsEmbedded ? [] : item.media.captions || []) { const url = safeAssetUrl(caption.url, location.origin); if (!url || caption.mimeType !== 'text/vtt') continue; const track = el('track'); track.kind = 'subtitles'; track.srclang = caption.language || 'th'; track.label = caption.label || 'ไทย'; track.src = url; video.append(track); }
      $('player-wrap').hidden = false; $('video-note').hidden = false;
      player.start(activeCourse?.progress?.lessons?.[selectedId]?.positionSeconds || 0, { autoplay: !item.showcase?.length });
    } else if (item.type !== 'boss') { $('media-message').hidden = false; $('media-message').textContent = 'วิดีโอยังเปิดไม่ได้ในขณะนี้ ลองเปิดบทนี้ใหม่อีกครั้ง หรือติดต่อผู้สอน'; }
    $('boss-invitation').hidden = !item.finale && item.type !== 'boss';
    lessonTools?.destroy(); lessonTools = renderLessonTools($('lesson-tools'), item.tools || []);
    renderStudentVideoCredits($('student-video-credits'), { courseId: course.course.id, lessonId: item.id, access: course.access });
    const reading = typeof item.reading === 'string' ? item.reading : typeof item.body === 'string' ? item.body : '';
    renderLessonReading($('lesson-reading'), reading, { origin: location.origin, resourcesLocked: course.access?.status !== 'active',
      onLesson: route => {
        const target = course.course.lessons.find(l => l.id === route.lessonId);
        if (route.courseId !== course.course.id || !target) return;
        if (target.locked) explainLockedLesson(target.title); else selectLesson(target.id);
      },
      onResource: () => { if (!course.access?.active && course.access?.status !== 'active') { explainLockedLesson('ไฟล์ฝึกของบทนี้'); return false; } return true; },
    });
    $('reading-intro').hidden = $('lesson-reading').hidden;
    const resources = $('resource-list'); resources.replaceChildren();
    const optional = el('details', '', 'optional-resources'); optional.append(el('summary', 'ไฟล์เพิ่มเติมสำหรับทบทวน'));
    let optionalCount = 0;
    for (const resource of item.resources || []) {
      const href = safeAssetUrl(resource.url, location.origin); if (!href) continue;
      const a = el('a', '', 'resource-link'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const label = el('span', resource.title || 'เปิดไฟล์บทเรียน'); const meta = [resource.mimeType?.split(';')[0]?.split('/').pop()?.toUpperCase(), resource.sizeBytes ? `${Math.ceil(resource.sizeBytes / 1024)} KB` : ''].filter(Boolean).join(' · '); if (meta) label.append(el('small', meta));
      const arrow = el('span', '↗', 'resource-arrow'); arrow.setAttribute('aria-hidden', 'true'); a.append(label, arrow);
      if (resource.optional === true) { optional.append(a); optionalCount += 1; } else resources.append(a);
    }
    if (optionalCount) resources.append(optional);
    $('resources-section').hidden = !resources.childElementCount;
    const sequence = context.chapters.flatMap(group => group.parts), position = sequence.findIndex(part => part.id === item.id);
    const following = position >= 0 ? sequence[position + 1] : course.course.lessons.find(part => part.id === item.nextLessonId);
    const next = following && !following.locked ? following : null;
    $('next-lesson').hidden = !next;
    if (next) {
      const nextChapter = context.chapters.find(group => group.parts.some(part => part.id === next.id));
      const heading = nextChapter === chapter ? 'ตอนถัดไป' : nextChapter?.label || 'เรียนต่อ';
      $('next-lesson').href = courseRoute(course.course.id, next.id); $('next-lesson').dataset.lessonId = next.id;
      $('next-lesson').textContent = `${heading} · ${partName(next)} →`;
    }
    $('chapter-parts-links').replaceChildren(); $('chapter-parts-section').hidden = !chapter || chapter.parts.length < 2;
    if (chapter) for (const [index, part] of chapter.parts.entries()) {
      const a = el('a', '', 'chapter-part-link'); a.href = courseRoute(course.course.id, part.id);
      a.append(el('small', partStep(part, index), 'chapter-part-step'), el('span', partName(part)));
      if (part.id === item.id) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', event => { event.preventDefault(); if (part.locked) explainLockedLesson(part.title); else selectLesson(part.id); });
      $('chapter-parts-links').append(a);
    }
    $('complete-lesson').disabled = false; updateProgress(course.progress, item.id);
    $('lesson-title').focus({ preventScroll: true });
  },
  error(error) {
    clearPlayer(); $('lesson-content').setAttribute('aria-busy', 'false'); status();
    if (error.code === 'AUTH_REQUIRED' || error.status === 401) { verification(); return; }
    if (error.code === 'EMAIL_VERIFICATION_REQUIRED') { verification(window.MC_ACCOUNT?.user?.email || ''); return; }
    if (error.code === 'COURSE_ACCESS_REQUIRED') { statePanel('บทนี้ยังไม่เปิดสิทธิ์', 'ตรวจสถานะการสมัครในบัญชีนี้ได้ เมื่อเปิดสิทธิ์แล้วจะเรียนได้ครบทุกบท', [action('ดูคอร์สของฉัน', () => { history.replaceState({}, '', '/learn/'); learner.load(); })]); return; }
    statePanel('เปิดห้องเรียนไม่สำเร็จ', error.message || 'กรุณาลองอีกครั้ง', [action('ลองใหม่', () => boot()), link('ติดต่อผู้สอน', 'https://lin.ee/rlSlhzT', true)]);
  },
  progress: updateProgress,
  progressError() { $('save-status').textContent = 'ยังบันทึกความคืบหน้าไม่ได้ วิดีโอยังดูต่อได้ ลองกดบันทึกอีกครั้งเมื่อเชื่อมต่อได้'; },
};
learner = createLearner({ api, view, route: () => parseRoute(location.search), navigate: (url, replace = false) => history[replace ? 'replaceState' : 'pushState']({}, '', url) });
function verification(email = '') { learner.reset(); const version = ++verificationVersion; showOnly('state-panel'); status(); return showVerification({ panel: $('state-panel'), email, onVerified: () => location.reload(), isCurrent: () => version === verificationVersion && !$('state-panel').hidden }); }
async function boot() {
  if (booting) return; booting = true;
  try {
    const query = new URLSearchParams(location.search), enroll = query.get('enroll');
    if (query.get('trial') === 'classroom') {
      learner.reset(); status('กำลังตรวจบัญชีเพื่อเปิดห้องทดลองเรียน…');
      const session = await authRequest(window.fetch.bind(window), 'session');
      if (!session.user?.emailVerified) { verification(session.user?.email || ''); return; }
      const target = safeReturn(query.get('return'), location.origin);
      location.replace(target?.startsWith('/classroom/') ? target : '/classroom/'); return;
    }
    if (enroll) {
      learner.reset(); status('กำลังตรวจสอบบัญชี…');
      if (enroll !== 'ai-sauce') { statePanel('ไม่พบรายการสมัครนี้', 'กลับไปที่ห้องเรียนเพื่อตรวจสอบคอร์สของคุณ', [link('คอร์สของฉัน', '/learn/')]); return; }
      const session = await authRequest(window.fetch.bind(window), 'session');
      if (!session.user?.emailVerified) { verification(session.user?.email || ''); return; }
      if (enrollmentBusy) return; enrollmentBusy = true;
      try {
        status('กำลังเพิ่มคอร์สในบัญชีของคุณ…'); await api('enroll', { courseId: enroll }, 'POST');
        const target = safeReturn(query.get('return'), location.origin);
        if (target) { location.replace(target); return; }
        const requestedLesson = validId(query.get('lesson')) ? query.get('lesson') : 'FOUNDATION';
        history.replaceState({}, '', courseRoute(enroll, requestedLesson));
      } finally { enrollmentBusy = false; }
    }
    await learner.load();
  } catch (error) { view.error(error); } finally { booting = false; }
}
document.querySelector('[data-home]').addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', '/learn/'); learner.load(); });
$('next-lesson').addEventListener('click', event => { event.preventDefault(); selectLesson(event.currentTarget.dataset.lessonId); });
$('complete-lesson').addEventListener('click', async () => {
  if (progressBusy || !selectedId) return; progressBusy = true; const id = selectedId; $('complete-lesson').disabled = true; $('save-status').textContent = 'กำลังบันทึก…';
  const saved = await learner.saveProgress(!isBossLesson() && Number.isFinite(video.currentTime) ? video.currentTime : 0, true);
  if (selectedId === id) { if (saved) $('save-status').textContent = 'บันทึกแล้ว กลับมาเรียนต่อด้วยบัญชีนี้ได้ทุกครั้ง'; else $('complete-lesson').disabled = false; } progressBusy = false;
});
async function savePosition() {
  if (!selectedId || isBossLesson() || progressBusy || !Number.isFinite(video.currentTime) || video.currentTime <= 0) return;
  if (Date.now() - lastSaved < 10000) return; lastSaved = Date.now(); await learner.saveProgress(video.currentTime);
}
video.addEventListener('timeupdate', savePosition); video.addEventListener('pause', savePosition);
window.addEventListener('popstate', () => learner.load());
window.addEventListener('mc:account-changed', () => { learner.reset(); booting = false; boot(); });
// HTTP no-store is not a back/forward DOM snapshot policy. Remove private
// reading/media before a page is suspended and reauthorize when it returns.
window.addEventListener('pagehide', () => { savePosition(); learner.reset(); });
window.addEventListener('pageshow', event => { if (event.persisted) { booting = false; boot(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });
boot();
