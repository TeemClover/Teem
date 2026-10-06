// Homechew — editorial dinner table. Copy from brands/homechew/Content.md.
import { brandHeader, brandFooter, mountBrand } from './shell.js';
import { offerCards } from '../commerce.js';
import { img, crop, heroFacts, weight, packDiagram, reheatSteps, faqList, faqAnswers, icons } from '../ui.js';
import { config } from '../product.js';

export const meta = {
  title: 'Homechew | โฮมเมดแฮมเบิร์กญี่ปุ่น พร้อมซอส พร้อมอุ่น',
  description: 'มื้อดี ๆ ที่บ้านกับแฮมเบิร์กสไตล์ญี่ปุ่นจากเชฟญี่ปุ่น บดเอง จี่จนสุก พร้อมซอสทำเอง ให้คุณอุ่นและจัดจานได้ง่าย'
};

const logo = `<img class="hc-wordmark" src="assets/homechew-wordmark.svg" width="657" height="123" alt="Homechew"><span class="hc-thai">โฮมชิว</span>`;
const n = config.product.packPieces;

export function render() {
  return `<div class="page brand-homechew" data-brand="homechew">
  ${brandHeader('homechew', { logo, nav: [['การทำของเรา', 'kitchen'], ['วิธีอุ่น', 'reheat'], ['เลือกชุดสินค้า', 'offers']] })}
  <main id="main">

  <section class="hc-hero" id="top" data-section="H01">
    <div class="hc-hero-copy">
      <p class="hc-eyebrow">โฮมเมดแฮมเบิร์กสไตล์ญี่ปุ่น</p>
      <h1 class="hc-h1"><span class="nb">มื้อดี ๆ</span> <span class="nb">รออยู่ที่บ้าน</span></h1>
      <p class="hc-lead">เนื้อบดเนียนนุ่ม จี่จนสุก พร้อมซอสที่เราทำเอง จากครัวของเชฟญี่ปุ่น ให้คุณอุ่นแล้วเสิร์ฟกับมื้อที่บ้าน</p>
      <p class="hc-slogan">ปรุงอย่างพิถีพิถัน อร่อยง่ายแค่อุ่น</p>
      <p class="hc-facts">${heroFacts()}</p>
      <div class="cta-row">
        <a class="btn" href="#offers" data-hero-cta>เลือกมื้อของคุณ</a>
        <a class="btn btn-ghost" href="#kitchen">ดูว่าเราทำอย่างไร</a>
      </div>
    </div>
    <figure class="hc-hero-photo">
      ${img('plate', { eager: true, sizes: '(min-width: 900px) 56vw, 100vw', pos: '50% 60%' })}
      <figcaption>ไอเดียเสิร์ฟ · ข้าว ผัก และเครื่องเคียงไม่รวมในแพ็ก</figcaption>
    </figure>
  </section>

  <section class="hc-pack" id="pack" data-section="H02">
    <div class="hc-pack-card" data-reveal>
      <p class="hc-kicker">ของในแพ็ก</p>
      <h2 class="hc-h2">ทำส่วนอร่อยมาให้แล้ว</h2>
      <p>ใน 1 แพ็กมีแฮมเบิร์ก ${n} ก้อนพร้อมซอส แช่แข็งไว้สำหรับอุ่นเสิร์ฟเมื่ออยากกิน</p>
      <p>เพิ่มข้าวร้อน ๆ ผัก หรือไข่ที่คุณชอบ ก็จัดเป็นมื้อของตัวเองได้</p>
      <ul class="hc-specs" role="list">
        <li><span>แฮมเบิร์ก</span><span>${n} ชิ้น</span></li>
        <li><span>ซอส</span><span>ทำเอง</span></li>
        <li><span>อาหารสุทธิ</span><span>${weight()}</span></li>
      </ul>
      <p class="hc-small">ข้าว ไข่ ผัก และเครื่องเคียงในภาพเป็นไอเดียเสิร์ฟ ไม่รวมในแพ็ก</p>
      <a class="text-link" href="#offers">ดูชุดสินค้า →</a>
    </div>
    <div class="hc-pack-art" data-reveal>${packDiagram()}</div>
  </section>

  <section class="hc-kitchen" id="kitchen" data-section="H03">
    <header class="hc-kitchen-head" data-reveal>
      <p class="hc-kicker">งานครัว</p>
      <h2 class="hc-h2">ความใส่ใจ <span class="nb">อยู่ตั้งแต่คำแรก</span></h2>
      <p>เราใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสม บดเองกับเครื่องเทศสูตรพิเศษ จี่จนสุกทุกชิ้นด้วยเตาย่างญี่ปุ่น ก่อนหมักกับซอสของครัว</p>
    </header>
    <ol class="hc-steps" role="list">
      <li data-reveal><span class="hc-num">01</span><span class="hc-icon">${icons.grind}</span>
        <h3>บดเอง</h3><p>เตรียมเนื้อให้ได้สัมผัสเนียนนุ่มที่เราตั้งใจ</p></li>
      <li data-reveal><span class="hc-num">02</span><span class="hc-icon">${icons.grill}</span>
        <h3>จี่จนสุก</h3><p>ปรุงทุกชิ้นให้พร้อม ก่อนทำเป็นอาหารแช่แข็งสำหรับอุ่น</p></li>
      <li data-reveal><span class="hc-num">03</span><span class="hc-icon">${icons.sauce}</span>
        <h3>ทำซอสเอง</h3><p>ต้มและปรุงซอสให้เข้ากับเนื้อของเรา</p></li>
    </ol>
    <p class="hc-chef" data-reveal>โดยเชฟญี่ปุ่นที่มีประสบการณ์ร้านอาหารญี่ปุ่นในประเทศไทยกว่า 10 ปี</p>
  </section>

  <section class="hc-table scene" id="table" data-section="H04">
    <div class="scene-runway" data-scene data-beats="3"><div class="scene-sticky">
      <div class="hc-board" aria-label="ภาพจัดโต๊ะ: จานแฮมเบิร์ก ข้าว ผัก และเนื้อด้านใน" role="group">
        <figure class="hc-piece hc-p-plate">${crop('whole', { size: '150%', pos: '45% 62%', label: 'จานแฮมเบิร์ก 2 ก้อนราดซอส' })}<figcaption>2 ก้อนกับซอส</figcaption></figure>
        <figure class="hc-piece hc-p-rice">${crop('whole', { size: '430%', pos: '1% 5%', label: 'ข้าวสวยร้อน ๆ ในถ้วยเซรามิก' })}<figcaption>ข้าวร้อน ๆ · ไอเดียเสิร์ฟ</figcaption></figure>
        <figure class="hc-piece hc-p-greens">${crop('whole', { size: '460%', pos: '99% 12%', label: 'ผักต้มคลุกงาในถ้วยเล็ก' })}<figcaption>ผักที่ชอบ · ไอเดียเสิร์ฟ</figcaption></figure>
        <figure class="hc-piece hc-p-cut">${crop('cutaway', { size: '170%', pos: '62% 55%', label: 'เนื้อด้านในของแฮมเบิร์กที่ผ่าครึ่ง' })}<figcaption>เนื้อด้านใน</figcaption></figure>
      </div>
      <div class="hc-table-copy">
        <p class="hc-kicker">โต๊ะอาหาร</p>
        <h2 class="hc-h2">เราทำส่วนละเอียด <span class="nb">คุณจัดมื้อในแบบของคุณ</span></h2>
        <ol class="beats" role="list">
          <li data-b="0">ก้อนและซอสเข้าจาน</li>
          <li data-b="1">วางคู่ข้าวร้อน ๆ</li>
          <li data-b="2">เติมผักหรือไข่ที่ชอบ</li>
        </ol>
      </div>
    </div></div>
    <div class="scene-tail">
      <p>วางบนข้าวร้อน ๆ เสิร์ฟกับผัก หรือเพิ่มไข่ที่ชอบ ความเนียนนุ่มของเนื้อกับซอสทำเองพร้อมเป็นส่วนหนึ่งของมื้อที่บ้าน</p>
      <a class="btn" href="#offers">เลือกชุดไว้ที่บ้าน</a>
    </div>
  </section>

  <section class="hc-sauce" data-section="H05">
    <figure class="hc-sauce-photo" data-reveal>${img('cutaway', { sizes: '(min-width: 900px) 60vw, 100vw', pos: '55% 78%' })}</figure>
    <div class="hc-sauce-copy" data-reveal>
      <p class="hc-kicker">ซอส</p>
      <h2 class="hc-h2">ซอสที่ทำให้เนื้อ <span class="nb">กับมื้อเข้ากัน</span></h2>
      <p>เราไม่ได้หยุดที่ทำเนื้อให้อร่อย ซอสของทุกแพ็กเป็นซอสที่ครัวต้มและปรุงเอง ให้รสของเนื้อกับซอสเข้ากันในแต่ละคำ</p>
      <p>อุ่นแล้วราดลงบนข้าวที่มี จัดมื้อให้พร้อม แล้วนั่งกินให้อร่อย</p>
      <a class="text-link" href="#offers">ไปชุดสินค้า →</a>
    </div>
  </section>

  <section class="hc-reheat" id="reheat" data-section="H06">
    <div class="hc-recipe" data-reveal>
      <p class="hc-kicker">อุ่นแล้วเสิร์ฟ</p>
      <h2 class="hc-h2">มื้อพร้อมขึ้น <span class="nb">เมื่อเราเตรียมให้แล้ว</span></h2>
      <p>เลือกวิธีอุ่นของสินค้า จัดลงจาน แล้วเสิร์ฟกับข้าวหรือเครื่องเคียงที่คุณชอบ</p>
      ${reheatSteps()}
      <p class="hc-small">สำหรับไมโครเวฟ ให้ฉีกซองและเทลงภาชนะที่ใช้กับไมโครเวฟได้ก่อนอุ่นตามวิธีของสินค้า</p>
    </div>
  </section>

  <section class="hc-offers" id="offers" data-section="H07">
    <header data-reveal>
      <p class="hc-kicker">เลือกชุด</p>
      <h2 class="hc-h2" tabindex="-1">เลือกมื้อดี ๆ ไว้ที่บ้าน</h2>
    </header>
    ${offerCards('homechew', {
      single: 'สำหรับเริ่มลองรสมือของครัวเรา',
      trio: 'เก็บไว้จัดมื้อที่อยากกิน',
      stock: 'เตรียมหลายแพ็กไว้เลือกอุ่นตามมื้อของคุณ'
    })}
  </section>

  <section class="hc-faq" id="faq" data-section="H08">
    <h2 class="hc-h2">คำถามก่อนเลือกมื้อ</h2>
    ${faqList([
      ['นี่คือเบอร์เกอร์ที่มีขนมปังด้วยไหม?', faqAnswers.bun],
      ['ในแพ็กมีอะไรบ้าง?', faqAnswers.pack()],
      ['ใช้เนื้อญี่ปุ่นทั้งหมดไหม?', 'เราใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสมของสูตรผสม ดูส่วนประกอบของสินค้ารุ่นที่เลือกได้ในรายละเอียดสินค้า'],
      ['มีส่วนผสมที่ต้องระวังสำหรับผู้แพ้อาหารไหม?', faqAnswers.allergen()],
      ['เก็บและอุ่นอย่างไร?', faqAnswers.storage()],
      ['จัดส่งถึงบ้านอย่างไร?', faqAnswers.shipping()]
    ])}
  </section>

  <section class="hc-close" data-section="H09">
    <figure class="hc-close-photo">${img('plate', { sizes: '100vw', pos: '50% 55%' })}</figure>
    <div class="hc-close-copy">
      <h2 class="hc-h2">ทำมื้อที่บ้าน <span class="nb">ให้เป็นมื้อที่อยากกลับมากิน</span></h2>
      <p>Homechew ทำเนื้อกับซอสให้แล้ว คุณอุ่น จัดจาน แล้วกลับมากินข้าว</p>
      <a class="btn" href="#offers" data-hero-cta>เลือกมื้อของคุณ</a>
    </div>
  </section>
  </main>
  ${brandFooter('homechew', { name: 'Homechew · โฮมชิว', slogan: 'ปรุงอย่างพิถีพิถัน อร่อยง่ายแค่อุ่น' })}
  </div>`;
}

export const mount = root => mountBrand(root, 'homechew');
