import { ANALYTICS_VERSION, DOORS, ENVIRONMENTS, EVENTS } from '../../assets/front-door/contract.js';

// Pure read model: keep incomplete or malformed API replies from becoming credible zeros.
const count = value => Number.isSafeInteger(value) && value >= 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counts = value => record(value) && ['installations', 'journeys', 'events'].every(key => count(value[key]));
const timingKeys = ['activeMsToFirstChoice', 'activeMsToLuckyReturn', 'activeMsToDoorFound'];
const dimensions = ['source', 'visitorClass', 'viewport', 'intentPrimary', 'doorId'];

export function validResponse(data, expectedEnv) {
  if (!record(data) || data.ok !== true || !['ready', 'no-data'].includes(data.status)
    || data.analyticsVersion !== ANALYTICS_VERSION || !ENVIRONMENTS.includes(data.env)
    || (expectedEnv && data.env !== expectedEnv)
    || !record(data.metrics) || !Object.keys(EVENTS).every(name => counts(data.metrics[name]))
    || !record(data.timings) || !timingKeys.every(key => data.timings[key] === null || (Number.isFinite(data.timings[key]) && data.timings[key] >= 0))
    || !record(data.breakdowns) || !dimensions.every(key => Array.isArray(data.breakdowns[key]) && data.breakdowns[key].every(counts))
    || !Array.isArray(data.transitions) || !data.transitions.every(counts)
    || !Array.isArray(data.rates) || !data.rates.every(rate => record(rate) && count(rate.numerator) && count(rate.denominator)
      && rate.numerator <= rate.denominator && (rate.rate === null || (Number.isFinite(rate.rate) && rate.rate >= 0 && rate.rate <= 1)))) return false;
  if (data.breakdowns.seedColor != null && (!Array.isArray(data.breakdowns.seedColor) || !data.breakdowns.seedColor.every(counts))) return false;
  if (data.outcomes == null) return true; // Older API: show an explicit outcomes-unwired notice.
  if (!record(data.outcomes) || !Array.isArray(data.outcomes.rows) || !data.outcomes.rows.every(row => record(row) && DOORS.includes(row.door)
    && ['opened', 'arrived', 'requested'].every(key => count(row[key])) && row.arrived <= row.opened && row.requested <= row.opened)) return false;
  return data.outcomes.paths == null || (Array.isArray(data.outcomes.paths) && data.outcomes.paths.every(row => counts(row)
    && DOORS.includes(row.door) && typeof row.path === 'string' && /^\/[A-Za-z0-9/_\-.]{0,159}$/.test(row.path)));
}

export const AKO_STOPS = Object.freeze([
  { path: '/ako/', title: 'บ้าน Ako', note: 'ถึงทางเข้าสุขภาพ' },
  { path: '/ako/kitchen/', title: 'ครัว Ako', note: 'เข้ามาหาเมนู' },
  { path: '/ako/story/', title: 'เรื่องราวของ Ako', note: 'เปิดอ่านเรื่องราว' },
  { path: '/xircle/', title: 'ไปต่อที่ Xircle', note: 'ยังเชื่อมกับทาง Ako' },
  { path: '/meet/', title: 'เปิดหน้านัดคุย', note: 'ยังไม่ใช่การส่งคำขอ' },
]);

export function akoProgress(outcomes) {
  if (!Array.isArray(outcomes?.paths)) return null;
  return AKO_STOPS.map(stop => ({ ...stop, ...(outcomes.paths.find(row => row.door === 'ako' && row.path === stop.path)
    || { installations: 0, journeys: 0, events: 0 }) }));
}

export function responseFailure(status, data, isJSON) {
  const error = data?.error;
  if (error === 'STAT_ACCESS_NOT_CONFIGURED') return { state: 'unwired', title: 'SETUP REQUIRED · ยังไม่ได้ตั้งการเข้าถึง Stat', message: 'เพิ่ม STAT_PASSWORD ใน Cloudflare Pages → Settings → Environment variables แล้ว deploy ใหม่ ระบบจะปิดข้อมูลไว้จนกว่าจะตั้งค่าสำเร็จ' };
  if (error === 'FRONTDOOR_DB_NOT_CONFIGURED') return { state: 'unwired', title: 'PIPELINE UNWIRED · ยังไม่เชื่อมฐานข้อมูล', message: 'API ทำงานแล้ว แต่ยังไม่มี D1 binding ชื่อ DB สำหรับข้อมูล Front Door' };
  if (error === 'FRONTDOOR_ENV_NOT_CONFIGURED') return { state: 'unwired', title: 'PIPELINE UNWIRED · ยังไม่ระบุ environment', message: 'ตรวจสอบ FRONTDOOR_ENV ของ deployment ให้ตรงกับ local, preview หรือ prod' };
  if (error === 'ENV_MISMATCH' || error === 'ORIGIN_ENV_MISMATCH') return { state: 'failed', title: 'ENVIRONMENT MISMATCH · ข้อมูลคนละ environment', message: 'โฮสต์ local และ preview อ่านได้เฉพาะ environment ของตัวเอง หากต้องการ production ให้เปิด Stat ผ่านช่องทางที่ป้องกันไว้', protectedLink: true };
  if (status === 401 || status === 403) return { state: 'failed', title: 'REQUEST FAILED · ต้องมีสิทธิ์เข้าถึง', message: 'เซิร์ฟเวอร์ปฏิเสธการเข้าถึงข้อมูล กรุณาเข้าสู่ Stat ผ่านช่องทางที่ป้องกันไว้', protectedLink: true };
  if (status === 400) return { state: 'failed', title: 'REQUEST FAILED · ตรวจสอบตัวกรอง', message: 'เลือกช่วงเวลาไม่เกิน 93 วัน และตรวจสอบตัวกรองอีกครั้ง', filters: true };
  if (status === 404 || status === 503 || (status >= 200 && status < 300 && !isJSON)) return { state: 'unwired', title: 'PIPELINE UNWIRED · ยังไม่ต่อสาย', message: 'ยังไม่พบ API Front Door ที่พร้อมใช้งานบนโฮสต์นี้ หรือบริการยังไม่พร้อมตอบกลับ' };
  if (status >= 400) return { state: 'failed', title: 'REQUEST FAILED · เซิร์ฟเวอร์ตอบกลับผิดพลาด', message: `อ่านข้อมูลไม่สำเร็จ (HTTP ${status}) กรุณาลองอีกครั้ง ตัวเลขเดิมถูกซ่อนไว้แล้ว` };
  return null;
}
