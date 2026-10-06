// นุ่มจัง · NOOMJANG — texture-led, light and calm. Copy from brands/noomjang/Content.md.
import { brandHeader, brandFooter, mountBrand } from './shell.js';
import { offerCards } from '../commerce.js';
import { brandMedia, heroFacts, weight, packDiagram, reheatSteps, faqList, faqAnswers, icons } from '../ui.js';
import { config } from '../product.js';

export const meta = {
  title: 'นุ่มจัง · NOOMJANG | แฮมเบิร์กญี่ปุ่น พร้อมซอส พร้อมอุ่น',
  description: 'นุ่มแบบญี่ปุ่น อุ่นได้ที่บ้าน แฮมเบิร์กเนียนนุ่มจากเชฟญี่ปุ่น บดเอง จี่จนสุก พร้อมซอสทำเอง เก็บมื้อที่อยากกินไว้ที่บ้าน'
};

const logo = `<span class="nj-word">นุ่มจัง</span><span class="nj-en">NOOMJANG</span>`;
const { img, crop, video } = brandMedia('noomjang');
const n = config.product.packPieces;

export function render() {
  return `<div class="page brand-noomjang" data-brand="noomjang">
  ${brandHeader('noomjang', { logo, nav: [['ความนุ่ม', 'texture'], ['ซอส', 'sauce'], ['วิธีอุ่น', 'reheat'], ['เลือกชุด', 'offers']] })}
  <main id="main">

  <section class="nj-hero" id="top" data-section="N01">
    <figure class="nj-hero-photo">
      ${video({ sizes: '(min-width: 900px) 56vw, 100vw', pos: '52% 58%' })}
      <figcaption>ภาพผ่าให้เห็นเนื้อด้านใน · ${n} ก้อนต่อแพ็ก</figcaption>
    </figure>
    <div class="nj-hero-copy">
      <p class="nj-eyebrow">แฮมเบิร์กญี่ปุ่น ฝีมือเชฟ พร้อมซอสทำเอง</p>
      <h1 class="nj-h1"><span class="nb">นุ่มแบบนี้</span> <span class="nb">อยากมีติดบ้าน</span></h1>
      <p class="nj-lead">เนื้อบดเนียนนุ่ม จี่จนสุก พร้อมซอสที่เข้ากันจากเชฟญี่ปุ่น เก็บในช่องแช่แข็ง แล้วอุ่นเป็นมื้อที่บ้าน</p>
      <p class="nj-slogan">นุ่มแบบญี่ปุ่น อุ่นได้ที่บ้าน</p>
      <p class="nj-facts">${heroFacts()}</p>
      <div class="cta-row">
        <a class="btn" href="#offers" data-hero-cta>เลือกชุดนุ่มจัง</a>
        <a class="btn btn-ghost" href="#texture">ดูความนุ่ม</a>
      </div>
    </div>
  </section>

  <section class="nj-texture scene" id="texture" data-section="N02">
    <div class="scene-runway" data-scene data-beats="3"><div class="scene-sticky">
      <div class="nj-frame" role="group" aria-label="จากเนื้อด้านในกับซอส แล้วเป็นจานมื้อที่บ้าน">
        ${img('whole', { cls: 'nf-whole', sizes: '(min-width: 900px) 60vw, 100vw', pos: '50% 50%', alt: 'แฮมเบิร์กกับซอสบนจานสีเขียวอ่อน' })}
        ${img('plate', { cls: 'nf-plate', sizes: '(min-width: 900px) 60vw, 100vw', pos: '50% 50%', alt: 'ก้อนที่ผ่าให้เห็นเนื้อนุ่มด้านใน พร้อมข้าวเป็นไอเดียเสิร์ฟ' })}
      </div>
      <div class="nj-texture-copy">
        <ol class="beats nj-beats" role="list">
          <li data-b="0">เนื้อนุ่มด้านใน</li>
          <li data-b="1">เนื้อด้านในกับซอส</li>
          <li data-b="2">มื้อที่บ้าน</li>
        </ol>
        <h2 class="nj-h2">เนียน นุ่ม <span class="nb">เข้ากับซอส</span></h2>
      </div>
    </div></div>
    <div class="scene-tail">
      <p>เนื้อที่บดเอง จี่จนสุก แล้วหมักกับซอสของเรา เราตั้งใจให้ทั้งเนื้อด้านในและรสของซอสเป็นคำที่อยากตักต่อ</p>
      <p>เติมข้าวร้อน ๆ แล้วจัดมื้อในแบบที่ชอบ</p>
      <a class="btn" href="#offers">เลือกชุดนุ่มจัง</a>
    </div>
  </section>

  <section class="nj-sauce" id="sauce" data-section="N03">
    <div class="nj-sauce-copy" data-reveal>
      <h2 class="nj-h2">ซอสที่ทำให้ <span class="nb">คำนี้ครบ</span></h2>
      <p>ซอสของทุกแพ็กเป็นซอสที่ครัวต้มและปรุงเอง ทำให้เข้ากับเนื้อของเรา ตั้งแต่ก้อนแรกไปจนถึงคำที่กินกับข้าว</p>
      <p>มีทั้งเนื้อกับซอสมาให้ คุณเลือกสิ่งที่อยากเสิร์ฟคู่กัน</p>
      <a class="text-link" href="#home">ดูมื้อที่บ้าน →</a>
    </div>
    <figure class="nj-sauce-photo" data-reveal>${img('cutaway', { sizes: '(min-width: 900px) 46vw, 100vw', pos: '40% 85%' })}</figure>
  </section>

  <section class="nj-home" id="home" data-section="N04">
    <h2 class="nj-h2" data-reveal>เก็บมื้อที่อยากกิน <span class="nb">ไว้ที่บ้าน</span></h2>
    <p class="nj-intro" data-reveal>วันที่อยากกินแฮมเบิร์กญี่ปุ่น คุณไม่ต้องเริ่มบดเนื้อหรือทำซอสใหม่ เราปรุงมาให้แล้ว คุณอุ่น จัดจาน และเสิร์ฟกับมื้อที่มี</p>
    <div class="nj-ideas">
      <article data-reveal>${crop('plate', { cls: 'nj-idea-img', size: '380%', pos: '16% 22%', label: 'ข้าวสวยร้อน ๆ ในถ้วย' })}
        <h3>กับข้าวร้อน ๆ</h3><p>วางแฮมเบิร์ก ราดซอส แล้วกินกับข้าวที่ชอบ</p></article>
      <article data-reveal>${crop('plate', { cls: 'nj-idea-img', size: '260%', pos: '62% 30%', label: 'เนื้อและซอสพร้อมจัดมื้อกับไข่และผัก' })}
        <h3>กับไข่และผัก</h3><p>เพิ่มสิ่งที่มีในครัว จัดเป็นมื้อของคุณ</p></article>
    </div>
    <p class="nj-small">ข้าว ไข่ ผัก และเครื่องเคียงในภาพเป็นไอเดียเสิร์ฟ ไม่รวมในแพ็ก</p>
    <a class="btn" href="#offers">เลือกชุดไว้ที่บ้าน</a>
  </section>

  <section class="nj-craft" id="craft" data-section="N05">
    <div class="nj-craft-copy" data-reveal>
      <h2 class="nj-h2">ความนุ่ม <span class="nb">มีงานปรุงอยู่ข้างใน</span></h2>
      <p>เราใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสม บดเองกับเครื่องเทศสูตรพิเศษ จี่จนสุกทุกชิ้นด้วยเตาย่างญี่ปุ่น แล้วหมักกับซอสที่เราทำเอง</p>
      <p class="nj-chef">โดยเชฟญี่ปุ่นที่มีประสบการณ์ร้านอาหารญี่ปุ่นในประเทศไทยกว่า 10 ปี</p>
    </div>
    <ul class="nj-chips" role="list" data-reveal>
      <li>${icons.grind}<span>บดเอง</span></li>
      <li>${icons.grill}<span>จี่จนสุก</span></li>
      <li>${icons.sauce}<span>ต้มซอสเอง</span></li>
    </ul>
    <a class="text-link" href="#pack">ดูของในแพ็ก →</a>
  </section>

  <section class="nj-pack" id="pack" data-section="N06">
    <div class="nj-pack-art" data-reveal>${packDiagram()}</div>
    <div class="nj-pack-copy" id="reheat" data-reveal>
      <h2 class="nj-h2">มีเนื้อกับซอส <span class="nb">มาให้แล้ว</span></h2>
      <p>1 แพ็กมีแฮมเบิร์ก ${n} ชิ้นพร้อมซอส อาหารสุทธิ ${weight()} ปรุงสุกและแช่แข็งไว้สำหรับอุ่น</p>
      <p>เลือกวิธีอุ่นของสินค้า จัดจาน แล้วเสิร์ฟกับข้าวหรือเครื่องเคียงที่ชอบ</p>
      ${reheatSteps()}
      <p class="nj-small">สำหรับไมโครเวฟ ให้ฉีกซองและเทลงภาชนะที่ใช้กับไมโครเวฟได้ก่อนอุ่นตามวิธีของสินค้า</p>
    </div>
  </section>

  <section class="nj-offers" id="offers" data-section="N07">
    <h2 class="nj-h2" tabindex="-1">มีนุ่มจังไว้ให้มื้อที่บ้าน</h2>
    ${offerCards('noomjang', {
      single: 'เริ่มลองเนื้อกับซอสของเรา',
      trio: 'มีอีกหลายแพ็กไว้เลือกอุ่น',
      stock: 'เก็บมื้อที่อยากกินไว้ในช่องแช่แข็ง'
    })}
  </section>

  <section class="nj-faq" id="faq" data-section="N08">
    <h2 class="nj-h2">ถามก่อนเลือก</h2>
    ${faqList([
      ['มีขนมปังเบอร์เกอร์มาด้วยไหม?', faqAnswers.bun],
      ['ในแพ็กมีเท่าไร?', faqAnswers.pack()],
      ['ใช้เนื้อญี่ปุ่นล้วนไหม?', faqAnswers.beef],
      ['ผู้แพ้อาหารควรดูข้อมูลอะไร?', faqAnswers.allergen()],
      ['เก็บและอุ่นอย่างไร?', faqAnswers.storage()],
      ['ค่าส่งและพื้นที่จัดส่งเป็นอย่างไร?', faqAnswers.shipping()]
    ])}
  </section>

  <section class="nj-close" data-section="N09">
    <figure class="nj-close-photo">${img('plate', { sizes: '(min-width: 900px) 70vw, 100vw', pos: '50% 55%' })}</figure>
    <h2 class="nj-h2">มื้อญี่ปุ่น <span class="nb">ที่อยากกลับบ้านมากิน</span></h2>
    <p>เนื้อเนียนนุ่ม ซอสทำเอง และความง่ายที่เราเตรียมมาให้</p>
    <a class="btn" href="#offers" data-hero-cta>เลือกชุดนุ่มจัง</a>
  </section>
  </main>
  ${brandFooter('noomjang', { name: 'นุ่มจัง · NOOMJANG', slogan: 'นุ่มแบบญี่ปุ่น อุ่นได้ที่บ้าน' })}
  </div>`;
}

export const mount = root => mountBrand(root, 'noomjang');
