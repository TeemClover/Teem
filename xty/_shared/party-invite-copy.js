/* XTY party invite — deterministic clipboard copy.
   The Party page used to prefer navigator.share(), which means a tap on iOS
   may open/abort a native share flow without ever putting the invite on the
   clipboard. Product rule: the invite button must ALWAYS give the player a
   pasteable XTY invite containing the 5-digit room code and /xty/join URL.

   This module runs only on /xty/p/ and captures the button before legacy or
   contextual handlers can redirect it elsewhere. */

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

function install() {
  const button = document.getElementById('copy');
  if (!button || button.dataset.xtyInviteCopy === '1') return;
  button.dataset.xtyInviteCopy = '1';

  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const displayed = String(document.getElementById('code')?.textContent || '').trim();
    const code = /^\d{5}$/.test(displayed) ? displayed : pageCode;
    const partyName = String(document.getElementById('pname')?.textContent || 'XTY').trim() || 'XTY';
    const inviteUrl = `${location.origin}/xty/join/?c=${encodeURIComponent(code)}`;
    const inviteText = `เข้าตี้ ${partyName}\nรหัสตี้ ${code}\n${inviteUrl}`;

    button.disabled = true;
    const copied = await copyText(inviteText);
    button.disabled = false;

    if (copied) {
      const old = button.textContent;
      button.textContent = 'คัดลอกแล้ว ✓';
      toast(`คัดลอกคำเชิญแล้ว · รหัส ${code}`);
      setTimeout(() => { if (button.isConnected) button.textContent = old; }, 1800);
      return;
    }

    /* Never hide the room code if clipboard permissions are unavailable. */
    toast(`คัดลอกอัตโนมัติไม่ได้ · รหัสตี้ ${code}`);
  }, true);
}
