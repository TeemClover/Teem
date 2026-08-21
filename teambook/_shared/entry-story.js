const mobileStyle = document.createElement('link');
mobileStyle.rel = 'stylesheet';
mobileStyle.href = '/_shared/entry-mobile.css?v=20260822-mobile1';
mobileStyle.media = '(max-width: 680px)';
document.head.append(mobileStyle);

const params = new URLSearchParams(location.search);
const rawCode = params.get('c') || '';
const inviteCode = /^\d{5}$/.test(rawCode) ? rawCode : '';

let hasLocalProfile = false;
try { hasLocalProfile = !!localStorage.getItem('teambook_profile_v1'); } catch {}

document.querySelectorAll('[data-keep-invite]').forEach(link => {
  if (!inviteCode) return;
  const url = new URL(link.getAttribute('href'), location.origin);
  url.searchParams.set('c', inviteCode);
  link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
});

document.querySelectorAll('[data-entry-cta]').forEach(link => {
  if (inviteCode) {
    link.setAttribute('href', `/?c=${encodeURIComponent(inviteCode)}`);
    if (link.dataset.inviteLabel) link.textContent = link.dataset.inviteLabel;
    return;
  }
  if (hasLocalProfile) {
    link.setAttribute('href', link.dataset.profileHref || '/');
    if (link.dataset.profileLabel) link.textContent = link.dataset.profileLabel;
  }
});

const seenButton = document.getElementById('seenDemoButton');
if (seenButton) {
  seenButton.addEventListener('click', () => {
    const isSeen = seenButton.getAttribute('aria-pressed') === 'true';
    seenButton.setAttribute('aria-pressed', isSeen ? 'false' : 'true');
    seenButton.textContent = isSeen ? 'เห็นแล้ว' : 'เห็นแล้ว · 1';
  });
}
