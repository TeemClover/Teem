const responsiveStyle = document.createElement('link');
responsiveStyle.rel = 'stylesheet';
responsiveStyle.href = '/_shared/entry-mobile.css?v=20260822-responsive3';
document.head.append(responsiveStyle);

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

/* Canonical example activities. Keep these identical everywhere the shared
   entry story is rendered so the animals never tell conflicting stories. */
const activityCanon = [
  { key: 'orange-cat', cls: 'activity-cat', name: 'แมวส้ม', text: 'โพสต์วันละ 1 คลิป' },
  { key: 'owl', cls: 'activity-owl', name: 'นกฮูก', text: 'อ่านวันละ 1 บท' },
  { key: 'pig', cls: 'activity-pig', name: 'หมู', text: 'อวดของอร่อยวันละ 1 มื้อ' },
  { key: 'turtle', cls: 'activity-turtle', name: 'เต่า', text: 'เดินวันละ 10,000 ก้าว' }
];

document.querySelectorAll('.trace-notes').forEach(container => {
  const notes = [...container.querySelectorAll('.trace-note')];

  activityCanon.forEach(activity => {
    const note = notes.find(item => item.querySelector('img')?.getAttribute('src')?.includes(activity.key));
    if (!note) return;

    note.classList.remove('activity-cat', 'activity-owl', 'activity-pig', 'activity-turtle');
    note.classList.add(activity.cls);

    const image = note.querySelector('img');
    if (image) image.alt = activity.name;

    const copy = note.querySelector('span');
    if (copy) {
      copy.replaceChildren();
      const label = document.createElement('b');
      label.textContent = activity.name;
      copy.append(label, document.createTextNode(activity.text));
    }

    /* append also normalizes visual order: cat, owl, pig, turtle */
    container.append(note);
  });

  const lead = container.previousElementSibling;
  if (lead?.classList.contains('entry-copy')) {
    lead.textContent = 'แมวส้มอาจโพสต์ 1 คลิป นกฮูกอ่าน 1 บท หมูอวดของอร่อย 1 มื้อ เต่าเดิน 10,000 ก้าว — คนละเรื่อง คนละเวลา ไม่เป็นไรเลย';
  }
});

document.querySelectorAll('.seen-demo p').forEach(copy => {
  copy.textContent = '“วันนี้เกือบไม่ได้ลง แต่โพสต์คลิปไปแล้ว 1 คลิป”';
});

const seenButton = document.getElementById('seenDemoButton');
if (seenButton) {
  seenButton.addEventListener('click', () => {
    const isSeen = seenButton.getAttribute('aria-pressed') === 'true';
    seenButton.setAttribute('aria-pressed', isSeen ? 'false' : 'true');
    seenButton.textContent = isSeen ? 'เห็นแล้ว' : 'เห็นแล้ว · 1';
  });
}
