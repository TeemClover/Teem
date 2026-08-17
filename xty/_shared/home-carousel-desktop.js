/* Desktop affordances for the XTY Home owner-party carousel.
   Touch devices already swipe natively; desktop users need a mouse-friendly
   way to reach older owner parties because the carousel intentionally hides
   most of the next slide. */

const STYLE_ID = 'xty-home-carousel-desktop-style';
const ENHANCED = 'xtyDesktopScroll';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Starter cover is already visually identified by the STARTER badge.
       Keep the Home card clean: the animal name beside/under the art is
       redundant and competes with the party title. */
    .xty-party-carousel .xty-home-cover.avatar-cover>b { display:none!important; }

    @media (hover:hover) and (pointer:fine) {
      .xty-party-carousel.multiple {
        cursor:grab;
        scrollbar-width:thin;
        padding-bottom:12px;
      }
      .xty-party-carousel.multiple.is-dragging { cursor:grabbing; user-select:none; }
      .xty-party-carousel.multiple::-webkit-scrollbar { display:block; height:6px; }
      .xty-party-carousel.multiple::-webkit-scrollbar-track { background:transparent; }
      .xty-party-carousel.multiple::-webkit-scrollbar-thumb {
        border-radius:999px;
        background:var(--xty-border);
      }
    }
  `;
  document.head.appendChild(style);
}

function enhance(carousel) {
  if (!carousel || carousel.dataset[ENHANCED] === '1') return;
  carousel.dataset[ENHANCED] = '1';

  carousel.addEventListener('wheel', event => {
    if (carousel.scrollWidth <= carousel.clientWidth + 1) return;
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

    const delta = event.deltaY;
    if (!delta) return;
    const max = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    const canMove = delta < 0 ? carousel.scrollLeft > 1 : carousel.scrollLeft < max - 1;
    if (!canMove) return;

    event.preventDefault();
    carousel.scrollLeft += delta;
  }, { passive: false });

  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;

  const finishDrag = () => {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    carousel.classList.remove('is-dragging');
  };

  carousel.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (carousel.scrollWidth <= carousel.clientWidth + 1) return;
    if (event.target.closest('a,button,input,textarea,select,label')) return;

    dragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = carousel.scrollLeft;
    carousel.classList.add('is-dragging');
    try { carousel.setPointerCapture(pointerId); } catch {}
  });

  carousel.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 2) event.preventDefault();
    carousel.scrollLeft = startScrollLeft - distance;
  });

  carousel.addEventListener('pointerup', finishDrag);
  carousel.addEventListener('pointercancel', finishDrag);
  carousel.addEventListener('lostpointercapture', finishDrag);
}

function scan() {
  document.querySelectorAll('.xty-party-carousel').forEach(enhance);
}

installStyle();
scan();

const host = document.getElementById('mainParty');
if (host) new MutationObserver(scan).observe(host, { childList: true, subtree: true });
