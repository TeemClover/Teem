/* The public shell never supplies an entitlement or stores the course payload. */
export const STATUS = Object.freeze({
  registered: { label: 'ลงทะเบียนแล้ว', message: 'เมื่อชำระและตรวจยอดเรียบร้อย บทเรียนเต็มทั้งหมดจะเปิดให้ในบัญชีนี้' },
  pending: { label: 'รอตรวจการชำระ', message: 'เราได้รับรายการสมัครแล้ว กำลังตรวจการชำระเพื่อเปิดสิทธิ์คอร์สเต็มให้บัญชีนี้' },
  active: { label: 'พร้อมเรียน', message: 'เรียนต่อจากจุดที่ค้างไว้ หรือเลือกบทที่ต้องการทบทวน' },
  expired: { label: 'สิทธิ์เรียนสิ้นสุดแล้ว', message: 'ติดต่อผู้สอนหากต้องการสอบถามสิทธิ์ของคอร์สนี้' },
  revoked: { label: 'สิทธิ์ถูกระงับ', message: 'ติดต่อผู้สอนเพื่อตรวจสอบสิทธิ์ของคอร์สนี้' },
  rejected: { label: 'ต้องตรวจสอบรายการ', message: 'ติดต่อผู้สอนเพื่อตรวจสอบรายละเอียดการสมัคร' },
});
export function validId(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value); }
export function courseRoute(courseId, lessonId) {
  if (!validId(courseId)) return '/learn/';
  const query = new URLSearchParams({ course: courseId });
  if (validId(lessonId)) query.set('lesson', lessonId);
  return '/learn/?' + query;
}
export function parseRoute(search = '') {
  const p = new URLSearchParams(search);
  return { courseId: validId(p.get('course')) ? p.get('course') : null, lessonId: validId(p.get('lesson')) ? p.get('lesson') : null };
}
export function normalizeCourses(data) {
  if (!data || data.ok !== true || !Array.isArray(data.courses)) throw new Error('รูปแบบข้อมูลห้องเรียนไม่ถูกต้อง');
  const seen = new Set();
  return data.courses.filter(c => c && validId(c.id) && typeof c.title === 'string' && STATUS[c.status] && !seen.has(c.id) && seen.add(c.id));
}
export function safeAssetUrl(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/api/learn-media?')) return null;
  try { const u = new URL(value, origin); return u.origin === origin && u.pathname === '/api/learn-media' && u.searchParams.has('assetId') ? u.pathname + u.search : null; } catch { return null; }
}
export function durationLabel(seconds) {
  const n = Math.round(Number(seconds));
  if (!Number.isFinite(n) || n <= 0) return '';
  return n < 60 ? `${n} วินาที` : `${Math.floor(n / 60)} นาที${n % 60 ? ` ${n % 60} วินาที` : ''}`;
}
export function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(date) : '';
}
export function progressSummary(progress = {}) {
  return { completed: Math.max(0, Number(progress.completedLessons) || 0), total: Math.max(0, Number(progress.totalLessons) || 0), percent: Math.min(100, Math.max(0, Number(progress.percent) || 0)) };
}
export function createApi(fetcher) {
  return async function request(action, args = {}, method = 'GET') {
    const query = new URLSearchParams(action ? { action } : {});
    if (method === 'GET') Object.entries(args).forEach(([key, value]) => query.set(key, value));
    const response = await fetcher('/api/learn' + (query.size ? '?' + query : ''), {
      method, credentials: 'same-origin', cache: 'no-store',
      ...(method !== 'GET' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) } : {}),
    });
    let body; try { body = await response.json(); } catch { throw new Error('อ่านข้อมูลห้องเรียนไม่ได้ กรุณาลองใหม่'); }
    if (!response.ok || body?.ok !== true) {
      const error = new Error(body?.message || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
      error.code = body?.code || body?.error; error.status = response.status; throw error;
    }
    return body;
  };
}
/* The view is injected so account changes, races and denied access are testable without a browser. */
export function createLearner({ api, view, route = () => ({}), navigate = () => {} }) {
  let epoch = 0, selection = 0, courses = [], currentCourse = null, currentLesson = null;
  const fail = error => view.error(error);
  async function loadLibrary(accountEpoch, run = selection) {
    const data = await api('courses');
    if (accountEpoch !== epoch || run !== selection) return false;
    courses = normalizeCourses(data); view.account(data.user); view.courses(courses);
    return true;
  }
  async function load() {
    const run = ++epoch; ++selection; courses = []; currentCourse = null; currentLesson = null;
    view.clear(); view.loading();
    try {
      const target = route();
      // The course endpoint itself verifies session, account and enrollment.
      // A deep link does not need to wait for the entire course library first.
      if (validId(target.courseId) && /^[a-zA-Z0-9]/.test(target.courseId)) {
        await loadCourse(target.courseId, target.lessonId, false, true);
      } else if (await loadLibrary(run)) {
        if (target.courseId) { navigate('/learn/', true); view.notice('บัญชีนี้ยังไม่มีคอร์สที่ระบุ'); }
      }
    } catch (error) { if (run === epoch) fail(error); }
  }
  async function openCourse(courseId, lessonId = null, updateRoute = true) {
    if (!validId(courseId) || (!courses.some(c => c.id === courseId) && currentCourse?.course.id !== courseId)) return false;
    return loadCourse(courseId, lessonId, updateRoute);
  }
  async function loadCourse(courseId, lessonId = null, updateRoute = true, direct = false) {
    const run = ++selection, accountEpoch = epoch;
    currentCourse = null; currentLesson = null; view.clearLesson(); view.courseLoading();
    if (updateRoute) navigate(courseRoute(courseId));
    try {
      const data = await api('course', { courseId });
      if (accountEpoch !== epoch || run !== selection) return false;
      if (!data.course || data.course.id !== courseId || !Array.isArray(data.course.lessons)) throw new Error('ข้อมูลคอร์สไม่ตรงกับรายการที่เลือก');
      currentCourse = data; view.account(data.user); view.course(data);
      const lessons = data.course.lessons;
      const selected = lessons.find(l => l.id === lessonId && !l.locked) || lessons.find(l => l.id === data.course.startLessonId && !l.locked) || lessons.find(l => !l.locked);
      if (selected) {
        if (!updateRoute && selected.id !== lessonId) navigate(courseRoute(courseId, selected.id), true);
        await openLesson(selected.id, updateRoute);
      }
      return true;
    } catch (error) {
      if (accountEpoch !== epoch || run !== selection) return false;
      if (direct && ['COURSE_NOT_FOUND', 'COURSE_ENROLLMENT_REQUIRED'].includes(error.code)) {
        try {
          if (await loadLibrary(accountEpoch, run)) { navigate('/learn/', true); view.notice('บัญชีนี้ยังไม่มีคอร์สที่ระบุ'); }
        } catch (libraryError) { if (accountEpoch === epoch && run === selection) fail(libraryError); }
      } else fail(error);
      return false;
    }
  }
  async function openLesson(lessonId, updateRoute = true) {
    const course = currentCourse, entry = course?.course.lessons.find(l => l.id === lessonId);
    if (!entry || entry.locked || !validId(lessonId)) return false;
    const run = ++selection, accountEpoch = epoch; currentLesson = null; view.clearLesson(); view.lessonLoading(lessonId);
    if (updateRoute) navigate(courseRoute(course.course.id, lessonId));
    try {
      const data = await api('lesson', { courseId: course.course.id, lessonId });
      if (accountEpoch !== epoch || run !== selection) return false;
      if (data.courseId !== course.course.id || data.lesson?.id !== lessonId) throw new Error('ข้อมูลบทเรียนไม่ตรงกับรายการที่เลือก');
      currentLesson = data; view.lesson(data, course); return true;
    } catch (error) { if (accountEpoch === epoch && run === selection) fail(error); return false; }
  }
  async function saveProgress(positionSeconds, completed = false) {
    const lesson = currentLesson, course = currentCourse, accountEpoch = epoch;
    if (!lesson || !course || !Number.isFinite(positionSeconds) || positionSeconds < 0) return false;
    const args = { courseId: course.course.id, lessonId: lesson.lesson.id, positionSeconds };
    if (completed) args.completed = true;
    try {
      const result = await api('progress', args, 'PUT');
      if (epoch !== accountEpoch || currentLesson !== lesson) return false;
      if (result.progress) { course.progress = result.progress; view.progress(result.progress, lesson.lesson.id); }
      return true;
    } catch (error) { if (epoch === accountEpoch && currentLesson === lesson) view.progressError(error); return false; }
  }
  function reset() { ++epoch; ++selection; courses = []; currentCourse = null; currentLesson = null; view.clear(); }
  return { load, openCourse, openLesson, saveProgress, reset };
}
