import './kickstarter-distilled-legacy.js?v=20260803-campaign-v6';

(function(){
  'use strict';

  const isThai = () => document.documentElement.lang === 'th';
  const q = selector => document.querySelector(selector);
  const qa = selector => Array.from(document.querySelectorAll(selector));
  const setText = (selector,value) => { const node=q(selector); if(node) node.textContent=value; };
  const setHTML = (selector,value) => { const node=q(selector); if(node) node.innerHTML=value; };
  const setMeta = (selector,value) => { const node=q(selector); if(node) node.setAttribute('content',value); };

  function injectStyles(){
    if(q('#campaign-v6-styles')) return;
    const style=document.createElement('style');
    style.id='campaign-v6-styles';
    style.textContent=`
      #official-games{padding:clamp(72px,9vw,128px) 0;background:#f4eddd;color:#10271d;position:relative;overflow:hidden}
      #official-games:before{content:"三川";position:absolute;right:-.04em;top:-.16em;font-size:clamp(140px,28vw,430px);font-weight:900;line-height:1;color:rgba(6,39,24,.035);pointer-events:none}
      .official-games-head{max-width:920px;margin:0 auto clamp(34px,5vw,64px);text-align:center;position:relative}.official-games-head h2{font-size:clamp(34px,5.6vw,72px);line-height:1.02;margin:.3em 0}.official-games-head>p:last-child{max-width:760px;margin:0 auto;font-size:clamp(17px,2vw,22px);line-height:1.65;color:#40534a}
      .official-games-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(18px,3vw,34px);position:relative}.official-game-card{min-height:360px;border-radius:26px;padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(6,39,24,.12);overflow:hidden;position:relative}.official-game-card.core7{background:#062718;color:#fff}.official-game-card.rivers{background:linear-gradient(145deg,#f9f3e7,#e9dcc1);border:1px solid rgba(125,92,30,.24);color:#183328}.official-game-card>span{font-size:12px;letter-spacing:.2em;font-weight:800;color:#c9a85c}.official-game-card h3{font-size:clamp(45px,7vw,84px);line-height:.9;margin:auto 0 .18em;letter-spacing:-.06em}.official-game-card.rivers h3{font-size:clamp(40px,6vw,74px);letter-spacing:-.045em}.official-game-card.rivers>b{font-size:12px;letter-spacing:.25em;color:#806423;margin-bottom:24px}.official-game-card p{font-size:clamp(16px,1.7vw,20px);line-height:1.65;max-width:620px;margin:0 0 32px}.official-game-card small{margin-top:auto;font-size:11px;letter-spacing:.13em;font-weight:800;opacity:.66}.official-open{margin:clamp(22px,4vw,40px) auto 0;padding:22px 28px;border:1px solid rgba(6,39,24,.14);border-radius:18px;display:flex;gap:20px;align-items:center;justify-content:center;text-align:left;position:relative;background:rgba(255,255,255,.45)}.official-open strong{white-space:nowrap;font-size:13px;letter-spacing:.14em;color:#7c6127}.official-open p{margin:0;line-height:1.55}
      #visual-story .ks-story-static-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:clamp(18px,2.8vw,34px)!important;align-items:start!important}#visual-story figure{margin:0!important;min-width:0!important;overflow:hidden!important;border-radius:18px!important}#visual-story figure img,#visual-story .ksv3-art-slot img{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;aspect-ratio:1586/992!important;object-fit:contain!important;object-position:center!important;background:#071e15!important}#visual-story figcaption{min-height:98px}
      .pocket-note{display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:14px!important;min-width:250px!important;padding:16px 20px!important;border-radius:18px!important;background:rgba(250,244,230,.96)!important;box-shadow:0 18px 55px rgba(6,39,24,.18)!important;text-align:left!important}.pocket-note>b{font-size:clamp(58px,7vw,88px)!important;line-height:.78!important;letter-spacing:-.08em!important;color:#b18b3d!important}.pocket-note>span{display:flex!important;flex-direction:column!important;line-height:1!important}.pocket-note strong{font-size:clamp(13px,1.3vw,17px)!important;letter-spacing:.11em!important;color:#062718!important}.pocket-note small{font-size:11px!important;letter-spacing:.18em!important;margin-top:7px!important;color:#657269!important;font-weight:800!important}
      @media(max-width:760px){.official-games-grid{grid-template-columns:1fr}.official-game-card{min-height:310px;border-radius:22px}.official-open{display:block;text-align:center}.official-open strong{display:block;margin-bottom:8px;white-space:normal}#visual-story .ks-story-static-grid{grid-template-columns:1fr!important;gap:22px!important}#visual-story figure{border-radius:14px!important}#visual-story figcaption{min-height:0}.pocket-note{min-width:0!important;width:min(88vw,330px)!important;padding:14px 17px!important;gap:12px!important}.pocket-note>b{font-size:62px!important}.pocket-note strong{font-size:13px!important}}
      @media(max-width:430px){.official-game-card{padding:26px 22px}.official-game-card h3{font-size:48px}.official-game-card.rivers h3{font-size:42px}.official-games-head{text-align:left}.official-games-head>p:last-child{margin:0}.brand b{display:none}}
    `;
    document.head.appendChild(style);
  }

  function insertOfficialGames(){
    if(q('#official-games')) return;
    const anchor=q('#tournament')||q('#play-online')||q('#game');
    if(!anchor||!anchor.parentNode) return;
    const section=document.createElement('section');
    section.id='official-games';
    section.className='official-games section-cream';
    section.innerHTML='<div class="wrap"><div class="official-games-head reveal is-visible"><p class="eyebrow" data-official-kicker></p><h2 data-official-title></h2><p data-official-lead></p></div><div class="official-games-grid"><article class="official-game-card core7 reveal is-visible"><span>FLAGSHIP RULE</span><h3>CORE7</h3><p data-core7-card></p><small>7 CARDS · SECRET CHOICE · HUMAN READ</small></article><article class="official-game-card rivers reveal is-visible"><span>STRATEGY GAME</span><h3>三川 3IVERS</h3><b>THREE RIVERS</b><p data-rivers-card></p><small>7 CARDS · 3 RIVERS · FIRST TO 3 WINS</small></article></div><div class="official-open reveal is-visible"><strong>1 KEYWORD · 4 COLOR STATS</strong><p data-official-open></p></div></div>';
    anchor.parentNode.insertBefore(section,anchor.nextSibling);
  }

  function applyMeta(){
    document.title='myClover — 0% RNG. 100% Decisions.';
    setMeta('meta[name="description"]','Choose 7 words and play 2 zero-randomness games with one 32-card system: CORE7, the flagship rule, and 三川 3IVERS, a 3-lane strategy game.');
    setMeta('meta[property="og:title"]','myClover — CORE7 + 三川 3IVERS');
    setMeta('meta[property="og:description"]','1 keyword. 4 colors. 7 chosen cards. 0% RNG. 100% decisions.');
  }

  function applyTop(){
    const th=isThai();
    const brand=q('.brand > span:not(.brand-mark)');
    if(brand) brand.innerHTML='myClover <b>· CORE7 + 三川 3IVERS</b>';
    setText('.hero-lead',th?'ระบบเกมการ์ด 32 ใบที่สอน CORE7 ได้ใน 10 วินาที เลือก 7 คำ เล่นด้วยการสุ่ม 0% และการตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า':'A 32-card game system you can teach in 10 seconds. Choose 7 words. Play with 0% RNG and 100% decisions—the only unpredictable thing is the human across the table.');
    setText('.micro-proof',th?'การ์ดคำ 28 ใบ · 4 สี · เลือก 7 ใบ · สุ่ม 0% · ตัดสินใจ 100%':'28 word cards · 4 colors · 7 chosen cards · 0% RNG · 100% decisions');
    const promise=q('.promise-grid');
    if(promise) promise.innerHTML=th?'<article><strong>10 วิ</strong><span>เรียนรู้ CORE7</span></article><article><strong>7 ใบ</strong><span>มือที่คุณเลือกเอง</span></article><article><strong>สุ่ม 0%</strong><span>ตัดสินใจ 100%</span></article><article><strong>2 เกม</strong><span>ระบบเดียวกัน</span></article>':'<article><strong>10 sec</strong><span>to learn CORE7</span></article><article><strong>7 cards</strong><span>your chosen hand</span></article><article><strong>0% RNG</strong><span>100% Decisions</span></article><article><strong>2 games</strong><span>one shared system</span></article>';
    const number=q('.origin-number'); if(number) number.innerHTML='04<span>COLORS</span>';
    const origin=q('.origin-copy');
    if(origin){
      let note=origin.querySelector('.origin-clarifier');
      if(!note){note=document.createElement('p');note.className='origin-clarifier';const quote=origin.querySelector('blockquote');if(quote) quote.insertAdjacentElement('afterend',note);}
      note.textContent=th?'3 สีใช้ตัดสินการปะทะ ส่วนสีเทาเปลี่ยนการตัดสินใจ':'Three colors resolve conflict. Gray changes the decision.';
    }
  }

  function applyCore7(){
    const th=isThai();
    setText('#game .section-heading .eyebrow','CORE7 · FLAGSHIP RULE');
    setHTML('#game .section-heading h2',th?'1 Match ที่เรียนรู้ได้ทันที<br><em>1 Set ที่อ่านคนตรงหน้าได้ลึกขึ้น</em>':'One Match you can learn instantly.<br><em>One Set that reads deeper.</em>');
    setText('#game .section-heading > p:last-child',th?'เลือกอย่างลับ เปิดพร้อมกัน สีตัดสิน Round ส่วนมนุษย์ตรงหน้าสร้างทุกสิ่งที่คาดเดาไม่ได้':'Choose in secret. Reveal together. Color resolves the Round. The human across the table creates everything unpredictable.');
    const poster=q('.rules-poster img'); if(poster) poster.alt='CORE7 Match and CORE7 Set rule overview';
    setText('.how-list li:nth-child(5) b',th?'ชนะ CORE7 Match':'Win the CORE7 Match.');
    setText('.how-list li:nth-child(5) p',th?'เล่นต่อจนผู้เล่นคนหนึ่งชนะ 3 Rounds หรือคู่แข่งหมดมือ':'Keep playing until one player wins 3 Rounds—or the opponent runs out of cards.');
    const guide=q('#formatGuide');
    if(guide) guide.innerHTML=th?'<article class="quick"><span>CORE7 MATCH</span><h3>ชนะ 3 Rounds หรือทำให้คู่แข่งหมดมือ</h3><p>1 เกมที่สมบูรณ์ เลือกการ์ดลับ เปิดพร้อมกัน และบริหารไพ่ 7 ใบจน Match มีผู้ชนะ</p></article><article class="standard"><span>CORE7 SET · LOCKED HAND</span><h3>มือเดิม ชนะ 3 Matches</h3><p>ล็อกมือ 7 ใบเดิมตลอด Set รีเซ็ตมือเดิมหลังจบแต่ละ Match คนแรกที่ชนะ 3 Matches ชนะ Set</p></article>':'<article class="quick"><span>CORE7 MATCH</span><h3>Win 3 Rounds—or empty the opponent’s hand.</h3><p>One complete game. Choose in secret, reveal together and manage the same 7-card hand until the Match has a winner.</p></article><article class="standard"><span>CORE7 SET · LOCKED HAND</span><h3>Same hand. Win 3 Matches.</h3><p>Lock the same 7-card hand for the whole Set. Reset it after every Match. First to win 3 Matches wins the Set.</p></article>';
    const truth=q('.game-truth'); if(truth) truth.innerHTML=th?'<p>สุ่ม 0% · ตัดสินใจ 100%</p><strong>การ์ดสร้างขอบเขต มนุษย์สร้างเกม</strong>':'<p>0% RNG · 100% DECISIONS</p><strong>The cards create the boundary. The humans create the game.</strong>';
    const memory=q('.memory-copy blockquote'); if(memory) memory.innerHTML=th?'CORE7 Match สร้างการอ่านครั้งแรก<br>CORE7 Set เปลี่ยนมันเป็นความทรงจำ':'A CORE7 Match creates the first read.<br>A CORE7 Set turns it into memory.';
    const checks=q('.carry .check-list'); if(checks) checks.innerHTML=th?'<li>เล่นกับคนที่เพิ่งพบกัน</li><li>สอน CORE7 ได้ใน 10 วินาที</li><li>เล่น 1 Match ด้วยมือที่เลือกเอง</li><li>ล็อกมือเดิมตลอด CORE7 Set</li><li>ให้บทสนทนาอยู่ได้นานกว่าคะแนน</li>':'<li>Play with someone you just met</li><li>Teach CORE7 in 10 seconds</li><li>Play one Match with a chosen hand</li><li>Lock the same hand for a CORE7 Set</li><li>Let the conversation outlast the score</li>';
    const note=q('.pocket-note'); if(note) note.innerHTML=th?'<b>7</b><span><strong>คำที่คุณเลือก</strong><small>ถือไว้ในวันนี้</small></span>':'<b>7</b><span><strong>WORDS YOU CHOOSE</strong><small>TO CARRY TODAY</small></span>';
  }

  function applyTournament(){
    const th=isThai(), section=q('#tournament'); if(!section) return;
    setText('#tournament .ksv2-scoreboard-top b','CORE7 SET');setText('#tournament .ksv2-scoreboard-top span','LOCKED HAND');setText('#tournament .ksv2-bo5','FIRST TO 3');
    const rounds=q('#tournament .ksv2-rounds'); if(rounds){rounds.innerHTML='<i>1</i><i>2</i><i>3</i>';rounds.setAttribute('aria-label','First to 3 Matches');}
    setText('#tournament .ksv2-scoreboard > p',th?'มือ 7 ใบเดิม คนแรกที่ชนะ 3 Matches ชนะ Set':'The same 7-card hand. First to win 3 Matches wins the Set.');
    setText('#tournament .ksv2-kicker',th?'การแข่งขันในรูปแบบที่เรียบที่สุด':'COMPETITIVE IN ITS SIMPLEST FORM');
    setHTML('#tournament .ksv2-title',th?'การ์ด 7 ใบเดิม<br>คนแรกที่ชนะ 3 Matches':'Same 7 cards.<br>First to 3 Matches.');
    setText('#tournament .ksv2-lead',th?'กติกาไม่ได้ยากขึ้น แต่คู่แข่งชัดขึ้น ทุก Match เปิดเผยนิสัย การหลอก และการตัดสินใจเพิ่มอีก 1 ชั้น':'The rules do not get harder. The opponent becomes clearer. Every Match reveals another habit, bluff and decision.');
    const copy=th?[['ล็อกมือ','การ์ด 7 ใบกลายเป็นตัวตนของคุณตลอด Set'],['เล่น Match ถัดไป','รีเซ็ตมือเดิม แต่เก็บข้อมูลทุกอย่างที่อ่านได้จากคู่แข่ง'],['ปรับตัวมนุษย์','ความลึกเกิดจากความจำ การหลอก และการอ่านรูปแบบ ไม่ใช่กติกาเพิ่ม']]:[['Lock the hand','The same 7 cards become your identity for the Set.'],['Play the next Match','Reset the hand, but keep everything you learned about the opponent.'],['Adapt the human','Depth comes from memory, bluffing and pattern recognition—not extra rules.']];
    qa('#tournament .ksv2-competitive-points article').forEach((node,index)=>{const row=copy[index];if(!row)return;const b=node.querySelector('b'),p=node.querySelector('p');if(b)b.textContent=row[0];if(p)p.textContent=row[1];});
  }

  function applyOfficialGames(){
    const th=isThai(); if(!q('#official-games')) return;
    setText('#official-games [data-official-kicker]',th?'1 ระบบ · 2 เกมทางการ':'ONE SYSTEM · TWO OFFICIAL GAMES');
    setHTML('#official-games [data-official-title]',th?'CORE7 คือจุดเริ่มต้น<br><em>三川 3IVERS เปลี่ยนการ์ด 7 ใบเดิมให้กลายเป็นสนามรบ</em>':'CORE7 is where everyone begins.<br><em>三川 3IVERS turns the same 7 cards into a battlefield.</em>');
    setText('#official-games [data-official-lead]',th?'myClover คือระบบเกม ไม่ใช่กติกาเพียงแบบเดียว การ์ด 1 ใบมี 1 Keyword และ Stat 4 สี แต่สร้างประสบการณ์เล่นได้หลายรูปแบบ':'myClover is the game system—not a single ruleset. Each card carries 1 keyword and 4 color stats, ready to support more ways to play.');
    setText('#official-games [data-core7-card]',th?'Flagship Rule เลือกอย่างลับ เปิดพร้อมกัน และอ่านมนุษย์ตรงหน้า ไม่ใช่กองการ์ดที่ถูกสับ':'The flagship rule. Choose in secret, reveal together and read the human across the table—not a shuffled deck.');
    setText('#official-games [data-rivers-card]',th?'Strategy Game ที่ใช้มือ 7 ใบเดิมต่อสู้บน 3 Rivers ชนะ 2 Rivers เพื่อรับ 1 Win จับเชลย 1 ใบจาก River ที่ยึดได้ และเป็นคนแรกที่ได้ 3 Wins':'A strategy game played with the same 7-card hand across 3 Rivers. Win 2 Rivers to claim 1 Win. Capture 1 defeated card from a River you conquered. First to 3 Wins takes the game.');
    setText('#official-games [data-official-open]',th?'2 กติกาทางการ และระบบเปิดสำหรับให้ผู้เล่นสร้างเกมถัดไป':'Two official games—and an open system for players to create the next one.');
  }

  function applySystemAndBox(){
    const th=isThai();
    const labels=th?{RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}:{RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};
    qa('.energy-button').forEach(button=>{if(labels[button.dataset.energy])button.innerHTML='<span>●</span> '+labels[button.dataset.energy];});
    setHTML('.ksv2-core-intro .ksv2-title',th?'กาย · จิตวิญญาณ · ความคิด · งานสร้าง':'Body. Soul. Mind. Craft.');
    setText('.ksv2-core-intro .ksv2-lead',th?'Red คือ Body, Green คือ Soul, Blue คือ Mind และ Gray คือ Craft ภาษาร่วม 4 สีของ myClover':'Red is Body. Green is Soul. Blue is Mind. Gray is Craft—the shared four-color language of myClover.');
    setText('#box .box-item:nth-child(1) p',th?'แดง เขียว ฟ้า และเทา สีละ 7 ใบ แต่ละใบมีภาพ Keyword ภาษาอังกฤษ และความหมายภาษาไทย':'Seven Red, Green, Blue and Gray cards, each with art, an English keyword and its Thai meaning.');
    setText('#box .box-item:nth-child(2) p',th?'CORE7 Match, CORE7 Set, 三川 3IVERS และ Open Play ส่งต่อให้กันแล้วเริ่มเล่นได้เลย':'CORE7 Match, CORE7 Set, 三川 3IVERS and Open Play. Hand them around and begin.');
    const heading=q('#box .section-heading');if(heading){let line=heading.querySelector('.box-system-line');if(!line){line=document.createElement('p');line.className='box-system-line';heading.appendChild(line);}line.textContent=th?'1 เด็ค · 2 เกมทางการ · ระบบเปิดสำหรับเกมใหม่':'One deck. Two official games. An open system for more.';}
    const open=q('.open-copy > p:not(.eyebrow):not(.open-emphasis)');if(open)open.textContent=th?'เขียน RED, GREEN, BLUE และ GRAY ลงบนกระดาษ CORE7 และเกมที่สร้างจากระบบนี้ก็ยังเล่นได้ กติกายังคงเปิดและออนไลน์ยังคงฟรี':'Write RED, GREEN, BLUE and GRAY on paper. CORE7—and games built on the system—still work. The rules stay open and online play stays free.';
    const stretch=qa('.stretch-goal b').find(node=>/BODY|SOUL|MIND|CRAFT|กาย|จิตวิญญาณ/.test(node.textContent));if(stretch)stretch.textContent=th?'กาย · จิตวิญญาณ · ความคิด · งานสร้าง':'BODY · SOUL · MIND · CRAFT';
    if(q('#possibilities')){setHTML('#possibilities .ksv2-title',th?'1 ระบบ<br>หลายวิธีเล่น':'One system.<br>Many ways to play.');setText('#possibilities .ksv2-lead',th?'CORE7 คือ Flagship Rule และ 三川 3IVERS คือ Strategy Game ในกล่องเดียวกัน ระบบ Keyword 1 คำและ Stat 4 สียังเปิดให้เกิดกติกาใหม่ต่อไป':'CORE7 is the flagship rule and 三川 3IVERS is the strategy game in the same box. The 1-keyword, 4-color-stat system stays open for new rules to emerge.');}
  }

  function applyStoryAndSupport(){
    const th=isThai();
    setText('#nameOriginKicker',th?'ที่มาของชื่อ':'THE NAME');setHTML('#nameOriginTitle',th?'myClover คือโชค<br><em>ที่เราเลือกถือไว้เอง</em>':'myClover is luck<br><em>you choose to carry.</em>');setText('#nameOriginBody',th?'ชื่อเริ่มจากโคลเวอร์ 4 แฉก และแนวคิด “my lucky seven” — 7 คำที่เราเลือกถือไปพบคนตรงหน้า':'The name began with a four-leaf clover and the idea of “my lucky seven”: the 7 words you choose to carry into a meeting.');setHTML('#nameOriginQuote',th?'ดวงถูกใช้ไปหมดแล้วตอนที่เราได้มาเจอกัน<br>ที่เหลือคือการตัดสินใจของเรา':'The luck was meeting.<br>Everything after that is a decision.');
    setText('#visual-story [data-story-kicker]',th?'เรื่องราวที่เล่าด้วยภาพ':'THE VISUAL STORY');setText('#visual-story [data-story-title]',th?'เกมที่เล็กขนาดนี้ควรถูกมองเห็น ไม่ใช่ถูกฝังอยู่ในย่อหน้า':'A game this small should be seen—not buried in paragraphs.');setText('#visual-story [data-story-lead]',th?'ภาพขนาด 1586 × 992 แสดงเต็มภาพทั้ง Desktop และ Mobile โดยไม่ Crop':'Every 1586 × 992 image is shown in full on desktop and mobile—never cropped.');
    qa('#visual-story img').forEach(image=>{image.width=1586;image.height=992;});
    const risk=qa('.risk-copy p');if(risk[1])risk[1].textContent=th?'myClover ถูกควบคุมขอบเขตอย่างตั้งใจ: การ์ด 32 ใบ กล่องขนาดกะทัดรัด เกมทางการ 2 แบบ ไม่มี Miniature ไม่มีแอปที่บังคับใช้ และไม่มีความซับซ้อนด้านการผลิตซ่อนอยู่ใน Stretch Goals':'myClover is intentionally controlled: 32 cards, one compact box, 2 official games, no miniatures, no required app and no production complexity hiding inside stretch goals.';
    const faq=qa('.faq-list details');if(faq[3])faq[3].innerHTML=th?'<summary>CORE7 Match กับ CORE7 Set ต่างกันอย่างไร?</summary><p>CORE7 Match คือ 1 เกมสมบูรณ์ จบเมื่อผู้เล่นชนะ 3 Rounds หรือคู่แข่งหมดมือ ส่วน CORE7 Set ล็อกมือ 7 ใบเดิม รีเซ็ตหลังแต่ละ Match และจบเมื่อมีผู้เล่นชนะ 3 Matches</p>':'<summary>What is the difference between a CORE7 Match and a CORE7 Set?</summary><p>A CORE7 Match is one complete game and ends when a player wins 3 Rounds or the opponent runs out of cards. A CORE7 Set locks the same 7-card hand, resets it after every Match and ends when a player wins 3 Matches.</p>';
    setText('.final-cta .final-inner > p:not(.eyebrow)',th?'เล่น 1 CORE7 Match หรือเปิดสนาม 三川 3IVERS แล้วออกจากโต๊ะพร้อมความทรงจำร่วมกัน':'Play one CORE7 Match—or open 3 Rivers—and leave the table with a shared memory.');setText('.final-cta small','myClover · CORE7 + 三川 3IVERS · 0% RNG · 100% Decisions');
    const featured=q('.pledge.featured > p:not(.pledge-label)');if(featured)featured.textContent=th?'ระบบเกมพกพาที่สมบูรณ์ใน 1 กล่อง':'The complete portable game system.';
  }

  function apply(){
    injectStyles();insertOfficialGames();applyMeta();applyTop();applyCore7();applyTournament();applyOfficialGames();applySystemAndBox();applyStoryAndSupport();
    qa('.reveal').forEach(node=>node.classList.add('is-visible'));
  }

  function init(){
    apply();
    [120,420,980,1900,2600].forEach(delay=>setTimeout(apply,delay));
    new MutationObserver(()=>setTimeout(apply,24)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();