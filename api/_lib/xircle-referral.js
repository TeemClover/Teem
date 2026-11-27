/* ถามชื่อเจ้าของรหัสผู้แนะนำจากหน้าสมัครของ buy.xircle.health
   ใช้ช่องเดียวกับที่หน้า https://buy.xircle.health/register ถามตอนพิมพ์รหัส (ทีละรหัส ไม่มีแบบดึงทั้งหมด)
   ผล: valid (มีชื่อ) · not_found (รหัสผิด) · error (ถามไม่สำเร็จ ลองใหม่รอบหน้า) */
export const REFERRAL_URL = 'https://buy.xircle.health/api/register/referral';

export async function lookupReferral(code, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(REFERRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    if (data && data.valid === true) {
      const owner = data.referralOwner || {};
      const text = value => String(value == null ? '' : value).trim().slice(0, 80);
      return { status: 'valid', first_name: text(owner.firstName), last_name: text(owner.lastName), role: text(owner.role).slice(0, 24) };
    }
    if (data && (data.status === 'NOT_FOUND' || data.error === 'referralCodeNotFound')) return { status: 'not_found' };
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
