/* TeamBook Home — canonical card geometry guard.
   Every visible card frame on / must stay 63:88 on desktop and mobile.
   Collectible cards used as book covers share the Starter frame language:
   colour comes from the card, artwork stays whole, and cover labels stay out. */

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

    /* A Book cover never prints the collectible card name/rarity over its art.
       Starter is a different renderer, so its dedicated STARTER pill remains. */
    html body #home #mainParty .animal-card .card-copy,
    html body #home #mainParty .animal-card .role-badge,
    html body #home #mainParty .animal-card .rarity-badge,
    html body #home .party-group .xty-party-row-cover .animal-card .card-copy,
    html body #home .party-group .xty-party-row-cover .animal-card .role-badge,
    html body #home .party-group .xty-party-row-cover .animal-card .rarity-badge,
    html body #home .party-group .xty-party-row-cover .avatar-cover > b,
    html body #home .party-group .xty-party-row-cover .avatar-cover > small {
      display:none!important;
    }

    /* Collectible cards use the same outside frame language as Starter, but
       without a STARTER tag. The finished 63:88 artwork is never cropped. */
    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back),
    html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card:not(.card-back),
    html body #home .tb15-public-party > .animal-card:not(.card-back) {
      --tb-cover-accent:var(--xty-green);
      position:relative!important;
      box-sizing:border-box!important;
      width:100%!important;
      height:100%!important;
      padding:0!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      border:3px solid var(--tb-cover-accent)!important;
      border-radius:16px!important;
      background:#FFF7D8!important;
      box-shadow:3px 4px 0 rgba(62,51,44,.10)!important;
      overflow:hidden!important;
    }
    html body #home #mainParty .animal-card[data-color="red"],
    html body #home .party-group .xty-party-row-cover .animal-card[data-color="red"],
    html body #home .tb15-public-party > .animal-card[data-color="red"] {--tb-cover-accent:var(--xty-red)}
    html body #home #mainParty .animal-card[data-color="blue"],
    html body #home .party-group .xty-party-row-cover .animal-card[data-color="blue"],
    html body #home .tb15-public-party > .animal-card[data-color="blue"] {--tb-cover-accent:var(--xty-blue)}
    html body #home #mainParty .animal-card[data-color="silver"],
    html body #home .party-group .xty-party-row-cover .animal-card[data-color="silver"],
    html body #home .tb15-public-party > .animal-card[data-color="silver"] {--tb-cover-accent:var(--xty-silver)}

    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back) .card-art,
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back) .card-art,
    html body #home .tb15-public-party .animal-card:not(.card-back) .card-art {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      margin:0!important;
      object-fit:contain!important;
      border-radius:11px!important;
      background:#FFF7D8!important;
      transform:none!important;
    }

    /* Compact list rows keep the same language at a smaller scale. */
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back) {
      border-width:2px!important;
      border-radius:9px!important;
      box-shadow:none!important;
    }
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back) .card-art {
      border-radius:7px!important;
    }

    /* Card backs are textures, not finished card-face artwork, so they fill. */
    html body #home #mainParty .xty-home-real-back img,
    html body #home .party-group .xty-party-row-cover .xty-home-real-back img {
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      object-fit:cover!important;
    }

    @media (max-width:380px) {
      html body #home .party-group .xty-party-row-visual {height:auto!important}
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
