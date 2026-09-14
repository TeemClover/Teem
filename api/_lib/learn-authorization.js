import { currentUser } from './core.js';
import { LEARN_COURSES, LEARN_ASSETS } from './learn-catalog.js';
import { courseAccess, LearnError, learnId } from './learn-domain.js';
import { createLearnStore } from './learn-store.js';

export async function verifiedLearnUser(sql,req,{store=createLearnStore(sql),lookupUser=currentUser}={}) {
  let user;
  try { user = await lookupUser(req,sql); }
  catch (error) { if (error instanceof URIError) throw new LearnError('AUTH_REQUIRED',401); throw error; }
  if (!user?.id) throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');
  // A later verification of an email must not upgrade an older password session.
  if (user.emailVerified !== true) throw new LearnError('EMAIL_VERIFICATION_REQUIRED',403,'ยืนยันอีเมลในบัญชีนี้ก่อนเข้าเรียน');
  const account = await store.account(user.id);
  if (!account?.email_verified_at || !Number.isFinite(new Date(account.email_verified_at).getTime())) {
    throw new LearnError('EMAIL_VERIFICATION_REQUIRED',403,'ยืนยันอีเมลในบัญชีนี้ก่อนเข้าเรียน');
  }
  return user;
}

export async function loadCourseAccess(store,userId,courseId,now=Date.now()) {
  const enrollment = await store.enrollment(userId,courseId);
  if (!enrollment) return courseAccess(null);
  const [grants,registrations,instructors] = await Promise.all([store.grants(userId,courseId),store.registrations(userId,courseId),store.instructors(userId,courseId)]);
  return courseAccess(enrollment,grants,registrations,now,instructors);
}

export function catalogLesson(courses,courseId,lessonId) {
  learnId(courseId,'COURSE_ID'); learnId(lessonId,'LESSON_ID');
  const course = courses.find(c=>c.id===courseId);
  const lesson = course?.lessons.find(l=>l.id===lessonId);
  if (!course || !lesson) throw new LearnError('LESSON_NOT_FOUND',404);
  return {course,lesson};
}

// Used by the media API too: no client-provided preview flag, user ID or expiry
// can bypass this lookup. All returned URLs must still point to that guarded API.
export async function authorizeLearnLesson(sql,req,{courseId,lessonId},options={}) {
  const store = options.store || createLearnStore(sql);
  const user = await verifiedLearnUser(sql,req,{store,lookupUser:options.lookupUser || currentUser});
  const {course,lesson} = catalogLesson(options.courses || LEARN_COURSES,courseId,lessonId);
  await store.ensure();
  const access = await loadCourseAccess(store,user.id,course.id,options.now ?? Date.now());
  if (access.status==='not_enrolled') throw new LearnError('COURSE_ENROLLMENT_REQUIRED',403,'ลงทะเบียนคอร์สนี้ก่อนเข้าเรียน');
  if (!access.active) throw new LearnError('COURSE_ACCESS_REQUIRED',403,'บทนี้อยู่ในคอร์สเต็ม กรุณาตรวจสอบสิทธิ์เรียนของบัญชีนี้');
  return {user,course,lesson,access,preview:false};
}

export async function authorizeLearnAsset(sql,req,{courseId,lessonId,assetId},options={}) {
  learnId(assetId,'ASSET_ID');
  const authorized = await authorizeLearnLesson(sql,req,{courseId,lessonId},options);
  const {lesson,course,access} = authorized;
  const asset = (options.assets || LEARN_ASSETS).find(a=>a.id===assetId);
  const video = assetId===lesson.mediaId && asset?.kind==='video';
  const caption = assetId===lesson.captionId && asset?.kind==='captions';
  const resource = [...(lesson.resourceIds || []),...(lesson.additionalResourceIds || [])].includes(assetId)
    && asset?.kind==='resource';
  if (!asset || asset.courseId!==course.id || !asset.lessonIds?.includes(lesson.id) || (!video && !caption && !resource)) {
    throw new LearnError('ASSET_NOT_FOUND',404);
  }
  // Every /learn asset belongs to the full course; the free course is /classroom.
  if (!access.active) throw new LearnError('COURSE_ACCESS_REQUIRED',403,'ไฟล์นี้อยู่ในสิทธิ์คอร์สเต็ม');
  return {...authorized,asset,assetId};
}

export async function enrollLearnCourse(sql,req,{courseId},options={}) {
  learnId(courseId,'COURSE_ID');
  const course = (options.courses || LEARN_COURSES).find(c=>c.id===courseId);
  if (!course) throw new LearnError('COURSE_NOT_FOUND',404);
  const store = options.store || createLearnStore(sql);
  const user = await verifiedLearnUser(sql,req,{store,lookupUser:options.lookupUser || currentUser});
  await store.ensure();
  const enrollment = await store.enroll(user.id,course.id,new Date(options.now ?? Date.now()));
  return {user,course,enrollment,access:await loadCourseAccess(store,user.id,course.id,options.now ?? Date.now())};
}
