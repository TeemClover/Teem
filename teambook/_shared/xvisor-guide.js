/* X-VISOR hidden guide registry data only.
   IMPORTANT: this module must stay side-effect free. TeamBook pages import
   PET_BY_ID through pets.js, so importing the guide must never install Xircle
   routing, share handlers, or page enhancers. */

export const XVISOR_GUIDE = Object.freeze({
  id: 'xvisor_white_cat_silver',
  nameTh: 'แมวขาว',
  emoji: '🐈',
  color: 'silver',
  /* Pet art is full-body, matching every other TeamBook animal. The same
     registry art is used by the companion card and animal chat speaker. */
  art: '/assets/art/pets/white-cat.webp',
  persona: 'PATTERN CARETAKER · เห็นสิ่งที่เกิดขึ้นจริง แล้วช่วยให้วงมองต่อทีละหนึ่งจุด',
  xvisorOnly: true,
  secret: true,
  unlockedByDefault: false,
});
