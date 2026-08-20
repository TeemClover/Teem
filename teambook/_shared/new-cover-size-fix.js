/* Keep the lead-cover picker card-sized while the v3 picker replaces the
   legacy grid. The host briefly exists in both layouts; these constraints
   make that transition safe on narrow/mobile screens instead of letting a
   single card stretch to the full content width. */

const STYLE_ID = 'xty-new-cover-size-fix-style';

if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .create-page #leadPick > .card-select {
      width:min(112px,31vw)!important;
      max-width:112px!important;
      min-width:0!important;
      justify-self:start!important;
    }
    .create-page #leadPick > .card-select > .animal-card,
    .create-page #leadPick > .card-select > .avatar-cover {
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      height:auto!important;
      aspect-ratio:var(--xty-card-aspect)!important;
    }
    .create-page #leadPick > .xty-cover-picker {
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
    }
    .create-page .xty-cover-current {
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      overflow:hidden;
    }
    .create-page .xty-cover-current-art {
      flex:0 0 88px!important;
      width:88px!important;
      min-width:88px!important;
      max-width:88px!important;
      height:auto!important;
      aspect-ratio:var(--xty-card-aspect)!important;
    }
    .create-page .xty-cover-current-art > img,
    .create-page .xty-cover-current-art > svg,
    .create-page .xty-cover-current-art > .animal-card,
    .create-page .xty-cover-current-art > .avatar-cover {
      display:block!important;
      width:100%!important;
      min-width:0!important;
      max-width:100%!important;
      height:100%!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      object-fit:cover!important;
    }
    .create-page .xty-cover-current-copy { min-width:0!important; }

    @media (max-width:480px) {
      .create-page #leadPick > .card-select {
        width:min(96px,29vw)!important;
        max-width:96px!important;
      }
      .create-page .xty-cover-current-art {
        flex-basis:82px!important;
        width:82px!important;
        min-width:82px!important;
        max-width:82px!important;
      }
      .create-page .xty-cover-current { gap:12px!important; padding:10px!important; }
    }
  `;
  document.head.appendChild(style);
}
