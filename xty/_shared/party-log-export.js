import { getParty, refreshParty } from './store.js';
import { PET_BY_ID } from './pets.js';

const PARTY_PATH = /^\/xty\/p(?:\/|$)/;

function ictStamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value || 'ไม่ระบุเวลา');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ICT`;
}

function memberNameMap(party) {
  return new Map((party.members || []).map(member => [member.userId, member.alias || member.userId]));
}

function reactionText(reactions, names) {
  return Object.entries(reactions || {}).map(([emoji, userIds]) => {
    const ids = Array.isArray(userIds) ? userIds : [];
    const who = ids.map(id => names.get(id) || id).join(', ');
    return `${emoji} ${ids.length}${who ? ` [${who}]` : ''}`;
  }).join(' | ');
}

function indentBody(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').split('\n').map(line => `  ${line}`).join('\n');
}

function buildPartyLogText(party) {
  const names = memberNameMap(party);
  const log = Array.isArray(party.log) ? [...party.log] : [];
  log.sort((a, b) => {
    const aSeq = Number(a.seq);
    const bSeq = Number(b.seq);
    if (Number.isFinite(aSeq) && Number.isFinite(bSeq) && aSeq !== bSeq) return aSeq - bSeq;
    return new Date(a.sentAt || 0) - new Date(b.sentAt || 0);
  });

  const lines = [
    'TEAMBOOK · เรื่องในสมุด',
    '========================',
    `สมุด: ${party.name || '-'}`,
    `รหัสสมุด: ${party.code || '-'}`,
    `Activity: ${party.activity || '-'}`,
    `State: ${party.state || '-'}`,
    `กติกาการลงชื่อ: ${party.commitRule || '-'}`,
    `Verification: ${party.verificationMode || '-'}`,
    `Duration: ${party.durationDays || '-'} days`,
    `Exported: ${ictStamp(new Date())}`,
    `Entries: ${log.length}`,
    '',
    'คนในสมุด',
    '--------',
  ];

  (party.members || []).forEach(member => {
    lines.push(`- ${member.alias || '-'} | role=${member.role || 'member'} | userId=${member.userId || '-'}`);
  });
  if (!(party.members || []).length) lines.push('- ไม่มีข้อมูลคนในสมุด');

  const currentPet = party.petId ? PET_BY_ID[party.petId] : null;
  lines.push('');
  lines.push('เพื่อนร่วมทางของสมุด');
  lines.push('--------------------');
  if (party.npcCardId) lines.push(`NPC card: ${party.npcCardId}`);
  else if (party.petId) lines.push(`Pet: ${currentPet?.nameTh || party.petId} | petId=${party.petId}`);
  else lines.push('ไม่มีเพื่อนร่วมทาง');

  lines.push('');
  lines.push('เรื่องในสมุด');
  lines.push('------------');

  if (!log.length) {
    lines.push('(ยังไม่มีเรื่องในสมุด)');
    return lines.join('\n') + '\n';
  }

  log.forEach(post => {
    const kind = String(post.kind || 'message').toUpperCase();
    const pet = post.kind === 'pet' && post.petId ? PET_BY_ID[post.petId] : null;
    const speaker = pet?.nameTh || post.alias || names.get(post.userId) || post.userId || 'ไม่ระบุชื่อ';
    const seq = post.seq ?? '-';
    lines.push(`[SEQ ${seq}] ${ictStamp(post.sentAt)} | ${kind} | ${speaker}`);
    if (post.userId) lines.push(`userId: ${post.userId}`);
    if (post.petId) lines.push(`petId: ${post.petId}`);
    if (post.retracted) {
      lines.push('retracted: yes');
      lines.push('message:');
      lines.push('  [ข้อความถูกถอนโดยเจ้าของ]');
    } else {
      lines.push('message:');
      lines.push(indentBody(post.body));
    }

    if (post.kind === 'commit') {
      if (party.verificationMode === 'confirm') {
        lines.push(post.confirmedBy
          ? `confirmedBy: ${names.get(post.confirmedBy) || post.confirmedBy} (${post.confirmedBy})`
          : 'confirmedBy: -');
      } else {
        lines.push('confirmedBy: auto / trust mode');
      }
    }

    const reactions = reactionText(post.reactions, names);
    if (reactions) lines.push(`reactions: ${reactions}`);
    lines.push('');
  });

  return lines.join('\n') + '\n';
}

function safeFilename(value) {
  return String(value || 'party')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 60) || 'party';
}

function downloadText(party) {
  const text = buildPartyLogText(party);
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `XTY-${safeFilename(party.name)}-${safeFilename(party.code)}-party-log.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function installPartyLogExport() {
  if (typeof document === 'undefined' || !PARTY_PATH.test(location.pathname)) return;
  if (document.getElementById('exportPartyLog')) return;

  const dissolve = document.getElementById('dissolveParty');
  if (!dissolve) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'exportPartyLog';
  button.className = 'btn ghost';
  button.textContent = '⬇ ดาวน์โหลดเรื่องในสมุด (.txt)';
  button.style.width = '100%';
  button.style.marginBottom = '10px';
  dissolve.insertAdjacentElement('beforebegin', button);

  button.addEventListener('click', async () => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'กำลังรวมเรื่องในสมุด…';
    try {
      const code = new URLSearchParams(location.search).get('c');
      if (!code) throw new Error('NO_PARTY_CODE');
      const fresh = await refreshParty(code);
      const party = fresh?.party || getParty(code);
      if (!party) throw new Error(fresh?.error || 'PARTY_NOT_FOUND');
      downloadText(party);
      button.textContent = '✓ ดาวน์โหลดเรื่องในสมุดแล้ว';
    } catch (error) {
      console.warn('XTY Party Log export failed', error);
      button.textContent = 'ยังดาวน์โหลดเรื่องในสมุดไม่ได้';
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
      }, 1600);
    }
  });
}

installPartyLogExport();

export { buildPartyLogText };
