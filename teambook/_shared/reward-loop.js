import { getParty, partyCompletionState } from './store.js';
import { syncPartyStarRewards } from './star-rewards.js';

const code = new URLSearchParams(location.search).get('c') || '';
if (/^\d{5}$/.test(code) && /^\/p\/?$/.test(location.pathname)) install();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}

function safeName(value) {
  return String(value || 'teambook-book').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 50) || 'teambook-book';
}

function downloadMarkdown(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dayNumber(party, at = new Date()) {
  const start = new Date(party?.startAt || party?.createdAt || at);
  const current = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(current.getTime())) return 1;
  const ict = date => {
    const shifted = new Date(date.getTime() + 7 * 3600000);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  };
  return Math.max(1, Math.floor((ict(current) - ict(start)) / 86400000) + 1);
}

function memberAlias(party, userId) {
  return (party?.memberHistory?.length ? party.memberHistory : party?.members || []).find(m => m.userId === userId)?.alias || 'สมาชิก';
}

function weeklySauce(party, week) {
  const start = new Date(party.startAt || party.createdAt);
  const from = new Date(start.getTime() + (week - 1) * 7 * 86400000);
  const to = new Date(start.getTime() + week * 7 * 86400000);
  const posts = (party.log || []).filter(post => {
    const at = new Date(post.sentAt).getTime();
    return at >= from.getTime() && at < to.getTime();
  });
  const commits = posts.filter(post => post.kind === 'commit' && !post.retracted);
  const confirmed = commits.filter(post => party.verificationMode !== 'confirm' || post.confirmedBy);
  const messages = posts.filter(post => post.kind === 'message' && !post.retracted);
  const members = party.memberHistory?.length ? party.memberHistory : party.members || [];
  const byMember = members.map(member => {
    const own = commits.filter(post => post.userId === member.userId);
    const valid = confirmed.filter(post => post.userId === member.userId);
    return `- ${member.alias}: ลงชื่อ ${own.length}${party.verificationMode === 'confirm' ? ` · มีคนเห็นแล้ว ${valid.length}` : ''}`;
  }).join('\n') || '- ยังไม่มีข้อมูลสมาชิก';
  const highlights = posts.slice(-8).map(post => {
    if (post.kind === 'reward') return post.rewardSource === 'first_seen'
      ? `- รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`
      : `- เปิดการ์ด · ${memberAlias(party, post.userId)} เปิดการ์ดในสมุด`;
    if (post.kind === 'commit') return `- ลงชื่อ · ${memberAlias(party, post.userId)} · ${String(post.body || '✓').replace(/\s+/g, ' ').slice(0, 120)}`;
    if (post.kind === 'message') return `- ${memberAlias(party, post.userId)}: ${String(post.body || '').replace(/\s+/g, ' ').slice(0, 140)}`;
    return '';
  }).filter(Boolean).join('\n') || '- สัปดาห์นี้ยังไม่มีบันทึกเด่น';
  return `# TeamBook · ซอสประจำสัปดาห์ · สัปดาห์ที่ ${week}\n\n` +
    `- สมุด: ${party.name}\n- รหัสสมุด: ${party.code}\n- กิจกรรม: ${party.activity || '—'}\n` +
    `- Week: ${week} · Day ${(week - 1) * 7 + 1}–${week * 7}\n` +
    `- Verification: ${party.verificationMode === 'confirm' ? 'Confirm' : 'Trust'}\n\n` +
    `## สิ่งที่เกิดขึ้นในสัปดาห์นี้\n\n- ลงชื่อ: ${commits.length}\n- ลงชื่อและมีคนเห็นแล้ว: ${confirmed.length}\n- Message: ${messages.length}\n\n` +
    `## สมาชิก\n\n${byMember}\n\n## Highlights\n\n${highlights}\n\n` +
    `## สิ่งที่ควรทำต่อ\n\n- อะไรทำได้จริงและควรทำซ้ำ?\n- อะไรติดขัดและควรปรับให้ง่ายลง?\n- สัปดาห์หน้าจะรักษา 1 อย่างอะไรไว้?\n\n---\nTeamBook · ซอสประจำสัปดาห์ · สร้างจากเรื่องในสมุด\n`;
}

