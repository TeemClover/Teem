// Shared source, based on Product.md. Owner-confirmed sales data belongs here.
export const config = {
  salesMode: 'preview',
  basePath: "/hamburg",
  product: {
    id: 'hbg-original-250', packPieces: 2, targetNetWeightGrams: 250,
    weightConfirmed: false,
    originClaim: 'ใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสม',
    ingredientsText: null, allergenText: null, storageInstructions: null,
    shelfLifeText: null, reheatInstructions: null, stockPacks: null
  },
  offers: [
    { id: 'single', packs: 1, priceBaht: 179 },
    { id: 'trio', packs: 3, priceBaht: 499 },
    { id: 'stock', packs: 5, priceBaht: 799 }
  ],
  commercial: {
    pricesConfirmed: false, orderChannel: null, orderDestination: null,
    sellerName: null, contactText: null, deliveryZones: null,
    shippingRules: null, fulfilmentText: null, issuePolicyText: null
  }
};
export const brandIds = ['homechew', 'tmt', 'noomjang'];
export const netWeightLabel = () => `${config.product.targetNetWeightGrams} กรัม${config.product.weightConfirmed ? '' : ' (ขนาดเป้าหมาย)'}`;
export const offerById = id => config.offers.find(offer => offer.id === id);
export function normalizeCart(cart) {
  return config.offers.flatMap(offer => {
    const quantity = Number(cart?.[offer.id]);
    return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99 ? [{ ...offer, quantity }] : [];
  });
}
export function totalCart(cart) {
  return normalizeCart(cart).reduce((total, item) => ({
    sets: total.sets + item.quantity,
    packs: total.packs + item.packs * item.quantity,
    pieces: total.pieces + item.packs * item.quantity * config.product.packPieces,
    subtotal: total.subtotal + item.priceBaht * item.quantity
  }), { sets: 0, packs: 0, pieces: 0, subtotal: 0 });
}
// Live ordering must revalidate prices and availability on a server before payment.
export function orderAdapter() {
  if (config.salesMode !== 'live') return null;
  const c = config.commercial;
  const p = config.product;
  if (!c.pricesConfirmed || !c.sellerName || !c.contactText || !c.deliveryZones ||
      !c.orderDestination || !p.weightConfirmed || !p.ingredientsText ||
      !p.allergenText || !p.storageInstructions || !p.shelfLifeText || !p.reheatInstructions) return null;
  try { const url = new URL(c.orderDestination); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
