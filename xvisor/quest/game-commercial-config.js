var COMMERCIAL_STATUS = Object.freeze({
  CONFIRMED: "CONFIRMED",
  SIMULATION: "SIMULATION",
  TO_CONFIRM: "TO_CONFIRM",
  NOT_FOR_SALE: "NOT_FOR_SALE"
});
var PRODUCT_CONFIG = Object.freeze({
  gus: Object.freeze({
    id: "gus",
    name: "G.U.S.+",
    abcd: "A · Absorb",
    role: "ตัวช่วยด้าน gut / digestive routine",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM
  }),
  proteinHmb: Object.freeze({
    id: "protein-hmb",
    name: "Protein HMB+",
    abcd: "B · Build",
    role: "protein / muscle-maintenance support ในบริบทอาหารและการขยับที่เหมาะสม",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM
  }),
  control: Object.freeze({
    id: "control",
    name: "พฤติกรรม",
    abcd: "C · Control",
    role: "สิ่งที่คนเลือกและลงมือทำเอง",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.NOT_FOR_SALE
  }),
  vitaMatrix: Object.freeze({
    id: "vita-matrix",
    name: "Vita Matrix",
    abcd: "D · Daily Balance",
    role: "Daily Balance · water-phase support",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM
  }),
  astaMega: Object.freeze({
    id: "astamega",
    name: "AstaMega+",
    abcd: "D · Daily Balance",
    role: "Daily Balance · oil-phase support",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM
  })
});
var TUTORIAL_OFFER = Object.freeze({
  id: "routinex-monthly",
  name: "RoutineX",
  price: 7490,
  xv: 7e3,
  cycle: "monthly",
  effectiveDate: null,
  status: COMMERCIAL_STATUS.SIMULATION
});
var XIRCLE_STARTER = Object.freeze({
  id: "xircle-band-scale",
  name: "Xircle Band + Scale",
  price: 4990,
  xv: 2495,
  cycle: "first_customer_only",
  effectiveDate: null,
  status: COMMERCIAL_STATUS.SIMULATION
});
var INCOME_RULE = Object.freeze({
  id: "active-retail-game-simulation",
  effectiveDate: null,
  status: COMMERCIAL_STATUS.TO_CONFIRM,
  tiers: Object.freeze([
    Object.freeze({ min: 0, max: 39999, rate: 0.2, label: "20%" }),
    Object.freeze({ min: 4e4, max: 99999, rate: 0.23, label: "23%" }),
    Object.freeze({ min: 1e5, max: null, rate: 0.25, label: "25%" })
  ])
});
var DIRECT_MENTORING_RULE = Object.freeze({
  id: "direct-mentoring",
  rate: 0.2,
  effectiveDate: null,
  source: "XVISOR_QUEST_PATCH_V7_3M",
  status: COMMERCIAL_STATUS.SIMULATION
});
var ORGANIZATION_INCOME_RULE = Object.freeze({
  id: "organization-income",
  rate: 0.05,
  effectiveDate: null,
  source: "XVISOR_QUEST_PATCH_V7_3M",
  status: COMMERCIAL_STATUS.SIMULATION
});
var BREAKAWAY_INCOME_RULE = Object.freeze({
  id: "breakaway-income",
  rate: 0.0175,
  effectiveDate: null,
  source: "XVISOR_QUEST_PATCH_V7_3M",
  status: COMMERCIAL_STATUS.SIMULATION
});
var ADS_GAMEPLAY_CONFIG = Object.freeze({
  budgetPerCampaign: 1e3,
  effectiveDate: null,
  status: COMMERCIAL_STATUS.SIMULATION
});
function getRetailTier(personalSalesBaht) {
  const amount = Math.max(0, Number(personalSalesBaht || 0));
  return INCOME_RULE.tiers.find((tier) => tier.max == null || amount <= tier.max) || INCOME_RULE.tiers[0];
}
function canRenderOfficialCommercialValue(item) {
  return item?.status === COMMERCIAL_STATUS.CONFIRMED;
}
function commercialStatusLabel(status) {
  if (status === COMMERCIAL_STATUS.CONFIRMED) return "ยืนยันแล้ว";
  if (status === COMMERCIAL_STATUS.SIMULATION) return "ตัวเลขจำลองในเกม";
  if (status === COMMERCIAL_STATUS.NOT_FOR_SALE) return "ไม่มีขาย";
  return "TO_CONFIRM · รอยืนยัน";
}

var BREAKAWAY_INCOME_RULE2 = Object.freeze({
  ...BREAKAWAY_INCOME_RULE,
  id: "breakaway-disabled-v8",
  rate: 0,
  status: COMMERCIAL_STATUS?.NOT_FOR_SALE || "NOT_FOR_SALE"
});
function getRetailTier2(personalXV) {
  const amount = Math.max(0, Number(personalXV || 0));
  return INCOME_RULE.tiers.find((tier) => tier.max == null || amount <= tier.max) || INCOME_RULE.tiers[0];
}
export {
  ADS_GAMEPLAY_CONFIG,
  BREAKAWAY_INCOME_RULE2 as BREAKAWAY_INCOME_RULE,
  COMMERCIAL_STATUS,
  DIRECT_MENTORING_RULE,
  INCOME_RULE,
  ORGANIZATION_INCOME_RULE,
  PRODUCT_CONFIG,
  TUTORIAL_OFFER,
  XIRCLE_STARTER,
  canRenderOfficialCommercialValue,
  commercialStatusLabel,
  getRetailTier2 as getRetailTier
};
