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

    /* Lower party rows should use the same full-card Starter treatment as
       the large owner card above. Keep only the outer colour frame; remove
       the inset white padding and let the art fill the whole face. */
    .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
      padding:0!important;
      box-shadow:none!important;
      overflow:hidden!important;
    }
    .party-group .xty-party-row-cover .xty-home-cover.avatar-cover>img {
      width:100%!important;
      height:100%!important;
      object-fit:cover!important;
      border-radius:6px!important;
    }

    /* A Collection card used as the Pet thumbnail keeps its card art, but
       should read like a soft little collectible — rounded, no hard box. */
    .party-group .xty-party-row-pet {
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
    }
    .party-group .xty-party-row-pet img {
      border:0!important;
      border-radius:8px!important;
      background:transparent!important;
      box-shadow:none!important;
    }

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

function polishHomeFooter() {
  const link = [...document.querySelectorAll('#home > a.about-link')]
    .find(node => node.getAttribute('href') === '/xty/about/' && /เกี่ยวกับ\s*XTY/.test(node.textContent || ''));
  if (!link) return;
  link.textContent = 'กลับหน้าแรก →';
  link.setAttribute('href', '/');
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
polishHomeFooter();
scan();

const host = document.getElementById('mainParty');
if (host) new MutationObserver(scan).observe(host, { childList: true, subtree: true });
