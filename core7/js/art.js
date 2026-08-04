/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Original Art (Procedural SVG)

   Asset ต้นฉบับทั้งหมดของเกม สร้างด้วยโค้ดในไฟล์นี้:
   - โลโก้โคลเวอร์ 4 แฉก Metallic
   - กรอบการ์ด Premium + หน้าไพ่ FIRST HAND 28 ใบ
   - Generic Card 4 สี + หลังการ์ด
   - Icon / Pattern ประจำสี (Accessibility — ไม่พึ่งสีอย่างเดียว)

   งานทั้งหมดเป็น Original ไม่เลียนแบบ Trade Dress ของ TCG ใด
   ═══════════════════════════════════════════════════════════════ */

import { COLOR_META, cardById } from './cards.js';

export const CORE7_ART_VERSION = '0.5';

/* FIRST HAND v0.4 — ภาพเต็มใบครบ 28 ใบ */
export const FIRST_HAND_ART = {
  'fh-red-desire': '/core7/assets/cards/fh-red-desire.webp',
  'fh-red-joy': '/core7/assets/cards/fh-red-joy.webp',
  'fh-red-taste': '/core7/assets/cards/fh-red-taste.webp',
  'fh-red-passion': '/core7/assets/cards/fh-red-passion.webp',
  'fh-red-courage': '/core7/assets/cards/fh-red-courage.webp',
  'fh-red-warmth': '/core7/assets/cards/fh-red-warmth.webp',
  'fh-red-celebration': '/core7/assets/cards/fh-red-celebration.webp',
  'fh-blue-clarity': '/core7/assets/cards/fh-blue-clarity.webp',
  'fh-blue-perspective': '/core7/assets/cards/fh-blue-perspective.webp',
  'fh-blue-wisdom': '/core7/assets/cards/fh-blue-wisdom.webp',
  'fh-blue-curiosity': '/core7/assets/cards/fh-blue-curiosity.webp',
  'fh-blue-strategy': '/core7/assets/cards/fh-blue-strategy.webp',
  'fh-blue-reflection': '/core7/assets/cards/fh-blue-reflection.webp',
  'fh-blue-choice': '/core7/assets/cards/fh-blue-choice.webp',
  'fh-green-discipline': '/core7/assets/cards/fh-green-discipline.webp',
  'fh-green-consistency': '/core7/assets/cards/fh-green-consistency.webp',
  'fh-green-balance': '/core7/assets/cards/fh-green-balance.webp',
  'fh-green-patience': '/core7/assets/cards/fh-green-patience.webp',
  'fh-green-care': '/core7/assets/cards/fh-green-care.webp',
  'fh-green-recovery': '/core7/assets/cards/fh-green-recovery.webp',
  'fh-green-commitment': '/core7/assets/cards/fh-green-commitment.webp',
  'fh-gray-observe': '/core7/assets/cards/fh-gray-observe.webp',
  'fh-gray-measure': '/core7/assets/cards/fh-gray-measure.webp',
  'fh-gray-build': '/core7/assets/cards/fh-gray-build.webp',
  'fh-gray-repair': '/core7/assets/cards/fh-gray-repair.webp',
  'fh-gray-connect': '/core7/assets/cards/fh-gray-connect.webp',
  'fh-gray-adapt': '/core7/assets/cards/fh-gray-adapt.webp',
  'fh-gray-iterate': '/core7/assets/cards/fh-gray-iterate.webp',
};

export const GENERIC_CARD_ART = {
  RED: '/core7/assets/cards/gen-red.webp',
  BLUE: '/core7/assets/cards/gen-blue.webp',
  GREEN: '/core7/assets/cards/gen-green.webp',
  GRAY: '/core7/assets/cards/gen-gray.webp',
};

export function cardArtHref(cardId) {
  const card = cardById(cardId);
  if (!card) return '';
  return card.generic ? GENERIC_CARD_ART[card.color] : FIRST_HAND_ART[cardId];
}

/* ── สีหลักของแบรนด์ ── */
export const BRAND = {
  emerald: '#0A2818', felt: '#0E3E26', cream: '#F8F6F0',
  gold: '#BE9442', goldLight: '#E3C57E', charcoal: '#20241F',
};

let uid = 0;
const nid = p => `${p}${(++uid).toString(36)}`;

/* ═══ โลโก้ myClover — โคลเวอร์ 4 แฉกรูปหัวใจ ═══
   ใบเป็นหัวใจ ปลายชี้เข้ากลาง: แดงบนซ้าย ฟ้าบนขวา เขียวล่างซ้าย เทาล่างขวา
   ตามภาพต้นแบบของแบรนด์ (ใช้ทั้ง Nav, Favicon และหลังการ์ดทุกใบ) */
