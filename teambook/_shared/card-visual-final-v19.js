/* TeamBook card surface paint — scoped visual layer.

   Geometry/profile remain owned by card-geometry-v16.js.
   This file must NEVER remove that geometry style or resize profile portraits.

   Surface contract:
   - collectible art fills the 63:88 card with no cream gutter
   - the card still has a visible frame in card.color
   - transparent/rounded pixels in source art reveal frame colour, never cream
   - Home Starter keeps its established full-bleed coloured frame + STARTER tag
   - compact Home rows keep the same colour frame, without black fallback edges
*/

if (typeof document !== 'undefined') {
  document.getElementById('tb-card-visual-v19')?.remove();

  const style = document.createElement('style');
  style.id = 'tb-card-visual-v19';
  style.textContent = `
    /* ===== Collectible cards: full bleed INSIDE a real coloured border =====
       Do not use an inset shadow as the frame: child artwork paints over it. */
    html body .animal-card:not(.card-back){
      --tb-card-frame:var(--xty-green);
      box-sizing:border-box!important;
      position:relative!important;
      width:100%!important;
      height:auto!important;
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
      margin:0!important;
      padding:0!important;
      border:3px solid var(--tb-card-frame)!important;
      border-radius:14px!important;
      background:var(--tb-card-frame)!important;
      box-shadow:3px 4px 0 rgba(62,51,44,.10)!important;
      overflow:hidden!important;
    }
    html body .animal-card[data-color="red"]{--tb-card-frame:var(--xty-red)!important}
    html body .animal-card[data-color="green"]{--tb-card-frame:var(--xty-green)!important}
    html body .animal-card[data-color="blue"]{--tb-card-frame:var(--xty-blue)!important}
    html body .animal-card[data-color="silver"]{--tb-card-frame:var(--xty-silver)!important}

    html body .animal-card:not(.card-back)>.card-art,
    html body .animal-card:not(.card-back) .card-art{
      box-sizing:border-box!important;
      position:absolute!important;
      inset:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      min-width:100%!important;
      min-height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      object-fit:cover!important;
      object-position:center!important;
      transform:none!important;
      clip-path:none!important;
    }

    /* Book-cover wrappers size only; no second white/cream frame. */
    html body #home #mainParty .xty-home-cover:has(>.animal-card:not(.card-back)),
    html body #home .party-group .xty-party-row-cover:has(.animal-card:not(.card-back)),
    html body #home .party-group .xty-home-cover:has(>.animal-card:not(.card-back)),
    html body .preview-cover:has(>.animal-card:not(.card-back)),
    html body #cover:has(>.animal-card:not(.card-back)){
      padding:0!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      overflow:visible!important;
    }

    /* Compact cards retain colour, just at the smaller 2px scale. */
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back){
      border-width:2px!important;
      border-radius:9px!important;
      box-shadow:none!important;
    }

    /* ===== Home Starter =====
       This is the previously approved Starter language: full-bleed animal art,
       a real RG/BS frame, neutral paper shadow, and STARTER on the main card. */
    html body #home #mainParty .xty-home-cover.avatar-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover{
      --tb-starter-frame:var(--xty-green);
      box-sizing:border-box!important;
      position:relative!important;
      padding:0!important;
      gap:0!important;
      border:3px solid var(--tb-starter-frame)!important;
      border-radius:14px!important;
      background:var(--tb-starter-frame)!important;
      box-shadow:3px 4px 0 rgba(62,51,44,.10)!important;
      overflow:hidden!important;
      aspect-ratio:var(--xty-card-aspect,63/88)!important;
    }
    html body #home .xty-home-cover.avatar-cover[data-color="red"]{--tb-starter-frame:var(--xty-red)!important}
    html body #home .xty-home-cover.avatar-cover[data-color="green"]{--tb-starter-frame:var(--xty-green)!important}
    html body #home .xty-home-cover.avatar-cover[data-color="blue"]{--tb-starter-frame:var(--xty-blue)!important}
    html body #home .xty-home-cover.avatar-cover[data-color="silver"]{--tb-starter-frame:var(--xty-silver)!important}

    html body #home #mainParty .xty-home-cover.avatar-cover>img,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover>img{
      position:absolute!important;
      inset:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      min-width:100%!important;
      min-height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      object-fit:cover!important;
      object-position:center!important;
      transform:none!important;
    }

    /* Main Starter: restore the small STARTER pill from the approved state.
       home-cover-v3 currently supplies a <b>; reuse that node without changing DOM. */
    html body #home #mainParty .xty-home-cover.avatar-cover>b{
      position:absolute!important;
      left:50%!important;
      bottom:7px!important;
      z-index:3!important;
      display:block!important;
      width:max-content!important;
      max-width:calc(100% - 14px)!important;
      margin:0!important;
      padding:3px 9px!important;
      transform:translateX(-50%)!important;
      color:transparent!important;
      font-size:0!important;
      line-height:1!important;
      border:1px solid rgba(62,51,44,.08)!important;
      border-radius:999px!important;
      background:rgba(255,254,248,.94)!important;
      box-shadow:0 1px 3px rgba(62,51,44,.08)!important;
      white-space:nowrap!important;
    }
    html body #home #mainParty .xty-home-cover.avatar-cover>b::before{
      content:'STARTER';
      color:var(--xty-muted);
      font:800 7.5px/1.1 var(--sans);
      letter-spacing:.14em;
    }

    /* Compact rows: same coloured frame, no black edge and no label. */
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover{
      border-width:2px!important;
      border-radius:9px!important;
      box-shadow:none!important;
    }
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover>b,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover>small,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover::after{
      display:none!important;
    }

    /* ===== Starter background colour only =====
       Public/Home public still had a historical cream background override.
       Keep every existing size/crop/border rule; only make that background use
       the same colour the user selected for the frame. */
    html body #tb15HomePublicList .tb15-starter-cover,
    html body .public-party>.avatar-cover,
    html body .preview-cover>.avatar-cover,
    html body #cover>.avatar-cover{
      --tb-public-starter-bg:var(--xty-green);
      background:var(--tb-public-starter-bg)!important;
    }
    html body #tb15HomePublicList .tb15-starter-cover[data-color="red"],
    html body .public-party>.avatar-cover[data-color="red"],
    html body .preview-cover>.avatar-cover[data-color="red"],
    html body #cover>.avatar-cover[data-color="red"]{--tb-public-starter-bg:var(--xty-red)!important}
    html body #tb15HomePublicList .tb15-starter-cover[data-color="green"],
    html body .public-party>.avatar-cover[data-color="green"],
    html body .preview-cover>.avatar-cover[data-color="green"],
    html body #cover>.avatar-cover[data-color="green"]{--tb-public-starter-bg:var(--xty-green)!important}
    html body #tb15HomePublicList .tb15-starter-cover[data-color="blue"],
    html body .public-party>.avatar-cover[data-color="blue"],
    html body .preview-cover>.avatar-cover[data-color="blue"],
    html body #cover>.avatar-cover[data-color="blue"]{--tb-public-starter-bg:var(--xty-blue)!important}
    html body #tb15HomePublicList .tb15-starter-cover[data-color="silver"],
    html body .public-party>.avatar-cover[data-color="silver"],
    html body .preview-cover>.avatar-cover[data-color="silver"],
    html body #cover>.avatar-cover[data-color="silver"]{--tb-public-starter-bg:var(--xty-silver)!important}
  `;
  document.head.appendChild(style);
}
