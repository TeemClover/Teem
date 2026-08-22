/* Thai TeamBook header canon.
   One visible brand treatment across app + story routes:
   TeamBook logo + “สมุดกลุ่มมีชีวิต”.
   Locale copy stays in this Thai-only module so the shared runtime remains
   language-neutral and future /en or /ja documents can use their own module. */

const STYLE_ID = 'teambook-header-brand-th-style';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .top .mark,
    .entry-brand{
      display:inline-flex;
      align-items:center;
      gap:12px;
      flex:none;
      text-decoration:none;
    }
    .top .mark img,
    .entry-brand img{
      width:auto !important;
      height:34px !important;
      max-width:150px;
      object-fit:contain;
      flex:none;
    }
    .top .mark .tb-brand-descriptor,
    .entry-brand .tb-brand-descriptor{
      display:block;
      padding-left:12px;
      border-left:1px solid rgba(62,51,44,.18);
      color:#776B62;
      font:600 13px/1.3 "Noto Sans Thai",Thonburi,"Leelawadee UI",Tahoma,sans-serif;
      letter-spacing:0;
      white-space:nowrap;
    }
    @media(max-width:390px){
      .top .mark,
      .entry-brand{gap:9px}
      .top .mark .tb-brand-descriptor,
      .entry-brand .tb-brand-descriptor{
        padding-left:9px;
        font-size:12px;
      }
    }
  `;
  document.head.appendChild(style);
}

function normalizeBrand(anchor) {
  if (!anchor) return;
  const image = anchor.querySelector('img');
  if (image) image.alt = 'TeamBook';

  let descriptor = anchor.querySelector('.tb-brand-descriptor');
  if (!descriptor) {
    descriptor = anchor.querySelector('span') || document.createElement('span');
    if (!descriptor.isConnected) anchor.appendChild(descriptor);
  }
  descriptor.classList.add('tb-brand-descriptor');
  descriptor.innerHTML = 'สมุดกลุ่ม<br>มีชีวิต';
  anchor.setAttribute('aria-label', 'TeamBook สมุดกลุ่มมีชีวิต');
}

function installHomeTagline() {
  if (location.pathname !== '/') return;
  const kicker = document.querySelector('#home > .kicker');
  if (kicker) kicker.textContent = 'TeamBook · มีฉัน มีเธอ มีเรื่องของเรา';
}

function boot() {
  installStyle();
  document.querySelectorAll('.top .mark, .entry-brand').forEach(normalizeBrand);
  installHomeTagline();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