export function cloverLogo(size = 64, { ring = true } = {}) {
  const id = nid('cl');
  /* หัวใจ: ปลายอยู่ที่ origin ตัวใบชี้ขึ้น (-y) — หมุนเข้าตำแหน่งทีละใบ */
  const HEART = 'M0 0 C -20 -14 -30 -26 -30 -38 C -30 -50 -21 -57 -12 -57 ' +
    'C -5.5 -57 -1.5 -53 0 -47 C 1.5 -53 5.5 -57 12 -57 C 21 -57 30 -50 30 -38 ' +
    'C 30 -26 20 -14 0 0 Z';
  const leaf = (rot, key) => `
    <g transform="translate(50 50) rotate(${rot}) translate(0 -2.5) scale(.7)">
      <path d="${HEART}" fill="url(#${id}-${key})" stroke="url(#${id}-au)" stroke-width="3.4"/>
      <path d="M-20 -44 C -14 -50 -6 -52 0 -50" stroke="rgba(255,255,255,.4)"
        stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </g>`;
  const grad = (key, c1, c2) => `
    <radialGradient id="${id}-${key}" cx="38%" cy="26%" r="95%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </radialGradient>`;
  const C = COLOR_META;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img"
    aria-label="โลโก้ myClover โคลเวอร์ 4 แฉกรูปหัวใจ 4 สี">
    <defs>
      <linearGradient id="${id}-au" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND.goldLight}"/>
        <stop offset="45%" stop-color="${BRAND.gold}"/>
        <stop offset="70%" stop-color="#8a6a2c"/>
        <stop offset="100%" stop-color="${BRAND.goldLight}"/>
      </linearGradient>
      ${grad('red', '#e8604a', C.RED.deep)}
      ${grad('blue', '#5f9ede', C.BLUE.deep)}
      ${grad('green', '#4fae78', C.GREEN.deep)}
      ${grad('gray', '#b9bfc6', '#5d6268')}
    </defs>
    ${ring ? `<circle cx="50" cy="50" r="48" fill="none" stroke="url(#${id}-au)" stroke-width="2"/>` : ''}
    ${leaf(-45, 'red')}${leaf(45, 'blue')}${leaf(225, 'green')}${leaf(135, 'gray')}
    <circle cx="50" cy="50" r="4.6" fill="url(#${id}-au)"/>
    <circle cx="48.8" cy="48.8" r="1.5" fill="rgba(255,255,255,.75)"/>
  </svg>`;
}

/* ═══ Icon ประจำสี (เส้นเดียวกันทั้งชุด — ใช้ currentColor) ═══ */
export function colorIcon(color, size = 20) {
  const paths = {
    /* flame — RED */
    RED: '<path d="M12 3 C13 7 17 8.5 17 13 A5 5 0 0 1 7 13 C7 10 9 8.6 9.5 6.5 C10.6 8 11.5 8.6 11.5 10.5 C12.8 9.4 12.4 5.8 12 3 Z"/>',
    /* water drop — BLUE */
    BLUE: '<path d="M12 2.5 C10.2 5.5 5.8 9.6 5.8 14 A6.2 6.2 0 0 0 18.2 14 C18.2 9.6 13.8 5.5 12 2.5 Z M8.6 14.2 C8.8 16.3 10.1 17.4 12 17.7 C9.5 18.1 7.6 16.6 7.6 14.4 C7.6 13.2 8.1 12.2 8.8 11.2 C8.6 12.3 8.5 13.3 8.6 14.2 Z"/>',
    /* leaf — GREEN */
    GREEN: '<path d="M19 5 C11 5 5.6 9.4 5.6 15.6 C5.6 17 5.9 18.2 6.3 19 L8 17.4 C7.8 16.8 7.7 16.2 7.7 15.6 C7.7 10.8 12 7.3 19 7.1 C18.6 12.6 15.9 16.6 10.6 17.6 L9 19.1 C9.9 19.4 10.9 19.6 12 19.6 C17.1 19.6 20.8 15 21 5.2 Z M4 21 C7 17.8 10 14.8 14.5 11.5 C10.4 13.6 6.9 16.4 3.2 20.2 Z"/>',
    /* gear — GRAY */
    GRAY: '<path d="M12 8.6 A3.4 3.4 0 1 0 12 15.4 A3.4 3.4 0 0 0 12 8.6 Z M12 10.6 A1.4 1.4 0 1 1 12 13.4 A1.4 1.4 0 0 1 12 10.6 Z M10.7 3 L10.3 5.4 C9.6 5.7 9 6 8.4 6.5 L6.1 5.7 L4.8 8 L6.6 9.5 C6.5 10.3 6.5 11 6.6 11.7 L4.8 13.2 L6.1 15.5 L8.4 14.7 C9 15.2 9.6 15.6 10.3 15.8 L10.7 18.2 H13.3 L13.7 15.8 C14.4 15.6 15 15.2 15.6 14.7 L17.9 15.5 L19.2 13.2 L17.4 11.7 C17.5 11 17.5 10.3 17.4 9.5 L19.2 8 L17.9 5.7 L15.6 6.5 C15 6 14.4 5.7 13.7 5.4 L13.3 3 Z" transform="translate(0 1.5)"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"
    aria-hidden="true">${paths[color]}</svg>`;
}

/* ═══ Pattern ประจำสี — ใช้บนแถบการ์ด/ชิป เพื่อผู้ที่แยกสียาก ═══ */
export function patternDefs(idPrefix = 'pat') {
  const C = COLOR_META;
  return `<defs>
    <pattern id="${idPrefix}-RED" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="${C.RED.hex}"/>
      <path d="M0 10 Q3.5 4 7 10 Q10.5 4 14 10" stroke="rgba(255,255,255,.5)" stroke-width="2" fill="none"/>
    </pattern>
    <pattern id="${idPrefix}-BLUE" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="${C.BLUE.hex}"/>
      <circle cx="8" cy="8" r="3.4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.8"/>
      <circle cx="8" cy="8" r="1" fill="rgba(255,255,255,.6)"/>
    </pattern>
    <pattern id="${idPrefix}-GREEN" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="${C.GREEN.hex}"/>
      <path d="M7 2 L12 6 L7 12 L2 6 Z" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.8"/>
    </pattern>
    <pattern id="${idPrefix}-GRAY" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="${C.GRAY.hex}"/>
      <path d="M2 2 H12 V12 H2 Z M7 2 V12 M2 7 H12" stroke="rgba(255,255,255,.4)" stroke-width="1.4" fill="none"/>
    </pattern>
  </defs>`;
}

/* ═══ ฉากภาพต้นฉบับ 28 ใบ ═══
   วาดใน viewBox 0 0 240 240 (จะถูกวางในหน้าต่างภาพของการ์ด)
   สไตล์ร่วม: ฉากเรียบ อบอุ่น เล่าอารมณ์ของคำ + แสงทองของบ้าน myClover */

const CREAM = BRAND.cream, GOLD = BRAND.gold, GOLDL = BRAND.goldLight;

