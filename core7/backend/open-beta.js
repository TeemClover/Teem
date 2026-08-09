/* สถิติก่อนเวลานี้เป็นข้อมูลทดสอบช่วงพัฒนา ไม่ใช่ข้อมูล Open Beta
   เก็บแถวเดิมไว้เพื่อย้อนตรวจได้ แต่ทุก report เริ่มนับจากจุดนี้ */
export const OPEN_BETA_ISO = '2026-08-09T21:35:00+07:00';
export const OPEN_BETA_AT = Date.parse(OPEN_BETA_ISO);

export function clampAnalyticsStart(start) {
  return Math.max(Number(start) || 0, OPEN_BETA_AT);
}
