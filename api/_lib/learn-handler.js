import { currentUser, database, sameOrigin } from './core.js';
import { LEARN_COURSES, LEARN_ASSETS } from './learn-catalog.js';
import { createLearnStore } from './learn-store.js';
import { authorizeLearnLesson, enrollLearnCourse, loadCourseAccess, verifiedLearnUser } from './learn-authorization.js';
import { courseAccess, LearnError, learnId, progressSummary, validateProgress } from './learn-domain.js';

const MAX_BODY_BYTES = 8192;
function reply(res,status,body) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
function parameter(req,name) {
  const url = new URL(req.url || '/api/learn','https://learn.invalid');
  const values = url.searchParams.getAll(name); const parsed = req.query?.[name];
  if (values.length>1 || (parsed!==undefined && typeof parsed!=='string')
    || (values.length && parsed!==undefined && parsed!==values[0])) throw new LearnError('INVALID_QUERY');
  return parsed ?? values[0];
}
function requestedCourse(req) {
  const courseId = parameter(req,'courseId'), alias = parameter(req,'course');
  if (courseId && alias && courseId!==alias) throw new LearnError('INVALID_QUERY');
  return learnId(courseId || alias,'COURSE_ID');
}
async function readBody(req) {
  if (String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase()!=='application/json') throw new LearnError('JSON_REQUIRED',415);
  const length = req.headers?.['content-length'];
  if (length!==undefined && (!/^\d+$/.test(String(length)) || Number(length)>MAX_BODY_BYTES)) throw new LearnError('BODY_TOO_LARGE',413);
  let body = req.body;
  if (body===undefined) {
    if (!req[Symbol.asyncIterator]) throw new LearnError('INVALID_BODY');
    const chunks=[];let size=0;
    for await (const chunk of req) { const b=Buffer.from(chunk);size+=b.length;if(size>MAX_BODY_BYTES)throw new LearnError('BODY_TOO_LARGE',413);chunks.push(b); }
    body=Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body=body.toString('utf8');
  if (typeof body==='string') {
    if (Buffer.byteLength(body)>MAX_BODY_BYTES) throw new LearnError('BODY_TOO_LARGE',413);
    try { body=JSON.parse(body); } catch { throw new LearnError('INVALID_BODY'); }
  }
  if (!body || typeof body!=='object' || Array.isArray(body)) throw new LearnError('INVALID_BODY');
  if (Buffer.byteLength(JSON.stringify(body))>MAX_BODY_BYTES) throw new LearnError('BODY_TOO_LARGE',413);
  return body;
}
function publicUser(user) { return {id:user.id,displayName:user.displayName,email:user.email || '',emailVerified:user.emailVerified===true,memberNo:user.memberNo || ''}; }
function lessonMetadata(lesson,access) {
  const result={};
  for (const key of ['id','title','type','sectionId','section','order','durationSeconds','summary','outcome','nextLessonId','returnLessonId','parentLessonId','supportingLessonIds','completionMode','activityUrl']) {
    if (lesson[key]!==undefined) result[key]=lesson[key];
  }
  return {...result,preview:false,locked:!access.active};
}
function mediaURL(courseId,lessonId,assetId) { return `/api/learn-media?${new URLSearchParams({courseId,lessonId,assetId})}`; }
function assetView(asset,courseId,lessonId) {
  return {id:asset.id,title:asset.title,filename:asset.filename,mimeType:asset.contentType,
    sizeBytes:asset.bytes,url:mediaURL(courseId,lessonId,asset.id)};
}
function lessonView(course,lesson,access,assets) {
  const view=lessonMetadata(lesson,access);
  const video=assets.find(a=>a.id===lesson.mediaId && a.kind==='video' && a.courseId===course.id && a.lessonIds?.includes(lesson.id) && (access.active || a.previewAllowed===true));
  const caption=assets.find(a=>a.id===lesson.captionId && a.kind==='captions' && a.courseId===course.id && a.lessonIds?.includes(lesson.id) && (access.active || a.previewAllowed===true));
  view.media=video ? {...assetView(video,course.id,lesson.id),captions:caption ? [{...assetView(caption,course.id,lesson.id),language:'th',label:'ไทย'}] : [],captionsEmbedded:lesson.captionsEmbedded===true} : null;
  view.resources=access.active ? [...(lesson.resourceIds || []),...(lesson.additionalResourceIds || [])]
    .map(id=>assets.find(a=>a.id===id && a.kind==='resource' && a.courseId===course.id && a.lessonIds?.includes(lesson.id)))
    .filter(Boolean).map(a=>({...assetView(a,course.id,lesson.id),optional:!(lesson.resourceIds || []).includes(a.id)})) : [];
  view.resourcesLocked=!access.active && Boolean(lesson.resourceIds?.length || lesson.additionalResourceIds?.length);
  return view;
}
function courseView(course,access) {
  return {id:course.id,title:course.title,summary:course.description || course.summary || '',
    sections:course.sections || [],startLessonId:course.startLessonId,
    previewLessonId:null,trialUrl:course.trialUrl || null,mainLessonIds:course.mainLessonIds || [],applicationLessonIds:course.applicationLessonIds || [],
    videoLessonCount:course.lessons.filter(l=>l.mediaId).length,
    lessons:course.lessons.map(l=>lessonMetadata(l,access))};
}

export function createLearnHandler({getSql=database,lookupUser=currentUser,storeFactory=createLearnStore,courses=LEARN_COURSES,assets=LEARN_ASSETS,now=()=>Date.now()}={}) {
  return async function handler(req,res) {
    for (const key of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control']) res.setHeader(key,'private, no-store, max-age=0');
    res.setHeader('Vary','Cookie, Origin');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    try {
      if (!['GET','POST','PUT'].includes(req.method)) {res.setHeader('Allow','GET, POST, PUT');throw new LearnError('METHOD_NOT_ALLOWED',405);}
      if (req.method!=='GET' && (!req.headers?.origin || !sameOrigin(req) || req.headers?.['sec-fetch-site']==='cross-site')) throw new LearnError('BAD_ORIGIN',403);
      const action=parameter(req,'action') || (req.method==='GET' ? 'courses' : '');
      const allowed={GET:['entry','courses','course','lesson','progress'],POST:['enroll'],PUT:['progress']};
      if (!allowed[req.method].includes(action)) throw new LearnError('INVALID_ACTION');
      const sql=getSql();const store=storeFactory(sql);const time=now();
      const options={store,lookupUser,courses,assets,now:time};
      if (action==='entry') {
        // A returning password session may show its doorway before email step-up.
        // No catalog, course title, progress, or paid asset is disclosed here.
        const user=await lookupUser(req,sql);
        if (!user?.id) throw new LearnError('AUTH_REQUIRED',401);
        await store.ensure();
        const enrollments=await store.enrollments(user.id);
        return reply(res,200,{ok:true,hasEnrollment:enrollments.some(e=>courses.some(c=>c.id===e.course_id))});
      }
      if (req.method==='POST') {
        const body=await readBody(req);
        if (Object.keys(body).some(k=>k!=='courseId')) throw new LearnError('INVALID_ENROLLMENT_FIELDS');
        const result=await enrollLearnCourse(sql,req,{courseId:body.courseId},options);
        return reply(res,200,{ok:true,user:publicUser(result.user),course:courseView(result.course,result.access),access:result.access});
      }
      if (req.method==='PUT') {
        const body=await readBody(req);const courseId=learnId(body.courseId,'COURSE_ID'),lessonId=learnId(body.lessonId,'LESSON_ID');
        const allowed=await authorizeLearnLesson(sql,req,{courseId,lessonId},options);
        await store.saveProgress(allowed.user.id,courseId,lessonId,validateProgress(body,allowed.lesson),new Date(time));
        return reply(res,200,{ok:true,courseId,progress:progressSummary(await store.progress(allowed.user.id,courseId),allowed.course)});
      }
      if (action==='lesson') {
        const result=await authorizeLearnLesson(sql,req,{courseId:requestedCourse(req),lessonId:learnId(parameter(req,'lessonId'),'LESSON_ID')},options);
        // Reading bodies live privately and use the same authorization as this
        // specific lesson. Course metadata and the public catalog never carry them.
        const reading=await store.reading?.(result.course.id,result.lesson.id) || '';
        const lesson={...lessonView(result.course,result.lesson,result.access,assets),reading,readingAvailable:Boolean(reading.trim())};
        return reply(res,200,{ok:true,courseId:result.course.id,lesson,access:result.access,preview:result.preview});
      }
      const user=await verifiedLearnUser(sql,req,{store,lookupUser});await store.ensure();
      if (action==='courses') {
        const [enrollments,grants,registrations,instructors]=await Promise.all([store.enrollments(user.id),store.grants(user.id),store.registrations(user.id),store.instructors(user.id)]);
        const result=[];
        for (const enrollment of enrollments) {
          const course=courses.find(c=>c.id===enrollment.course_id);if(!course)continue;
          const access=courseAccess(enrollment,grants.filter(g=>g.course_id===course.id),registrations.filter(r=>r.course_id===course.id),time,instructors);
          const progress=progressSummary(await store.progress(user.id,course.id),course);
          result.push({id:course.id,title:course.title,summary:course.description || course.summary || '',status:access.status,expiresAt:access.expiresAt,
            videoLessonCount:course.lessons.filter(l=>l.mediaId).length,
            access,progress:{completedLessons:progress.completedLessons,totalLessons:progress.totalLessons,percent:progress.percent}});
        }
        return reply(res,200,{ok:true,user:publicUser(user),courses:result});
      }
      const courseId=requestedCourse(req);const course=courses.find(c=>c.id===courseId);
      if(!course)throw new LearnError('COURSE_NOT_FOUND',404);
      const access=await loadCourseAccess(store,user.id,course.id,time);
      if(access.status==='not_enrolled')throw new LearnError('COURSE_ENROLLMENT_REQUIRED',403);
      const progress=progressSummary(await store.progress(user.id,course.id),course);
      if(action==='progress')return reply(res,200,{ok:true,courseId,progress});
      return reply(res,200,{ok:true,user:publicUser(user),course:courseView(course,access),access,progress});
    } catch(error) {
      if (!(error instanceof LearnError)) console.error('LEARN_UNAVAILABLE',String(error?.code || error?.name || 'UnknownError').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60));
      const status=error instanceof LearnError ? error.status : 503;
      const code=error instanceof LearnError ? error.code : 'LEARN_UNAVAILABLE';
      return reply(res,status,{ok:false,error:code,code,message:error instanceof LearnError ? error.message : 'ห้องเรียนยังไม่พร้อม กรุณาลองใหม่อีกครั้ง'});
    }
  };
}