function sceneBg(id, top, bottom) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/>
  </linearGradient></defs><rect width="240" height="240" fill="url(#${id})"/>`;
}

const SCENES = {
  /* ── 🔴 RED ── */
  'fh-red-desire': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F7E3D8', '#E8BFA8')}
    <ellipse cx="120" cy="190" rx="86" ry="22" fill="#B0563E" opacity=".25"/>
    <ellipse cx="120" cy="182" rx="70" ry="18" fill="${CREAM}"/>
    <ellipse cx="120" cy="176" rx="52" ry="13" fill="#C8442C"/>
    <ellipse cx="112" cy="173" rx="20" ry="5" fill="#E06A50"/>
    <path d="M96 150 C96 132 116 132 116 118 M124 150 C124 136 140 136 140 120"
      stroke="#B0563E" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M30 96 C60 88 84 96 104 120 L96 132 C76 112 56 104 34 110 Z"
      fill="#8F2B1A"/>
    <circle cx="104" cy="124" r="9" fill="#8F2B1A"/>
    <circle cx="196" cy="44" r="20" fill="${GOLDL}" opacity=".6"/>`;
  },
  'fh-red-joy': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F9E8D6', '#EFC9A9')}
    <rect x="24" y="150" width="192" height="12" rx="6" fill="#8F2B1A"/>
    <rect x="40" y="162" width="10" height="46" fill="#8F2B1A" opacity=".7"/>
    <rect x="190" y="162" width="10" height="46" fill="#8F2B1A" opacity=".7"/>
    <circle cx="76" cy="112" r="24" fill="#C8442C"/>
    <circle cx="164" cy="112" r="24" fill="#E06A50"/>
    <path d="M64 116 Q76 128 88 116 M152 116 Q164 128 176 116"
      stroke="${CREAM}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M104 74 Q110 60 120 68 M128 60 Q136 46 146 56 M96 52 Q100 42 110 46"
      stroke="${GOLD}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="120" cy="146" rx="26" ry="8" fill="${CREAM}"/>`;
  },
  'fh-red-taste': () => {
    const g = nid('s');
    return `${sceneBg(g, '#FAEDDD', '#EFC0A4')}
    <ellipse cx="120" cy="186" rx="78" ry="20" fill="#B0563E" opacity=".22"/>
    <path d="M52 168 A68 40 0 0 0 188 168 L182 148 H58 Z" fill="#C8442C"/>
    <ellipse cx="120" cy="148" rx="62" ry="14" fill="#E06A50"/>
    <path d="M150 120 L196 74 C202 68 210 76 204 82 L158 128 Z" fill="${GOLD}"/>
    <ellipse cx="150" cy="126" rx="14" ry="9" transform="rotate(-45 150 126)" fill="${GOLDL}"/>
    <path d="M100 108 C100 94 112 94 112 82 M124 110 C124 98 134 98 134 88"
      stroke="#B0563E" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".6"/>`;
  },
  'fh-red-passion': () => {
    const g = nid('s');
    return `${sceneBg(g, '#3A1611', '#7A2417')}
    <rect x="52" y="176" width="136" height="14" rx="7" fill="#20100C"/>
    <path d="M120 44 C132 76 168 88 168 134 A48 48 0 0 1 72 134 C72 106 92 92 98 70 C108 84 116 90 116 108 C128 96 124 66 120 44 Z"
      fill="#E06A50"/>
    <path d="M120 84 C126 102 146 110 146 136 A26 26 0 0 1 94 136 C94 120 106 112 110 98 C114 106 120 110 120 120 C126 112 122 96 120 84 Z"
      fill="${GOLDL}"/>
    <circle cx="60" cy="60" r="3" fill="${GOLDL}"/><circle cx="184" cy="80" r="2.5" fill="${GOLDL}"/>
    <circle cx="172" cy="40" r="2" fill="${GOLDL}"/>`;
  },
  'fh-red-courage': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F8E6D2', '#ECC3A0')}
    <circle cx="96" cy="96" r="30" fill="#C8442C"/>
    <circle cx="86" cy="90" r="4" fill="${CREAM}"/>
    <ellipse cx="96" cy="108" rx="10" ry="6" fill="${CREAM}"/>
    <rect x="82" y="126" width="28" height="52" rx="12" fill="#8F2B1A"/>
    <path d="M126 118 L158 96 M158 96 L152 108 M158 96 L146 92"
      stroke="#8F2B1A" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M168 66 L173 78 L186 79 L176 88 L179 100 L168 93 L157 100 L160 88 L150 79 L163 78 Z"
      fill="${GOLD}"/>
    <ellipse cx="120" cy="200" rx="76" ry="14" fill="#B0563E" opacity=".2"/>`;
  },
  'fh-red-warmth': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F6E0CE', '#E5B896')}
    <path d="M74 120 A46 46 0 0 0 166 120 V160 A46 30 0 0 1 74 160 Z" fill="#C8442C"/>
    <ellipse cx="120" cy="120" rx="46" ry="14" fill="#E06A50"/>
    <path d="M166 130 A18 16 0 0 1 166 162" stroke="#8F2B1A" stroke-width="8" fill="none"/>
    <path d="M60 132 C48 138 46 158 62 166 M180 132 C192 138 194 158 178 166"
      stroke="#B0563E" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M100 96 C100 82 112 82 112 68 M132 96 C132 84 142 84 142 72"
      stroke="#B0563E" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".6"/>
    <circle cx="120" cy="40" r="14" fill="${GOLDL}" opacity=".7"/>`;
  },
  'fh-red-celebration': () => {
    const g = nid('s');
    return `${sceneBg(g, '#2E1310', '#6E2015')}
    <path d="M20 40 Q120 88 220 40" stroke="${GOLD}" stroke-width="3" fill="none"/>
    ${[40, 70, 100, 130, 160, 190].map((x, i) =>
      `<circle cx="${x}" cy="${58 + Math.round(14 * Math.sin((i + 1) * 1.05))}" r="6"
        fill="${i % 2 ? GOLDL : '#E06A50'}"/>`).join('')}
    <rect x="30" y="156" width="180" height="10" rx="5" fill="#3A1611"/>
    <rect x="30" y="156" width="180" height="4" rx="2" fill="${GOLD}" opacity=".7"/>
    <ellipse cx="80" cy="150" rx="22" ry="8" fill="${CREAM}"/>
    <ellipse cx="150" cy="150" rx="18" ry="7" fill="#E06A50"/>
    <path d="M186 132 L189 140 L197 141 L191 146 L193 154 L186 150 L179 154 L181 146 L175 141 L183 140 Z" fill="${GOLDL}"/>`;
  },

  /* ── 💧 BLUE ── */
  'fh-blue-clarity': () => {
    const g = nid('s');
    return `${sceneBg(g, '#BFD9EE', '#7FB0D8')}
    <circle cx="120" cy="112" r="42" fill="${GOLDL}" opacity=".9"/>
    <circle cx="120" cy="112" r="30" fill="#FDF6E3"/>
    <path d="M-10 96 C30 82 58 90 78 104 C60 116 28 120 -10 112 Z" fill="${CREAM}" opacity=".95"/>
    <path d="M250 128 C210 112 180 118 158 132 C178 146 214 150 250 142 Z" fill="${CREAM}" opacity=".95"/>
    <path d="M20 190 C70 170 170 170 220 190 L220 240 L20 240 Z" fill="#2C6BA8"/>`;
  },
  'fh-blue-perspective': () => {
    const g = nid('s');
    return `${sceneBg(g, '#CFE2F1', '#8FB6D9')}
    <path d="M0 150 L90 96 L150 128 L240 82 L240 240 L0 240 Z" fill="#1B4470"/>
    <path d="M0 190 L80 150 L140 176 L240 130 L240 240 L0 240 Z" fill="#2C6BA8"/>
    <path d="M96 196 C120 186 150 184 180 190" stroke="${GOLDL}" stroke-width="4"
      stroke-dasharray="2 8" fill="none" stroke-linecap="round"/>
    <circle cx="60" cy="106" r="9" fill="${BRAND.charcoal}"/>
    <rect x="53" y="115" width="14" height="24" rx="6" fill="${BRAND.charcoal}"/>`;
  },
  'fh-blue-wisdom': () => {
    const g = nid('s');
    return `${sceneBg(g, '#D8E7F2', '#A8C6E0')}
    <circle cx="164" cy="84" r="40" fill="#2E7D4F"/>
    <circle cx="140" cy="102" r="30" fill="#3B915F"/>
    <circle cx="186" cy="104" r="28" fill="#256B44"/>
    <rect x="158" y="118" width="12" height="66" fill="#6B4A2A"/>
    <path d="M40 176 L104 164 L104 196 L40 208 Z M104 164 L168 176 L168 208 L104 196 Z"
      fill="${CREAM}" stroke="#2C6BA8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M52 180 L94 172 M52 188 L94 180 M116 172 L156 180 M116 180 L156 188"
      stroke="#8FB6D9" stroke-width="2.5"/>`;
  },
  'fh-blue-curiosity': () => {
    const g = nid('s');
    return `${sceneBg(g, '#132A44', '#1B4470')}
    ${[[40, 40, 2.5], [80, 24, 2], [204, 36, 3], [170, 20, 2], [210, 90, 2], [30, 90, 2]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}"/>`).join('')}
    <path d="M138 64 L146 56 L150 60 L142 68 Z" fill="${GOLDL}"/>
    <circle cx="150" cy="52" r="9" fill="none" stroke="${GOLDL}" stroke-width="2.5"/>
    <rect x="66" y="98" width="96" height="22" rx="11" transform="rotate(-28 114 109)" fill="#4C82B8"/>
    <rect x="150" y="62" width="26" height="14" rx="7" transform="rotate(-28 163 69)" fill="#2C6BA8"/>
    <path d="M96 128 L84 192 M108 124 L128 192" stroke="#4C82B8" stroke-width="8" stroke-linecap="round"/>`;
  },
  'fh-blue-strategy': () => {
    const g = nid('s');
    return `${sceneBg(g, '#E8EFF5', '#C2D7E8')}
    <path d="M28 32 L100 48 L164 30 L212 46 L212 200 L148 214 L84 198 L28 212 Z"
      fill="${CREAM}" stroke="#2C6BA8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M56 170 C80 130 120 150 136 110 C146 86 170 84 184 72"
      stroke="#2C6BA8" stroke-width="3.5" stroke-dasharray="7 6" fill="none"/>
    ${[[56, 170], [136, 110], [184, 72]].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="7" fill="#C8442C"/>
      <circle cx="${x}" cy="${y}" r="2.6" fill="${CREAM}"/>`).join('')}
    <path d="M182 60 L186 48 L190 60 Z" fill="${GOLD}"/>`;
  },
  'fh-blue-reflection': () => {
    const g = nid('s');
    return `${sceneBg(g, '#CFE0EE', '#9EBFDB')}
    <path d="M40 118 L104 58 L150 100 L196 66 L240 118 Z" fill="#1B4470"/>
    <rect x="0" y="118" width="240" height="122" fill="#2C6BA8"/>
    <path d="M40 118 L104 178 L150 136 L196 170 L240 118 Z" fill="#173C61" opacity=".8"/>
    <path d="M20 140 H70 M96 160 H150 M170 146 H224" stroke="#8FB6D9" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <circle cx="196" cy="42" r="13" fill="${GOLDL}"/>`;
  },
  'fh-blue-choice': () => {
    const g = nid('s');
    return `${sceneBg(g, '#14273E', '#2C5075')}
    <path d="M112 240 L112 150 C112 110 70 104 52 76 M128 240 L128 150 C128 110 170 104 188 76 M120 150 L120 60"
      stroke="#8FB6D9" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="52" cy="64" r="12" fill="#E06A50"/>
    <circle cx="120" cy="46" r="12" fill="${GOLDL}"/>
    <circle cx="188" cy="64" r="12" fill="#57A97B"/>
    ${[52, 120, 188].map((x, i) => `<path d="M${x} ${i === 1 ? 60 : 78} L${x} ${i === 1 ? 76 : 94}"
      stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-linecap="round"/>`).join('')}`;
  },

  /* ── 🟢 GREEN ── */
  'fh-green-discipline': () => {
    const g = nid('s');
    return `${sceneBg(g, '#12314F', '#3E6E8E')}
    <circle cx="120" cy="128" r="34" fill="${GOLDL}" opacity=".85"/>
    <rect x="0" y="128" width="240" height="112" fill="#1B5233"/>
    <path d="M60 176 C60 166 68 160 78 160 L104 160 C118 160 124 168 124 176 L124 184 L60 184 Z"
      fill="${CREAM}"/>
    <path d="M60 184 H124 L122 192 H62 Z" fill="#2E7D4F"/>
    <path d="M134 176 C134 166 142 160 152 160 L178 160 C192 160 198 168 198 176 L198 184 L134 184 Z"
      fill="${CREAM}"/>
    <path d="M134 184 H198 L196 192 H136 Z" fill="#2E7D4F"/>
    <path d="M70 166 C80 162 94 162 104 166" stroke="#2E7D4F" stroke-width="2.5" fill="none"/>
    <path d="M144 166 C154 162 168 162 178 166" stroke="#2E7D4F" stroke-width="2.5" fill="none"/>`;
  },
  'fh-green-consistency': () => {
    const g = nid('s');
    return `${sceneBg(g, '#E4F0E8', '#BBDCC8')}
    <rect x="0" y="186" width="240" height="54" fill="#2E7D4F"/>
    <rect x="52" y="162" width="6" height="26" fill="#6B4A2A"/>
    <circle cx="55" cy="152" r="14" fill="#57A97B"/>
    <rect x="112" y="146" width="8" height="42" fill="#6B4A2A"/>
    <circle cx="116" cy="128" r="22" fill="#3B915F"/>
    <rect x="176" y="122" width="10" height="66" fill="#6B4A2A"/>
    <circle cx="181" cy="94" r="32" fill="#2E7D4F"/>
    <circle cx="168" cy="106" r="16" fill="#57A97B" opacity=".85"/>
    <path d="M30 210 H210" stroke="#1B5233" stroke-width="3" stroke-dasharray="3 10" stroke-linecap="round"/>`;
  },
  'fh-green-balance': () => {
    const g = nid('s');
    return `${sceneBg(g, '#DFEDE4', '#AFD4BE')}
    <path d="M0 196 C60 180 90 200 140 192 C180 186 214 196 240 190 L240 240 L0 240 Z" fill="#2C6BA8" opacity=".5"/>
    <path d="M0 206 C70 194 150 210 240 200 L240 240 L0 240 Z" fill="#2E7D4F"/>
    <ellipse cx="120" cy="196" rx="52" ry="10" fill="#1B5233" opacity=".3"/>
    <path d="M84 196 C82 178 100 174 118 176 C142 178 152 172 150 188 C149 197 130 199 116 197 C100 196 86 199 84 196 Z" fill="#7B8378"/>
    <path d="M96 176 C92 158 112 152 126 156 C142 160 148 158 146 170 C144 180 122 180 112 178 Z" fill="#9AA79C"/>
    <path d="M104 154 C104 140 120 136 130 140 C140 144 142 148 140 154 C136 162 112 162 104 154 Z" fill="#6E7378"/>
    <path d="M112 136 C112 126 124 122 132 128 C138 132 136 138 132 140 C124 142 112 142 112 136 Z" fill="#B9C4BB"/>`;
  },
  'fh-green-patience': () => {
    const g = nid('s');
    return `${sceneBg(g, '#E9F2EC', '#C4E0CF')}
    <rect x="0" y="150" width="240" height="90" fill="#6B4A2A"/>
    <rect x="0" y="150" width="240" height="8" fill="#57A97B" opacity=".5"/>
    <ellipse cx="120" cy="182" rx="16" ry="20" fill="#8A6438"/>
    <ellipse cx="120" cy="182" rx="9" ry="13" fill="#BE9442"/>
    <path d="M120 168 C120 150 118 142 120 128 M120 128 C110 130 104 122 104 112 C114 110 122 116 120 128 M120 136 C130 138 138 130 138 120 C128 118 120 124 120 136"
      stroke="#2E7D4F" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M120 202 C112 210 104 212 98 220 M120 202 C128 212 138 214 142 222"
      stroke="${CREAM}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
  },
  'fh-green-care': () => {
    const g = nid('s');
    return `${sceneBg(g, '#E6F1E9', '#BFDCCB')}
    <path d="M50 160 C50 140 70 132 92 138 L120 148 L148 138 C170 132 190 140 190 160 C190 186 160 200 120 200 C80 200 50 186 50 160 Z"
      fill="${CREAM}" stroke="#D9C9A6" stroke-width="3"/>
    <path d="M74 158 C80 150 94 148 104 152 M166 158 C160 150 146 148 136 152"
      stroke="#D9C9A6" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="120" cy="158" rx="20" ry="10" fill="#8A6438"/>
    <path d="M120 152 V118 M120 128 C110 130 102 122 102 110 C112 108 120 116 120 128 M120 134 C130 136 140 128 140 116 C130 114 120 122 120 134"
      stroke="#2E7D4F" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  },
  'fh-green-recovery': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F4EFDD', '#CBE3D2')}
    <circle cx="120" cy="96" r="34" fill="${GOLDL}"/>
    ${[0, 30, 60, 90, 120, 150, 180].map(a => `
      <path d="M120 96 L${120 + 62 * Math.cos((a - 180) * Math.PI / 180)} ${96 + 62 * Math.sin((a - 180) * Math.PI / 180)}"
        stroke="${GOLDL}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`).join('')}
    <path d="M0 190 C60 174 180 174 240 190 L240 240 L0 240 Z" fill="#2E7D4F"/>
    ${[[54, 160], [96, 148], [150, 152], [190, 162]].map(([x, y]) => `
      <path d="M${x} ${y} C${x} ${y + 8} ${x - 7} ${y + 12} ${x} ${y + 18} C${x + 7} ${y + 12} ${x} ${y + 8} ${x} ${y} Z"
        fill="#2C6BA8" opacity=".55"/>`).join('')}`;
  },
  'fh-green-commitment': () => {
    const g = nid('s');
    return `${sceneBg(g, '#DCEBE0', '#A9CDB8')}
    <path d="M0 240 L88 96 L128 150 L172 60 L240 240 Z" fill="#2E7D4F"/>
    <path d="M0 240 L88 96 L128 150 L100 240 Z" fill="#1B5233"/>
    <path d="M172 60 L172 34 L196 42 L172 50" fill="#C8442C" stroke="#C8442C" stroke-width="3" stroke-linejoin="round"/>
    ${[[60, 216], [76, 196], [94, 178], [112, 162], [130, 142], [148, 118], [162, 92]]
      .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="2.8"
        transform="rotate(${-28 - i * 3} ${x} ${y})" fill="${CREAM}" opacity=".9"/>`).join('')}`;
  },

  /* ── ⚙️ GRAY ── */
  'fh-gray-observe': () => {
    const g = nid('s');
    return `${sceneBg(g, '#EDEEEA', '#CDD1CE')}
    <rect x="52" y="150" width="136" height="44" rx="8" fill="#9AA0A6"/>
    <circle cx="120" cy="172" r="12" fill="#6E7378"/>
    <circle cx="120" cy="172" r="5" fill="#43474C"/>
    <circle cx="112" cy="104" r="44" fill="rgba(255,255,255,.55)" stroke="${GOLD}" stroke-width="7"/>
    <circle cx="112" cy="104" r="44" fill="none" stroke="#43474C" stroke-width="2.5"/>
    <path d="M144 138 L176 172" stroke="${GOLD}" stroke-width="12" stroke-linecap="round"/>
    <path d="M96 92 A20 20 0 0 1 116 76" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  },
  'fh-gray-measure': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F1F1EE', '#D3D6D2')}
    <rect x="36" y="60" width="168" height="120" rx="6" fill="${CREAM}" stroke="#6E7378" stroke-width="3"/>
    <path d="M60 150 L110 96 L150 128 L184 84" stroke="#2C6BA8" stroke-width="3.5"
      stroke-dasharray="6 5" fill="none"/>
    <circle cx="110" cy="96" r="5" fill="#C8442C"/>
    <rect x="24" y="188" width="192" height="22" rx="4" fill="${GOLD}"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${36 + i * 14} 188 V${i % 4 === 0 ? 202 : 197}"
      stroke="#43474C" stroke-width="2.5"/>`).join('')}`;
  },
  'fh-gray-build': () => {
    const g = nid('s');
    return `${sceneBg(g, '#ECEDE9', '#C8CCC8')}
    <rect x="64" y="150" width="44" height="44" rx="6" fill="#6E7378"/>
    <rect x="112" y="150" width="44" height="44" rx="6" fill="#9AA0A6"/>
    <rect x="88" y="104" width="44" height="42" rx="6" fill="${GOLD}"/>
    <rect x="140" y="98" width="40" height="38" rx="6" fill="#B9C4BB" transform="rotate(12 160 117)"/>
    <path d="M150 92 L160 74 M156 96 L172 84" stroke="#6E7378" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="120" cy="206" rx="80" ry="10" fill="#43474C" opacity=".2"/>`;
  },
  'fh-gray-repair': () => {
    const g = nid('s');
    return `${sceneBg(g, '#E9EAE6', '#C6CAC6')}
    <circle cx="112" cy="128" r="56" fill="${CREAM}" stroke="#9AA0A6" stroke-width="4"/>
    <path d="M84 92 C100 116 108 136 104 168 M104 168 C120 150 132 130 148 96"
      stroke="${GOLD}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M172 176 L196 152 C206 158 206 170 198 178 C190 186 178 184 172 176 Z" fill="#6E7378"/>
    <path d="M176 172 L140 150" stroke="#6E7378" stroke-width="9" stroke-linecap="round"/>`;
  },
  'fh-gray-connect': () => {
    const g = nid('s');
    return `${sceneBg(g, '#DDE6EC', '#AFC0CC')}
    <path d="M0 130 L70 130 L70 240 L0 240 Z" fill="#6E7378"/>
    <path d="M170 130 L240 130 L240 240 L170 240 Z" fill="#6E7378"/>
    <path d="M60 130 C90 88 150 88 180 130" stroke="${GOLD}" stroke-width="7" fill="none"/>
    <rect x="56" y="128" width="128" height="10" rx="4" fill="#43474C"/>
    ${[84, 104, 124, 144, 160].map(x => {
      const t = (x - 60) / 120;
      const y = 130 - (1 - (2 * t - 1) * (2 * t - 1)) * 32;
      return `<path d="M${x} ${y + 4} V128" stroke="${GOLD}" stroke-width="3.5"/>`;
    }).join('')}
    <path d="M0 240 C80 210 160 210 240 240 Z" fill="#2C6BA8" opacity=".55"/>`;
  },
  'fh-gray-adapt': () => {
    const g = nid('s');
    return `${sceneBg(g, '#EEEFEB', '#CFD3CF')}
    <path d="M56 84 L108 84 L82 130 Z" fill="#6E7378"/>
    <rect x="120" y="66" width="44" height="44" rx="6" fill="${GOLD}" transform="rotate(14 142 88)"/>
    <circle cx="182" cy="140" r="24" fill="#9AA0A6"/>
    <path d="M60 190 L92 150 L124 190 Z" fill="#43474C"/>
    <rect x="132" y="158" width="40" height="40" rx="20" fill="#C8442C" opacity=".8"/>
    <path d="M96 118 C104 132 116 140 130 144" stroke="#43474C" stroke-width="3"
      stroke-dasharray="5 6" fill="none" stroke-linecap="round"/>`;
  },
  'fh-gray-iterate': () => {
    const g = nid('s');
    return `${sceneBg(g, '#F0F0ED', '#D3D6D2')}
    <rect x="26" y="86" width="52" height="70" rx="5" fill="${CREAM}" stroke="#9AA0A6" stroke-width="2.5"/>
    <path d="M36 106 H68 M36 118 H60 M36 130 H66" stroke="#C6CAC6" stroke-width="3"/>
    <rect x="94" y="78" width="56" height="78" rx="5" fill="${CREAM}" stroke="#6E7378" stroke-width="2.5"/>
    <path d="M104 98 H140 M104 110 H132 M104 122 H138 M104 134 H126" stroke="#9AA0A6" stroke-width="3"/>
    <rect x="166" y="68" width="60" height="88" rx="5" fill="${CREAM}" stroke="${GOLD}" stroke-width="3.5"/>
    <path d="M176 88 H216 M176 100 H208 M176 112 H214 M176 124 H200 M176 136 H210" stroke="${GOLD}" stroke-width="3" opacity=".7"/>
    <path d="M50 180 C90 200 150 200 196 180 M196 180 L188 172 M196 180 L186 186"
      stroke="#43474C" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
};

