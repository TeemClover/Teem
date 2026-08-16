const SITE = 'https://www.myclover.com';

const XIRCLE = {
  root: {
    title: 'Xircle — เห็นเมื่อวาน เลือก 1 อย่างสำหรับวันนี้',
    description: 'ลองประสบการณ์ Xircle แล้วค่อยเห็นว่า X-VISOR, RoutineX และ แมวขาว · XTY ต่อกันอย่างไร',
    image: '/xircle/assets/v5/xircle-s00-hook-hero.webp',
    alt: 'Xircle — เห็นเมื่อวานผ่าน กิน ขยับ และนอน',
  },
  start: {
    title: 'วันนี้ — เลือก 1 Action จากเมื่อวาน | Xircle',
    description: 'เห็นเมื่อวานให้ชัดขึ้น แล้วเลือกเพียง 1 อย่างที่อยากทำต่อในวันนี้',
    image: '/xircle/assets/v5/xircle-start-today.webp',
    alt: 'Xircle — จากเมื่อวานสู่ 1 Action วันนี้',
  },
  care: {
    title: 'Human Care — ข้อมูลช่วยให้เราเห็น คนช่วยให้เราไปต่อ',
    description: 'Xircle เห็น Pattern, X-VISOR เข้าใจชีวิตจริง และคนช่วยกันเลือกสิ่งที่จะทำต่ออย่างมีขอบเขต',
    image: '/xircle/assets/v5/xircle-care-hero.webp',
    alt: 'Human Care — ข้อมูลและบริบทของชีวิตจริง',
  },
  opportunity: {
    title: 'ลองวิธีคิดแบบ X-VISOR — Xircle',
    description: 'เห็นสัญญาณ เข้าใจบริบท เลือก 1 อย่าง ติดตาม และรู้ขอบเขต — ลองเคสสั้น ๆ ด้วยตัวเอง',
    image: '/xircle/assets/v5/xircle-opportunity-o0-intro.webp',
    alt: 'X-VISOR — มองให้ไกลกว่าสัญญาณที่ข้อมูลเห็น',
  },
  routinex: {
    title: 'RoutineX — ทำให้สิ่งที่เลือก เกิดขึ้นได้ในชีวิตจริง',
    description: 'จาก 1 Action ไปสู่ ABCD + Flavor+ — เห็นว่าอะไรต้องทำเอง และอะไรมีตัวช่วยได้',
    image: '/xircle/assets/v5/xircle-routinex-hero.webp',
    alt: 'RoutineX — ABCD + Flavor+',
  },
  products: {
    title: 'ตัวช่วยของ RoutineX — CloverX × Xircle',
    description: 'ดูว่า G.U.S.+, Protein HMB+, Vita Matrix, AstaMega+ และ Flavor+ อยู่ตรงไหนของ Routine โดยไม่แทนพฤติกรรม',
    image: '/xircle/assets/v5/xircle-products-hero.webp',
    alt: 'ตัวช่วยรอบ RoutineX',
  },
  hardware: {
    title: 'Band + Scale — สัญญาณที่ช่วยให้เห็นเมื่อวาน | Xircle',
    description: 'ข้อมูลจากอุปกรณ์ช่วยเก็บสัญญาณ แต่ความหมายยังต้องดูร่วมกับพฤติกรรมและบริบทของชีวิตจริง',
    image: '/xircle/assets/v5/xircle-hardware-hero.webp',
    alt: 'Xircle Band และ Scale — สัญญาณประกอบภาพของเมื่อวาน',
  },
  circle: {
    title: 'ทำด้วยกัน — จาก 1 Action สู่คนจริง | Xircle',
    description: 'การเห็นข้อมูลเป็นจุดเริ่มต้น การทำต่อมีทั้ง Commit เช็กอิน และคนที่ช่วยกันถือจังหวะ',
    image: '/xircle/assets/v5/xircle-together-hero.webp',
    alt: 'ทำด้วยกัน — คนช่วยกันถือ Action ให้ไปต่อ',
  },
  ghost: {
    title: 'ดู Pattern ไม่ดูแค่วันเดียว — Xircle',
    description: 'ข้อมูลหนึ่งวันเป็นเพียงสัญญาณ หลายวันจึงค่อยเริ่มเห็น Pattern ที่ใช้ทบทวนและเลือกก้าวต่อได้',
    image: '/xircle/assets/v5/xircle-pattern-hero.webp',
    alt: 'Xircle — มอง Pattern จากหลายวัน',
  },
  learn: {
    title: 'ถาม Xircle — Answer Engine',
    description: 'ถามเรื่อง Xircle, Habit Score, X-VISOR, RoutineX, XTY และ Source แล้วไปต่อยัง Reference ที่ลึกขึ้นได้',
    image: '/xircle/assets/v5/xircle-learn-hero.webp',
    alt: 'Xircle Answer Engine — ถามแล้วไปต่อได้',
  },
  reference: {
    title: 'Xircle Reference Library — อ่านลึกจาก Source',
    description: 'คลังอ้างอิงของ Xircle, X-VISOR, RoutineX, XTY และระบบที่เกี่ยวข้อง พร้อมสถานะ CANON / DEMO / CONCEPT / TO CONFIRM',
    image: '/xircle/assets/v5/xircle-reference-hero.webp',
    alt: 'Xircle Reference Library',
  },
  partyCreate: {
    title: '28 วัน · 1 Action · ทำด้วยกัน — แมวขาว · XTY',
    description: 'จากสิ่งที่ Xircle ช่วยให้เห็น สู่สิ่งที่คนทำต่อด้วยกันจริง ๆ — ตั้ง Action แล้วเปิดตี้แมวขาว',
    image: '/xircle/assets/v5/xircle-party-create-hero.webp',
    alt: 'แมวขาว · XTY — 28 วัน 1 Action ทำด้วยกัน',
  },
  partyJoin: {
    title: 'เข้าตี้แมวขาว — 28 วัน · 1 Action · ทำด้วยกัน',
    description: 'มีคนชวนคุณทำ 1 อย่างไปด้วยกัน — เข้าตี้แมวขาว แล้วช่วยกัน Commit · เช็กอิน · ติดตาม',
    image: '/xircle/assets/v5/xircle-party-join-hero.webp',
    alt: 'เข้าตี้แมวขาว · XTY',
  },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanPath(raw) {
  return String(raw || '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\.html$/i, '');
}

function xircleCard(path, mode) {
  const p = `/${path}/`.replace(/\/+/g, '/');
  if (p.includes('/care/party/')) return mode === 'join' ? XIRCLE.partyJoin : XIRCLE.partyCreate;
  if (p.includes('/opportunity/')) return XIRCLE.opportunity;
  if (p.includes('/routinex/') || p.includes('/habix/')) return XIRCLE.routinex;
  if (p.includes('/products/')) return XIRCLE.products;
  if (p.includes('/hardware/')) return XIRCLE.hardware;
  if (p.includes('/circle/')) return XIRCLE.circle;
  if (p.includes('/ghost/')) return XIRCLE.ghost;
  if (p.includes('/care/')) return XIRCLE.care;
  if (p.includes('/start/') || p.includes('/app/')) return XIRCLE.start;
  if (p.includes('/learn/')) return XIRCLE.learn;
  if (p.includes('/doc/') || p.includes('/source/') || p.includes('/ecosystem/') || p.includes('/xvisor/') || p.includes('/xos/') || p.includes('/commerce/') || p.includes('/academy/')) return XIRCLE.reference;
  return XIRCLE.root;
}

function canonicalFor(path, query = '') {
  const clean = cleanPath(path);
  const suffix = clean ? `/${clean}/` : '/';
  return `${SITE}${suffix}${query}`;
}

function render({ title, description, image, alt, canonical }) {
  const imageUrl = image.startsWith('http') ? image : `${SITE}${image}`;
  const imageType = /\.jpe?g(?:$|\?)/i.test(imageUrl) ? 'image/jpeg' : /\.png(?:$|\?)/i.test(imageUrl) ? 'image/png' : 'image/webp';
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="myClover">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:secure_url" content="${esc(imageUrl)}">
<meta property="og:image:type" content="${imageType}">
<meta property="og:image:alt" content="${esc(alt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(imageUrl)}">
<meta name="twitter:image:alt" content="${esc(alt || title)}">
</head>
<body><a href="${esc(canonical)}">${esc(title)}</a></body>
</html>`;
}

export default function handler(req, res) {
  const path = cleanPath(one(req.query.path));
  const mode = one(req.query.mode) === 'join' ? 'join' : 'create';
  const code = /^\d{5}$/.test(String(one(req.query.c) || '')) ? String(one(req.query.c)) : '';

  let card;
  let canonical;

  if (path === 'xty/join' || path.startsWith('xty/join/') || path === 'xty/p' || path.startsWith('xty/p/')) {
    card = {
      title: code ? `มีคนชวนคุณเข้าตี้ ${code} — XTY` : 'มีคนชวนคุณเข้าตี้ — XTY',
      description: code
        ? `รหัสตี้ ${code} · กดลิงก์เพื่อเข้าร่วม แล้วทำของจริงและกลับมา Commit ด้วยกันใน XTY`
        : 'กดลิงก์เพื่อเข้าร่วมตี้ แล้วทำของจริงและกลับมา Commit ด้วยกันใน XTY',
      image: '/xty/assets/xty-og-share-1200x630.jpg',
      alt: 'XTY — ตั้งตี้ทำอะไรก็ได้ แล้วกลับมา Commit ด้วยกัน',
    };
    const invitePath = path.startsWith('xty/p') ? 'xty/p' : 'xty/join';
    canonical = canonicalFor(invitePath, code ? `?c=${encodeURIComponent(code)}` : '');
  } else {
    card = xircleCard(path, mode);
    canonical = canonicalFor(path || 'xircle', mode === 'join' && path.includes('care/party') ? '?mode=join' : '');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.status(200).send(render({ ...card, canonical }));
}
