// เชื่อปากกู · TMT — big confident type and a first-bite rhythm. Copy from brands/tmt/Content.md.
import { brandHeader, brandFooter, mountBrand } from './shell.js';
import { offerCards } from '../commerce.js';
import { brandMedia, heroFacts, weight, packDiagram, reheatSteps, faqList, faqAnswers, icons } from '../ui.js';
import { config } from '../product.js';

export const meta = {
  title: 'เชื่อปากกู · TMT | แฮมเบิร์กญี่ปุ่น พร้อมซอส พร้อมอุ่น',
  description: 'เนียน นุ่ม ถึงรสญี่ปุ่น แฮมเบิร์กจากเชฟญี่ปุ่น บดเอง จี่จนสุก พร้อมซอสทำเอง เราปรุงให้แล้ว คุณแค่อุ่น'
};

const logo = `<span class="tmt-word">เชื่อปากกู</span><span class="tmt-en">TMT — TRUST MY TASTE</span>`;
const stamp = (cls = '') => `<div class="tmt-stamp ${cls}" aria-hidden="true">
  <svg viewBox="0 0 200 200"><defs><path id="tmt-ring" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0"/></defs>
  <circle cx="100" cy="100" r="94"/><circle cx="100" cy="100" r="58"/>
  <text><textPath href="#tmt-ring" startOffset="0">TRUST MY TASTE · TMT · TRUST MY TASTE · TMT ·</textPath></text></svg>
  <span>กูชิม<br>แล้ว</span></div>`;
const { img, crop, video } = brandMedia('tmt');
const n = config.product.packPieces;