export function sceneSVG(cardId) {
  const fn = SCENES[cardId];
  return fn ? fn() : '';
}

/* ═══ Template ภาพเต็มใบ — ใช้ร่วมกันทั้ง FIRST HAND Pilot และ Generic ═══ */
function fullBleedCardSVG(card, artHref, { width = 300, showNumber = true, generic = false } = {}) {
  const meta = COLOR_META[card.color];
  const id = nid('fb');
  const title = generic ? meta.nameEn.toUpperCase() : card.en.toUpperCase();
  const titleSize = title.length > 10 ? 25 : (title.length > 8 ? 28 : 32);
  const subtitle = generic ? meta.nameTh : card.th;
  const footer = generic
    ? 'GENERIC'
    : `FIRST HAND · ${String(card.no).padStart(2, '0')} / 28`;

  return `<svg width="${width}" height="${Math.round(width * 1.4)}" viewBox="0 0 300 420" data-art-version="${CORE7_ART_VERSION}"
    role="img" aria-label="การ์ด ${title} (${subtitle}) สี${meta.nameTh}">
    <defs>
      <clipPath id="${id}-clip"><rect x="12" y="12" width="276" height="396" rx="13"/></clipPath>
      <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${GOLDL}"/><stop offset="45%" stop-color="${GOLD}"/>
        <stop offset="72%" stop-color="#76561F"/><stop offset="100%" stop-color="${GOLDL}"/>
      </linearGradient>
      <linearGradient id="${id}-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#06120C" stop-opacity=".76"/>
        <stop offset="24%" stop-color="#06120C" stop-opacity=".04"/>
        <stop offset="55%" stop-color="#06120C" stop-opacity=".02"/>
        <stop offset="78%" stop-color="#06120C" stop-opacity=".74"/>
        <stop offset="100%" stop-color="#06120C" stop-opacity=".98"/>
      </linearGradient>
      <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity=".8"/>
      </filter>
    </defs>

    <rect x="2" y="2" width="296" height="416" rx="19" fill="${BRAND.charcoal}"/>
    <g clip-path="url(#${id}-clip)">
      <!-- สีสำรองขึ้นทันทีก่อนภาพโหลด -->
      <rect x="12" y="12" width="276" height="396" fill="${meta.deep}"/>
      <image href="${artHref}" x="12" y="12" width="276" height="396" preserveAspectRatio="xMidYMid slice"/>
      <rect x="12" y="12" width="276" height="396" fill="url(#${id}-shade)"/>
    </g>

    <!-- มุมบนเหลือเพียงวงกลมสี + icon -->
    <g filter="url(#${id}-shadow)">
      <circle cx="45" cy="40" r="15" fill="${meta.hex}" stroke="${GOLDL}" stroke-width="1.4"/>
      <g transform="translate(36,31)" style="color:#fff">${colorIcon(card.color, 18)}</g>
    </g>

    <!-- ชื่ออังกฤษเด่น ภาษาไทยตาม -->
    <g filter="url(#${id}-shadow)">
      <text x="150" y="337" text-anchor="middle" font-family="'Bai Jamjuree',sans-serif"
        font-size="${titleSize}" font-weight="700" letter-spacing="1.1" fill="#fff">${title}</text>
      <text x="150" y="362" text-anchor="middle" font-family="'Anuphan',sans-serif"
        font-size="17" font-weight="600" fill="${GOLDL}">${subtitle}</text>
    </g>

    <rect x="48" y="374" width="204" height="5" rx="2.5" fill="${meta.hex}"
      stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>
    ${showNumber ? `<text x="150" y="397" text-anchor="middle" font-family="'Bai Jamjuree',sans-serif"
      font-size="7.8" font-weight="600" letter-spacing=".8" fill="#fff" fill-opacity=".72">${footer}</text>` : ''}

    <rect x="12" y="12" width="276" height="396" rx="13" fill="none" stroke="${meta.hex}" stroke-width="2.2"/>
    <rect x="2" y="2" width="296" height="416" rx="19" fill="none" stroke="url(#${id}-gold)" stroke-width="4"/>
  </svg>`;
}

