import {
  getParty, importServerCardReward, isActiveParty, partyIdentity, refreshParty,
} from './store.js';

function toast(text) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = text;
  node.classList.add('on');
  setTimeout(() => node.classList.remove('on'), 3200);
}

function confirmDeadline(sentAt) {
  const date = new Date(sentAt || 0);
  if (!Number.isFinite(date.getTime())) return 0;
  const ict = new Date(date.getTime() + 7 * 60 * 60000);
  const year = ict.getUTCFullYear();
  const month = ict.getUTCMonth();
  const day = ict.getUTCDate();
  return Date.UTC(year, month, day + 2) - 7 * 60 * 60000;
}

function seenLabel(party, post) {
  if (!post.confirmedBy) return '';
  if (String(post.confirmedBy).startsWith('public:')) return '◎ ใครบางคนนอกสมุดเห็นแล้ว';
  const member = (party.memberHistory?.length ? party.memberHistory : party.members || [])
    .find(item => item.userId === post.confirmedBy);
  return `◎ ${member?.alias || 'เพื่อนในสมุด'} เห็นแล้ว`;
}

function trustPassMark() {
  const mark = document.createElement('span');
  mark.className = 'confirmed-mark';
  mark.textContent = '✓ ผ่านทันที · เชื่อใจกัน';
  return mark;
}

function trustSeenMark(text) {
  const mark = document.createElement('span');
  mark.className = 'confirmed-mark trust-seen-mark';
  mark.textContent = text;
  return mark;
}

async function trustSeenCommit(code, seq) {
  const identity = partyIdentity(code);
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (identity?.token) headers.authorization = `Bearer ${identity.token}`;
  try {
    const response = await fetch(`/api/teambook-trust-seen?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ seq }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && !result.error) result.error = `HTTP_${response.status}`;
    if (!result.error && result.myReward) importServerCardReward(result.myReward);
    return result;
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

function decorateTrustBook() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  const party = getParty(code);
  if (!party || party.verificationMode !== 'trust') return;

  const myId = partyIdentity(code)?.userId;
  const commits = (party.log || []).filter(post => post.kind === 'commit');
  const nodes = [...document.querySelectorAll('#log .post.commit')];
  const writable = isActiveParty(party) || String(party.state || '').toUpperCase() === 'COMPLETED';

  commits.forEach((post, index) => {
    const node = nodes[index];
    const slot = node?.querySelector('.confirm-slot');
    if (!slot || post.retracted) return;
    const signature = `${post.seq}|${post.confirmedBy || ''}|${myId || ''}`;
    if (slot.dataset.trustSeenSignature === signature) return;
    slot.dataset.trustSeenSignature = signature;
    slot.replaceChildren(trustPassMark());

    const alreadySeen = seenLabel(party, post);
    if (alreadySeen) {
      slot.appendChild(trustSeenMark(alreadySeen));
      return;
    }
    if (!writable || post.userId === myId || Date.now() >= confirmDeadline(post.sentAt)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'confirm-button trust-seen-button';
    button.textContent = '◎ เห็นแล้ว';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'กำลังบันทึกว่าเห็นแล้ว…';
      const result = await trustSeenCommit(code, post.seq);
      if (result.error) {
        if (result.error === 'ALREADY_CONFIRMED') {
          button.replaceWith(trustSeenMark('◎ มีคนเห็นแล้ว'));
          refreshParty(code).catch(() => {});
          return;
        }
        if (result.error === 'CONFIRM_WINDOW_CLOSED') {
          button.textContent = 'หมดเวลากดเห็นแล้ว';
          return;
        }
        button.disabled = false;
        button.textContent = '◎ เห็นแล้ว';
        console.warn('TeamBook trust Seen failed', result.error);
        toast('ยังเห็นแล้วไม่สำเร็จ');
        return;
      }
      button.replaceWith(trustSeenMark('◎ เห็นแล้ว ✓'));
      if (result.firstSeenReward?.rewardId && !result.firstSeenReward.revealedAt) {
        toast('เจอการ์ดแล้ว · เปิดได้จากเรื่องในสมุด');
      } else {
        toast('เห็นแล้ว ✓');
      }
      refreshParty(code).catch(() => {});
    });
    slot.appendChild(button);
  });
}

function softenTrustPublicCopy() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  const panel = document.getElementById('v13PublicSeenPanel');
  if (!panel) return;
  const meta = document.getElementById('meta');
  if (!String(meta?.textContent || '').includes('เชื่อใจกัน')) return;
  const title = panel.querySelector('h2');
  const body = panel.querySelector('.whisper');
  if (title) title.textContent = 'แวะเห็นสิ่งที่คนในสมุดทำได้';
  if (body) body.textContent = 'สมุดนี้ผ่านทันทีเมื่อลงชื่อ · แต่ “เห็นแล้ว” ยังส่งกลับเข้าไปในสมุดได้เหมือนเดิม';
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    decorateTrustBook();
    softenTrustPublicCopy();
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(schedule);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
    addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