export function render() {
  return `<div class="page brand-tmt" data-brand="tmt">
  ${brandHeader('tmt', { logo, nav: [['คำแรก', 'first-bite'], ['งานปรุง', 'proof'], ['วิธีอุ่น', 'reheat'], ['เลือกชุด', 'offers']] })}
  <main id="main">

  <section class="tmt-hero" id="top" data-section="T01">
    <div class="tmt-hero-copy">
      <p class="tmt-name"><strong>เชื่อปากกู</strong> <span>TMT — TRUST MY TASTE</span></p>
      <p class="tmt-eyebrow">แฮมเบิร์กสไตล์ญี่ปุ่น พร้อมซอส พร้อมอุ่น</p>
      <h1 class="tmt-h1"><span class="tmt-l1">คำนี้</span><span class="tmt-l2">กูชิมแล้ว</span></h1>
      <p class="tmt-lead">เนื้อบดเนียนนุ่ม จี่จนสุก พร้อมซอสที่ต้มเองจากเชฟญี่ปุ่น ใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสม แล้วปรุงให้เนื้อกับซอสเข้ากัน</p>
      <p class="tmt-promise">เราปรุงให้แล้ว คุณแค่อุ่น</p>
      <p class="tmt-facts">${heroFacts()}</p>
      <div class="cta-row">
        <a class="btn" href="#offers" data-hero-cta>เลือกชุดไปลอง</a>
        <a class="btn btn-ghost" href="#first-bite">ดูคำแรก</a>
      </div>
    </div>
    <figure class="tmt-hero-photo">
      ${video({ sizes: '(min-width: 900px) 48vw, 100vw', pos: '50% 58%' })}
      <figcaption>ไอเดียเสิร์ฟ · เครื่องเคียงไม่รวมในแพ็ก</figcaption>
    </figure>
  </section>

  <div class="tmt-band" aria-label="สิ่งที่เราทำเอง">
    <span>บดเอง</span><i></i><span>จี่จนสุก</span><i></i><span>ซอสต้มเอง</span><i></i><span>เชฟญี่ปุ่น</span>
  </div>

  <section class="tmt-bite scene" id="first-bite" data-section="T02">
    <div class="scene-runway" data-scene data-beats="3"><div class="scene-sticky">
      <div class="tmt-stage">
        ${img('whole', { cls: 'tb-whole', sizes: '(min-width: 900px) 62vw, 100vw', pos: '66% 60%', alt: 'แฮมเบิร์ก 2 ก้อนกับซอสบนจานดำ' })}
        ${img('plate', { cls: 'tb-cut', sizes: '(min-width: 900px) 62vw, 100vw', pos: '66% 60%', alt: 'ก้อนที่ผ่าแล้วเห็นเนื้อด้านใน' })}
        ${img('cutaway', { cls: 'tb-macro', sizes: '(min-width: 900px) 62vw, 100vw', pos: '62% 60%', alt: 'ภาพใกล้เนื้อด้านในกับซอสที่เข้าคำ' })}
        ${stamp('tb-stamp')}
      </div>
      <div class="tmt-bite-copy">
        <p class="tmt-kicker">คำแรก</p>
        <ol class="beats tmt-beats" role="list">
          <li data-b="0">ผิวที่จี่</li>
          <li data-b="1">เนื้อด้านใน</li>
          <li data-b="2">ซอสที่เข้ากัน</li>
        </ol>
        <h2 class="tmt-h2">เนียน นุ่ม <span class="nb">ถึงรสญี่ปุ่น</span></h2>
      </div>
    </div></div>
    <div class="scene-tail">
      <p>ผิวที่จี่ เนื้อด้านใน และซอสที่เข้ากัน เราตั้งใจทำทั้งสามอย่างให้เป็นคำที่อยากกินต่อ</p>
      <p class="tmt-sign">เชื่อปากกู กูชิมแล้ว</p>
      <a class="btn btn-light" href="#offers">เลือกชุดไปลอง</a>
    </div>
  </section>

  <section class="tmt-proof" id="proof" data-section="T03">
    <h2 class="tmt-h2" data-reveal>คำว่าชิมแล้ว <span class="nb">มีงานปรุงอยู่ข้างหลัง</span></h2>
    <ol class="tmt-proof-grid" role="list">
      <li data-reveal><span class="tp-n">01</span>${icons.grind}<h3>บดเองกับเครื่องเทศสูตรของเรา</h3><p>ใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสม เตรียมเนื้อให้ได้สัมผัสเนียนนุ่ม</p></li>
      <li data-reveal><span class="tp-n">02</span>${icons.grill}<h3>จี่จนสุกทุกชิ้น</h3><p>ปรุงด้วยเตาย่างญี่ปุ่น ก่อนหมักกับซอสและทำเป็นอาหารแช่แข็งพร้อมอุ่น</p></li>
      <li data-reveal><span class="tp-n">03</span>${icons.sauce}<h3>ซอสทำเองทุกแพ็ก</h3><p>ต้มและปรุงเองให้เข้ากับเนื้อของเรา</p></li>
      <li data-reveal><span class="tp-n">04</span>${icons.chef}<h3>รสมือเชฟญี่ปุ่น</h3><p>จากประสบการณ์ร้านอาหารญี่ปุ่นในประเทศไทยกว่า 10 ปี</p></li>
    </ol>
    <a class="text-link" href="#sauce">ดูเรื่องซอส →</a>
  </section>

  <section class="tmt-sauce" id="sauce" data-section="T04">
    <figure class="tmt-sauce-photo">${img('cutaway', { sizes: '100vw', pos: '50% 70%' })}</figure>
    <div class="tmt-sauce-copy" data-reveal>
      <h2 class="tmt-h2"><span class="nb">เนื้อต้องนุ่ม</span> <span class="nb">ซอสต้องเข้าคำ</span></h2>
      <p>เราปรุงซอสให้เข้ากับเนื้อที่บดและจี่เอง ให้แต่ละคำมีทั้งสัมผัสและรสที่อยากกินต่อ</p>
      <p>จะเสิร์ฟกับข้าว ผัก หรือเพิ่มไข่ที่ชอบ คุณจัดมื้อได้ในแบบของคุณ</p>
      <a class="btn" href="#offers">เลือกชุด</a>
    </div>
  </section>

  <section class="tmt-pack" id="pack" data-section="T05">
    <div data-reveal>
      <h2 class="tmt-h2">เปิดแพ็กแล้ว ได้อะไร</h2>
      <p>แฮมเบิร์ก ${n} ก้อนพร้อมซอส อาหารสุทธิ ${weight()} ปรุงสุกและแช่แข็งไว้สำหรับอุ่น</p>
      <table class="tmt-spec">
        <tr><th scope="row">ในแพ็ก</th><td>แฮมเบิร์ก ${n} ก้อน + ซอสทำเอง</td></tr>
        <tr><th scope="row">อาหารสุทธิ</th><td>${weight()}</td></tr>
        <tr><th scope="row">สถานะ</th><td>ปรุงสุก แช่แข็ง พร้อมอุ่น</td></tr>
        <tr><th scope="row">ไม่รวม</th><td>ข้าว ไข่ ผัก และเครื่องเคียงในภาพ</td></tr>
      </table>
      <a class="text-link" href="#reheat">ดูวิธีอุ่น →</a>
    </div>
    <div data-reveal>${packDiagram()}</div>
  </section>

  <section class="tmt-reheat" id="reheat" data-section="T06">
    <h2 class="tmt-h2 tmt-big"><span class="nb">อีเจ้ทำให้แล้ว</span> <span class="nb">มึงแค่อุ่น</span></h2>
    <div class="tmt-reheat-body">
      <p>เราทำส่วนการปรุงให้แล้ว คุณเลือกวิธีอุ่นของสินค้า จัดจาน แล้วกินให้อร่อย</p>
      ${reheatSteps()}
      <p class="tmt-small">สำหรับไมโครเวฟ ให้ฉีกซองและเทลงภาชนะที่ใช้กับไมโครเวฟได้ก่อนอุ่นตามวิธีของสินค้า</p>
    </div>
  </section>

  <section class="tmt-offers" id="offers" data-section="T07">
    <h2 class="tmt-h2" tabindex="-1">ลองคำที่เรามั่นใจ</h2>
    ${offerCards('tmt', {
      single: 'เริ่มลองรสมือของเรา',
      trio: 'มีอีกหลายแพ็กไว้จัดมื้อ',
      stock: 'เก็บไว้เลือกอุ่นเมื่ออยากกิน'
    })}
  </section>

  <section class="tmt-faq" id="faq" data-section="T08">
    <h2 class="tmt-h2">ถามก่อนลอง</h2>
    ${faqList([
      ['นี่คือเบอร์เกอร์พร้อมขนมปังไหม?', faqAnswers.bun],
      ['ใน 1 แพ็กมีเท่าไร?', faqAnswers.pack()],
      ['ใช้เนื้อวัวญี่ปุ่น 100% หรือเปล่า?', faqAnswers.beef],
      ['มีส่วนผสมที่ต้องระวังสำหรับผู้แพ้อาหารไหม?', faqAnswers.allergen()],
      ['เก็บและอุ่นอย่างไร?', faqAnswers.storage()],
      ['จัดส่งอย่างไรและค่าส่งเท่าไร?', faqAnswers.shipping()]
    ])}
  </section>

  <section class="tmt-close" data-section="T09">
    ${stamp('tc-stamp')}
    <h2 class="tmt-h2 tmt-big"><span class="nb">กูชิมแล้ว</span> <span class="nb">ทีนี้ตาลองของมึง</span></h2>
    <p>แฮมเบิร์กญี่ปุ่นเนียนนุ่มกับซอสที่เราทำเอง ปรุงให้แล้วพร้อมเป็นมื้อที่บ้าน</p>
    <a class="btn" href="#offers" data-hero-cta>เลือกชุดไปลอง</a>
    <p class="tmt-en-sign">TMT — TRUST MY TASTE</p>
  </section>
  </main>
  ${brandFooter('tmt', { name: 'เชื่อปากกู · TMT — TRUST MY TASTE', slogan: 'เราปรุงให้แล้ว คุณแค่อุ่น' })}
  </div>`;
}

export const mount = root => mountBrand(root, 'tmt');