/* ═══ หน้าการ์ดเต็มใบ — viewBox 300 × 420 (63:88) ═══ */
export function cardSVG(cardId, { width = 300, showNumber = true } = {}) {
  const card = cardById(cardId);
  if (!card) return '';
  if (card.generic) return genericCardSVG(card.color, { width });
  return fullBleedCardSVG(card, FIRST_HAND_ART[cardId], { width, showNumber });
}

/* ═══ Generic Card — สำหรับ Guest ═══ */
export function genericCardSVG(color, { width = 300 } = {}) {
  const meta = COLOR_META[color];
  if (!meta) return '';
  return fullBleedCardSVG({ color, en: meta.nameEn, th: meta.nameTh, generic: true },
    GENERIC_CARD_ART[color], { width, generic: true });
}

/* ═══ หลังการ์ด — ตราหัวใจโคลเวอร์ + วงเข็มทิศทอง ═══
   ชื่อบนหลังการ์ดคือ "myClover" เท่านั้น (CORE7 เป็นชื่อโหมดของเกม
   ไม่ใช่ชื่อการ์ด — ห้ามพิมพ์บนใบ) ใช้แบบเดียวกันทุกใบ เดาหน้าไพ่ไม่ได้ */
function legacyCardBackSVG({ width = 300 } = {}) {
  const id = nid('cb');
  /* หนามเพชรของวงเข็มทิศ: ยาวแกนหลัก สั้นแกนทแยง */
  const spike = (rot, len) => `
    <path d="M0 -${len} L6 -78 L0 -70 L-6 -78 Z" transform="rotate(${rot})"
      fill="url(#${id}-au)"/>`;
  return `<svg width="${width}" height="${Math.round(width * 1.4)}" viewBox="0 0 300 420"
    role="img" aria-label="หลังการ์ด myClover">
    <defs>
      <radialGradient id="${id}-bg" cx="50%" cy="46%" r="80%">
        <stop offset="0%" stop-color="#11402A"/><stop offset="100%" stop-color="#071B10"/>
      </radialGradient>
      <linearGradient id="${id}-au" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${GOLDL}"/><stop offset="45%" stop-color="${GOLD}"/>
        <stop offset="70%" stop-color="#8a6a2c"/><stop offset="100%" stop-color="${GOLDL}"/>
      </linearGradient>
      <pattern id="${id}-qf" width="34" height="34" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="rgba(190,148,66,.10)" stroke-width="1.3">
          <circle cx="17" cy="10" r="6"/><circle cx="10" cy="17" r="6"/>
          <circle cx="24" cy="17" r="6"/><circle cx="17" cy="24" r="6"/>
        </g>
      </pattern>
    </defs>
    <rect x="2" y="2" width="296" height="416" rx="18" fill="#0B0E0B"/>
    <rect x="2" y="2" width="296" height="416" rx="18" fill="none" stroke="url(#${id}-au)" stroke-width="4"/>
    <rect x="11" y="11" width="278" height="398" rx="13" fill="url(#${id}-bg)"/>
    <rect x="11" y="11" width="278" height="398" rx="13" fill="url(#${id}-qf)"/>
    <rect x="20" y="20" width="260" height="380" rx="10" fill="none" stroke="url(#${id}-au)" stroke-width="1.7"/>
    <rect x="25" y="25" width="250" height="370" rx="8" fill="none" stroke="rgba(190,148,66,.35)" stroke-width=".8"/>

    <!-- มุมการ์ด: ใบโคลเวอร์เล็ก 4 มุม -->
    ${[[38, 38, 0], [262, 38, 90], [262, 382, 180], [38, 382, 270]].map(([x, y, r]) => `
      <g transform="translate(${x} ${y}) rotate(${r})" fill="url(#${id}-au)">
        <circle cx="0" cy="-4.5" r="3.4"/><circle cx="-4.5" cy="1" r="3.4"/>
        <circle cx="4.5" cy="1" r="3.4"/><path d="M-1 3 L1 3 L2.5 10 L-2.5 10 Z"/>
      </g>`).join('')}

    <!-- วงเข็มทิศ -->
    <g transform="translate(150 185)">
      <circle r="104" fill="none" stroke="rgba(227,197,126,.5)" stroke-width="1.4"/>
      <circle r="96" fill="none" stroke="rgba(190,148,66,.28)" stroke-width=".9"/>
      ${spike(0, 128)}${spike(90, 128)}${spike(180, 128)}${spike(270, 128)}
      ${[45, 135, 225, 315].map(r => `
        <path d="M0 -104 L3.5 -93 L0 -86 L-3.5 -93 Z" transform="rotate(${r})" fill="url(#${id}-au)"/>`).join('')}
      <circle r="120" fill="none" stroke="rgba(190,148,66,.16)" stroke-width=".8"/>
    </g>

    <!-- ตราหัวใจโคลเวอร์ -->
    <g transform="translate(78,113)">${cloverLogo(144, { ring: false })}</g>

    <!-- ชื่อการ์ด: myClover เท่านั้น -->
    <text x="150" y="352" text-anchor="middle" font-family="'Bai Jamjuree',sans-serif"
      font-size="26" font-weight="700" fill="url(#${id}-au)">myClover</text>
    <g transform="translate(150 368)" fill="url(#${id}-au)">
      <path d="M-26 0 H-8 M8 0 H26" stroke="url(#${id}-au)" stroke-width="1.2"/>
      <circle cx="0" cy="-2.2" r="2"/><circle cx="-2.6" cy="1" r="2"/>
      <circle cx="2.6" cy="1" r="2"/><path d="M-.6 2 L.6 2 L1.4 6 L-1.4 6 Z"/>
    </g>
  </svg>`;
}

