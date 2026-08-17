import { getParty, partyCompletionState } from './store.js';
import { syncPartyStarRewards } from './star-rewards.js';

const code = new URLSearchParams(location.search).get('c') || '';
if (/^\d{5}$/.test(code) && /^\/xty\/p\/?$/.test(location.pathname)) install();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}

function safeName(value) {
  return String(value || 'xty-party').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 50) || 'xty-party';
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
    return `- ${member.alias}: Commit ${own.length}${party.verificationMode === 'confirm' ? ` · Confirmed ${valid.length}` : ''}`;
  }).join('\n') || '- ยังไม่มีข้อมูลสมาชิก';
  const highlights = posts.slice(-8).map(post => {
    if (post.kind === 'reward') return `- CARD DROP · ${memberAlias(party, post.userId)} เปิดการ์ดในตี้`;
    if (post.kind === 'commit') return `- COMMIT · ${memberAlias(party, post.userId)} · ${String(post.body || '✓').replace(/\s+/g, ' ').slice(0, 120)}`;
    if (post.kind === 'message') return `- ${memberAlias(party, post.userId)}: ${String(post.body || '').replace(/\s+/g, ' ').slice(0, 140)}`;
    return '';
  }).filter(Boolean).join('\n') || '- สัปดาห์นี้ยังไม่มีบันทึกเด่น';
  return `# XTY Weekly Sauce · Week ${week}\n\n` +
    `- Party: ${party.name}\n- Code: ${party.code}\n- Activity: ${party.activity || '—'}\n` +
    `- Week: ${week} · Day ${(week - 1) * 7 + 1}–${week * 7}\n` +
    `- Verification: ${party.verificationMode === 'confirm' ? 'Confirm' : 'Trust'}\n\n` +
    `## สิ่งที่เกิดขึ้นในสัปดาห์นี้\n\n- Commit: ${commits.length}\n- Confirmed Commit: ${confirmed.length}\n- Message: ${messages.length}\n\n` +
    `## สมาชิก\n\n${byMember}\n\n## Highlights\n\n${highlights}\n\n` +
    `## สิ่งที่ควรทำต่อ\n\n- อะไรทำได้จริงและควรทำซ้ำ?\n- อะไรติดขัดและควรปรับให้ง่ายลง?\n- สัปดาห์หน้าจะรักษา 1 อย่างอะไรไว้?\n\n---\nXTY Weekly Sauce · generated from Party Log\n`;
}

function dissolveSauce(party) {
  const ended = new Date(party.endAt || party.endedAt || Date.now());
  const day = dayNumber(party, ended);
  const posts = party.log || [];
  const commits = posts.filter(post => post.kind === 'commit' && !post.retracted);
  const confirmed = commits.filter(post => party.verificationMode !== 'confirm' || post.confirmedBy);
  const messages = posts.filter(post => post.kind === 'message' && !post.retracted);
  return `# XTY · ซอสสลายตี้\n\n` +
    `> ตี้นี้จบก่อนกำหนด ไฟล์นี้เก็บสิ่งที่เกิดขึ้นตามจริง ไม่ถือว่า Quest Clear\n\n` +
    `- Party: ${party.name}\n- Code: ${party.code}\n- Activity: ${party.activity || '—'}\n- จบที่: Day ${day}\n` +
    `- Commit: ${commits.length}\n- Confirmed Commit: ${confirmed.length}\n- Message: ${messages.length}\n\n` +
    `## สิ่งที่เกิดขึ้นจริง\n\n${commits.slice(-12).map(post => `- ${memberAlias(party, post.userId)} · ${String(post.body || '✓').replace(/\s+/g, ' ').slice(0, 140)}`).join('\n') || '- ยังไม่มี Commit'}\n\n` +
    `## ก่อนวางตี้นี้ลง\n\n- อะไรทำให้ตี้ไปต่อยาก?\n- มีอะไรที่ยังคุ้มจะเก็บไว้ทำต่อคนเดียวหรือตี้ใหม่?\n- ถ้าเริ่มใหม่ จะทำให้เล็กลงตรงไหน?\n\n---\nXTY · Dissolved Party Sauce\n`;
}

