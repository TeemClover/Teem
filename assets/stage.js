/* ═══════════════════════════════════════════════════════════════
   myClover — เข็มทิศนำทาง (First Run Stage)

   บ้านหลังนี้ไม่ได้เปิดทุกห้องพร้อมกันตั้งแต่วินาทีแรกอีกแล้ว
   คนใหม่เห็นแค่ประตูกับหมัดที่ยื่นมา แล้วห้องจะเปิดทีละขั้นตามที่เดินจริง

   เหตุผลที่ต้องมีไฟล์นี้:
   สถานะของคนคนหนึ่งกระจายอยู่ 3 ที่ — mc_* ของเว็บหลัก, c7:* ของเกม
   และรายการตอนที่อ่านแล้ว ถ้าปล่อยให้แต่ละหน้าอ่านเองแปลว่าเพิ่มขั้นใหม่ที
   ต้องไล่แก้ทุกหน้า และหน้าไหนคิดเลขพลาดคนก็ค้างอยู่ตรงนั้นโดยไม่มีอะไรบอก

   ที่นี่จึงเป็นที่เดียวที่ตอบว่า "คนคนนี้เดินถึงไหนแล้ว" และ
   "เข็มทิศควรชี้ไปทางไหนต่อ"

   ── ใช้ยังไง ──
   <script src="/assets/stage.js" defer></script>

   แล้วติดป้ายในหน้า HTML ให้บล็อกไหนเปิดที่ขั้นไหน
     <section data-mc-stage="hall">…</section>     โผล่เมื่อถึงขั้น hall แล้ว
     <section data-mc-stage="!hall">…</section>    ซ่อนเมื่อถึงขั้น hall แล้ว

   ของที่เปิดด้วยเงื่อนไข ไม่ใช่ตามลำดับการเดิน (walk · lesson1 · secret)
     <section data-mc-when="lesson1">…</section>

   อ่านค่าจากโค้ด
     MC_STAGE.get()        → {id, index, done, next}
     MC_STAGE.reached('core7')
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── ลำดับขั้น ──
     เรียงตามที่คนเดินจริง แต่ละขั้นถามคำถามเดียว: "ผ่านขั้นนี้ไปหรือยัง"
     done() เป็นจริงเมื่อไหร่ = เข็มทิศเลื่อนไปขั้นถัดไปทันที */
  var STAGES = [
    {
      id: 'door', rail: { icon: '👊', th: 'ชนหมัด' },
      done: function () { return flag('mc_glhf_seen'); },
      next: {
        href: 'hall.html#glhf', icon: '👊',
        label: 'ก้าวแรก',
        title: 'ชนหมัดเพื่อเริ่มเกม',
        desc: 'พิธีเริ่มเกมของบ้านหลังนี้ ชนหมัดแล้วเข็มทิศจะโผล่ขึ้นมา',
        cta: 'ไปชนหมัด →',
      },
    },
    {
      id: 'intro', rail: { icon: '🌱', th: 'บทนำ' },
      done: function () { return flag('mc_intro_seen') || readCount() > 0; },
      next: {
        href: 'forge/intro/', icon: '🌱',
        label: 'ห้องแรก',
        /* หัวข้อบนการ์ดต้องบอกว่า "ในนั้นมีอะไร" ไม่ใช่พูดซ้ำกับหัวข้อด้านบน
           ที่บอกอยู่แล้วว่าเข็มทิศชี้ไปห้องแรก */
        title: 'วิธีคิดในการใช้ AI ที่คนส่วนใหญ่ไม่เคยรู้',
        desc: 'สองช่อง อ่านจบในไม่กี่วินาที แล้วเข้าเรื่องเลย',
        cta: 'เดินตามเข็มทิศ →',
      },
    },
    {
      id: 'forge', rail: { icon: '📖', th: 'การ์ตูน 7 ตอน' },
      done: function () { return readCount() >= EPISODES.length; },
      next: function () {
        var i = Math.min(readCount(), EPISODES.length - 1);
        var n = i + 1;
        return {
          href: 'forge/' + EPISODES[i] + '/', icon: '📖',
          label: readCount() === 0 ? 'ภารกิจแรก' : 'เดินต่อ',
          title: 'อ่าน WHY AI? ตอนที่ ' + n,
          desc: 'ตอนที่ ' + n + ' จาก ' + EPISODES.length + ' · อ่านจบแล้วเข็มทิศจะเลื่อนไปตอนถัดไปเอง',
          cta: 'อ่านตอนที่ ' + n + ' →',
        };
      },
    },
    {
      id: 'walkthrough', rail: { icon: '🗺️', th: 'บทสรุปก่อนเรียน' },
      done: function () { return flag('mc_walk_done'); },
      next: {
        href: 'walkthrough/', icon: '🗺️',
        label: 'ปลดล็อกแล้ว',
        title: 'Walkthrough — บทสรุปก่อนลงมือ',
        desc: 'อ่านครบ 7 ตอนแล้ว หน้านี้มัดทั้งเรื่องให้เหลือสิ่งที่เอาไปใช้ได้จริง',
        cta: 'เปิด Walkthrough →',
      },
    },
    {
      id: 'tutorial', rail: null,
      done: function () { return json('c7:tutorial_completed') === true; },
      next: {
        href: 'core7/tutorial/', icon: '🎓',
        label: 'ก่อนลงสนาม',
        title: 'เรียนกติกา CORE7 ใน 1 นาที',
        desc: 'กติกามีอยู่ไม่กี่ข้อ รู้ครบแล้วค่อยลงเล่นจริง',
        cta: 'เริ่ม Tutorial →',
      },
    },
    {
      id: 'core7', rail: { icon: '🃏', th: 'เล่น 1 เกม' },
      done: function () { return matchesPlayed() > 0; },
      next: {
        href: 'core7/hand/?next=bot&level=easy&entry=forge', icon: '🃏',
        label: 'ลงสนามจริง',
        title: 'เล่น CORE7 กับบอท 1 เกม',
        desc: 'ไม่ต้องชนะ ขอแค่เล่นจนจบ — จบเกมแล้วบ้านจะเปิดห้องที่เหลือให้',
        cta: 'เลือกมือ 7 ใบ →',
      },
    },
    {
      id: 'hall', rail: { icon: '⚡', th: 'AI ใส่ซอส 6 บท' },
      done: function () { return learnCount() >= LESSONS.length; },
      next: function () {
        var i = Math.min(learnCount(), LESSONS.length - 1);
        var n = i + 1;
        return {
          href: 'classroom/' + LESSONS[i] + '.html', icon: '⚡',
          label: 'บทที่ ' + n,
          title: 'AI ใส่ซอส — บทที่ ' + n,
          desc: LESSON_TH[i] + ' · บทที่ ' + n + ' จาก ' + LESSONS.length,
          cta: 'เข้าห้องเรียน →',
        };
      },
    },
  ];

  /* ── ปลายทาง ──
     เดินครบทุกขั้นแล้วเข็มทิศไม่ได้ดับ มันหันไปทางด่านถัดไปของบ้าน
     ซึ่งไม่ใช่ห้องอีกห้อง แต่คือคนอื่นที่กำลังเดินอยู่เหมือนกัน

     เคยมีขั้นปลอมชื่อ stats คั่นอยู่ตรงนี้ ซึ่ง done() คืน false ตลอดกาล
     get() จึงไม่มีวันคืน done:true และหน้าจบของบ้านไม่มีวันได้โผล่เลย */
  var DONE_NEXT = {
    href: 'guild/', icon: '🏰',
    label: 'NEXT QUEST · GUILD X',
    title: 'เข้า Guild X แล้วหา Party ของคุณ',
    desc: 'Discord สำหรับแชร์สิ่งที่ทำ ถามคำถาม และเจอคนที่อยากเล่นหรือสร้างต่อไปด้วยกัน',
    cta: 'เข้าร่วม Guild X →',
  };

  var EPISODES = [
    'ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back',
    'ep4-what-traveled-without-us', 'ep5-from-answers-to-a-system',
    'ep6-the-starter-kit', 'ep7-a-voice-that-went-further',
  ];
  var LESSONS = ['free-ai', 'image-ai', 'clip-ai', 'notebooklm', 'prompts', 'first-web'];
  var LESSON_TH = ['AI ฟรีที่ควรมีติดเครื่อง', 'สร้างภาพด้วย AI', 'สร้างคลิปสั้นด้วย AI',
    'สร้าง Source ให้ AI', 'ออกแบบ Prompt ให้เป็นระบบ', 'สร้างเว็บชิ้นแรก'];

  /* ── อ่านค่าจากเครื่อง ──
     ทุกตัวกัน throw เพราะ localStorage โยน SecurityError ได้ในโหมดส่วนตัว
     และเข็มทิศพังทั้งหน้าเพราะเรื่องนี้ไม่คุ้มเลย */
  function raw(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : v; }
    catch (e) { return d; }
  }
  function flag(k) { return raw(k, '') === '1'; }
  function json(k) { try { return JSON.parse(raw(k, 'null')); } catch (e) { return null; } }
  function list(k) { return raw(k, '').split(',').filter(Boolean); }
  function readCount() {
    var a = list('mc_read');
    return EPISODES.filter(function (s) { return a.indexOf(s) >= 0; }).length;
  }
  function learned(slug) { return list('mc_learn').indexOf(slug) >= 0; }
  function learnCount() {
    var a = list('mc_learn');
    return LESSONS.filter(function (s) { return a.indexOf(s) >= 0; }).length;
  }
  /* เกมเก็บสถิติแยกตามโหมด — รวมทุกโหมดเพราะคำถามคือ "เคยเล่นจบไหม"
     ไม่ใช่ "ชนะไหม"

     ⚠️ คีย์คือ c7:stats_bot ขีดล่าง ไม่ใช่ c7:stats:bot — core7/js/store.js
     ต่อ namespace 'c7:' เข้ากับชื่อ 'stats_' + mode เอง เดาผิดทีคนเล่นจบแล้ว
     ค้างอยู่ตรงนั้นตลอดกาลโดยไม่มีอะไรบอกว่าค้างเพราะอะไร */
  function matchesPlayed() {
    var n = 0;
    ['bot', 'casual'].forEach(function (m) {
      var s = json('c7:stats_' + m);
      if (s && typeof s.matchesPlayed === 'number') n += s.matchesPlayed;
    });
    return n;
  }

  /* ── ขั้นปัจจุบัน ──
     ขั้นแรกที่ยัง done() ไม่จริง คือขั้นที่คนคนนี้ยืนอยู่
     ถ้าผ่านหมดทุกขั้น ให้ค้างที่ขั้นสุดท้าย ไม่ใช่หลุดออกนอกตาราง */
  function get() {
    for (var i = 0; i < STAGES.length; i++) {
      if (!STAGES[i].done()) return snapshot(i, false);
    }
    return snapshot(STAGES.length - 1, true);
  }
  function snapshot(i, all) {
    var s = STAGES[i];
    var n = all ? DONE_NEXT : (typeof s.next === 'function' ? s.next() : s.next);
    return {
      id: s.id, index: i, total: STAGES.length, done: all,
      next: n, read: readCount(), episodes: EPISODES.length,
      learn: learnCount(), lessons: LESSONS.length,
    };
  }
  function indexOf(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return i;
    return -1;
  }
  /* "ถึงขั้นนี้แล้วหรือยัง" — ถึง = ยืนอยู่ตรงนั้น หรือเดินเลยไปแล้ว */
  function reached(id) {
    var want = indexOf(id);
    return want >= 0 && get().index >= want;
  }

  /* ── เงื่อนไขที่ไม่ได้อยู่บนเส้นตรง ──
     บางห้องไม่ได้เปิดตามลำดับการเดิน แต่เปิดเพราะทำอย่างใดอย่างหนึ่งสำเร็จ
     ยัดพวกนี้เข้าไปเป็น "ขั้น" จะทำให้เข็มทิศชี้ไปหาของที่ไม่ควรถูกชี้ */
  var WHEN = {
    /* กระเป๋าเปิดตอนจบ Walkthrough แล้วอยู่ตลอดไป ไม่หายอีก */
    walk: function () { return flag('mc_walk_done'); },
    /* บทที่ 1 จบ = เปิด 4 ค่าสถานะ กับ Sub Quest พร้อมกัน โดยไม่ประกาศในเข็มทิศ */
    lesson1: function () { return learned('free-ai'); },
    /* First Version เป็นของท้ายเกมจริง ๆ เปิดหลังดู Secret Ending เท่านั้น */
    secret: function () { return flag('mc_secret_end'); },
  };

  /* ── เปิด/ปิดบล็อกตามขั้น ──
     ใช้ hidden แทน display:none เพราะมันเอา element ออกจาก accessibility tree
     ด้วย — ห้องที่ยังไม่เปิดต้องไม่โผล่ในลำดับ Tab หรือใน Screen Reader */
  function paint() {
    var here = get();
    /* ชื่อ attribute บน <html> ต้องคนละตัวกับที่ใช้ติดป้ายบล็อก ไม่งั้น
       querySelectorAll ด้านล่างจะเจอ <html> เองแล้วสั่ง hidden ทั้งหน้า */
    document.documentElement.setAttribute('data-mc-here', here.id);
    var nodes = document.querySelectorAll('[data-mc-stage]');
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].getAttribute('data-mc-stage');
      var neg = v.charAt(0) === '!';
      var want = indexOf(neg ? v.slice(1) : v);
      var ok = want >= 0 && here.index >= want;
      nodes[i].hidden = neg ? ok : !ok;
    }
    var whens = document.querySelectorAll('[data-mc-when]');
    for (var j = 0; j < whens.length; j++) {
      var w = whens[j].getAttribute('data-mc-when');
      var nw = w.charAt(0) === '!';
      var fn = WHEN[nw ? w.slice(1) : w];
      var got = typeof fn === 'function' && fn();
      whens[j].hidden = nw ? got : !got;
    }
  }

  /* ปลายทางในตารางเขียนแบบอิงราก (ไม่มีสแลชนำหน้า) เพื่อให้หน้าที่อยู่ราก
     ใช้ได้ตรง ๆ หน้าที่อยู่ลึกกว่านั้นเรียก href() เพื่อเติม / ให้ */
  function href(h) { return h.charAt(0) === '/' || /^https?:/.test(h) ? h : '/' + h; }

  /* เส้นทางแบบเส้นตรงสำหรับวาดราง — ขั้นสุดท้ายไม่มีอะไรให้ทำ จึงไม่อยู่บนราง */
  function rail() {
    var here = get();
    var out = [];
    for (var i = 0; i < STAGES.length; i++) {
      if (!STAGES[i].rail) continue;
      out.push({
        id: STAGES[i].id, icon: STAGES[i].rail.icon, th: STAGES[i].rail.th,
        done: here.index > i || here.done,
        current: here.index === i && !here.done,
      });
    }
    return out;
  }

  window.MC_STAGE = {
    STAGES: STAGES.map(function (s) { return s.id; }),
    rail: rail,
    EPISODES: EPISODES,
    get: get, reached: reached, paint: paint, href: href,
    when: function (k) { return typeof WHEN[k] === 'function' && WHEN[k](); },
    /* ปักธงว่าอ่าน/ทำขั้นนี้จบแล้ว — เรียกจากหน้าที่เป็นเจ้าของขั้นนั้น */
    mark: function (key) {
      try { localStorage.setItem(key, '1'); } catch (e) { /* โหมดส่วนตัว */ }
      paint();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint, { once: true });
  } else {
    paint();
  }
  /* กลับมาที่แท็บนี้หลังไปทำอะไรมาอีกแท็บ ต้องเห็นห้องที่เพิ่งปลดทันที */
  document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
  window.addEventListener('storage', paint);
})();
