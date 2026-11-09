/**
 * Small, inspectable brand catalogue. No runtime fetch or personal assessment.
 * Download destinations verified from https://www.xircle.health/download and /app
 * on 2026-11-09. Existing local Habix/RoutineX references were reviewed for names
 * and roles only; this does not reapprove formula, health, price or label claims.
 * FIVES is a framework, not a product. C / Control is behavior, never a SKU.
 */

export const APP_LINKS = Object.freeze({
  download: 'https://www.xircle.health/download',
  ios: 'https://apps.apple.com/th/app/id6785562482',
  android: 'https://play.google.com/store/apps/details?id=health.xircle.app',
  official: 'https://www.xircle.health/app',
  portal: 'https://buy.xircle.health/login',
});

export const OFFICIAL_ART = Object.freeze({
  appIcon: '/xircle/assets/official/xircle-app-icon.webp',
  appStoreBadge: '/xircle/assets/official/app-store.svg',
  googlePlayBadge: '/xircle/assets/official/google-play.svg',
  logo: '/xircle/assets/official/xircle-logo-light.svg',
  band: '/xircle/assets/official/band-onyx.webp',
  scale: '/xircle/assets/official/scale-lifestyle.webp',
});

export const HABIX_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'gus', name: 'G.U.S.+', stage: 'A', role: 'Absorb',
    image: '/xircle/assets/product/gus-320.webp',
    imageAlt: 'ภาพผลิตภัณฑ์ G.U.S.+',
    summary: 'ใยอาหารหลายชนิดในขั้น A — Absorb',
    href: '/xircle/doc/habix/gus/', source: '/xircle/doc/habix/gus/',
  }),
  Object.freeze({
    id: 'protein-hmb', name: 'Protein HMB+', stage: 'B', role: 'Build',
    image: '/xircle/assets/product/protein-hmb-520.webp',
    imageAlt: 'ภาพผลิตภัณฑ์ Protein HMB+',
    summary: 'โปรตีนผสม HMB สำหรับขั้น B — Build',
    href: '/xircle/doc/habix/protein-hmb/', source: '/xircle/doc/habix/protein-hmb/',
  }),
  Object.freeze({
    id: 'astamega', name: 'AstaMega+', stage: 'D', role: 'Oil Phase',
    image: '/xircle/assets/product/astamega-320.webp',
    imageAlt: 'ภาพผลิตภัณฑ์ AstaMega+',
    summary: 'ส่วนหนึ่งของ Daily Balance ฝั่ง Oil Phase',
    href: '/xircle/doc/habix/astamega/', source: '/xircle/doc/habix/astamega/',
  }),
  Object.freeze({
    id: 'vita-matrix', name: 'Vita Matrix', stage: 'D', role: 'Water Phase',
    image: '/xircle/assets/product/vita-matrix-320.webp',
    imageAlt: 'ภาพผลิตภัณฑ์ Vita Matrix',
    summary: 'วิตามินและแร่ธาตุฝั่ง Water Phase ของ Daily Balance',
    href: '/xircle/doc/habix/vita-matrix/', source: '/xircle/doc/habix/vita-matrix/',
  }),
  Object.freeze({
    id: 'flavor', name: 'Flavor+', stage: null, role: 'Taste & variety',
    image: null, imageAlt: '',
    summary: 'เพิ่มรสชาติให้ Protein HMB+ และความหลากหลายให้รูทีน',
    href: '/xircle/doc/habix/flavor/', source: '/xircle/doc/habix/flavor/',
  }),
]);

export const ROUTINE_STAGES = Object.freeze([
  Object.freeze({
    id: 'absorb', letter: 'A', title: 'Absorb',
    summary: 'เริ่มรู้จักใยอาหารใน G.U.S.+',
    href: '/routinex/absorb/', products: Object.freeze(['gus']),
    source: '/xircle/doc/routinex/abcd/',
  }),
  Object.freeze({
    id: 'build', letter: 'B', title: 'Build',
    summary: 'จัดโปรตีนให้เป็นส่วนหนึ่งของวัน',
    href: '/routinex/build/', products: Object.freeze(['protein-hmb']),
    source: '/xircle/doc/routinex/abcd/',
  }),
  Object.freeze({
    id: 'control', letter: 'C', title: 'Control',
    summary: 'สิ่งที่เลือกและทำทุกวัน — ขั้นนี้ไม่มีสินค้าขาย',
    href: '/xircle/doc/routinex/abcd/#control', products: Object.freeze([]),
    source: '/xircle/doc/routinex/abcd/#control',
  }),
  Object.freeze({
    id: 'balance', letter: 'D', title: 'Daily Balance',
    summary: 'AstaMega+ และ Vita Matrix คนละฝั่งของ Daily Balance',
    href: '/xircle/doc/routinex/abcd/#abcd', products: Object.freeze(['astamega', 'vita-matrix']),
    source: '/xircle/doc/routinex/abcd/',
  }),
]);

export const FIVES_FRAMEWORK = Object.freeze({
  name: 'FIVES', kind: 'framework',
  summary: '5 มุมมองที่ใช้เลือกและอธิบายส่วนผสม',
  terms: Object.freeze(['Functional', 'Intelligent', 'Value', 'Effective', 'Science']),
  href: '/xircle/doc/habix/fives/',
});