/* หลังการ์ดจริงของ CORE7 — 2.5 × 3.5 นิ้ว (5:7), asset เดียวกันทั้งจอและงานพิมพ์ */
export function cardBackSVG({ width = 300 } = {}) {
  const id = nid('cb-photo');
  const height = Math.round(width * 1.4);
  return `<svg width="${width}" height="${height}" viewBox="0 0 300 420"
    role="img" aria-label="หลังการ์ด myClover CORE7">
    <defs><clipPath id="${id}-clip"><rect width="300" height="420" rx="18"/></clipPath></defs>
    <image href="/core7/assets/myclover-back.webp" width="300" height="420"
      preserveAspectRatio="none" clip-path="url(#${id}-clip)"/>
  </svg>`;
}

/* ═══ วงสี Interactive (ใช้บน Landing / Rules) ═══ */
export function colorCycleSVG(size = 300) {
  const C = COLOR_META;
  const pos = { RED: [150, 52], GREEN: [238, 208], BLUE: [62, 208] };
  const id = nid('cy');
  /* group นอกถือตำแหน่ง (attribute transform) — group ในรับ animation จาก CSS
     ห้ามรวมกัน: CSS transform จะทับ translate แล้ววงสีหลุดไปมุมจอ */
  const node = (color, x, y) => `
    <g transform="translate(${x},${y})">
      <g class="cyc-node" data-color="${color}" style="color:#fff">
        <circle r="40" fill="${C[color].hex}" stroke="${BRAND.gold}" stroke-width="2.5"/>
        <g transform="translate(-15,-22)">${colorIcon(color, 30)}</g>
        <text y="22" text-anchor="middle" font-family="'Bai Jamjuree',sans-serif"
          font-size="13" font-weight="700" fill="#fff">${C[color].nameEn.toUpperCase()}</text>
      </g>
    </g>`;
  const arrow = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    const sx = x1 + ux * 52, sy = y1 + uy * 52, ex = x2 - ux * 52, ey = y2 - uy * 52;
    return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"
      stroke="url(#${id}-au)" stroke-width="5" marker-end="url(#${id}-ah)"/>`;
  };
  return `<svg width="${size}" height="${size * 0.87}" viewBox="0 0 300 260" role="img"
    aria-label="วงสี: แดงชนะเขียว เขียวชนะฟ้า ฟ้าชนะแดง เทาเสมอทุกสี">
    <defs>
      <linearGradient id="${id}-au"
      gradientUnits="userSpaceOnUse"
      x1="0" y1="0" x2="300" y2="0">
        <stop offset="0%" stop-color="${GOLDL}"/><stop offset="100%" stop-color="${GOLD}"/>
      </linearGradient>
      <marker id="${id}-ah" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
        <path d="M0 0 L8 4.5 L0 9 Z" fill="${GOLD}"/>
      </marker>
    </defs>
    ${arrow(...pos.RED, ...pos.GREEN)}
    ${arrow(...pos.GREEN, ...pos.BLUE)}
    ${arrow(...pos.BLUE, ...pos.RED)}
    ${node('RED', ...pos.RED)}${node('GREEN', ...pos.GREEN)}${node('BLUE', ...pos.BLUE)}
    <g transform="translate(150,160)">
      <g class="cyc-node" data-color="GRAY" style="color:#fff">
        <circle r="32" fill="${C.GRAY.hex}" stroke="${BRAND.gold}" stroke-width="2"/>
        <g transform="translate(-12,-18)">${colorIcon('GRAY', 24)}</g>
        <text y="18" text-anchor="middle" font-family="'Bai Jamjuree',sans-serif"
          font-size="11" font-weight="700" fill="#fff">GRAY = BLOCK</text>
      </g>
    </g>
  </svg>`;
}

/* ชิปสีเล็ก (มือ Guest / ตัวนับ) */
export function colorChip(color, size = 40) {
  const meta = COLOR_META[color];
  return `<span class="chip chip-${color.toLowerCase()}" style="width:${size}px;height:${size}px"
    role="img" aria-label="สี${meta.nameTh}">${colorIcon(color, Math.round(size * 0.55))}</span>`;
}
