import './kickstarter-distilled-base.js?v=20260803-base';

(function(){
  'use strict';

  const TEXT = {
    en: {
      carryEyebrow: 'ONE BOX · TWO PEOPLE',
      carryBody: 'The owner chooses seven words to carry, then offers the remaining twenty-one to the person across the table. No second deck and no shared language required.',
      openEyebrow: 'OUR PROMISE',
      openBody: 'Write RED, BLUE, GREEN and GRAY on paper. CORE7 still works. The rules stay open and online play stays free.',
      aiEyebrow: 'THE AI LAYER',
      aiBody: 'Every box links to a clean Markdown knowledge file: card meanings, rules, boundaries and responsible ways to extend the system.',
      futureEyebrow: 'ONE LANGUAGE · MANY HANDS',
      futureBody: 'Future sets add meanings, art and cultures without making the First Hand obsolete.',
      proof: ['FAB Worlds 2024 players','live game experience','platform users served','designing games'],
      questions: ['Do both players need a box?','Is the game really 0% RNG?','Why print words if colors resolve the game?','What is the difference between Quick Play and Standard?','Why buy the cards if the rules are open?','Does rarity make a card stronger?'],
      answers: ['No. The owner chooses seven, then offers the remaining twenty-one so the other player can build a complete hand.','Yes in standard play: no dice, no draw luck and no random resolution. Uncertainty comes from human decisions.','Colors make the mechanic playable. The words create the feeling of the hand and the conversation after the game.','Quick Play ends when someone wins three Rounds. Standard locks the same CORE7 for a BO5 and ends when someone wins three Quick Plays.','Because the physical deck is the art, language and portable ritual. The mechanic is open; the artifact earns the purchase.','Never. Foil and rarity are cosmetic only.']
    },
    th: {
      carryEyebrow: 'หนึ่งกล่อง · สองคน',
      carryBody: 'เจ้าของกล่องเลือกเจ็ดคำที่อยากถือ แล้วส่งอีกยี่สิบเอ็ดใบให้คนตรงหน้าเลือกมือของเขา ไม่ต้องมีเด็คที่สอง และไม่ต้องพูดภาษาเดียวกัน',
      openEyebrow: 'คำสัญญาของเรา',
      openBody: 'เขียน แดง ฟ้า เขียว เทา ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี',
      aiEyebrow: 'ชั้น AI',
      aiBody: 'ทุกกล่องเชื่อมไปยังไฟล์ Markdown ที่สะอาด มีความหมายของการ์ด กติกา ขอบเขต และวิธีต่อยอดระบบอย่างรับผิดชอบ',
      futureEyebrow: 'หนึ่งภาษา · หลายมือ',
      futureBody: 'ชุดอนาคตเพิ่มความหมาย ภาพ และวัฒนธรรม โดยไม่ทำให้ First Hand ล้าสมัย',
      proof: ['ผู้เล่น FAB Worlds 2024','ประสบการณ์เกมสด','ผู้ใช้บนแพลตฟอร์ม','ออกแบบเกม'],
      questions: ['ผู้เล่นทั้งสองต้องมีกล่องไหม?','เกมนี้สุ่ม 0% จริงหรือ?','ทำไมต้องพิมพ์คำ ถ้าสีเป็นตัวตัดสินเกม?','Quick Play กับ Standard ต่างกันอย่างไร?','ทำไมต้องซื้อการ์ด ถ้ากติกาเปิด?','การ์ดหายากเก่งกว่าหรือไม่?'],
      answers: ['ไม่ เจ้าของกล่องเลือกเจ็ดใบ แล้วส่งอีกยี่สิบเอ็ดใบให้อีกคนสร้างมือที่สมบูรณ์','จริงในรูปแบบมาตรฐาน ไม่มีลูกเต๋า ไม่มีดวงจั่ว และไม่มีการสุ่มผล ความไม่แน่นอนมาจากการตัดสินใจของมนุษย์','สีทำให้กลไกเล่นได้ แต่คำสร้างความรู้สึกของมือและบทสนทนาหลังเกม','Quick Play จบเมื่อมีคนชนะสาม Rounds ส่วน Standard ล็อก CORE7 เดิมตลอด BO5 และจบเมื่อมีคนชนะสาม Quick Plays','เพราะเด็คจริงคืองานศิลปะ ภาษา และพิธีกรรมพกพา กลไกเปิดกว้าง แต่วัตถุต้องคู่ควรกับการซื้อ','ไม่ ฟอยล์และความหายากเป็นเพียงของสะสม ไม่มีผลต่อโอกาสชนะ']
    }
  };

  function text(selector,value){
    const node=document.querySelector(selector);
    if(node) node.textContent=value;
  }

  function apply(){
    const lang=document.documentElement.lang==='th'?'th':'en';
    const c=TEXT[lang];
    text('.carry-copy .eyebrow',c.carryEyebrow);
    text('.carry-copy > p:not(.eyebrow)',c.carryBody);
    text('.open-copy .eyebrow',c.openEyebrow);
    text('.open-copy > p:not(.eyebrow):not(.open-emphasis)',c.openBody);
    text('.ai-copy .eyebrow',c.aiEyebrow);
    text('.ai-copy > p:not(.eyebrow):not(.ai-boundary)',c.aiBody);
    text('.future-copy .eyebrow',c.futureEyebrow);
    text('.future-copy p:not(.eyebrow)',c.futureBody);
    document.querySelectorAll('.founder-proof span').forEach((node,index)=>{if(c.proof[index]) node.textContent=c.proof[index];});
    document.querySelectorAll('.faq-list details').forEach((detail,index)=>{const summary=detail.querySelector('summary');const body=detail.querySelector('p');if(summary&&c.questions[index]) summary.textContent=c.questions[index];if(body&&c.answers[index]) body.textContent=c.answers[index];});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    const observer=new MutationObserver(()=>setTimeout(apply,0));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    [120,700,1600].forEach(delay=>setTimeout(apply,delay));
  });
})();