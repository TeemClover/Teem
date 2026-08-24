import './header-brand-th.js';

const responsiveStyle = document.createElement('link');
responsiveStyle.rel = 'stylesheet';
responsiveStyle.href = '/_shared/entry-mobile.css?v=20260822-responsive3';
document.head.append(responsiveStyle);

/* Patch 1.3: a one-person Book is already complete. Entry/read pages are a
   separate lightweight runtime from the app shell, so keep the 1–5 canon here
   too instead of leaving old 2–5 copy behind. */
(function applyV13OccupancyCopy() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.parentElement?.closest('script,style,textarea,input')) return;
    if (node.nodeValue?.includes('2–5')) node.nodeValue = node.nodeValue.replaceAll('2–5', '1–5');
  });
})();

/* Thai display text needs more vertical breathing room than Latin at the
   same nominal line-height. Keep this scoped to /read so other entry flows
   retain their existing geometry.

   The responsive layer is mobile-first and intentionally collapses chapter
   heroes/body widths. Restore the original calm desktop chapter geometry above
   the old 940px breakpoint so WHY / HOW / WHAT / NEXT do not stretch edge to
   edge or stack the hero artwork underneath the headline on wide screens. */
if (/^\/read(?:\/|$)/.test(location.pathname)) {
  const thaiHeadingStyle = document.createElement('style');
  thaiHeadingStyle.id = 'teambook-read-thai-heading-leading';
  thaiHeadingStyle.textContent = `
    .entry-page .entry-title,
    .entry-page .story-copy h2,
    .entry-page .final-invite h2,
    .entry-page .chapter-hero h1 {
      line-height: 1.34;
      letter-spacing: -0.025em;
    }
    @media (max-width: 700px) {
      .entry-page .entry-title,
      .entry-page .story-copy h2,
      .entry-page .final-invite h2,
      .entry-page .chapter-hero h1 {
        line-height: 1.6;
        letter-spacing: -0.018em;
      }
    }
    @media (min-width: 941px) {
      .entry-page .chapter-hero {
        grid-template-columns: minmax(0,.9fr) minmax(380px,1.1fr) !important;
        align-items: center;
        gap: clamp(28px,6vw,72px);
        padding: clamp(50px,8vw,96px) 0 clamp(44px,7vw,82px);
      }
      .entry-page .chapter-hero > div {
        min-width: 0;
        max-width: 620px;
      }
      .entry-page .chapter-hero .story-figure {
        width: min(100%,560px);
        justify-self: end;
      }
      .entry-page .chapter-body {
        width: min(760px,calc(100% - 64px));
        margin-left: auto;
        margin-right: auto;
        padding: 20px 0 80px;
      }
      .entry-page .chapter-body h2 {
        margin-top: 52px;
        font-size: clamp(25px,3.7vw,38px);
        line-height: 1.34;
      }
      .entry-page .chapter-body p,
      .entry-page .chapter-body ul {
        font-size: 17px;
        line-height: 1.9;
      }
    }
  `;
  document.head.append(thaiHeadingStyle);
}

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
