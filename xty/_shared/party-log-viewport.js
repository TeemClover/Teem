const box = document.getElementById('log');

if (box) install();

function install() {
  injectStyle();
  box.tabIndex = 0;
  box.setAttribute('aria-label', 'Party Log — เลื่อนอ่านบันทึกได้อย่างอิสระ');
}

function injectStyle() {
  if (document.getElementById('xty-party-log-viewport-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-party-log-viewport-style';
  style.textContent = `
    #log{
      height:min(68dvh,680px);
      min-height:320px;
      overflow-y:auto!important;
      overflow-x:hidden;
      overscroll-behavior-y:auto;
      -webkit-overflow-scrolling:touch;
      touch-action:pan-y;
      scroll-behavior:auto!important;
      overflow-anchor:none;
      scrollbar-gutter:stable;
      padding-right:4px;
      border-top:1px solid rgba(62,51,44,.08);
      border-bottom:1px solid rgba(62,51,44,.08);
    }
    #log:focus-visible{outline:3px solid rgba(50,139,92,.18);outline-offset:3px}
    @media (max-height:650px){#log{height:62dvh;min-height:260px}}
    @media (min-width:760px){#log{height:min(62vh,620px)}}
  `;
  document.head.appendChild(style);
}
