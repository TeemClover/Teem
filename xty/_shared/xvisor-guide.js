/* X-VISOR hidden guide registry data only.
   IMPORTANT: this module must stay side-effect free. Normal XTY pages import
   PET_BY_ID through pets.js, so importing the guide must never install Xircle
   routing, share handlers, or page enhancers. */

export const XVISOR_GUIDE = Object.freeze({
  id: 'xvisor_white_cat_silver',
  nameTh: 'แมวขาวสีเงิน',
  emoji: '🐈',
  color: 'silver',
  art: '/xty/assets/art/avatars/white-cat.webp',
  persona: 'แมวตัวนี้เทรนนิ่ง X-VISOR มาแล้ว',
  xvisorOnly: true,
  secret: true,
  unlockedByDefault: false,
  core7Eligible: false,
});