function installStyle() {
  if (document.getElementById('xtyRewardLoopStyle')) return;
  const style = document.createElement('style');
  style.id = 'xtyRewardLoopStyle';
  style.textContent = `
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
  const progress = document.getElementById('progress');
  if (!progress) return;
  const starPanel = document.createElement('div');
  starPanel.className = 'xty-reward-loop'; starPanel.id = 'xtyStarLoop';
  progress.insertAdjacentElement('afterend', starPanel);
  const saucePanel = document.createElement('div');
  saucePanel.className = 'xty-reward-loop'; saucePanel.id = 'xtySauceLoop';
  starPanel.insertAdjacentElement('afterend', saucePanel);

  const backupKey = `xty_dissolve_backup_${code}`;
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
      starPanel.innerHTML = `<div class="loop-head"><div><span class="label">CARD DROP</span><h3>ตี้นี้ใช้โหมดเชื่อใจกัน</h3></div></div><p>โหมดนี้ไม่สะสมดาว · ตี้ที่เลือก “ต้อง Confirm” จะได้ ⭐ 1 ดวงต่อ Confirmed Commit และครบ ⭐⭐⭐ รับการ์ด 1 ใบ</p>`;
      return;
    }
    starPanel.innerHTML = `<p>กำลังนับดาวจาก Confirmed Commit…</p>`;
    const state = await syncPartyStarRewards(code);
    if (state.error) { starPanel.innerHTML = `<span class="label">CARD DROP</span><p>ยังดึงดาวไม่ได้ · ลองกด ↻ ดึงอัปเดตอีกครั้ง</p>`; return; }
    const rows = (state.members || []).map(member => {
      const stars = [0,1,2].map(i => `<span class="${i < member.stars ? '' : 'off'}">★</span>`).join('');
      const drops = member.dropCount ? `<span class="xty-drop">${member.dropCount} CARD DROP${member.pendingDrops ? ` · ${member.pendingDrops} รอเปิด` : ''}</span>` : '';
      return `<div class="xty-star-row"><div><b>${esc(member.alias)}</b>${drops ? `<br>${drops}` : ''}</div><div class="xty-stars">${stars}</div></div>`;
    }).join('');
    const pending = (state.myRewards || []).filter(reward => !reward.revealedAt && !reward.complete && reward.cardId);
    starPanel.innerHTML = `<div class="loop-head"><div><span class="label">CONFIRMED COMMIT → CARD DROP</span><h3>ครบ ⭐⭐⭐ ได้การ์ด 1 ใบ</h3></div></div>` +
      `<p>นับแยกในตี้นี้เท่านั้น · ไม่ข้ามตี้ · Commit ที่ไม่มี Confirm ไม่นับดาว</p>${rows}` +
      (pending.length ? `<div class="xty-loop-actions">${pending.map(reward => `<a class="btn gold sm" href="/xty/reveal/?r=${encodeURIComponent(reward.rewardId)}">เปิด Card Drop #${reward.milestone}</a>`).join('')}</div>` : '');
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
        saucePanel.innerHTML = `<span class="label">PARTY SAUCE</span><h3>ตี้สลายก่อน Day 3</h3><p>ยังไม่มีซอสให้ · เก็บเป็นประวัติตี้สลายอย่างเดียว</p>`;
        return;
      }
      saucePanel.innerHTML = `<span class="label">DISSOLVED PARTY SAUCE</span><h3>ซอสสลายตี้ · Day ${dissolveDay}</h3><p>เก็บสิ่งที่เกิดขึ้นตามจริง โดยไม่เรียกว่า Quest Clear</p><div class="xty-loop-actions"><button class="btn gold sm" id="downloadDissolveSauce">ดาวน์โหลดซอสสลายตี้ .md</button></div>`;
      document.getElementById('downloadDissolveSauce')?.addEventListener('click', () => downloadMarkdown(`XTY-Sauce-Dissolved-${safeName(party.name)}.md`, dissolveSauce(party)));
      return;
    }

    if (existingEnding) {
      existingEnding.hidden = false;
      existingEnding.textContent = state === 'COMPLETED' ? 'ดาวน์โหลด Final Sauce .md' : 'ดาวน์โหลด Ending .md';
    }
    const weekButtons = weekly.map(week => `<button class="btn ghost sm" data-week-sauce="${week}">Week ${week} Sauce .md</button>`).join('');
    saucePanel.innerHTML = `<span class="label">PARTY SAUCE</span><h3>${duration > 7 ? 'ทุก 7 วันมีซอสประจำสัปดาห์' : 'จบ Quest แล้วรับ Final Sauce'}</h3>` +
      `<p>${duration > 7 ? `ปลดแล้ว ${weekly.length}/${Math.floor(duration / 7)} สัปดาห์ · ตอนจบยังมี Final Sauce อีกไฟล์` : `${duration} วัน · ซอสตอนจบเก็บเรื่องที่เกิดขึ้นจริงในตี้`}</p>` +
      (weekButtons ? `<div class="xty-sauce-list">${weekButtons}</div>` : `<p>${completion.day < duration ? 'ยังเดินทางอยู่ · ทำต่อแล้วกลับมาเก็บซอสตอนจบ' : 'ถึงช่วงจบ Quest แล้ว'}</p>`);
    saucePanel.querySelectorAll('[data-week-sauce]').forEach(button => button.addEventListener('click', () => {
      const week = Number(button.dataset.weekSauce);
      downloadMarkdown(`XTY-Weekly-Sauce-W${week}-${safeName(party.name)}.md`, weeklySauce(party, week));
    }));
  }

  syncStars(); syncSauce();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncStars(); syncSauce(); } });
  setInterval(syncSauce, 4000);
}
