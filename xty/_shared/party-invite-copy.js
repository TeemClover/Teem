/* XTY party invite — deterministic clipboard copy.
   Product rule: Party sharing always stays inside XTY and gives the player
   two explicit clipboard choices:
   1) แชร์คำเชิญ = short ready-to-send invite with party context + join URL
   2) แชร์ลิงก์ = join URL only

   Never route through /xircle and never depend on navigator.share().
   This module runs only on /xty/p/ and captures the legacy #copy button
   before older handlers can do anything else. */

import { getParty } from './store.js';

const pageCode = new URLSearchParams(location.search).get('c') || '';

if (/^\d{5}$/.test(pageCode)) install();

function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 2800);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  /* Fallback for LINE / embedded iOS browsers where Clipboard API may be
     missing or denied even though a user gesture is active. */
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  area.style.top = '0';
  area.style.opacity = '0';
  area.style.fontSize = '16px';
  document.body.appendChild(area);
  area.focus({ preventScroll: true });
  area.select();
  area.setSelectionRange(0, area.value.length);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch {}
  area.remove();
  return copied;
}

function partySnapshot() {
  const party = getParty(pageCode) || {};
  const displayed = String(document.getElementById('code')?.textContent || '').trim();
  const code = /^\d{5}$/.test(displayed) ? displayed : pageCode;
  const name = String(party.name || document.getElementById('pname')?.textContent || 'XTY').trim() || 'XTY';
  const activity = String(party.activity || document.getElementById('act')?.textContent || 'ยังไม่ระบุกิจกรรม').trim() || 'ยังไม่ระบุกิจกรรม';
  const durationDays = Math.max(1, Number(party.durationDays || 7) || 7);
  const inviteUrl = `${location.origin}/xty/join/?c=${encodeURIComponent(code)}`;
  return { code, name, activity, durationDays, inviteUrl };
}

function inviteText(party) {
  return [
    'เข้าร่วมสมุดใน XTY',
    `สมุด: ${party.name}`,
    `ทำ: ${party.activity}`,
    `${party.durationDays} วัน · รหัส ${party.code}`,
    party.inviteUrl,
  ].join('\n');
}

function flashCopied(button, text) {
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => { if (button.isConnected) button.textContent = old; }, 1800);
}

async function copyFromButton(button, text, successToast, failureToast) {
  button.disabled = true;
  const copied = await copyText(text);
  button.disabled = false;
  if (copied) {
    flashCopied(button, 'คัดลอกแล้ว ✓');
    toast(successToast);
    return;
  }
  toast(failureToast);
}

function install() {
  const inviteButton = document.getElementById('copy');
  if (!inviteButton || inviteButton.dataset.xtyInviteCopy === '1') return;
  inviteButton.dataset.xtyInviteCopy = '1';
  inviteButton.textContent = 'แชร์คำเชิญ';

  /* Keep both actions beside the visible room code. The parent is already a
     wrapping flex row, so this remains safe on narrow mobile screens. */
  let linkButton = document.getElementById('copyLink');
  if (!linkButton) {
    linkButton = document.createElement('button');
    linkButton.id = 'copyLink';
    linkButton.type = 'button';
    linkButton.className = 'btn ghost sm';
    linkButton.textContent = 'แชร์ลิงก์';
    inviteButton.insertAdjacentElement('afterend', linkButton);
  }

  inviteButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const party = partySnapshot();
    await copyFromButton(
      inviteButton,
      inviteText(party),
      `คัดลอกคำเชิญแล้ว · รหัส ${party.code}`,
      `คัดลอกอัตโนมัติไม่ได้ · รหัสสมุด ${party.code}`,
    );
  }, true);

  linkButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const party = partySnapshot();
    await copyFromButton(
      linkButton,
      party.inviteUrl,
      'คัดลอกลิงก์เข้าร่วมสมุดแล้ว',
      `คัดลอกลิงก์อัตโนมัติไม่ได้ · รหัสสมุด ${party.code}`,
    );
  }, true);
}
