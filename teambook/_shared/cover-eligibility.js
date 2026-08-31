/* TeamBook cover policy.

   Cover eligibility is intentionally independent from rarity. Every real
   collectible card a player owns can be used as a book cover — Common is a
   collectible too, not a lower-class cosmetic. Non-reward/generic cards stay
   excluded so internal placeholders can never leak into cover pickers. */

export function cardCanBePartyCover(card) {
  return !!card?.eligibility?.reward;
}
