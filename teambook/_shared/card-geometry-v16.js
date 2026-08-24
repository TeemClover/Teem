/* TeamBook 1.6 — canonical card-slot geometry guard.

   A card slot is always exactly 63:88. The visible frame must never consume
   the card's content box, because a 3px border on a 63:88 border-box changes
   the INNER ratio and makes an exact 63:88 card image letterbox by a few px.

   Contract:
   - every Book cover/card seat uses --xty-card-aspect (63/88)
   - collectible 63:88 art fills the slot without crop or letterbox
   - coloured frames are painted with box-shadow, not layout border
   - Starter square art may crop to fill the 63:88 shell
   - old fixed pixel pairs such as 54x76 are forbidden
*/

if (typeof document !== 'undefined' && !document.getElementById('tb-card-geometry-v16')) {
  const style = document.createElement('style');
  style.id = 'tb-card-geometry-v16';
  style.textContent = `
    /* ---------- shared 63:88 slot shells ---------- */
    html body #home #mainParty .xty-home-cover,
    html body #home .party-group .xty-party-row-cover,
    html body #home .party-group .xty-party-row-cover .xty-home-cover,
    html body #home .tb15-public-party > :first-child,
    html body .public-party > :first-child,
    html body .preview-cover,
    html body #cover,
    html body .xty-cover-current-art,
    html body .xty-cover-thumb,
    html body #seats > .tb-person-seat,
    html body #seats > .tb-companion-seat,
    html body #members .tb-public-member-visual,
    html body .tb-member-status .tb-book-member-visual {
      box-sizing:border-box!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      height:auto!important;
    }

    /* ---------- finished collectible card used as a Book cover ---------- */
    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back),
    html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card:not(.card-back),
    html body #home .tb15-public-party > .animal-card:not(.card-back),
    html body .public-party > .animal-card:not(.card-back),
    html body .preview-cover > .animal-card:not(.card-back),
    html body #cover > .animal-card:not(.card-back) {
      --tb-slot-accent:var(--xty-green);
      box-sizing:border-box!important;
      width:100%!important;
      height:100%!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:14px!important;
      background:transparent!important;
      box-shadow:0 0 0 3px var(--tb-slot-accent),3px 4px 0 rgba(62,51,44,.10)!important;
      overflow:hidden!important;
    }
    html body #home .animal-card[data-color="red"],
    html body .public-party > .animal-card[data-color="red"],
    html body .preview-cover > .animal-card[data-color="red"],
    html body #cover > .animal-card[data-color="red"]{--tb-slot-accent:var(--xty-red)!important}
    html body #home .animal-card[data-color="green"],
    html body .public-party > .animal-card[data-color="green"],
    html body .preview-cover > .animal-card[data-color="green"],
    html body #cover > .animal-card[data-color="green"]{--tb-slot-accent:var(--xty-green)!important}
    html body #home .animal-card[data-color="blue"],
    html body .public-party > .animal-card[data-color="blue"],
    html body .preview-cover > .animal-card[data-color="blue"],
    html body #cover > .animal-card[data-color="blue"]{--tb-slot-accent:var(--xty-blue)!important}
    html body #home .animal-card[data-color="silver"],
    html body .public-party > .animal-card[data-color="silver"],
    html body .preview-cover > .animal-card[data-color="silver"],
    html body #cover > .animal-card[data-color="silver"]{--tb-slot-accent:var(--xty-silver)!important}

    /* Because the parent content box itself is 63:88 and has NO layout border,
       a finished 63:88 image now fills exactly. contain is safe here and keeps
       the entire printed card visible. */
    html body #home #mainParty .xty-home-cover > .animal-card:not(.card-back) .card-art,
    html body #home .party-group .xty-party-row-cover .animal-card:not(.card-back) .card-art,
    html body #home .tb15-public-party .animal-card:not(.card-back) .card-art,
    html body .public-party > .animal-card:not(.card-back) .card-art,
    html body .preview-cover > .animal-card:not(.card-back) .card-art,
    html body #cover > .animal-card:not(.card-back) .card-art {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      object-fit:contain!important;
      object-position:center!important;
      background:transparent!important;
      transform:none!important;
    }

    /* Cover UI never paints collectible name / rarity labels over the art. */
    html body #home #mainParty .animal-card .card-copy,
    html body #home #mainParty .animal-card .role-badge,
    html body #home #mainParty .animal-card .rarity-badge,
    html body #home .party-group .xty-party-row-cover .animal-card .card-copy,
    html body #home .party-group .xty-party-row-cover .animal-card .role-badge,
    html body #home .party-group .xty-party-row-cover .animal-card .rarity-badge,
    html body .public-party > .animal-card .card-copy,
    html body .public-party > .animal-card .role-badge,
    html body .public-party > .animal-card .rarity-badge,
    html body #cover > .animal-card .card-copy,
    html body #cover > .animal-card .role-badge,
    html body #cover > .animal-card .rarity-badge {
      display:none!important;
    }

    /* ---------- Starter Book covers ----------
       Starter source art is square, therefore cover is the only correct fit:
       crop the source, never shrink the 63:88 slot around it. */
    html body #home .xty-home-cover.avatar-cover,
    html body .public-party > .avatar-cover,
    html body .preview-cover > .avatar-cover,
    html body #cover > .avatar-cover {
      box-sizing:border-box!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      overflow:hidden!important;
    }
    html body #home .xty-home-cover.avatar-cover > img,
    html body .public-party > .avatar-cover > img,
    html body .preview-cover > .avatar-cover > img,
    html body #cover > .avatar-cover > img {
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      aspect-ratio:auto!important;
      margin:0!important;
      transform:none!important;
      object-fit:cover!important;
      object-position:center!important;
    }

    /* ---------- Book board / human seats ----------
       Old board CSS intentionally kept Starter art as a 68% square portrait.
       That is the large blank area visible after a card is inserted. The seat
       itself is already 63:88, so identity art must fill that shell. */
    html body #seats > .tb-person-seat.seat > .av,
    html body #seats > .tb-person-seat.seat > .av.is-card {
      position:absolute!important;
      inset:0!important;
      left:0!important;
      top:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      margin:0!important;
      transform:none!important;
      display:block!important;
      overflow:hidden!important;
      border-radius:13px!important;
    }
    html body #seats > .tb-person-seat.seat > .av > img {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      border-radius:0!important;
      object-position:center!important;
      transform:none!important;
    }
    html body #seats > .tb-person-seat.seat > .av:not(.is-card) > img {
      object-fit:cover!important;
    }
    html body #seats > .tb-person-seat.seat > .av.is-card > img {
      object-fit:contain!important;
    }

    /* Public member identity cards already use a vertical shell. Do not let a
       legacy square img rule collapse the child back to 54x54. */
    html body #members .tb-public-member-visual > img,
    html body .tb-member-status .tb-book-member-visual > img {
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      object-fit:cover!important;
      object-position:center!important;
    }
    html body #members .tb-public-member-visual.is-card > img,
    html body .tb-member-status .tb-book-member-visual.is-card > img {
      object-fit:contain!important;
    }

    /* Compact Home rows used to hard-code 54x76. 54x76 is NOT 63x88. Width may
       shrink on small screens; height must always be derived from the token. */
    @media(max-width:380px){
      html body #home .party-group .xty-party-row-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover,
      html body #home .party-group .xty-party-row-cover .xty-home-cover > .animal-card,
      html body #home .party-group .xty-party-row-cover .xty-home-real-back,
      html body #home .party-group .xty-party-row-cover .xty-home-cover.avatar-cover {
        width:54px!important;
        min-width:54px!important;
        height:auto!important;
        aspect-ratio:var(--xty-card-aspect)!important;
      }
    }
  `;
  document.head.appendChild(style);
}
