/* Safari/iOS can clip the last pixel of the Starter cover and rounded detail
   cards because the child is exactly the size of an overflow-hidden parent.
   Keep a 1px breathing edge and repaint the outer card stroke above content. */

if (/^\/public\/p\/?$/.test(location.pathname) && !document.getElementById('tb-public-edge-fix-v14')) {
  const style = document.createElement('style');
  style.id = 'tb-public-edge-fix-v14';
  style.textContent = `
    #cover.preview-cover{
      overflow:visible!important;
      padding:1px!important;
      box-sizing:border-box!important;
    }
    #cover.preview-cover>.avatar-cover,
    #cover.preview-cover>.animal-card{
      width:calc(100% - 2px)!important;
      height:calc(100% - 2px)!important;
      margin:1px!important;
      box-sizing:border-box!important;
    }
    #view>.card{position:relative}
    #view>.card::after{
      content:'';position:absolute;inset:0;z-index:2;pointer-events:none;
      border:1px solid var(--xty-border);border-radius:inherit
    }
  `;
  document.head.appendChild(style);
}
