import './kickstarter-base.js?v=20260802-campaign-v2';

(function(){
  'use strict';

  const ENERGY_COPY = {
    RED: {
      en: { label:'RED · BODY', headline:'What makes you feel and move?', body:'Desire, Joy, Taste, Passion, Courage, Warmth and Celebration — the living energy that lets you feel, want and act.' },
      th: { label:'แดง · ร่างกาย', headline:'อะไรทำให้คุณรู้สึกและเคลื่อนไหว?', body:'ความอยาก ความสุข รสชาติ แรงปรารถนา ความกล้า ความอบอุ่น และการเฉลิมฉลอง — พลังชีวิตที่ทำให้เรารู้สึก ต้องการ และลงมือ' }
    },
    BLUE: {
      en: { label:'BLUE · MIND', headline:'What helps you see and choose?', body:'Clarity, Perspective, Wisdom, Curiosity, Strategy, Reflection and Choice — the mind that turns noise into direction.' },
      th: { label:'ฟ้า · จิตใจ', headline:'อะไรช่วยให้คุณมองเห็นและเลือก?', body:'ความชัดเจน มุมมอง ปัญญา ความสงสัย กลยุทธ์ การทบทวน และการเลือก — จิตใจที่เปลี่ยนความวุ่นวายให้กลายเป็นทิศทาง' }
    },
    GREEN: {
      en: { label:'GREEN · SOUL', headline:'What helps you care, endure and become?', body:'Discipline, Consistency, Balance, Patience, Care, Recovery and Commitment — the inner roots that let a life keep growing.' },
      th: { label:'เขียว · จิตวิญญาณ', headline:'อะไรช่วยให้คุณดูแล อดทน และเติบโตเป็นตัวเอง?', body:'วินัย ความสม่ำเสมอ สมดุล ความอดทน การดูแล การฟื้นตัว และความตั้งใจมั่น — รากภายในที่ทำให้ชีวิตเติบโตต่อไปได้' }
    },
    GRAY: {
      en: { label:'GRAY · CRAFT', headline:'What helps you turn meaning into reality?', body:'Observe, Measure, Build, Repair, Connect, Adapt and Iterate — the craft that gives intention a form the world can use.' },
      th: { label:'เทา · งานสร้าง', headline:'อะไรช่วยให้คุณเปลี่ยนความหมายให้เป็นของจริง?', body:'สังเกต วัดผล สร้าง ซ่อม เชื่อมต่อ ปรับตัว และทำซ้ำให้ดีขึ้น — งานสร้างที่เปลี่ยนเจตนาให้เป็นสิ่งที่โลกใช้งานได้' }
    }
  };

  let currentLanguage = 'en';
  const translations = [];

  function injectStyles(){
    if(document.querySelector('link[data-kickstarter-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './kickstarter-v2.css?v=20260802-2';
    link.dataset.kickstarterV2 = 'true';
    document.head.appendChild(link);
  }

  function setText(selector, value){
    const node = document.querySelector(selector);
    if(node) node.textContent = value;
  }

  function insertAfter(reference, node){
    if(reference && reference.parentNode) reference.parentNode.insertBefore(node, reference.nextSibling);
  }

  function sectionFrom(html){
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function addNavigationControls(){
    const nav = document.querySelector('.nav-inner');
    if(!nav || document.querySelector('.ksv2-nav-tools')) return;
    const controls = document.createElement('div');
    controls.className = 'ksv2-nav-tools';
    controls.innerHTML = `
      <div class="ksv2-lang" role="group" aria-label="Language">
        <button type="button" data-lang="en" class="active">EN</button>
        <button type="button" data-lang="th">TH</button>
      </div>
      <a class="ksv2-play-nav" href="/core7/">Play now</a>`;
    const cta = nav.querySelector('.nav-cta');
    nav.insertBefore(controls, cta || null);
  }

  function enhanceHero(){
    const actions = document.querySelector('.hero-actions');
    if(actions && !actions.querySelector('.ksv2-play-hero')){
      const play = document.createElement('a');
      play.className = 'button button-ghost ksv2-play-hero';
      play.href = '/core7/';
      play.textContent = 'Play online now';
      actions.insertBefore(play, actions.lastElementChild);
    }
    const copy = document.querySelector('.hero-copy');
    if(copy && !copy.querySelector('.ksv2-hero-badge')){
      const badges = document.createElement('div');
      badges.className = 'ksv2-hero-badge';
      badges.innerHTML = '<span>Free forever</span><span>No ads</span><span>10 seconds to learn</span>';
      copy.appendChild(badges);
    }
  }

  function injectOnlineSection(){
    if(document.getElementById('play-online')) return;
    const section = sectionFrom(`
      <section id="play-online" class="ksv2-section ksv2-online">
        <div class="wrap ksv2-online-grid">
          <div>
            <p class="ksv2-kicker">TRY BEFORE YOU BACK</p>
            <h2 class="ksv2-title">The game already exists.<br>You can play it now.</h2>
            <p class="ksv2-lead">CORE7 is online, playable and free forever. No advertising. No paid advantage. No campaign promise asking you to imagine whether the game is fun.</p>
            <div class="ksv2-button-row">
              <a class="ksv2-button primary" href="/core7/">Play CORE7 now</a>
              <a class="ksv2-button secondary" href="#game">Read the ten-second rules</a>
            </div>
          </div>
          <div class="ksv2-online-panel">
            <p class="ksv2-kicker">PHYSICAL ↔ DIGITAL</p>
            <h3>The cards are not a paywall.<br>They are the artifact.</h3>
            <p>Every player gets the same game. Physical sets add the object, the art, the ritual and a code that unlocks the matching collection online as new sets arrive.</p>
            <div class="ksv2-online-list">
              <article><b>Free forever</b><span>The core game remains available without a purchase.</span></article>
              <article><b>No ads</b><span>The table is for people, not interruption inventory.</span></article>
              <article><b>Equal play</b><span>Foil, rarity and digital art never change the odds.</span></article>
              <article><b>Set unlocks</b><span>Own the physical set, carry its matching collection online.</span></article>
            </div>
          </div>
        </div>
      </section>`);
    insertAfter(document.querySelector('.game'), section);
  }

  function injectTournamentSection(){
    if(document.getElementById('tournament')) return;
    const section = sectionFrom(`
      <section id="tournament" class="ksv2-section ksv2-tournament">
        <div class="wrap ksv2-tournament-grid">
          <div class="ksv2-scoreboard">
            <div class="ksv2-scoreboard-top"><b>CORE7 TOURNAMENT FORMAT</b><span>LOCKED HAND</span></div>
            <div class="ksv2-bo5">BO5</div>
            <div class="ksv2-rounds" aria-label="Best of five"><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i></div>
            <p>One seven-card hand. Up to five fast games. Every repeat reveals another habit.</p>
          </div>
          <div>
            <p class="ksv2-kicker">COMPETITIVE IN ITS SIMPLEST FORM</p>
            <h2 class="ksv2-title">Ten seconds to learn.<br>Five games to read a human.</h2>
            <p class="ksv2-lead">For tournaments, players lock the same seven-card hand for a Best-of-5 set. The rules do not get harder. The opponent becomes clearer. You remember choices, detect patterns, change timing and feel the pressure of using the same tools again.</p>
            <div class="ksv2-competitive-points">
              <article><strong>01</strong><div><b>Lock the hand</b><p>Seven cards become your identity for the set.</p></div></article>
              <article><strong>02</strong><div><b>Repeat the duel</b><p>Play up to five compact matches with the same information space.</p></div></article>
              <article><strong>03</strong><div><b>Adapt the player</b><p>The competitive depth comes from memory, bluffing and human pattern recognition.</p></div></article>
            </div>
            <div class="ksv2-prize"><b>Cold Foil Tournament Prizes</b><br><span>Special event cards can reward champions and communities without adding power. Prestige only. The game remains equal.</span></div>
          </div>
        </div>
      </section>`);
    insertAfter(document.getElementById('play-online'), section);
  }

  function injectCardBackSection(){
    if(document.getElementById('card-back')) return;
    const section = sectionFrom(`
      <section id="card-back" class="ksv2-section ksv2-cardback">
        <div class="wrap ksv2-cardback-grid">
          <div class="ksv2-flip-stage">
            <div id="ksv2FlipCard" class="ksv2-flip-card" role="button" tabindex="0" aria-label="Flip the CORE7 card">
              <div id="ksv2CardFront" class="ksv2-flip-face ksv2-flip-front"></div>
              <div class="ksv2-flip-face ksv2-flip-back"><img src="/core7/assets/myclover-back.webp" alt="The shared back of every myClover CORE7 card"></div>
            </div>
            <button id="ksv2FlipButton" class="ksv2-flip-control" type="button">↻ Flip the card</button>
          </div>
          <div class="ksv2-cardback-copy">
            <p class="ksv2-kicker">ONE BACK · EVERY SET</p>
            <h2 class="ksv2-title">Different meanings.<br>The same language.</h2>
            <p class="ksv2-lead">Every playable myClover card shares one back. New keywords, artists and cultures can enter the system without breaking the hidden information that makes CORE7 work.</p>
            <blockquote>The back is not packaging. It is the flag of a language anyone can sit down and speak.</blockquote>
            <ul>
              <li>One universal back for every compatible set</li>
              <li>Four-color clover and compass identity</li>
              <li>Designed for mixing old and future cards</li>
              <li>No sleeves required for ordinary play</li>
            </ul>
          </div>
        </div>
      </section>`);
    insertAfter(document.querySelector('.carry'), section);
  }

  function injectCoreFoilSection(){
    if(document.getElementById('foil-cores')) return;
    const section = sectionFrom(`
      <section id="foil-cores" class="ksv2-section ksv2-cores">
        <div class="wrap">
          <div class="ksv2-core-intro">
            <p class="ksv2-kicker">THE FOUR FOIL CORES</p>
            <h2 class="ksv2-title">Body. Mind. Soul. Craft.</h2>
            <p class="ksv2-lead">Three are the forces of a living person. The fourth is the human act of shaping meaning into something real. Together they complete the myClover language.</p>
          </div>
          <div class="ksv2-core-grid">
            <article class="ksv2-core-card red"><span class="ksv2-core-symbol">●</span><small>RED CORE</small><h3>BODY<br><span>ร่างกาย</span></h3></article>
            <article class="ksv2-core-card blue"><span class="ksv2-core-symbol">◆</span><small>BLUE CORE</small><h3>MIND<br><span>จิตใจ</span></h3></article>
            <article class="ksv2-core-card green"><span class="ksv2-core-symbol">✦</span><small>GREEN CORE</small><h3>SOUL<br><span>จิตวิญญาณ</span></h3></article>
            <article class="ksv2-core-card gray"><span class="ksv2-core-symbol">⚙</span><small>GRAY CORE</small><h3>CRAFT<br><span>งานสร้าง</span></h3></article>
          </div>
          <p class="ksv2-core-thesis">Unlocked as a stretch goal: four symbolic foil cards in every physical box. They are collectible, universal and never mechanically stronger.</p>
        </div>
      </section>`);
    insertAfter(document.querySelector('.language'), section);
  }

  function injectUseCases(){
    if(document.getElementById('possibilities')) return;
    const section = sectionFrom(`
      <section id="possibilities" class="ksv2-section ksv2-uses">
        <div class="wrap">
          <div class="ksv2-uses-head">
            <div><p class="ksv2-kicker">BEYOND THE DUEL</p><h2 class="ksv2-title">One deck.<br>Many rooms.</h2></div>
            <p class="ksv2-lead">CORE7 is the first game inside the system, not the limit of the cards. The same four colors can move from a pocket duel to a seminar, a team table or an AI-assisted reflection.</p>
          </div>
          <div class="ksv2-uses-grid">
            <article class="ksv2-use"><span class="icon">💬</span><b>Conversation Starter</b><p>Move from small talk to a real question without forcing anyone to overshare.</p><span>HOME · FRIENDS · COMMUNITY</span></article>
            <article class="ksv2-use"><span class="icon">🤝</span><b>Team Building</b><p>Name what a team has, what it lacks and what needs to happen next.</p><span>TEAMS · CULTURE · RETROSPECTIVE</span></article>
            <article class="ksv2-use"><span class="icon">🎤</span><b>Seminar & Workshop</b><p>Teach one shared language, run an activity, then let every participant carry it home.</p><span>EVENTS · LEARNING · DOOR GIFT</span></article>
            <article class="ksv2-use"><span class="icon">🧭</span><b>Project & Product</b><p>Use Body, Mind, Soul and Craft to frame desire, direction, sustainability and execution.</p><span>PITCH · PLAN · PRESENT</span></article>
            <article class="ksv2-use"><span class="icon">🧩</span><b>Build a Team</b><p>Choose the energies and keywords a project needs before assigning roles.</p><span>FORMATION · ROLE · ALIGNMENT</span></article>
            <article class="ksv2-use"><span class="icon">🔮</span><b>Oracle & Reflection</b><p>Use symbolic systems as optional lenses for better questions, never guaranteed prediction.</p><span>JOURNAL · RITUAL · PERSPECTIVE</span></article>
            <article class="ksv2-use"><span class="icon">🤖</span><b>AI Companion</b><p>Scan the Markdown knowledge file so AI can interpret, combine and expand the deck responsibly.</p><span>CHOOSE · EXPLAIN · EXPAND</span></article>
            <article class="ksv2-use"><span class="icon">🏆</span><b>Tournament Play</b><p>Run compact BO5 sets and reward champions with cosmetic Cold Foil prize cards.</p><span>DUEL · RANK · COMMUNITY</span></article>
          </div>
          <div class="ksv2-unlimited"><strong>4 Colours.<br>Unlimited Possibilities.</strong><span>New cards can add words and art. New designers can add games. The common protocol remains small enough for everyone to remember.</span></div>
        </div>
      </section>`);
    insertAfter(document.querySelector('.ai'), section);
  }

  function applyCampaignCopy(){
    const og = document.querySelector('meta[property="og:description"]');
    if(og) og.setAttribute('content','One deck. Any opponent. Anywhere. Learn in ten seconds, carry seven cards, and play with the world.');
    setText('.hero-lead','A beautiful 32-card box that lets you open a real game with anyone in ten seconds — even if they do not own a deck, know the rules, or speak the same language.');
    setText('.micro-proof','28 energy cards · 4 rule cards · 10-second teach · 1 deck for the whole table');
    const promise = document.querySelector('#promise .promise-grid article:first-child strong');
    if(promise) promise.textContent = '10 sec';
    const heading = document.querySelector('.language .section-heading h2');
    if(heading) heading.innerHTML = 'Four colors. Four parts of being human.<br><em>Body. Mind. Soul. Craft.</em>';
    const labels = {RED:'RED · BODY',BLUE:'BLUE · MIND',GREEN:'GREEN · SOUL',GRAY:'GRAY · CRAFT'};
    document.querySelectorAll('.energy-button').forEach(button => {
      if(labels[button.dataset.energy]) button.innerHTML = '<span>●</span> '+labels[button.dataset.energy];
    });
    applyEnergy('RED');
  }

  function enhancePledges(){
    document.querySelectorAll('.pledge').forEach(card => {
      if(card.dataset.pledge === 'Open Player') return;
      const list = card.querySelector('ul');
      if(list && !list.querySelector('.ksv2-unlock-item')){
        const li = document.createElement('li');
        li.className = 'ksv2-unlock-item';
        li.textContent = 'Matching digital collection unlock';
        list.appendChild(li);
      }
    });
    const box = document.querySelector('#box .production-spec');
    if(box && !document.querySelector('.ksv2-digital-unlock')){
      const note = document.createElement('div');
      note.className = 'ksv2-digital-unlock reveal';
      note.innerHTML = '<b>Physical set, digital collection.</b><br><span>Each physical release is designed to unlock its matching card collection online while the core game stays free for everyone.</span>';
      insertAfter(box, note);
    }
  }

  function enhanceStretchGoal(){
    document.querySelectorAll('.stretch-goal').forEach(goal => {
      if(goal.textContent.includes('FOUR FOIL CORES')){
        const title = goal.querySelector('b');
        const body = goal.querySelector('p');
        if(title) title.textContent = 'BODY · MIND · SOUL · CRAFT';
        if(body) body.textContent = 'Four symbolic foil Core cards in every box — three forces of life and the human power to Craft. Collectible, universal and never stronger.';
      }
    });
    const futureTitle = document.querySelector('.future-copy h2');
    if(futureTitle) futureTitle.innerHTML = 'Four colors.<br>Unlimited possibilities.';
  }

  async function renderCardFront(){
    try{
      const {cardSVG} = await import('/core7/js/art.js');
      const target = document.getElementById('ksv2CardFront');
      if(target) target.innerHTML = cardSVG('fh-red-courage',{width:360});
    }catch(error){
      const target = document.getElementById('ksv2CardFront');
      if(target) target.innerHTML = '<div style="height:100%;display:grid;place-items:center;background:#8f2b1a;color:white;font-weight:900">COURAGE · ความกล้า</div>';
    }
  }

  function initFlip(){
    const card = document.getElementById('ksv2FlipCard');
    const button = document.getElementById('ksv2FlipButton');
    if(!card || !button) return;
    const flip = () => card.classList.toggle('flipped');
    button.addEventListener('click',flip);
    card.addEventListener('click',flip);
    card.addEventListener('keydown',event => {
      if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); flip(); }
    });
  }

  function applyEnergy(energy){
    const pack = ENERGY_COPY[energy];
    if(!pack) return;
    const copy = pack[currentLanguage] || pack.en;
    setText('#energyLabel',copy.label);
    setText('#energyHeadline',copy.headline);
    setText('#energyBody',copy.body);
  }

  function bind(selector, thai, html){
    const nodes = Array.from(document.querySelectorAll(selector));
    const values = Array.isArray(thai) ? thai : [thai];
    nodes.forEach((node,index) => {
      translations.push({
        node,
        en: html ? node.innerHTML : node.textContent,
        th: values[index] !== undefined ? values[index] : values[values.length-1],
        html: Boolean(html)
      });
    });
  }

  function buildTranslations(){
    bind('.nav-links a',['ตัวเกม','ในกล่อง','ระดับสนับสนุน','เป้าหมายเพิ่มเติม']);
    bind('.nav-cta','เลือกระดับสนับสนุน');
    bind('.ksv2-play-nav','เล่นตอนนี้');
    bind('.campaign-kicker','ตัวอย่างแคมเปญ · การพิมพ์ครั้งแรก');
    bind('.hero h1','เด็คเดียว<br>คู่แข่งคนไหนก็ได้<br><em>ที่ไหนก็ได้</em>',true);
    bind('.hero-lead','กล่องการ์ดสวยงาม 32 ใบ ที่ทำให้คุณเปิดเกมจริงกับใครก็ได้ภายในสิบวินาที แม้เขาจะไม่มีเด็ค ไม่รู้กติกา หรือพูดคนละภาษาก็ตาม');
    bind('.hero-actions a',['สนับสนุน First Hand','เล่นออนไลน์ตอนนี้','ดูวิธีเล่น']);
    bind('.micro-proof','การ์ดพลังงาน 28 ใบ · การ์ดกติกา 4 ใบ · สอน 10 วินาที · เด็คเดียวเล่นได้ทั้งโต๊ะ');
    bind('.ksv2-hero-badge span',['ฟรีตลอดไป','ไม่มีโฆษณา','เรียนรู้ใน 10 วินาที']);
    bind('#promise .promise-grid article span',['ใช้เรียนรู้','พกติดตัว','คนจากกล่องเดียว','การซื้อที่จำเป็นต่อการเล่น']);
    bind('.origin-copy .eyebrow','การค้นพบครั้งสำคัญ');
    bind('.origin-copy h2','เราใช้เวลาสามปีพยายามออกแบบเกมการ์ด<br><em>แล้วเราก็ค้นพบภาษา</em>',true);
    bind('.origin-copy p',['เกมการ์ดส่วนใหญ่เริ่มด้วยปัญหา: ทั้งสองคนต้องมีเกมเดียวกัน รู้กติกาเดียวกัน และมักต้องมีเด็คของตัวเอง แต่ CORE7 เริ่มจากคำสัญญาตรงกันข้าม','การ์ดใช้สี่สี สี่สัญลักษณ์ และยี่สิบแปดคำของมนุษย์ เด็กเข้าใจการต่อสู้ ผู้ใหญ่คุยต่อหลังเกม และทีมใช้การ์ดชุดเดียวกันเพื่อวางแผน ทบทวน หรือบอกว่าสิ่งใดกำลังขาด']);
    bind('.origin-copy blockquote','“ฉันพกหนึ่งกล่อง ฉันเจอใครก็ได้ แล้วเราเล่นกันได้”');
    bind('.game .section-heading .eyebrow','CORE7 · เกมหลัก');
    bind('.game .section-heading h2','สี่สี หนึ่งวงจร<br>และเกมที่ลึกเกินคาด',true);
    bind('.game .section-heading > p:last-child','เลือกแบบลับ เปิดพร้อมกัน แล้วอ่านคนตรงหน้า ไม่ใช่อ่านกำแพงข้อความบนการ์ด');
    bind('.rules-poster figcaption','แนวคิดทั้งหมดจบได้ในการ์ดกติกาเพียงหนึ่งใบ');
    bind('.cycle-item span',['ชนะเขียว','ชนะฟ้า','ชนะแดง']);
    bind('.gray-rule span','บล็อกทุกสี แต่เทาใบสุดท้ายแพ้');
    bind('.how-list b',['สร้างมือของคุณ','เลือกแบบลับ','เปิดพร้อมกัน','บริหารการ์ดที่เหลือ','ชนะสามรอบ']);
    bind('.how-list p',['พกเจ็ดใบ ดราฟต์จากกล่อง หรือใช้อะไรก็ได้ที่แทนสี่สี','ผู้เล่นทั้งสองเลือกการ์ดหนึ่งใบคว่ำพร้อมกัน','วงจรสีตัดสินทันที เทาทำหน้าที่บล็อก','ผู้ชนะทิ้งหนึ่งใบ ผู้แพ้ทิ้งใบที่เล่นและเพิ่มอีกหนึ่งใบ','ทุกใบที่เปิดกลายเป็นข้อมูล เกมยิ่งเข้มเมื่อมือเล็กลง']);
    bind('.game-truth p','กติกาง่ายพอจะสอนได้โดยไม่ต้องใช้ภาษา');
    bind('.game-truth strong','แต่ตัวเลือกเป็นมนุษย์พอที่จะทำให้เล่นซ้ำได้');
    bind('.carry-copy .eyebrow','คำสัญญาของเกมพกพา');
    bind('.carry-copy h2','เกมทั้งคืนของคุณอยู่ในกระเป๋าใบเดียวได้');
    bind('.carry-copy > p','เก็บกล่องเต็มไว้ที่บ้าน หรือพกมือเจ็ดใบของคุณ เมื่อเจอผู้เล่นอีกคนก็สร้างมือให้เขาจากอีกยี่สิบเอ็ดใบ ไม่ต้องมีเด็คที่สอง ไม่ต้องจัดโต๊ะพิธีใหญ่ และไม่ต้องตามหาคนที่รู้จักเกมเดียวกัน');
    bind('.check-list li',['ไม่ต้องใส่ซอง','ไม่ต้องใช้พื้นที่โต๊ะใหญ่','ไม่มีการ์ดสะสมที่เก่งขึ้นเรื่อย ๆ','ไม่ต้องอ่านข้อความเพื่อชี้ขาดเกมหลัก','ไม่ต้องใช้อินเทอร์เน็ต']);
    bind('.language .section-heading .eyebrow','การ์ดหลังเกมจบ');
    bind('.language .section-heading h2','สี่สี สี่ส่วนของความเป็นมนุษย์<br><em>ร่างกาย จิตใจ จิตวิญญาณ งานสร้าง</em>',true);
    bind('.language .section-heading > p:last-child','การ์ดแต่ละใบเก็บพลังงานของมนุษย์หนึ่งคำ คำอังกฤษทำให้มันเดินทาง ส่วนคำไทยรักษาต้นกำเนิดทางอารมณ์ของมันไว้ ไม่ใช่ของตกแต่ง แต่คือเมล็ดแรกของความหมาย');
    bind('.gallery-caption','FIRST HAND · 28 ใบ · เจ็ดความหมายในแต่ละสี');
    bind('#box .section-heading .eyebrow','มีอะไรในกล่อง');
    bind('#box .section-heading h2','สามสิบสองใบ<br>ไม่มีอะไรเกินความจำเป็น',true);
    bind('.box-item h3',['การ์ดพลังงาน','การ์ดกติกา','ไฟล์ความรู้สำหรับ AI','วิธีใช้ไม่จำกัด']);
    bind('.box-item p',['แดงเจ็ด ฟ้าเจ็ด เขียวเจ็ด และเทาเจ็ด แต่ละใบมีภาพเต็มใบต้นฉบับ คำอังกฤษ และความหมายภาษาไทย','การเริ่มเกม วงจรสี การบล็อกและชัยชนะ รวมถึง Open Play และคู่มือ AI แจกให้คนรอบโต๊ะแล้วเริ่มได้เลย','สแกน QR เพื่อให้ AI รู้รายการการ์ด ความหมาย กติกา ขอบเขต และแนวคิดใช้งานต่อ','CORE7 คือเกมแรก ไม่ใช่เกมสุดท้าย ใช้โปรโตคอลสี่สีเดียวกันสร้างเกม เวิร์กช็อป และพิธีกรรมใหม่ได้']);
    bind('.production-spec span',['ขนาดการ์ดมาตรฐาน','ออกแบบมาให้เล่นโดยไม่ใส่ซอง','ไม่ใช้สีเพียงอย่างเดียว','สร้างมาเพื่อกระเป๋า ไม่ใช่ชั้นวาง']);
    bind('.ksv2-digital-unlock b','ชุดจริง คอลเลกชันดิจิทัล');
    bind('.ksv2-digital-unlock span','การ์ดจริงแต่ละชุดออกแบบมาเพื่อปลดล็อกคอลเลกชันเดียวกันในออนไลน์ ขณะที่เกมหลักยังฟรีสำหรับทุกคน');
    bind('.open-copy .eyebrow','คำสัญญาของเรา');
    bind('.open-copy h2','คุณไม่จำเป็นต้องซื้อการ์ดของเราเพื่อเล่นเกมของเรา');
    bind('.open-copy > p:first-of-type','เขียน แดง ฟ้า เขียว เทา ลงบนเศษกระดาษ ใช้โทเคนสี หรือกำหนดดอกจากไพ่ปกติ CORE7 ก็ยังเล่นได้');
    bind('.open-emphasis','เราไม่ได้ขายสิทธิ์ในการเล่น<br><b>เรากำลังสร้างวัตถุที่ดีพอให้คุณเลือกซื้อเอง</b>',true);
    bind('.open-pillars span',['เล่นออนไลน์ฟรี','พิมพ์เล่นเอง','ใช้ของแทนได้','ไม่จ่ายเพื่อชนะ','สร้างกติกาชุมชนได้']);
    bind('.ai-copy .eyebrow','ชั้น AI');
    bind('.ai-copy h2','เด็คที่เครื่องเข้าใจได้ โดยไม่บังคับให้คุณจำหนังสือทั้งเล่ม');
    bind('.ai-copy > p:first-of-type','ทุกกล่องมี QR ไปยังไฟล์ Markdown ที่สะอาด ส่งให้ AI ที่คุณใช้อยู่ มันจะรู้ว่ามีการ์ดอะไร ความหมายคืออะไร เกมทำงานอย่างไร และจุดไหนที่การตีความต้องหยุด');
    bind('.ai-use-grid b',['เลือกมือประจำวัน','วางแผนโปรเจกต์','เปิดบทสนทนา','สะท้อนผ่านสัญลักษณ์']);
    bind('.ai-use-grid span',['“เลือกเจ็ดใบให้เหมาะกับวันที่ฉันกำลังจะเจอ”','เปลี่ยน Clarity, Strategy, Build, Measure และ Iterate ให้เป็นขั้นตอนทำงานจริง','สร้างคำถามสำหรับครอบครัว ทีม หรือคนแปลกหน้าสองคนที่โต๊ะเดียวกัน','ใช้วันเกิด ธาตุ หรือระบบวัฒนธรรมเป็นเลนส์เสริม ไม่ใช่คำทำนายที่รับประกัน']);
    bind('.ai-boundary','AI ไม่ได้บอกชะตาของคุณ มันช่วยให้คุณเห็นทางเลือกมากขึ้น');
    bind('#pledges .section-heading .eyebrow','เลือก FIRST HAND ของคุณ');
    bind('#pledges .section-heading h2','สนับสนุนวัตถุ<br>รักษาเกมให้เปิดกว้าง',true);
    bind('#pledges .section-heading > p:last-child','ราคาแคมเปญแสดงเป็นดอลลาร์สหรัฐ ค่าจัดส่งเก็บหลังแคมเปญเพื่อคิดตามปลายทางจริง');
    bind('.ksv2-unlock-item','ปลดล็อกคอลเลกชันดิจิทัลที่ตรงกับชุดจริง');
    bind('#stretch .section-heading .eyebrow','เป้าหมายเพิ่มเติม');
    bind('#stretch .section-heading h2','ทำให้กล่องเดิมดีขึ้น<br>อย่าสร้างโครงการที่สอง',true);
    bind('#stretch .section-heading > p:last-child','ทุกเป้าหมายทำให้วัตถุหรือระบบเปิดดีขึ้น ไม่มีสิ่งใดเพิ่มพลังการแข่งขัน');
    bind('.future-copy .eyebrow','หนึ่งภาษา · หลายโลก');
    bind('.future-copy h2','สี่สี<br>ความเป็นไปได้ไม่จำกัด',true);
    bind('.future-copy p','ชุดอนาคตนำคำใหม่ ภาพใหม่ ศิลปินใหม่ และวัฒนธรรมใหม่เข้าสู่โปรโตคอลสี่สีเดิม การ์ดเก่ายังเล่นได้ ภาพใหม่ยังน่าสะสม และ CORE7 ยังฟรี');
    bind('.timeline .section-heading .eyebrow','เส้นทางสู่โต๊ะของคุณ');
    bind('.timeline .section-heading h2','กล่องเล็ก ๆ สมควรได้รับแผนงานที่มีวินัย');
    bind('.timeline-grid b',['แคมเปญ','เตรียมพิมพ์','ตัวอย่างโรงงาน','การผลิต','ขนส่งใหญ่','ส่งถึงมือ']);
    bind('.timeline-grid p',['ระดมทุน สรุปจำนวนผู้สนับสนุน และล็อกเป้าหมายเพิ่มเติม','ตรวจทุกใบ ภาษา สัญลักษณ์ ระยะตัดตก และโปรไฟล์สี','อนุมัติกระดาษ ผิวสัมผัส กล่อง และการใช้งานจริงโดยไม่ใส่ซอง','พิมพ์ ตัด จัดชุด ตรวจสอบ และเปลี่ยนชิ้นเสีย','ย้ายสินค้าไปจุดกระจายและเก็บค่าจัดส่งตามปลายทาง','ส่ง First Hand ออกสู่โลก แล้วดูโต๊ะใหม่เริ่มต้น']);
    bind('.risks .eyebrow','ความเสี่ยงและความท้าทาย');
    bind('.risks h2','เราทะเยอทะยานกับวัฒนธรรม<br>แต่ระมัดระวังกับกล่อง',true);
    bind('.risk-copy p',['เกมมีอยู่แล้วในรูปแบบดิจิทัล ตัวตนของการ์ดยี่สิบแปดใบแรกถูกล็อก และระบบภาพสร้างเสร็จแล้ว งานที่เหลือคือการผลิตจริง: ตัวอย่าง สี วัสดุ บรรจุภัณฑ์ ขนส่ง และกระจายสินค้า','เราจะไม่เพิ่มมินิฟิกเกอร์ การบังคับใช้แอป กล่องเกมที่สอง หรือกระบวนการผลิตประหลาดเพียงเพราะตัวเลขระดมทุนดูน่าตื่นเต้น เป้าหมายเพิ่มเติมต้องทำให้สิ่งเดิมดีขึ้น','วันที่ในแคมเปญจริงจะอิงใบเสนอราคาที่ลงนามแล้ว พร้อมเวลาสำรองสำหรับแก้ตัวอย่างและขนส่งระหว่างประเทศ']);
    bind('.faq .eyebrow','คำถามที่พบบ่อย');
    bind('.faq h2','คำถามที่เราจะถามก่อนกดสนับสนุน');
    bind('.faq-list summary',['ผู้เล่นทั้งสองต้องมีกล่องไหม?','ทำไมต้องซื้อการ์ดถ้าเกมฟรี?','คำไทยมีผลต่อการเล่นไหม?','นี่คือไพ่ออราเคิลหรือดูดวงไหม?','การ์ดหายากเก่งกว่าหรือไม่?','เด็กเล่นได้ไหม?','ฉันสร้างการ์ดหรือเกมเองได้ไหม?','จะมีชุดใหม่อีกไหม?']);
    bind('.faq-list details p',['ไม่ นี่คือคำสัญญาหลัก กล่องเดียวสร้างมือได้ทั้งสองฝ่าย และเกมพื้นฐานใช้สิ่งใดก็ได้ที่แทนสี่สี','เพราะเด็คจริงคืองานศิลปะ ภาษา พิธีกรรมพกพา และวัตถุที่คุณอยากวางลงบนโต๊ะ กลไกเปิดกว้าง แต่วัตถุต้องคู่ควรกับการซื้อ','ไม่ สีเป็นตัวตัดสิน CORE7 ภาษาไทยรักษาต้นกำเนิดทางวัฒนธรรมและอารมณ์ของแต่ละคำ เพิ่มความลึกโดยไม่สร้างกำแพงภาษา','ใช้สะท้อนเชิงสัญลักษณ์ร่วมกับ AI ได้ แต่ไม่อ้างว่าทำนายอนาคต ระบบออกแบบเพื่อสร้างคำถาม มุมมอง และการลงมือ ไม่ใช่ความแน่นอน','ไม่ ฟอยล์ ภาพพิเศษ และความหายากเป็นเพียงของสะสม กระดาษเขียนคำว่าแดงสามารถชนะการ์ดเขียวราคาแพงที่สุดได้เสมอ','เกมสีตั้งใจให้ง่ายและมีไอคอนกำกับ คำแนะนำอายุและการดูแลของผู้ใหญ่จะยืนยันหลัง Blind Playtest','นี่คือส่วนหนึ่งของระบบระยะยาว Open Creator Kit จะกำหนด Schema และแนวทางความเข้ากันได้โดยรักษาแกนสี่สี','มี ทั้งคำใหม่ ภาพใหม่ ศิลปินใหม่ และธีมใหม่ โปรโตคอลยังคงแดง ฟ้า เขียว เทา เพื่อให้ First Hand ไม่ล้าสมัย']);
    bind('.final-cta .eyebrow','FIRST HAND');
    bind('.final-cta h2','พกหนึ่งเด็ค<br>แล้วออกไปพบโลกครึ่งทาง',true);
    bind('.final-cta > .wrap > p:not(.eyebrow)','สนับสนุนเกมที่ทุกคนเล่นได้ และชุดคำที่ควรถูกส่งต่อจากมือหนึ่งสู่อีกมือหนึ่ง');
    bind('.final-cta .button','เลือกระดับสนับสนุน');

    bind('#play-online .ksv2-kicker',['ลองก่อนสนับสนุน','กายภาพ ↔ ดิจิทัล']);
    bind('#play-online .ksv2-title','เกมมีอยู่แล้ว<br>คุณเล่นได้ตอนนี้',true);
    bind('#play-online .ksv2-lead','CORE7 เล่นออนไลน์ได้จริงและฟรีตลอดไป ไม่มีโฆษณา ไม่มีความได้เปรียบแบบจ่ายเงิน และไม่ต้องเชื่อคำสัญญาของแคมเปญว่ามันสนุกหรือไม่');
    bind('#play-online .ksv2-button',['เล่น CORE7 ตอนนี้','อ่านกติกาสิบวินาที']);
    bind('.ksv2-online-panel h3','การ์ดไม่ใช่กำแพงจ่ายเงิน<br>มันคือวัตถุที่เราอยากสร้าง',true);
    bind('.ksv2-online-panel > p:not(.ksv2-kicker)','ผู้เล่นทุกคนได้เกมเดียวกัน ชุดจริงเพิ่มวัตถุ งานศิลปะ พิธีกรรม และรหัสปลดล็อกคอลเลกชันเดียวกันในออนไลน์เมื่อมีชุดใหม่');
    bind('.ksv2-online-list b',['ฟรีตลอดไป','ไม่มีโฆษณา','การแข่งขันเท่าเทียม','ปลดล็อกชุด']);
    bind('.ksv2-online-list span',['เกมหลักยังเล่นได้โดยไม่ต้องซื้อ','โต๊ะมีไว้ให้คน ไม่ใช่พื้นที่ขายโฆษณา','ฟอยล์ ความหายาก และภาพดิจิทัลไม่เปลี่ยนโอกาสชนะ','มีชุดจริง ก็พกคอลเลกชันเดียวกันไปในออนไลน์']);

    bind('#tournament .ksv2-scoreboard-top b','รูปแบบการแข่งขัน CORE7');
    bind('#tournament .ksv2-scoreboard-top span','ล็อกมือ');
    bind('#tournament .ksv2-scoreboard > p','มือเจ็ดใบหนึ่งชุด เกมเร็วสูงสุดห้าเกม ทุกการเล่นซ้ำเผยนิสัยเพิ่มขึ้น');
    bind('#tournament .ksv2-kicker','การแข่งขันในรูปแบบที่เรียบง่ายที่สุด');
    bind('#tournament .ksv2-title','เรียนรู้ในสิบวินาที<br>ใช้ห้าเกมอ่านมนุษย์หนึ่งคน',true);
    bind('#tournament .ksv2-lead','ในการแข่งขัน ผู้เล่นล็อกมือเจ็ดใบเดิมตลอดเซ็ต Best-of-5 กติกาไม่ได้ยากขึ้น แต่คู่แข่งชัดขึ้น คุณจำการเลือก เห็นรูปแบบ เปลี่ยนจังหวะ และรู้สึกถึงแรงกดดันของการใช้เครื่องมือเดิมอีกครั้ง');
    bind('.ksv2-competitive-points b',['ล็อกมือ','เล่นดวลซ้ำ','ปรับตามคน']);
    bind('.ksv2-competitive-points p',['เจ็ดใบกลายเป็นตัวตนของคุณตลอดเซ็ต','เล่นเกมสั้นสูงสุดห้าเกมในพื้นที่ข้อมูลเดิม','ความลึกมาจากความจำ การลวง และการอ่านรูปแบบของมนุษย์']);
    bind('.ksv2-prize b','รางวัลการแข่งขัน Cold Foil');
    bind('.ksv2-prize span','การ์ดกิจกรรมพิเศษใช้ให้รางวัลแชมป์และชุมชนได้โดยไม่เพิ่มพลัง มีเพียงเกียรติ เกมยังเท่าเทียม');

    bind('#card-back .ksv2-kicker','หลังเดียว · ทุกชุด');
    bind('#card-back .ksv2-title','ความหมายต่างกัน<br>ภาษาเดียวกัน',true);
    bind('#card-back .ksv2-lead','การ์ด myClover ที่ใช้เล่นทุกใบมีหลังเดียวกัน คำใหม่ ศิลปินใหม่ และวัฒนธรรมใหม่จึงเข้าระบบได้โดยไม่ทำลายข้อมูลลับที่ทำให้ CORE7 ทำงาน');
    bind('.ksv2-cardback-copy blockquote','หลังการ์ดไม่ใช่บรรจุภัณฑ์ มันคือธงของภาษาที่ใครก็นั่งลงและพูดร่วมกันได้');
    bind('.ksv2-cardback-copy li',['หลังสากลหนึ่งแบบสำหรับทุกชุดที่เข้ากันได้','โคลเวอร์สี่สีและเข็มทิศเป็นตัวตนกลาง','ออกแบบให้ผสมการ์ดเก่ากับอนาคตได้','เล่นทั่วไปได้โดยไม่ต้องใส่ซอง']);
    bind('#ksv2FlipButton','↻ พลิกการ์ด');

    bind('#foil-cores .ksv2-kicker','FOIL CORE ทั้งสี่');
    bind('#foil-cores .ksv2-title','ร่างกาย จิตใจ จิตวิญญาณ งานสร้าง');
    bind('#foil-cores .ksv2-lead','สามอย่างคือพลังของชีวิต ส่วนที่สี่คือการกระทำของมนุษย์ที่เปลี่ยนความหมายให้เป็นของจริง เมื่อรวมกันจึงทำให้ภาษา myClover สมบูรณ์');
    bind('.ksv2-core-thesis','ปลดล็อกเป็น Stretch Goal: การ์ดสัญลักษณ์ฟอยล์สี่ใบในทุกกล่อง เป็นของสะสม ใช้ร่วมกันได้ และไม่เก่งกว่าเชิงกลไก');

    bind('#possibilities .ksv2-kicker','นอกเหนือจากการดวล');
    bind('#possibilities .ksv2-title','หนึ่งเด็ค<br>หลายพื้นที่',true);
    bind('#possibilities .ksv2-lead','CORE7 คือเกมแรกในระบบ ไม่ใช่ขีดจำกัดของการ์ด สี่สีเดียวกันเดินทางจากการดวลในกระเป๋าไปสู่สัมมนา โต๊ะทีม หรือการสะท้อนร่วมกับ AI ได้');
    bind('.ksv2-use b',['เริ่มบทสนทนา','สร้างทีม','สัมมนาและเวิร์กช็อป','โปรเจกต์และสินค้า','ตั้งทีม','ออราเคิลและการสะท้อน','คู่คิด AI','การแข่งขัน']);
    bind('.ksv2-use p',['พาจากบทสนทนาทั่วไปไปสู่คำถามจริงโดยไม่บังคับให้ใครเปิดเผยเกินไป','บอกว่าทีมมีอะไร ขาดอะไร และอะไรต้องเกิดขึ้นต่อ','สอนภาษากลางหนึ่งชุด ทำกิจกรรม แล้วให้ผู้เข้าร่วมพกกลับบ้าน','ใช้ Body, Mind, Soul และ Craft วางกรอบความต้องการ ทิศทาง ความยั่งยืน และการลงมือ','เลือกพลังงานและ Keyword ที่โครงการต้องการก่อนแบ่งบทบาท','ใช้ระบบสัญลักษณ์เป็นเลนส์เสริมสำหรับคำถามที่ดีขึ้น ไม่ใช่คำทำนายรับประกัน','สแกนไฟล์ Markdown เพื่อให้ AI ตีความ ผสม และขยายระบบอย่างมีขอบเขต','จัดเซ็ต BO5 ที่กระชับและให้รางวัลแชมป์ด้วยการ์ด Cold Foil ที่ไม่มีพลังเพิ่ม']);
    bind('.ksv2-unlimited strong','4 สี<br>ความเป็นไปได้ไม่จำกัด',true);
    bind('.ksv2-unlimited span','การ์ดใหม่เพิ่มคำและภาพ นักออกแบบใหม่เพิ่มเกม โปรโตคอลร่วมยังเล็กพอให้ทุกคนจำได้');
  }

  function translatePledgeButtons(){
    document.querySelectorAll('.pledge').forEach(card => {
      const button = card.querySelector('.select-pledge');
      if(!button) return;
      const selected = card.classList.contains('is-selected');
      if(currentLanguage === 'th') button.textContent = selected ? 'เลือกแล้ว ✓' : 'เลือก '+card.dataset.pledge;
      else button.textContent = selected ? 'Selected ✓' : 'Choose '+card.dataset.pledge;
    });
    const clear = document.getElementById('clearPledge');
    if(clear) clear.textContent = currentLanguage === 'th' ? 'เปลี่ยนตัวเลือก' : 'Change selection';
  }

  function applyLanguage(language){
    currentLanguage = language === 'th' ? 'th' : 'en';
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('.ksv2-lang button').forEach(button => button.classList.toggle('active',button.dataset.lang === currentLanguage));
    translations.forEach(item => {
      const value = currentLanguage === 'th' ? item.th : item.en;
      if(item.html) item.node.innerHTML = value;
      else item.node.textContent = value;
    });
    document.querySelectorAll('.energy-button').forEach(button => {
      const energy = button.dataset.energy;
      const labels = currentLanguage === 'th'
        ? {RED:'แดง · ร่างกาย',BLUE:'ฟ้า · จิตใจ',GREEN:'เขียว · จิตวิญญาณ',GRAY:'เทา · งานสร้าง'}
        : {RED:'RED · BODY',BLUE:'BLUE · MIND',GREEN:'GREEN · SOUL',GRAY:'GRAY · CRAFT'};
      button.innerHTML = '<span>●</span> '+labels[energy];
    });
    const active = document.querySelector('.energy-button.active') || document.querySelector('.energy-button');
    if(active) applyEnergy(active.dataset.energy);
    translatePledgeButtons();
  }

  function initLanguageToggle(){
    document.querySelectorAll('.ksv2-lang button').forEach(button => {
      button.addEventListener('click',() => applyLanguage(button.dataset.lang));
    });
  }

  function initEnergyOverride(){
    document.querySelectorAll('.energy-button').forEach(button => {
      button.addEventListener('click',() => window.setTimeout(() => applyEnergy(button.dataset.energy),0));
    });
  }

  function initPledgeLanguageSync(){
    document.querySelectorAll('.select-pledge,#clearPledge').forEach(button => {
      button.addEventListener('click',() => window.setTimeout(translatePledgeButtons,0));
    });
  }

  document.addEventListener('DOMContentLoaded',() => {
    injectStyles();
    addNavigationControls();
    enhanceHero();
    injectOnlineSection();
    injectTournamentSection();
    injectCardBackSection();
    injectCoreFoilSection();
    injectUseCases();
    applyCampaignCopy();
    enhancePledges();
    enhanceStretchGoal();
    renderCardFront();
    initFlip();
    buildTranslations();
    initLanguageToggle();
    initEnergyOverride();
    initPledgeLanguageSync();
    applyLanguage('en');
  });
})();
