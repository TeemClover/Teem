// The hand-off text for Claude, built from the same plan the preview draws and the export records.
import { XVISOR_REPO, CLAIM_GUARD_URL, OFFICIAL_IMAGES, publicUrl } from './official-assets.js';
import { STYLES } from './story.js';

export const NEXT_REQUESTS = [
  { id: 'voice', label: 'ปรับเป็นภาษาพูดของพี่', text: 'ช่วยปรับบทพากย์นี้ให้เป็นภาษาพูดของพี่ โดยคงประโยคเปิดไว้ แล้วโชว์ก่อน/หลังเฉพาะประโยคที่เปลี่ยน', recommended: true },
  { id: 'caption', label: 'เขียนแคปชันและแฮชแท็ก', text: 'ช่วยเขียนแคปชันไม่เกิน 3 บรรทัด และแฮชแท็ก 3–5 อันสำหรับคลิปนี้ โดยคงประโยคเปิดไว้' },
  { id: 'short', label: 'ทำเวอร์ชัน 15 วินาที', text: 'ช่วยตัดบทนี้ให้เหลือราว 15 วินาที โดยคงประโยคเปิดไว้ และบอกว่าตัดช็อตไหนออก' },
  { id: 'next', label: 'คิดคลิปที่สอง', text: 'ช่วยคิดคลิปที่สองต่อจากคลิปนี้ ใช้รูปชุดเดิมได้ ไม่ต้องออกกล้อง' }
];

const time = s => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const quote = s => `“${String(s || '').trim()}”`;

export function describeFocus(focus) {
  const h = focus.x < 0.4 ? 'ค่อนซ้าย' : focus.x > 0.6 ? 'ค่อนขวา' : 'กลาง';
  const v = focus.y < 0.4 ? 'ค่อนบน' : focus.y > 0.6 ? 'ค่อนล่าง' : 'กลาง';
  return h === v ? 'กลางภาพ' : `${h === 'กลาง' ? 'กลางภาพ' : h}${v === 'กลาง' ? '' : ' ' + v}`.trim();
}

function shotScreenText(shot) {
  if (shot.kind === 'choices') return `${quote(shot.text)} + ตัวเลือก ${shot.choices.map((c, i) => `${'กขค'[i]}) ${c}`).join(' ')}`;
  if (shot.kind === 'step') return `ขั้นที่ ${shot.step}: ${quote(shot.text)}`;
  if (shot.kind === 'hook' && shot.kicker) return `${quote(shot.text)} (ป้ายเล็ก: ${shot.kicker})`;
  return quote(shot.text);
}

const KIND_LABEL = { hook: 'เปิด', line: 'กลาง', step: 'กลาง', choices: 'กลาง', close: 'ปิด' };

// context: { story, audience, nextRequest, customRequest, sampleKeys }
export function buildBrief(plan, context) {
  const style = STYLES[plan.style];
  const fromDevice = plan.photos.some(p => p.origin === 'device');
  const lines = [];
  lines.push(`ชุดความรู้ X-VISOR อยู่ที่ ${XVISOR_REPO}`);
  lines.push('ถ้าเปิดลิงก์ได้ ให้อ่าน START-HERE.md แล้วใช้คู่มือทำคลิปกับ Claim Guard ในนั้น ถ้าเปิดไม่ได้ บอกพี่สั้น ๆ ว่าต้องแนบไฟล์ไหน');
  lines.push('');
  lines.push(`เป้าหมาย: พี่เป็น X-VISOR อยากโพสต์คลิปแนวตั้ง 9:16 ยาว ${Math.round(plan.duration)} วินาที โดยไม่ออกกล้อง`);
  lines.push(`ผู้ชม: ${context.audience}`);
  lines.push(`รูปแบบ: ${style.label} (สไลด์ภาพ + ข้อความบนจอ ยังไม่มีเสียงพากย์)`);
  lines.push(`เรื่องที่พี่เล่าเอง: ${quote(context.story || '-')}`);
  lines.push('');
  lines.push(`บทฉบับแก้ล่าสุด (X-VISOR Studio ฉบับ ${plan.id})`);
  lines.push(`ประโยคเปิด (Hook): ${quote(plan.shots[0].text)}`);
  lines.push('');
  lines.push('ลำดับช็อต');
  plan.shots.forEach((shot, i) => {
    const photo = plan.photos[shot.photo];
    lines.push(`${i + 1}) ${time(shot.start)}–${time(shot.end)} [${KIND_LABEL[shot.kind]}] ภาพ: รูปที่ ${shot.photo + 1} (โฟกัส${describeFocus(photo.focus)}) · ข้อความบนจอ: ${shotScreenText(shot)}`);
  });
  lines.push('');
  lines.push('รูปที่ใช้');
  plan.photos.forEach((p, i) => {
    if (p.origin === 'device') lines.push(`- รูปที่ ${i + 1}: รูปจากมือถือของพี่ (${p.width}×${p.height})`);
    else {
      const key = Object.keys(OFFICIAL_IMAGES).find(k => k === p.id);
      lines.push(`- รูปที่ ${i + 1}: ภาพตัวอย่างทางการ ${OFFICIAL_IMAGES[key]?.label || p.label} ${key ? publicUrl(key) : ''}`.trim());
    }
  });
  if (fromDevice) lines.push('รูปจากมือถือของพี่ไม่ได้ส่งมากับข้อความนี้ ถ้าต้องให้ Claude เห็นภาพจริง พี่จะแนบรูปเดิมในแชตนี้');
  lines.push('');
  lines.push('ขอบเขต');
  lines.push('- ประสบการณ์ส่วนตัวใช้เฉพาะที่พี่เล่าข้างบน ห้ามเติมผลลัพธ์ จำนวนวันที่ใช้ หรือตัวเลขสุขภาพ ถ้าจำเป็นให้เว้น [ใส่ประสบการณ์จริงของพี่]');
  lines.push(`- ตรวจคำเสี่ยงตาม Claim Guard ${CLAIM_GUARD_URL}`);
  lines.push('');
  const next = NEXT_REQUESTS.find(r => r.id === context.nextRequest);
  const ask = context.nextRequest === 'custom' && context.customRequest ? context.customRequest.trim() : (next || NEXT_REQUESTS[0]).text;
  lines.push(`สิ่งที่อยากให้ช่วยต่อ: ${ask}`);
  lines.push('ตอบเป็นภาษาไทย สั้น อ่านบนมือถือได้');
  return lines.join('\n');
}
