// Guild X — Hall + XTY Party upgrade. Runtime-only, scoped to /guild.
// Intentionally does not touch the existing hero artwork geometry.
(() => {
  if (!/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (window.__mcGuildMultiplayerV1) return;
  window.__mcGuildMultiplayerV1 = true;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer:fine)');

  function addStyle() {
    if (document.getElementById('guild-multiplayer-v1-style')) return;
    const style = document.createElement('style');
    style.id = 'guild-multiplayer-v1-style';
    style.textContent = `
      /* ===== Guild X: Hall + Party ===== */
      .guild-two-worlds{position:relative;isolation:isolate}
      .guild-two-worlds>.section-head{max-width:860px}
      .guild-dual-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .guild-world{position:relative;overflow:hidden;min-height:610px;border:1px solid var(--line);border-radius:30px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.024)),#09100d;box-shadow:0 24px 70px rgba(0,0,0,.26);isolation:isolate}
      .guild-world:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.04),transparent 34%,transparent 68%,rgba(240,202,107,.035))}
      .guild-world-copy{position:relative;z-index:20;padding:36px 34px 32px;max-width:560px}
      .guild-world-kicker{display:flex;align-items:center;gap:8px;color:#bdf8d6;font:850 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase}
      .guild-world-kicker:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 16px var(--green)}
      .guild-world h3{font-size:clamp(42px,5vw,68px);line-height:.96;letter-spacing:-.05em;margin:14px 0 12px}
      .guild-world p{color:var(--muted);font-size:15px;line-height:1.72;margin:0;max-width:520px}
      .guild-world-points{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0 0}
      .guild-world-points span{padding:7px 10px;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:rgba(255,255,255,.035);font-size:10.5px;font-weight:760;color:#c7d0ca}
      .guild-world .actions{margin-top:22px}
      .guild-world-art{position:absolute;z-index:2;inset:180px 0 0;overflow:hidden;--scene:0;--px:0;--py:0}
      .guild-world-art img{position:absolute;object-fit:contain;pointer-events:none;will-change:transform}
      .hall-world{background:radial-gradient(650px 410px at 70% 64%,rgba(44,255,142,.10),transparent 67%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.022)),#07100c}
      .hall-magic{width:84%;height:84%;left:8%;bottom:-17%;opacity:.34;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*-8px),calc(var(--scene)*18px),0) rotate(calc(var(--scene)*12deg));animation:gHallSpin 38s linear infinite}
      .hall-core{width:47%;height:47%;left:26.5%;bottom:8%;filter:drop-shadow(0 20px 38px rgba(0,0,0,.5));transform:translate3d(calc(var(--px)*12px),calc(var(--py)*8px + var(--scene)*-8px),0);animation:gHallCore 5.4s ease-in-out infinite}
      .hall-comet{width:115%;height:66%;left:-10%;bottom:-3%;opacity:.36;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*-12px),calc(var(--scene)*-18px),0) rotate(-3deg);animation:gHallSweep 8s ease-in-out infinite}
      .hall-avatar{width:24%;aspect-ratio:1;filter:drop-shadow(0 18px 30px rgba(0,0,0,.48));border-radius:24%;transform:translate3d(calc(var(--px)*var(--dx,8px)),calc(var(--py)*var(--dy,6px)),0);animation:gAvatarFloat 6s ease-in-out infinite}
      .hall-a1{left:5%;bottom:20%;--dx:-11px;--dy:-8px}.hall-a2{right:6%;bottom:26%;--dx:13px;--dy:-7px;animation-delay:-1.5s}.hall-a3{left:19%;bottom:-2%;--dx:-9px;--dy:9px;animation-delay:-2.6s}.hall-a4{right:18%;bottom:2%;--dx:10px;--dy:8px;animation-delay:-3.5s}

      .party-world{background:radial-gradient(620px 400px at 50% 72%,rgba(240,202,107,.11),transparent 66%),radial-gradient(460px 300px at 85% 45%,rgba(89,255,169,.08),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.022)),#0d0d09}
      .party-sigil{width:62%;height:62%;left:19%;bottom:1%;opacity:.42;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*-6px),calc(var(--scene)*12px),0);animation:gPartyPulse 5.2s ease-in-out infinite}
      .party-x{width:34%;height:34%;left:33%;bottom:15%;filter:drop-shadow(0 0 34px rgba(240,202,107,.35));transform:translate3d(calc(var(--px)*8px),calc(var(--py)*7px),0);animation:gPartyX 4.6s ease-in-out infinite}
      .party-dust{width:110%;height:100%;left:-5%;bottom:-18%;opacity:.28;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*-10px),calc(var(--scene)*-20px),0);animation:gHallSpin 45s linear infinite reverse}
      .party-pet{width:24%;height:35%;filter:drop-shadow(0 18px 28px rgba(0,0,0,.52));transform:translate3d(calc(var(--px)*var(--dx,9px)),calc(var(--py)*var(--dy,7px) + var(--scene)*var(--sy,10px)),0);animation:gPetFloat 6.4s ease-in-out infinite}
      .pet-pig{left:3%;bottom:17%;--dx:-13px;--dy:-5px;--sy:-10px}.pet-dog{right:3%;bottom:18%;--dx:14px;--dy:-6px;--sy:12px;animation-delay:-1.2s}.pet-crow{left:17%;bottom:-2%;--dx:-8px;--dy:11px;--sy:14px;animation-delay:-2.3s}.pet-chicken{right:17%;bottom:-2%;--dx:9px;--dy:10px;--sy:-13px;animation-delay:-3.4s}
      .public-badge{display:inline-flex;align-items:center;gap:8px;margin-top:15px;padding:8px 11px;border-radius:999px;border:1px solid rgba(240,202,107,.2);background:rgba(240,202,107,.08);color:#f5d98e;font-size:11px;font-weight:800}.public-badge i{width:7px;height:7px;border-radius:50%;background:#8df6bd;box-shadow:0 0 13px #8df6bd;animation:gPublicLive 1.9s ease-in-out infinite}

      /* ===== Mission Board ===== */
      .guild-mission{position:relative}
      .mission-shell{position:relative;overflow:hidden;min-height:720px;padding:46px;border:1px solid var(--line);border-radius:32px;background:radial-gradient(900px 520px at 50% 35%,rgba(240,202,107,.08),transparent 68%),linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02)),#090c0a;isolation:isolate;--scene:0;--px:0;--py:0}
      .mission-shell:before{content:"MISSION BOARD";position:absolute;right:-20px;top:18px;font:900 clamp(54px,9vw,128px)/1 Georgia,serif;letter-spacing:-.06em;color:rgba(240,202,107,.035);pointer-events:none}
      .mission-copy{position:relative;z-index:20;max-width:690px}
      .mission-copy h2{font-size:clamp(48px,6.4vw,82px);line-height:.98;letter-spacing:-.05em;margin:14px 0}
      .mission-copy p{color:var(--muted);font-size:16px;line-height:1.8;max-width:650px}
      .mission-flow{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 0}
      .mission-flow span{padding:8px 12px;border:1px solid rgba(255,255,255,.10);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:800;color:#c9d2cc}
      .mission-board{position:relative;z-index:10;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:34px;perspective:1200px}
      .mission-card{position:relative;overflow:hidden;min-height:260px;padding:24px;border:1px solid rgba(240,202,107,.17);border-radius:22px;background:linear-gradient(180deg,rgba(28,31,27,.94),rgba(10,13,11,.96));box-shadow:0 20px 48px rgba(0,0,0,.30);transform:translate3d(calc(var(--px)*var(--dx,4px)),calc(var(--py)*var(--dy,4px) + var(--scene)*var(--sy,8px)),0) rotateX(calc(var(--py)*-1deg)) rotateY(calc(var(--px)*1deg));transition:border-color .25s ease,box-shadow .25s ease}
      .mission-card:hover{border-color:rgba(240,202,107,.38);box-shadow:0 26px 64px rgba(0,0,0,.4),0 0 34px rgba(240,202,107,.06)}
      .mission-card:nth-child(1){--dx:-6px;--dy:3px;--sy:-10px}.mission-card:nth-child(2){--dx:4px;--dy:-4px;--sy:7px}.mission-card:nth-child(3){--dx:7px;--dy:5px;--sy:-6px}
      .mission-pin{width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff0a8,#dcae42 50%,#76520c 100%);box-shadow:0 4px 10px rgba(0,0,0,.45),0 0 14px rgba(240,202,107,.2);margin-bottom:26px}
      .mission-type{display:inline-flex;padding:6px 9px;border:1px solid rgba(141,246,189,.13);border-radius:999px;color:#bdf8d6;background:rgba(141,246,189,.04);font:800 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}
      .mission-card h3{font-size:24px;line-height:1.15;margin:14px 0 9px}.mission-card p{margin:0;color:#9da8a1;font-size:13px;line-height:1.65}.mission-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:22px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07);color:#8e9a92;font-size:10px}.mission-meta b{color:#f2d486}
      .mission-art{position:absolute;z-index:1;inset:0;pointer-events:none;overflow:hidden}
      .mission-art img{position:absolute;object-fit:contain;will-change:transform}
      .mb-dust{width:78%;height:78%;right:-18%;bottom:-28%;opacity:.24;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*-12px),calc(var(--scene)*-22px),0);animation:gHallSpin 52s linear infinite}
      .mb-star{width:44%;height:44%;right:3%;top:2%;opacity:.13;mix-blend-mode:screen;transform:translate3d(calc(var(--px)*10px),calc(var(--scene)*16px),0);animation:gHallSpin 28s linear infinite reverse}
      .mb-trail-r,.mb-trail-g,.mb-trail-b,.mb-trail-s{width:44%;height:30%;opacity:.18;mix-blend-mode:screen}
      .mb-trail-r{left:-10%;top:28%;transform:rotate(20deg) translate3d(calc(var(--px)*-8px),0,0)}.mb-trail-g{right:-10%;top:25%;transform:rotate(-18deg) translate3d(calc(var(--px)*8px),0,0)}.mb-trail-b{left:-12%;bottom:4%;transform:rotate(-14deg) translate3d(calc(var(--px)*-7px),0,0)}.mb-trail-s{right:-12%;bottom:3%;transform:rotate(14deg) translate3d(calc(var(--px)*7px),0,0)}
      .mission-cta{position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:28px;padding:20px 22px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:rgba(255,255,255,.035);backdrop-filter:blur(14px)}
      .mission-cta-copy b{display:block;font-size:17px}.mission-cta-copy span{display:block;color:#99a49c;font-size:12.5px;margin-top:5px;line-height:1.5}.mission-cta .actions{margin:0;flex:0 0 auto}

      /* ===== Existing page bridge copy ===== */
      .guild-route-note{display:flex;gap:10px;align-items:center;margin-top:16px;color:#aeb8b1;font-size:12.5px;line-height:1.55}
      .guild-route-note strong{color:#f4d78e}
      .guild-route-note:before{content:"XTY";display:grid;place-items:center;flex:0 0 44px;height:28px;border-radius:999px;background:rgba(240,202,107,.09);border:1px solid rgba(240,202,107,.18);color:#f4d78e;font:850 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}

      @keyframes gHallSpin{to{transform:rotate(360deg)}}
      @keyframes gHallCore{0%,100%{filter:drop-shadow(0 20px 38px rgba(0,0,0,.5));scale:1}50%{filter:drop-shadow(0 20px 48px rgba(86,235,161,.20));scale:1.035}}
      @keyframes gHallSweep{0%,100%{opacity:.18;translate:-3% 0}50%{opacity:.44;translate:4% -2%}}
      @keyframes gAvatarFloat{0%,100%{translate:0 0}50%{translate:0 -10px}}
      @keyframes gPartyPulse{0%,100%{opacity:.28;scale:.94}50%{opacity:.56;scale:1.06}}
      @keyframes gPartyX{0%,100%{scale:.98;rotate:-1deg}50%{scale:1.04;rotate:1deg}}
      @keyframes gPetFloat{0%,100%{translate:0 0;rotate:-1deg}50%{translate:0 -12px;rotate:1.5deg}}
      @keyframes gPublicLive{50%{opacity:.45;scale:.75}}

      @media(max-width:980px){
        .guild-dual-grid{grid-template-columns:1fr}.guild-world{min-height:640px}.guild-world-art{inset:170px 0 0}
        .mission-board{grid-template-columns:1fr 1fr}.mission-card:last-child{grid-column:1/-1;min-height:210px}
        .mission-cta{align-items:flex-start;flex-direction:column}.mission-cta .actions{width:100%}
      }
      @media(max-width:640px){
        .guild-two-worlds{padding-top:18px}.guild-world{min-height:590px;border-radius:24px}.guild-world-copy{padding:28px 22px 22px}.guild-world h3{font-size:46px}.guild-world p{font-size:14px}.guild-world-art{inset:190px 0 0}
        .hall-core{width:52%;height:52%;left:24%;bottom:7%}.hall-avatar{width:27%}.hall-a1{left:0}.hall-a2{right:0}.hall-a3{left:14%;bottom:0}.hall-a4{right:14%;bottom:0}
        .party-pet{width:28%;height:38%}.pet-pig{left:-2%}.pet-dog{right:-2%}.pet-crow{left:12%}.pet-chicken{right:12%}.party-x{width:38%;height:38%;left:31%}
        .mission-shell{min-height:auto;padding:30px 18px 26px;border-radius:24px}.mission-copy h2{font-size:48px}.mission-copy p{font-size:14.5px}.mission-board{grid-template-columns:1fr}.mission-card,.mission-card:last-child{grid-column:auto;min-height:218px}.mission-shell:before{font-size:70px;right:-6px;top:6px}.mission-cta{padding:17px}.mission-cta .actions{display:grid;grid-template-columns:1fr;width:100%}.mission-cta .btn,.mission-cta .pill{width:100%}
      }
      @media(prefers-reduced-motion:reduce){
        .guild-world-art img,.mission-art img,.hall-avatar,.party-pet,.mission-card{animation:none!important;transform:none!important;translate:none!important;rotate:none!important;scale:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function hallSection() {
    const section = document.createElement('section');
    section.className = 'section shell guild-two-worlds';
    section.id = 'play';
    section.innerHTML = `
      <div class="section-head reveal">
        <div class="eyebrow">One Guild · Two Ways To Play</div>
        <h2>เจอคนใน Hall<br>แล้วออกไป <span class="shine">ตั้งตี้</span></h2>
        <p>Guild X มี 2 พื้นที่ที่ทำหน้าที่ไม่เหมือนกัน — ห้องโถงมีไว้เจอคน แลก Source และหาเพื่อนร่วมทาง ส่วน Party ใน XTY มีไว้เลือกคน 2–5 คน แล้วเอาภารกิจออกไปเกิดในชีวิตจริง</p>
      </div>
      <div class="guild-dual-grid">
        <article class="guild-world hall-world reveal">
          <div class="guild-world-copy">
            <div class="guild-world-kicker">Guild Hall · Discord</div>
            <h3>เจอคน<br><span class="shine">ก่อนตั้งตี้</span></h3>
            <p>เข้าห้องโถงเพื่อถาม แชร์ Source ขอ feedback หรือหาอีก Path ที่ชิ้นงานของคุณยังขาด ไม่ต้องมีทีมมาก่อน — Hall คือที่ที่คนในบ้านมาเจอกัน</p>
            <div class="guild-world-points"><span>4 Paths</span><span>Source</span><span>Feedback</span><span>หา Party</span></div>
            <div class="actions"><a class="btn primary jsGuild" href="#">เข้า Guild Hall</a></div>
          </div>
          <div class="guild-world-art guild-motion-stage" aria-hidden="true">
            <img class="hall-magic" loading="lazy" src="/guild/assets/extras/emerald_gold_magic_circle_frame.png" alt="">
            <img class="hall-comet" loading="lazy" src="/guild/assets/extras/golden_emerald_comet_light_trail.png" alt="">
            <img class="hall-core" loading="lazy" src="/guild/assets/identity-core.png" alt="">
            <img class="hall-avatar hall-a1" loading="lazy" src="/guild/assets/avatar-void-ui.png" alt="">
            <img class="hall-avatar hall-a2" loading="lazy" src="/guild/assets/avatar-android-ui.png" alt="">
            <img class="hall-avatar hall-a3" loading="lazy" src="/guild/assets/avatar-cat-ui.png" alt="">
            <img class="hall-avatar hall-a4" loading="lazy" src="/guild/assets/avatar-fox-ui.png" alt="">
          </div>
        </article>
        <article class="guild-world party-world reveal delay1">
          <div class="guild-world-copy">
            <div class="guild-world-kicker">Party · XTY</div>
            <h3>ตั้งภารกิจ<br><span class="shine">แล้วออกไปทำ</span></h3>
            <p>ตั้งตี้ 2–5 คน กำหนดว่าอะไรถึงนับเป็น Commit แล้วออกไปเล่นในชีวิตจริง จะเปิดเป็น Public Party ให้คนอื่นมาเจอ หรือใช้รหัสชวนเฉพาะคนก็ได้</p>
            <div class="guild-world-points"><span>2–5 คน</span><span>Public Party</span><span>Commit</span><span>Message</span><span>React</span></div>
            <span class="public-badge"><i></i> PUBLIC PARTY · เปิดให้คนเจอได้</span>
            <div class="actions"><a class="btn gold" href="/xty/?view=public&from=guild">เปิด Mission Board</a><a class="pill" href="/xty/new/?visibility=public&from=guild">+ ตั้งภารกิจ</a></div>
          </div>
          <div class="guild-world-art guild-motion-stage" aria-hidden="true">
            <img class="party-dust" loading="lazy" src="/guild/assets/extras/emerald_clover_dust_swirl_overlay.png" alt="">
            <img class="party-sigil" loading="lazy" src="/guild/assets/extras/radiant_golden_x_energy_sigil.png" alt="">
            <img class="party-x" loading="lazy" src="/guild/assets/guild-x-mark.png" alt="">
            <img class="party-pet pet-pig" loading="lazy" src="/xty/assets/pets/starter-pig.webp" alt="">
            <img class="party-pet pet-dog" loading="lazy" src="/xty/assets/pets/starter-dog.webp" alt="">
            <img class="party-pet pet-crow" loading="lazy" src="/xty/assets/pets/starter-crow.webp" alt="">
            <img class="party-pet pet-chicken" loading="lazy" src="/xty/assets/pets/starter-chicken.webp" alt="">
          </div>
        </article>
      </div>`;
    return section;
  }

  function missionSection() {
    const section = document.createElement('section');
    section.className = 'section shell guild-mission';
    section.id = 'party';
    section.innerHTML = `
      <article class="mission-shell reveal guild-motion-stage">
        <div class="mission-art" aria-hidden="true">
          <img class="mb-dust" loading="lazy" src="/guild/assets/extras/emerald_clover_dust_swirl_overlay.png" alt="">
          <img class="mb-star" loading="lazy" src="/guild/assets/extras/emerald_gold_starburst_emblem.png" alt="">
          <img class="mb-trail-r" loading="lazy" src="/guild/assets/trail-red.png" alt="">
          <img class="mb-trail-g" loading="lazy" src="/guild/assets/trail-green.png" alt="">
          <img class="mb-trail-b" loading="lazy" src="/guild/assets/trail-blue.png" alt="">
          <img class="mb-trail-s" loading="lazy" src="/guild/assets/trail-silver.png" alt="">
        </div>
        <div class="mission-copy">
          <div class="eyebrow">Mission Board · XTY</div>
          <h2>ภารกิจไม่ต้องอยู่ในแชต<br><span class="shine">เอามันออกไปทำจริง</span></h2>
          <p>หัวตี้ตั้งเรื่องอะไรก็ได้ ตั้งกติกาว่าแค่ไหนถึงนับว่า Commit แล้วเลือกว่าจะปักเป็น Public Party หรือส่งรหัสให้คนที่อยากชวนโดยตรง เป้าหมายคือคุยน้อยลง แต่ทำบางอย่างร่วมกันได้จริง</p>
          <div class="mission-flow"><span>ตั้งภารกิจ</span><span>เลือก 2–5 คน</span><span>ออกไปทำจริง</span><span>COMMIT</span><span>MESSAGE เมื่อจำเป็น</span><span>REACT ได้เต็มที่</span></div>
        </div>
        <div class="mission-board" aria-label="ตัวอย่างภารกิจที่ใช้ XTY ได้">
          <article class="mission-card"><div class="mission-pin"></div><span class="mission-type">EXAMPLE · BUILD</span><h3>ทำโปรเจกต์ให้จบ</h3><p>เอางานค้างหนึ่งชิ้นมาตั้งกติกา แล้ว Commit ทุกครั้งที่ส่งของจริง ไม่ต้องเฝ้าแชตทั้งวัน</p><div class="mission-meta"><span>เหมาะกับ <b>MAKER + TASTER</b></span><span>2–5 คน</span></div></article>
          <article class="mission-card"><div class="mission-pin"></div><span class="mission-type">EXAMPLE · MOVE</span><h3>ออกไปขยับด้วยกัน</h3><p>เดิน วิ่ง ตีแบด หรืออะไรก็ได้ที่ชีวิตจริงเป็นสนามเกม ทำแล้วกลับมากด Commit ให้ตี้เห็น</p><div class="mission-meta"><span>จาก Xircle ก็ส่งมาตั้งตี้ได้</span><span>2–5 คน</span></div></article>
          <article class="mission-card"><div class="mission-pin"></div><span class="mission-type">EXAMPLE · LEARN</span><h3>เรียนหรือทดลอง 7 วัน</h3><p>ตั้งกติกาเล็กพอที่จะทำซ้ำ แชร์สิ่งจำเป็นเท่านั้น แล้วดูว่าคนในตี้พากันไปได้ไกลแค่ไหน</p><div class="mission-meta"><span><b>THINKER + KEEPER</b></span><span>Public ได้</span></div></article>
        </div>
        <div class="mission-cta">
          <div class="mission-cta-copy"><b>อยากรับภารกิจ ไม่ต้องรอให้รู้จักใครก่อน</b><span>เปิด Public Parties ใน XTY เพื่อดูตี้ที่กำลังหาเพื่อน หรือเริ่มตี้ของตัวเองแล้วปักไว้ให้คนอื่นเจอ</span></div>
          <div class="actions"><a class="btn primary" href="/xty/?view=public&from=guild">ดู Public Parties</a><a class="btn gold" href="/xty/new/?visibility=public&from=guild">+ ตั้ง Public Party</a></div>
        </div>
      </article>`;
    return section;
  }

  function rewriteExistingCopy() {
    // Hero geometry is deliberately untouched. Only copy/links are reframed around Hall + Party.
    const heroActions = document.querySelector('.hero-copy .actions');
    if (heroActions) heroActions.innerHTML = '<a class="btn primary jsGuild" href="#">เข้า Guild Hall</a><a class="btn gold" href="/xty/?view=public&from=guild">เปิด Party / XTY</a>';

    const promises = document.querySelectorAll('.hero-copy .promise');
    if (promises.length >= 3) {
      promises[1].innerHTML = '<b>Guild Hall</b><span>Discord · เจอคน · แชร์ Source · หา Party</span>';
      promises[2].innerHTML = '<b>Party / XTY</b><span>ตั้งภารกิจ · Public หรือรหัส · ออกไปทำจริง</span>';
    }

    const nav = document.querySelector('.navlinks');
    if (nav) {
      const inside = nav.querySelector('a[href="#inside"]');
      if (inside) inside.textContent = 'Hall';
      if (!nav.querySelector('a[href="#party"]')) {
        const a = document.createElement('a'); a.href = '#party'; a.textContent = 'Party';
        const hero = nav.querySelector('a[href="#hero"]'); nav.insertBefore(a, hero || null);
      }
    }

    const dock = document.querySelector('.dock');
    if (dock) {
      const pathLink = dock.querySelector('a[href="#paths"]');
      if (pathLink) { pathLink.href = '#party'; pathLink.textContent = 'Party'; }
      const guild = dock.querySelector('.jsGuild'); if (guild) guild.textContent = 'Hall';
    }

    const insideHead = document.querySelector('#inside .section-head');
    if (insideHead && !insideHead.querySelector('.guild-route-note')) {
      const note = document.createElement('p'); note.className = 'guild-route-note';
      note.innerHTML = '<strong>Hall คือที่เจอคน</strong> — ถ้าจะเอาคน 2–5 คนออกไปทำภารกิจจริง ให้ไปตั้ง Party ต่อใน XTY';
      insideHead.appendChild(note);
    }

    const finalActions = document.querySelector('.final .actions');
    if (finalActions && !finalActions.querySelector('a[href^="/xty/"]')) {
      const party = document.createElement('a'); party.className = 'btn gold'; party.href = '/xty/?view=public&from=guild'; party.textContent = 'เปิด Mission Board';
      finalActions.appendChild(party);
    }
  }

  function wireGuildLinks() {
    const invite = (window.MC_CONFIG && window.MC_CONFIG.GUILDX_INVITE) || 'https://discord.gg/A5nmMqvTm';
    document.querySelectorAll('.jsGuild').forEach(a => {
      a.href = invite; a.target = '_blank'; a.rel = 'noopener';
    });
  }

  function motion() {
    const stages = [...document.querySelectorAll('.guild-motion-stage')];
    if (!stages.length || reduceMotion.matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = innerHeight || 800;
      for (const stage of stages) {
        const r = stage.getBoundingClientRect();
        const scene = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        stage.style.setProperty('--scene', scene.toFixed(3));
      }
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive:true });
    addEventListener('resize', update, { passive:true });
    update();

    if (finePointer.matches) {
      stages.forEach(stage => {
        stage.addEventListener('pointermove', e => {
          const r = stage.getBoundingClientRect();
          stage.style.setProperty('--px', (((e.clientX - r.left) / r.width) - .5).toFixed(3));
          stage.style.setProperty('--py', (((e.clientY - r.top) / r.height) - .5).toFixed(3));
        });
        stage.addEventListener('pointerleave', () => {
          stage.style.setProperty('--px', 0); stage.style.setProperty('--py', 0);
        });
      });
    }
  }

  function boot() {
    const main = document.querySelector('main#top');
    const hero = main?.querySelector(':scope > .hero');
    const paths = document.getElementById('paths');
    if (!main || !hero || !paths) return;
    addStyle();

    if (!document.getElementById('play')) hero.insertAdjacentElement('afterend', hallSection());
    if (!document.getElementById('party')) paths.insertAdjacentElement('afterend', missionSection());
    rewriteExistingCopy();
    wireGuildLinks();

    // Existing reveal observer was created before these nodes existed. Reveal them here.
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in');
    }), { threshold:.10, rootMargin:'0px 0px -4% 0px' }) : null;
    document.querySelectorAll('#play .reveal,#party .reveal').forEach(el => {
      if (io) io.observe(el); else el.classList.add('in');
    });
    motion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
