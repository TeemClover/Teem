/* XTY Home — canonical card geometry guard.
   Every visible card frame on /xty/ must stay 63:88 on desktop and mobile.
   This module loads after the Home renderer so it also overrides old narrow-
   screen pixel heights that could stretch/crop a card by a few pixels. */

if (typeof document !== 'undefined' && !document.getElementById('xty-home-card-ratio-fix')) {
  const style = document.createElement('style');
  style.id = 'xty-home-card-ratio-fix';
  style.textContent = `
    html body #home #mainParty .xty-home-cover,
    html body #home .party-group .xty-party-row-cover {
      aspect-ratio:63 / 88!important;
      height:auto!important;
    }

    html body #home #mainParty .xty-home-cover > .animal-card,
    html body #home #mainParty .xty-home-cover.xty-home-core7-cover,
    html body #home #mainParty .xty-home-cover.xty-home-real-back,
    html body #home #mainParty .xty-home-cover.avatar-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card,
    html body #home .party-group .xty-party-row-cover .xty-home-core7-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-real-back,
    html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
      aspect-ratio:63 / 88!important;
    }

    /* Keep the printed card edge visible. The frame owns 63:88; the art is
       fitted inside it instead of being enlarged and shaved by object-fit. */
    html body #home #mainParty .xty-home-core7-cover svg,
    html body #home #mainParty .xty-home-real-back img,
    html body #home #mainParty .xty-home-cover > .animal-card .card-art,
    html body #home .party-group .xty-party-row-cover .xty-home-core7-cover svg,
    html body #home .party-group .xty-party-row-cover .xty-home-real-back img,
    html body #home .party-group .xty-party-row-cover .animal-card .card-art {
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      object-fit:contain!important;
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
      html body #home .party-group .xty-party-row-cover .xty-home-core7-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-real-back,
      html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
        height:auto!important;
        aspect-ratio:63 / 88!important;
      }
    }
  `;
  document.head.appendChild(style);
}
