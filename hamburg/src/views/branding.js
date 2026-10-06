import { brandLogo, packPreview } from '../identity.js';
import { href } from '../ui.js';

export const meta = {
  title: '3 แบรนด์ 3 บุคลิก · Hamburg',
  description: 'โลโก้ สี และถุงซีลสูญญากาศติดฉลากของ Homechew เชื่อปากกู และนุ่มจัง',
  noindex: true
};

const kits = [
  { id: 'homechew', name: 'Homechew · โฮมชิว', style: 'ครัวอบอุ่น งานคราฟต์',
    copy: 'ใช้สัญลักษณ์บ้านและตัวชื่อเดิม เปลี่ยนการสะกดไทยเป็น โฮมชิว ฉลากงาช้าง เส้นบาง และช่องว่างแบบงานครัวที่ตั้งใจทำ',
    colors: ['#F4EEE4', '#292018', '#7E5738', '#A85D37'], type: 'ตัวชื่อเดิม / Noto Serif Thai / IBM Plex Sans Thai',
    shape: 'ฉลากสี่เหลี่ยมงาช้าง · กรอบเส้นบาง · ตราบ้าน', line: 'ปรุงอย่างพิถีพิถัน อร่อยง่ายแค่อุ่น' },
  { id: 'tmt', name: 'เชื่อปากกู · TMT', style: 'แดง มั่นใจ จำได้ในคำเดียว',
    copy: 'ตัวไทยตัดมุม หนักแน่น วางเป็นตราสองชั้น แดงเป็นสีจำของแบรนด์ ใช้ฉลากขอบตรงและแถบสีเข้มเพื่อให้เห็นชัดบนถุงใส',
    colors: ['#B72D26', '#181714', '#FFF6E8', '#4C3026'], type: 'โลโก้ตัวไทยเฉพาะ / Kanit / IBM Plex Sans Thai',
    shape: 'ตราตัวไทยสองชั้น · แถบแดง · กริดและขอบตรง', line: 'คำนี้ กูชิมแล้ว' },
  { id: 'noomjang', name: 'นุ่มจัง · NOOMJANG', style: 'นุ่ม เป็นมิตร สีเขียวสบายตา',
    copy: 'ตัวชื่ออิ่มโค้งกับไอร้อน สีเขียวเข้มบนพื้นเขียวอ่อน มีสีแอปริคอตช่วยให้ดูชวนกิน ฉลากทรงซุ้มและพื้นที่โปร่งให้เห็นอาหาร',
    colors: ['#355A49', '#E5EEDB', '#F0B991', '#FFFDF5'], type: 'โลโก้ตัวไทยเฉพาะ / Mitr / IBM Plex Sans Thai Looped',
    shape: 'ฉลากทรงซุ้ม · เส้นโค้งอ่อน · ไอร้อน', line: 'นุ่มแบบญี่ปุ่น อุ่นได้ที่บ้าน' }
];

export function render() {
  return `<div class="page brand-kit" data-brand="arena">
    <header class="kit-head"><a data-link href="${href('/')}">← กลับไปเลือกบูธ</a><span>HAMBURG / BRAND STUDY</span></header>
    <main id="main">
      <section class="kit-intro"><p class="kit-eyebrow">โลโก้ · แบรนด์ · แพ็กเกจ</p><h1>3 แบรนด์ <span class="nb">3 บุคลิก</span></h1><p>สินค้าเดียวกันในถุงซีลสูญญากาศติดฉลาก แต่เล่าเรื่องคนละแบบ</p></section>
      <div class="kit-grid">${kits.map(k => `<article class="kit-card kit-${k.id}">
        <div class="kit-logo">${brandLogo(k.id, { full: true })}</div>
        <div class="kit-pack">${packPreview(k.id)}</div>
        <div class="kit-copy"><p class="kit-style">${k.style}</p><h2>${k.name}</h2><p>${k.copy}</p>
          <div class="kit-swatches" aria-label="สีของ ${k.name}">${k.colors.map(c => `<span><i style="background:${c}"></i><code>${c}</code></span>`).join('')}</div>
          <dl><dt>ตัวอักษร</dt><dd>${k.type}</dd><dt>รูปทรง</dt><dd>${k.shape}</dd><dt>ประโยคของแบรนด์</dt><dd>${k.line}</dd></dl>
          <div class="kit-actions"><a href="assets/${k.id}/label-front.svg" target="_blank" rel="noopener">ดูฉลากหน้า ↗</a><a href="assets/${k.id}/label-back.svg" target="_blank" rel="noopener">ดูฉลากหลัง ↗</a><a data-link href="${href(`/${k.id}/`)}">เข้าบูธ →</a></div>
        </div>
      </article>`).join('')}</div>
      <section class="kit-note"><h2>ถุงใส เห็นของที่อยู่ข้างใน</h2><p>แฮมเบิร์ก 2 ชิ้นกับซอสอยู่ในถุงเดียวกัน ติดฉลากด้านนอกและเหลือพื้นที่ให้เห็นอาหาร แบบฉลากหลังเว้นช่องสำหรับข้อมูลสินค้าจริงและวันที่ผลิต</p><p><a href="assets/brand-kit-v2.zip" download>ดาวน์โหลดชุดโลโก้ ภาพแพ็กเกจ และแบบฉลาก (ZIP) ↓</a></p><p>ภาพและฉลากชุดนี้เป็นแบบสำหรับเลือกทิศทางแบรนด์ ยังไม่ใช่ภาพสินค้าจริงหรือฉลากพร้อมผลิต</p></section>
    </main>
  </div>`;
}
