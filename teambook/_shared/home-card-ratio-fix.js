/* TeamBook Home — canonical card geometry guard.
   Every visible card frame on / must stay 63:88 on desktop and mobile.
   This module loads after the Home renderer so it also overrides old narrow-
   screen pixel heights that could stretch/crop a card by a few pixels. */

if (typeof document !== 'undefined' && !document.getElementById('xty-home-card-ratio-fix')) {
  const style = document.createElement('style');
  style.id = 'xty-home-card-ratio-fix';
  style.textContent = `
    html body #home #mainParty .xty-home-cover,
    html body #home .party-group .xty-party-row-cover {
      aspect-ratio:var(--xty-card-aspect)!important;
      height:auto!important;
    }

    html body #home #mainParty .xty-home-cover > .animal-card,
    html body #home #mainParty .xty-home-cover.xty-home-real-back,
    html body #home #mainParty .xty-home-cover.avatar-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card,
    html body #home .party-group .xty-party-row-cover .xty-home-real-back,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
      aspect-ratio:var(--xty-card-aspect)!important;
    }

    /* The compact Home rows use the artwork itself as the book cover. Card
       names/labels belong in the row copy, not painted on top of the artwork. */
    html body #home .party-group .xty-party-row-cover .animal-card .card-copy,
    html body #home .party-group .xty-party-row-cover .animal-card .role-badge,
    html body #home .party-group .xty-party-row-cover .animal-card .rarity-badge,
    html body #home .party-group .xty-party-row-cover .avatar-cover > b,
    html body #home .party-group .xty-party-row-cover .avatar-cover > small {
      display:none!important;
    }

    /* A collectible TeamBook card is already a finished 63:88 image, including
       its printed frame. Never crop it again inside a book-cover slot. The slot
       only supplies geometry; the whole card image stays visible edge to edge. */
    html body #home #mainParty .xty-home-cover:has(> .animal-card:not(.card-back)),
    html body #home .party-group .xty-party-row-cover:has(.animal-card:not(.card-back)),
    html body #home .party-group .xty-party-row-cover .xty-home-cover:has(> .animal-card:not(.card-back)),
    html body #home .tb14-public-party:has(.animal-card:not(.card-back)) > .animal-card {
      overflow:visible!important;
    }

    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back),
    html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card:not(.card-back)),
    html body #home .tb14-public-party > .animal-card:not(.card-back) {
      padding:0!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
    }

    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back) .card-art,
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back) .card-art,
    html body #home .tb14-public-party .animal-card:not(.card-back) .card-art {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      margin:0!important;
      object-fit:contain!important;
      border-radius:0!important;
      transform:none!important;
    }

    /* Card backs are textures, not finished card-face artwork, so they still
       fill their frame. */
    html body #home #mainParty .xty-home-real-back img,
    html body #home .party-group .xty-party-row-cover .xty-home-real-back img {
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      object-fit:cover!important;
    }

    /* Old <=380px rules used 54x76, which is not 63:88. Width may shrink,
       but height must always be derived from the canonical ratio. */
    @media (max-width:380px) {
      html body #home .party-group .xty-party-row-visual {
        height:auto!important;
      }
      html body #home .party-group .xty-party-row-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card,
      html body #home .party-group .xty-party-row-cover .xty-home-real-back,
      html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
        height:auto!important;
        aspect-ratio:var(--xty-card-aspect)!important;
      }
    }
  `;
  document.head.appendChild(style);
}