function dissolveSauce(party) {
  const ended = new Date(party.endAt || party.endedAt || Date.now());
  const day = dayNumber(party, ended);
  const posts = party.log || [];
  const commits = posts.filter(post => post.kind === 'commit' && !post.retracted);
  const confirmed = commits.filter(post => party.verificationMode !== 'confirm' || post.confirmedBy);
  const messages = posts.filter(post => post.kind === 'message' && !post.retracted);
  return `# TeamBook · ซอสตอนปิดสมุดก่อนจบ\n\n` +
    `> สมุดนี้จบก่อนกำหนด ไฟล์นี้เก็บสิ่งที่เกิดขึ้นตามจริง ไม่ถือว่าปิดเล่มสำเร็จ\n\n` +
    `- สมุด: ${party.name}\n- รหัสสมุด: ${party.code}\n- กิจกรรม: ${party.activity || '—'}\n- จบที่: วันที่ ${day}\n` +
    `- ลงชื่อ: ${commits.length}\n- ลงชื่อและมีคนเห็นแล้ว: ${confirmed.length}\n- Message: ${messages.length}\n\n` +
    `## สิ่งที่เกิดขึ้นจริง\n\n${commits.slice(-12).map(post => `- ${memberAlias(party, post.userId)} · ${String(post.body || '✓').replace(/\s+/g, ' ').slice(0, 140)}`).join('\n') || '- ยังไม่มีการลงชื่อ'}\n\n` +
    `## ก่อนวางสมุดนี้ลง\n\n- อะไรทำให้สมุดไปต่อยาก?\n- มีอะไรที่ยังคุ้มจะเก็บไว้ทำต่อคนเดียวหรือสมุดใหม่?\n- ถ้าเริ่มใหม่ จะทำให้เล็กลงตรงไหน?\n\n---\nTeamBook · ซอสตอนปิดสมุดก่อนจบ\n`;
}

function installStyle() {
  if (document.getElementById('xtyRewardLoopStyle')) return;
  const style = document.createElement('style');
  style.id = 'xtyRewardLoopStyle';
  style.textContent = `
    /* Folded shut by default: rewards are a thing you check, not a thing
       you read past every day. The summary alone answers "how many stars
       do I have", so most visits never need to open it. */
    .xty-reward-shell{margin-top:18px;border:1px solid var(--xty-border);border-radius:var(--r-lg,18px);background:rgba(255,255,255,.72);overflow:hidden}
    .xty-reward-shell>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:15px 16px;font-weight:800;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .xty-reward-shell>summary::-webkit-details-marker{display:none}
    .xty-reward-shell>summary::after{content:'⌄';flex:none;margin-left:auto;font-size:18px;line-height:1;transition:transform .18s ease}
    .xty-reward-shell:not([open])>summary::after{transform:rotate(-90deg)}
    .xty-reward-peek{margin-left:auto;color:var(--xty-muted);font-size:12.5px;font-weight:700;letter-spacing:1px;white-space:nowrap}
    .xty-reward-shell>summary::after{margin-left:10px}
    .xty-reward-shell .xty-reward-loop{margin:0 14px 14px}
    .xty-reward-shell .xty-reward-loop:first-of-type{margin-top:2px}
    .xty-reward-aside{border-left:3px solid var(--xty-blue,#5B8DFF);padding-left:10px}
    .xty-reward-loop{margin-top:18px;padding:16px;border:1px dashed rgba(166,116,45,.35);border-radius:18px;background:rgba(255,250,235,.68)}
    .xty-reward-loop .loop-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
    .xty-reward-loop h3{margin:2px 0 0;font-size:18px}.xty-reward-loop p{margin:5px 0;color:var(--xty-muted);font-size:13px;line-height:1.55}
    .xty-star-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid rgba(80,60,35,.09)}
    .xty-star-row:first-of-type{border-top:0}.xty-stars{font-size:19px;letter-spacing:2px;white-space:nowrap}.xty-stars .off{opacity:.25}
    .xty-drop{font-size:12px;color:var(--gold-soft);font-weight:800}.xty-loop-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .xty-loop-actions .btn{width:auto;min-height:38px;padding:0 13px;font-size:12px}.xty-sauce-list{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    @media(max-width:560px){.xty-star-row{align-items:flex-start}.xty-reward-loop{padding:14px}.xty-stars{font-size:17px}}
  `;
  document.head.appendChild(style);
}

