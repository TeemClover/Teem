const box = document.getElementById('log');

if (box) install();

function install() {
  injectStyle();
  box.setAttribute('aria-label', 'เรื่องในสมุด — เลื่อนอ่านบันทึกได้อย่างอิสระ');
}

function injectStyle() {
  if (document.getElementById('xty-party-log-viewport-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-party-log-viewport-style';
  style.textContent = `
    /* The Book uses the page itself as the reading surface. A forced 60–70vh
       inner scroller created a giant blank area for short logs and trapped
       touch scrolling in iOS/in-app browsers. Keep the log natural until it is
       genuinely long; only desktop gets a bounded history viewport. */
    #log{
      min-height:0!important;
      height:auto!important;
      overflow:visible!important;
      overscroll-behavior:initial!important;
      touch-action:auto!important;
      scrollbar-gutter:auto!important;
      padding-right:0!important;
      border-top:1px solid rgba(62,51,44,.08);
      border-bottom:1px solid rgba(62,51,44,.08);
    }

    /* System events are timeline annotations, not conversation. */
    #log>.party-event{
      gap:5px!important;
      margin:0!important;
      padding:3px 6px!important;
      color:color-mix(in srgb,var(--xty-muted) 82%,transparent)!important;
      font-size:10.5px!important;
      line-height:1.35!important;
      border-left:2px solid rgba(91,141,255,.18)!important;
      background:rgba(255,255,255,.22)!important;
      border-radius:0 6px 6px 0!important;
    }
    #log>.party-event .event-dot{width:4px!important;height:4px!important;opacity:.55!important}
    #log>.party-event .event-time{font-size:8.5px!important;opacity:.7!important}

    @media(min-width:900px){
      #log.long-log{
        max-height:620px!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        overscroll-behavior-y:contain!important;
        padding-right:4px!important;
      }
    }
  `;
  document.head.appendChild(style);

  /* Add the desktop viewport only when the history is actually long. No
     MutationObserver is needed: rendering code may call this module again on a
     new document, and a short log never gets a fake blank canvas. */
  requestAnimationFrame(() => {
    if (matchMedia('(min-width:900px)').matches && box.scrollHeight > 760) {
      box.classList.add('long-log');
    }
  });
}
