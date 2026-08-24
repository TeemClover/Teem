/* Public Seen labels and solo-book copy for the member-only book route. */
import { getParty, partyIdentity } from './store.js';

function decorate() {
  const code = new URLSearchParams(location.search).get('c') || '';
  const party = /^\d{5}$/.test(code) ? getParty(code) : null;
  const log = document.getElementById('log');
  if (!party || !log) return;

  const commits = (party.log || []).filter(post => post.kind === 'commit' && !post.retracted);
  const nodes = [...log.querySelectorAll('.post.commit')];
  commits.forEach((post, index) => {
    if (!String(post.confirmedBy || '').startsWith('public:')) return;
    const mark = nodes[index]?.querySelector('.confirmed-mark');
    if (mark) mark.textContent = '◎ ใครบางคนนอกสมุดเห็นแล้ว';
  });

  const myId = partyIdentity(code)?.userId;
  const myPublicSeen = commits.some(post => post.userId === myId && String(post.confirmedBy || '').startsWith('public:'));
  const title = document.querySelector('.tb-seen-welcome #tbSeenWelcomeTitle');
  if (myPublicSeen && title) title.textContent = 'ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว';

  const seats = document.getElementById('seats');
  const activeMembers = (party.members || []).filter(member => !member.leftAt);
  const solo = activeMembers.length === 1;
  seats?.classList.toggle('tb15-solo-book', solo);
  if (solo) {
    const hint = document.getElementById('seatHint');
    if (hint) hint.textContent = 'สมุดเล่มนี้สมบูรณ์แล้วด้วยคนเดียว · ถ้ามีใครอยากเข้ามาเขียนด้วย ค่อยเปิดที่ว่างให้เขา';
  }
}

if (/^\/p\/?$/.test(location.pathname)) {
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; decorate(); });
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  schedule();
}
