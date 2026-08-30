export const COMMERCIAL_STATUS = Object.freeze({
  CONFIRMED: "CONFIRMED",
  SIMULATION: "SIMULATION",
  TO_CONFIRM: "TO_CONFIRM",
  NOT_FOR_SALE: "NOT_FOR_SALE",
});

export const PRODUCT_CONFIG = Object.freeze({
  gus: Object.freeze({
    id: "gus",
    name: "G.U.S.+",
    abcd: "A · Absorb",
    role: "ตัวช่วยด้าน gut / digestive routine",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM,
  }),
  proteinHmb: Object.freeze({
    id: "protein-hmb",
    name: "Protein HMB+",
    abcd: "B · Build",
    role: "protein / muscle-maintenance support ในบริบทอาหารและการขยับที่เหมาะสม",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM,
  }),
  control: Object.freeze({
    id: "control",
    name: "พฤติกรรม",
    abcd: "C · Control",
    role: "สิ่งที่คนเลือกและลงมือทำเอง",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.NOT_FOR_SALE,
  }),
  vitaMatrix: Object.freeze({
    id: "vita-matrix",
    name: "Vita Matrix",
    abcd: "D · Daily Balance",
    role: "Daily Balance · water-phase support",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM,
  }),
  astaMega: Object.freeze({
    id: "astamega",
    name: "AstaMega+",
    abcd: "D · Daily Balance",
    role: "Daily Balance · oil-phase support",
    price: null,
    xv: null,
    effectiveDate: null,
    status: COMMERCIAL_STATUS.TO_CONFIRM,
  }),
});

// These placeholder values preserve a playable economy while the commercial
// plan is being reconfirmed. TO_CONFIRM must always be visible beside them;
// they are not an official price, qualification, or income promise.
export const TUTORIAL_OFFER = Object.freeze({
  id: "routinex-game-simulation",
  name: "RoutineX 28 วัน",
  price: 7490,
  xv: 7000,
  effectiveDate: null,
  status: COMMERCIAL_STATUS.TO_CONFIRM,
});

export const INCOME_RULE = Object.freeze({
  id: "active-retail-game-simulation",
  effectiveDate: null,
  status: COMMERCIAL_STATUS.TO_CONFIRM,
  tiers: Object.freeze([
    Object.freeze({ min: 0, max: 39999, rate: 0.2, label: "20%" }),
    Object.freeze({ min: 40000, max: 99999, rate: 0.23, label: "23%" }),
    Object.freeze({ min: 100000, max: null, rate: 0.25, label: "25%" }),
  ]),
});

export function getRetailTier(xv) {
  const amount = Math.max(0, Number(xv || 0));
  return INCOME_RULE.tiers.find((tier) => tier.max == null || amount <= tier.max)
    || INCOME_RULE.tiers[0];
}

export function canRenderOfficialCommercialValue(item) {
  return item?.status === COMMERCIAL_STATUS.CONFIRMED;
}

export function commercialStatusLabel(status) {
  if (status === COMMERCIAL_STATUS.CONFIRMED) return "ยืนยันแล้ว";
  if (status === COMMERCIAL_STATUS.SIMULATION) return "ตัวเลขจำลองในเกม";
  if (status === COMMERCIAL_STATUS.NOT_FOR_SALE) return "ไม่มีขาย";
  return "TO_CONFIRM · รอยืนยัน";
}