function install() {
  installStyle();
  /* These used to sit directly under the daily progress grid, which put
     two blocks of reward bookkeeping between the player and their own
     Party Log. Rewards are something you check, not something you read
     every day, so they now live at the foot of the page, folded away,
     next to the Quest Ending they belong to. */
  const anchor = document.getElementById('questFinishPanel')
    || document.getElementById('progress');
  if (!anchor) return;

  const shell = document.createElement('details');
  shell.className = 'xty-reward-shell'; shell.id = 'xtyRewardShell';
  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="label">รางวัลของเล่มนี้</span>'
    + '<span class="xty-reward-peek" id="xtyRewardPeek">กำลังเช็ก…</span>';
  shell.appendChild(summary);

  const starPanel = document.createElement('div');
  starPanel.className = 'xty-reward-loop'; starPanel.id = 'xtyStarLoop';
  const saucePanel = document.createElement('div');
  saucePanel.className = 'xty-reward-loop'; saucePanel.id = 'xtySauceLoop';
  shell.append(starPanel, saucePanel);
  anchor.insertAdjacentElement('afterend', shell);

  /* The summary carries the live star count so the common question —
     "how close am I to a card?" — is answered without opening anything. */
  function setPeek(text) {
    const peek = document.getElementById('xtyRewardPeek');
    if (peek) peek.textContent = text;
  }

  const backupKey = `teambook_dissolve_backup_${code}`;
  document.addEventListener('click', event => {
    if (event.target.closest('#dissolveParty')) {
      const party = getParty(code);
      if (party) { try { localStorage.setItem(backupKey, JSON.stringify(party)); } catch {} }
    }
    if (event.target.closest('.confirm-button')) setTimeout(syncStars, 1200);
    if (event.target.closest('#refresh')) setTimeout(syncStars, 1000);
  }, true);

  async function syncStars() {
    const party = getParty(code);
    if (!party) return;
    if (party.verificationMode !== 'confirm') {
      setPeek('โหมดเชื่อใจ · ไม่มีดาว');
      starPanel.innerHTML = '<div class="loop-head"><div><span class="label">เปิดการ์ด</span>'
        + '<h3>สมุดนี้เชื่อใจกัน ไม่ต้องเก็บดาว</h3></div></div>'
        + '<p>การลงชื่อของทุกคนผ่านทันที ไม่มีใครต้องรอใครยืนยัน</p>'
        + '<p class="xty-reward-aside">อยากได้การ์ดไว้สะสม สมุดหน้าลองเลือกโหมด “ต้องมีคนเห็นแล้ว” ดู — '
        + 'เพื่อนกดเห็นแล้วให้ 1 ครั้งได้ ⭐ 1 ดวง ครบ 3 ดวงรับการ์ด 1 ใบ</p>';
      return;
    }
    setPeek('กำลังนับดาว…');
    starPanel.innerHTML = `<p>กำลังนับดาวจากการลงชื่อที่มีคนเห็นแล้ว…</p>`;
    const state = await syncPartyStarRewards(code);
    if (state.error) {
      setPeek('ดึงดาวไม่ได้');
      starPanel.innerHTML = `<span class="label">เปิดการ์ด</span><p>ยังดึงดาวไม่ได้ · ลองกด ↻ ดึงอัปเดตอีกครั้ง</p>`;
      return;
    }
    const rows = (state.members || []).map(member => {
      const stars = [0,1,2].map(i => `<span class="${i < member.stars ? '' : 'off'}">★</span>`).join('');
      const drops = member.dropCount ? `<span class="xty-drop">${member.dropCount} การ์ด${member.pendingDrops ? ` · ${member.pendingDrops} รอเปิด` : ''}</span>` : '';
      return `<div class="xty-star-row"><div><b>${esc(member.alias)}</b>${drops ? `<br>${drops}` : ''}</div><div class="xty-stars">${stars}</div></div>`;
    }).join('');
    const pending = (state.myRewards || []).filter(reward => !reward.revealedAt && !reward.complete && reward.cardId);

    /* Speak to the reader about their own progress, not the scoring rules. */
    const me = state.meUserId
      ? (state.members || []).find(member => member.userId === state.meUserId)
      : null;
    /* The server sends confirmedCount % 3, so this is progress toward the
       NEXT card and never reaches 3 — hitting three issues a drop and the
       count rolls back to zero. Cards already earned live in dropCount. */
    const myStars = Math.max(0, Math.min(2, Number(me?.stars || 0)));
    const myDrops = Math.max(0, Number(me?.dropCount || 0));
    const left = 3 - myStars;
    const dial = `${'★'.repeat(myStars)}${'☆'.repeat(3 - myStars)}`;
    setPeek(pending.length ? `${dial} · มีการ์ดรอเปิด` : `${dial} · อีก ${left} ดวง`);

    const headline = pending.length ? 'มีการ์ดรอคุณเปิดอยู่'
      : (myDrops ? `ได้การ์ดไปแล้ว ${myDrops} ใบ · อีก ${left} ดวงได้อีกใบ`
        : (myStars === 0 ? 'ให้เพื่อนกดเห็นแล้ว 3 ครั้ง ได้การ์ด 1 ใบ' : `อีก ${left} ดวงได้การ์ด 1 ใบ`));
    starPanel.innerHTML = `<div class="loop-head"><div><span class="label">ลงชื่อแล้วมีคนเห็น → ได้การ์ด</span>`
      + `<h3>${headline}</h3></div></div>`
      + `<p>การลงชื่อที่มีเพื่อนกดเห็นแล้วได้ ⭐ 1 ดวง · ดาวนับเฉพาะในสมุดนี้ ไม่ยกไปสมุดอื่น</p>${rows}`
      + (pending.length ? `<div class="xty-loop-actions">${pending.map(reward => `<a class="btn gold sm" href="/reveal/?r=${encodeURIComponent(reward.rewardId)}">เปิด เปิดการ์ด #${reward.milestone}</a>`).join('')}</div>` : '');
  }

  function syncSauce() {
    let party = getParty(code);
    if (!party) return;
    let backup = null;
    try { backup = JSON.parse(localStorage.getItem(backupKey) || 'null'); } catch {}
    if (String(party.state || '').toUpperCase() === 'DISSOLVED' && backup) party = { ...backup, state: 'DISSOLVED', endAt: party.endAt || party.endedAt || new Date().toISOString() };
    const state = String(party.state || '').toUpperCase();
    const duration = Number(party.durationDays || 7);
    const now = state === 'DISSOLVED' ? new Date(party.endAt || Date.now()) : new Date();
    const completion = partyCompletionState(party, now);
    const start = new Date(party.startAt || party.createdAt || Date.now());
    const elapsedMs = Math.max(0, now.getTime() - start.getTime());
    const fullWeeks = Math.min(Math.floor(duration / 7), Math.floor(elapsedMs / (7 * 86400000)));
    const weekly = duration > 7 ? Array.from({ length: fullWeeks }, (_, i) => i + 1) : [];
    const dissolveDay = dayNumber(party, now);

    const existingEnding = document.getElementById('downloadEnding');
    if (state === 'DISSOLVED') {
      if (existingEnding) existingEnding.hidden = true;
      if (dissolveDay < 3) {
        saucePanel.innerHTML = `<span class="label">PARTY SAUCE</span><h3>สมุดสลายก่อน Day 3</h3><p>ยังไม่มีซอสให้ · เก็บเป็นประวัติสมุดสลายอย่างเดียว</p>`;
        return;
      }
      saucePanel.innerHTML = `<span class="label">ซอสตอนปิดสมุดก่อนจบ</span><h3>ซอสสลายสมุด · Day ${dissolveDay}</h3><p>เก็บสิ่งที่เกิดขึ้นตามจริง โดยไม่เรียกว่าปิดเล่มสำเร็จ</p><div class="xty-loop-actions"><button class="btn gold sm" id="downloadDissolveSauce">ดาวน์โหลดซอสสลายสมุด .md</button></div>`;
      document.getElementById('downloadDissolveSauce')?.addEventListener('click', () => downloadMarkdown(`TeamBook-Sauce-Dissolved-${safeName(party.name)}.md`, dissolveSauce(party)));
      return;
    }

    if (existingEnding) {
      existingEnding.hidden = false;
      existingEnding.textContent = state === 'COMPLETED' ? 'ดาวน์โหลด Final Sauce .md' : 'ดาวน์โหลด Ending .md';
    }
    const weekButtons = weekly.map(week => `<button class="btn ghost sm" data-week-sauce="${week}">Week ${week} Sauce .md</button>`).join('');
    saucePanel.innerHTML = `<span class="label">PARTY SAUCE</span><h3>${duration > 7 ? 'ทุก 7 วันมีซอสประจำสัปดาห์' : 'ปิดเล่มแล้วรับซอสสุดท้าย'}</h3>` +
      `<p>${duration > 7 ? `ปลดแล้ว ${weekly.length}/${Math.floor(duration / 7)} สัปดาห์ · ตอนจบยังมี Final Sauce อีกไฟล์` : `${duration} วัน · ซอสตอนจบเก็บเรื่องที่เกิดขึ้นจริงในสมุด`}</p>` +
      (weekButtons ? `<div class="xty-sauce-list">${weekButtons}</div>` : `<p>${completion.day < duration ? 'ยังเดินทางอยู่ · ทำต่อแล้วกลับมาเก็บซอสตอนจบ' : 'ถึงช่วงปิดเล่มแล้ว'}</p>`);
    saucePanel.querySelectorAll('[data-week-sauce]').forEach(button => button.addEventListener('click', () => {
      const week = Number(button.dataset.weekSauce);
      downloadMarkdown(`TeamBook-Weekly-Sauce-W${week}-${safeName(party.name)}.md`, weeklySauce(party, week));
    }));
  }

  syncStars(); syncSauce();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncStars(); syncSauce(); } });
  setInterval(syncSauce, 4000);
}
