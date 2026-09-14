import { STATUS, createApi, createLearner, parseRoute, courseRoute, safeAssetUrl, durationLabel, dateLabel, progressSummary, validId } from './learn-core.js';
import { authRequest, safeReturn, showVerification } from './account-step.js';

const $ = id => document.getElementById(id);
const el = (tag, text = '', className = '') => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
const api = createApi(window.fetch.bind(window));
const video = $('lesson-video');
let learner, activeCourse = null, selectedId = null, lastSaved = 0, progressBusy = false, enrollmentBusy = false, booting = false, verificationVersion = 0;
const lessonLinks = new Map();
function status(text = '') { $('page-status').textContent = text; }
function showOnly(id) { ['state-panel', 'library', 'classroom'].forEach(key => { $(key).hidden = key !== id; }); }
function action(text, callback, secondary = false) { const b = el('button', text, `button button-${secondary ? 'secondary' : 'primary'}`); b.type = 'button'; b.addEventListener('click', callback); return b; }
function link(text, href, secondary = false) { const a = el('a', text, `button button-${secondary ? 'secondary' : 'primary'}`); a.href = href; return a; }
function badge(state) { return el('span', STATUS[state]?.label || 'กำลังตรวจสอบ', `badge ${state || ''}`); }
async function selectLesson(id) { if (await learner.openLesson(id)) $('lesson-title').scrollIntoView({ block: 'start', behavior: 'auto' }); }
function clearPlayer() {
  selectedId = null; progressBusy = false; lastSaved = 0;
  video.pause(); video.removeAttribute('src'); video.replaceChildren(); video.load();
  $('player-wrap').hidden = true; $('video-note').hidden = true; $('lesson-body').hidden = true;
  $('lesson-placeholder').hidden = false; $('lesson-placeholder').textContent = 'เลือกบทเรียนจากสารบัญ';
  $('resource-list').replaceChildren(); $('lesson-reading').replaceChildren(); $('save-status').textContent = '';
  $('media-message').hidden = true;
}
function statePanel(title, text, controls = []) {
  verificationVersion += 1;
  status(); showOnly('state-panel'); const panel = $('state-panel'); panel.replaceChildren(el('p', 'MY LEARNING', 'eyebrow'), el('h1', title), el('p', text));
  const row = el('div', '', 'state-actions'); row.append(...controls); panel.append(row);
}
function updateProgress(progress = {}, lessonId) {
  const p = progressSummary(progress); $('course-progress').value = p.percent;
  $('course-progress-label').textContent = p.total ? `${p.completed} / ${p.total} บท` : '';
  for (const [id, node] of lessonLinks) {
    if (node.dataset.locked === 'true') continue;
    node.querySelector('.lesson-icon').textContent = progress.lessons?.[id]?.completed ? '✓' : '○';
  }
  if (lessonId && selectedId === lessonId) {
    const completed = progress.lessons?.[lessonId]?.completed === true;
    $('complete-lesson').textContent = completed ? 'บันทึกว่าเรียนจบแล้ว ✓' : 'ทำบทนี้เสร็จแล้ว';
    $('complete-lesson').disabled = completed;
  }
}
function courseNav(data) {
  const course = data.course, nav = $('lesson-navigation'); nav.replaceChildren(); lessonLinks.clear();
  const lessons = [...course.lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
  const sections = Array.isArray(course.sections) ? course.sections : [];
  const titleFor = id => sections.find(s => s.id === id)?.title || '';
  const makeLesson = item => {
    const a = el('a', '', 'lesson-link'); a.dataset.lessonId = item.id; a.dataset.locked = String(!!item.locked);
    const icon = el('span', item.locked ? '—' : '○', 'lesson-icon'); icon.setAttribute('aria-hidden', 'true');
    const label = el('span', item.title || 'บทเรียน', 'lesson-link-label');
    const sub = [item.preview ? 'บทตัวอย่าง' : '', durationLabel(item.durationSeconds)].filter(Boolean).join(' · ');
    if (sub) label.append(el('small', sub)); a.append(icon, label);
    if (item.locked) { a.setAttribute('aria-disabled', 'true'); a.setAttribute('aria-label', `${item.title} — ยังไม่เปิดสิทธิ์`); }
    else { a.href = courseRoute(course.id, item.id); a.addEventListener('click', event => { event.preventDefault(); selectLesson(item.id); }); }
    lessonLinks.set(item.id, a); return a;
  };
  const mains = lessons.filter(l => l.type === 'foundation' || l.type === 'main');
  if (mains.length) { nav.append(el('p', 'เส้นทางหลัก', 'nav-heading')); mains.forEach(l => nav.append(makeLesson(l))); }
  const supplemental = lessons.filter(l => l.type !== 'foundation' && l.type !== 'main');
  if (supplemental.length) {
    const details = el('details', '', 'supporting'); details.append(el('summary', 'บทเสริมและเคสตัวอย่าง'));
    let previousSection;
    supplemental.forEach(l => { const section = l.sectionId || l.section; if (section !== previousSection) { const title = titleFor(section); if (title) details.append(el('p', title, 'nav-heading')); previousSection = section; } details.append(makeLesson(l)); }); nav.append(details);
  }
  updateProgress(data.progress);
}
const view = {
  clear() { verificationVersion += 1; clearPlayer(); activeCourse = null; $('course-grid').replaceChildren(); $('lesson-navigation').replaceChildren(); lessonLinks.clear(); showOnly(null); },
  clearLesson: clearPlayer,
  loading() { status('กำลังเปิดห้องเรียนของคุณ…'); },
  account(user) { $('account-label').textContent = user?.displayName || user?.email || 'บัญชีของฉัน'; },
  notice(text) { status(text); },
  courses(courses) {
    status();
    if (!courses.length) { statePanel('ห้องเรียนยังว่างอยู่', 'คอร์สที่คุณลงทะเบียนจะปรากฏที่นี่ หากสมัครไว้แล้ว ให้ตรวจว่าใช้อีเมลเดียวกับตอนสมัคร', [action('ตรวจสอบบัญชี', () => window.MC_ACCOUNT?.open('login')), link('กลับหน้าหลัก', '/', true)]); return; }
    showOnly('library'); $('course-count').textContent = `${courses.length} คอร์ส`;
    const grid = $('course-grid'); grid.replaceChildren();
    for (const course of courses) {
      const card = el('article', '', 'course-card'), art = el('div', '', 'course-art'); art.setAttribute('aria-hidden', 'true'); art.append(el('p', 'MYCLOVER / LEARNING', 'course-art-label'), el('p', 'จากความรู้ → งานที่ใช้ได้', 'course-art-title'));
      const body = el('div', '', 'course-card-body'); body.append(badge(course.status), el('h3', course.title), el('p', course.summary || STATUS[course.status].message));
      const expiry = dateLabel(course.expiresAt); if (expiry && course.status === 'active') body.append(el('div', `เรียนได้ถึง ${expiry}`, 'course-card-meta'));
      const p = progressSummary(course.progress); if (course.status === 'active' && p.total) body.append(el('div', `เรียนจบแล้ว ${p.completed} จาก ${p.total} บท`, 'course-card-meta'));
      const label = course.status === 'active' ? 'เปิดห้องเรียน →' : ['registered', 'pending'].includes(course.status) ? 'ดูบทตัวอย่างและสถานะ →' : 'ดูสถานะคอร์ส →';
      const open = link(label, courseRoute(course.id)); open.addEventListener('click', event => { event.preventDefault(); learner.openCourse(course.id); }); body.append(open); card.append(art, body); grid.append(card);
    }
  },
  courseLoading() { status('กำลังเปิดคอร์ส…'); },
  course(data) {
    activeCourse = data; status(); showOnly('classroom');
    $('course-title').textContent = data.course.title; $('course-summary').textContent = data.course.summary || '';
    const state = data.access?.status || 'registered'; $('course-access').replaceChildren(badge(state));
    const expiry = dateLabel(data.access?.expiresAt); if (expiry && state === 'active') $('course-access').append(el('p', `เรียนได้ถึง ${expiry}`));
    const notice = $('access-notice'); notice.hidden = state === 'active'; notice.replaceChildren();
    if (state !== 'active') {
      notice.append(document.createTextNode(STATUS[state]?.message || 'กำลังตรวจสอบสิทธิ์เรียน'));
      if (state === 'registered') { const a = el('a', 'สมัครเรียนเต็มคอร์ส →'); a.href = '/ai-source/#offer'; notice.append(a); }
      else { const a = el('a', 'ติดต่อผู้สอน ↗'); a.href = 'https://lin.ee/rlSlhzT'; a.target = '_blank'; a.rel = 'noopener noreferrer'; notice.append(a); }
    }
    courseNav(data);
  },
  lessonLoading(id) { $('lesson-content').setAttribute('aria-busy', 'true'); $('lesson-placeholder').textContent = 'กำลังเปิดบทเรียน…'; for (const [key, a] of lessonLinks) { if (key === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } },
  lesson(data, course) {
    const item = data.lesson; selectedId = item.id; $('lesson-content').setAttribute('aria-busy', 'false');
    $('lesson-placeholder').hidden = true; $('lesson-body').hidden = false;
    $('lesson-title').textContent = item.title; $('lesson-summary').textContent = item.summary || '';
    $('lesson-kicker').textContent = data.preview ? 'บทตัวอย่าง' : item.type === 'case' ? 'เคสตัวอย่าง' : item.type === 'support' ? 'บทเสริม · เลือกทบทวนได้' : 'บทเรียนหลัก';
    const navItem = lessonLinks.get(item.id); const details = navItem?.closest('details'); if (details) details.open = true;
    const mediaUrl = safeAssetUrl(item.media?.url, location.origin);
    if (mediaUrl) {
      video.src = mediaUrl;
      // Current course subtitles are burned in; do not request SRT as an HTML video track.
      for (const caption of item.media.captionsEmbedded ? [] : item.media.captions || []) { const url = safeAssetUrl(caption.url, location.origin); if (!url || caption.mimeType !== 'text/vtt') continue; const track = el('track'); track.kind = 'subtitles'; track.srclang = caption.language || 'th'; track.label = caption.label || 'ไทย'; track.src = url; video.append(track); }
      $('player-wrap').hidden = false; $('video-note').hidden = false; video.load();
    } else { $('media-message').hidden = false; $('media-message').textContent = 'วิดีโอยังเปิดไม่ได้ในขณะนี้ ลองเปิดบทนี้ใหม่อีกครั้ง หรือติดต่อผู้สอน'; }
    const reading = typeof item.reading === 'string' ? item.reading : typeof item.body === 'string' ? item.body : '';
    $('lesson-reading').textContent = reading; $('lesson-reading').hidden = !reading;
    const resources = $('resource-list'); resources.replaceChildren();
    const optional = el('details', '', 'optional-resources'); optional.append(el('summary', 'ไฟล์เพิ่มเติมสำหรับทบทวน'));
    let optionalCount = 0;
    for (const resource of item.resources || []) {
      const href = safeAssetUrl(resource.url, location.origin); if (!href) continue;
      const a = el('a', '', 'resource-link'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const label = el('span', resource.title || 'เปิดไฟล์บทเรียน'); const meta = [resource.mimeType?.split('/').pop()?.toUpperCase(), resource.sizeBytes ? `${Math.ceil(resource.sizeBytes / 1024)} KB` : ''].filter(Boolean).join(' · '); if (meta) label.append(el('small', meta));
      const arrow = el('span', '↗', 'resource-arrow'); arrow.setAttribute('aria-hidden', 'true'); a.append(label, arrow);
      if (resource.optional === true) { optional.append(a); optionalCount += 1; } else resources.append(a);
    }
    if (optionalCount) resources.append(optional);
    $('resources-section').hidden = !resources.childElementCount;
    const unlocked = course.course.lessons.filter(l => !l.locked);
    const next = unlocked.find(l => l.id === item.nextLessonId) || unlocked.find(l => l.id === item.returnLessonId);
    $('next-lesson').hidden = !next; if (next) { $('next-lesson').href = courseRoute(course.course.id, next.id); $('next-lesson').dataset.lessonId = next.id; $('next-lesson').textContent = item.nextLessonId ? 'บทถัดไป →' : 'กลับบทหลัก →'; }
    const cases = (item.type === 'main' && !item.nextLessonId) || item.type === 'case' ? unlocked.filter(l => course.course.applicationLessonIds?.includes(l.id) && l.id !== item.id) : [];
    $('application-links').replaceChildren(); $('application-section').hidden = !cases.length;
    for (const example of cases) { const a = link(example.title + ' →', courseRoute(course.course.id, example.id), true); a.addEventListener('click', event => { event.preventDefault(); selectLesson(example.id); }); $('application-links').append(a); }
    $('complete-lesson').disabled = false; updateProgress(course.progress, item.id);
    $('lesson-title').focus({ preventScroll: true });
  },
  error(error) {
    clearPlayer(); $('lesson-content').setAttribute('aria-busy', 'false'); status();
    if (error.code === 'AUTH_REQUIRED' || error.status === 401) { verification(); return; }
    if (error.code === 'EMAIL_VERIFICATION_REQUIRED') { verification(window.MC_ACCOUNT?.user?.email || ''); return; }
    if (error.code === 'COURSE_ACCESS_REQUIRED') { statePanel('บทนี้ยังไม่เปิดสิทธิ์', 'ดูสถานะคอร์สหรือกลับไปเรียนบทตัวอย่างก่อนได้', [action('ดูคอร์สของฉัน', () => { history.replaceState({}, '', '/learn/'); learner.load(); })]); return; }
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
        const requestedLesson = validId(query.get('lesson')) ? query.get('lesson') : 'EP01';
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
  const saved = await learner.saveProgress(Number.isFinite(video.currentTime) ? video.currentTime : 0, true);
  if (selectedId === id) { if (saved) $('save-status').textContent = 'บันทึกแล้ว กลับมาเรียนต่อด้วยบัญชีนี้ได้ทุกครั้ง'; else $('complete-lesson').disabled = false; } progressBusy = false;
});
video.addEventListener('loadedmetadata', () => {
  const pos = activeCourse?.progress?.lessons?.[selectedId]?.positionSeconds;
  if (Number.isFinite(pos) && pos > 2 && Number.isFinite(video.duration) && pos < video.duration - 2) video.currentTime = pos;
});
async function savePosition() {
  if (!selectedId || progressBusy || !Number.isFinite(video.currentTime) || video.currentTime <= 0) return;
  if (Date.now() - lastSaved < 10000) return; lastSaved = Date.now(); await learner.saveProgress(video.currentTime);
}
video.addEventListener('timeupdate', savePosition); video.addEventListener('pause', savePosition);
video.addEventListener('error', () => { if (!selectedId) return; $('media-message').hidden = false; $('media-message').textContent = 'เปิดวิดีโอไม่ได้ในขณะนี้ ลองเปิดบทนี้ใหม่เพื่อตรวจสิทธิ์และเชื่อมต่ออีกครั้ง'; });
window.addEventListener('popstate', () => learner.load());
window.addEventListener('mc:account-changed', () => { learner.reset(); booting = false; boot(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });
boot();
