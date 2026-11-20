// The one place where X-VISOR Studio points at official files.
// When TeemClover/xvisor publishes its asset folder, switch `publicUrl` users over here; nothing else hard-codes a path.
// Every image below is already published on myClover and is byte-identical to the file of the same purpose
// in the public skill repo (checked with git hash-object on 2026-11-20).

export const XVISOR_REPO = 'https://github.com/TeemClover/xvisor';
export const XVISOR_RAW = 'https://raw.githubusercontent.com/TeemClover/xvisor/main/';
export const CLAIM_GUARD_URL = 'https://www.myclover.com/xircle/doc/xvisor/claims/';
export const CLAUDE_URL = 'https://claude.ai/new';

export const OFFICIAL_IMAGES = {
  scaleLifestyle: {
    src: '/xircle/assets/official/scale-lifestyle.webp',
    width: 960,
    height: 1200,
    label: 'เครื่องชั่ง XIRCLE วางบนพื้นห้อง',
    source: 'https://www.xircle.health/assets/eco-scale.png',
    provenance: '/xircle/assets/official/provenance.json',
    publicPath: null, // not yet in TeemClover/xvisor/assets
    focus: { x: 0.5, y: 0.52 }
  },
  scaleBox: {
    src: '/xircle/assets/real-app/scale.jpg',
    width: 1280,
    height: 1280,
    label: 'กล่องเครื่องชั่ง XIRCLE Body Scale',
    source: 'CloverX product artwork (xircle/assets/real-app/README.md)',
    provenance: '/xircle/assets/real-app/README.md',
    publicPath: 'assets/devices/xircle-scale-photo.jpg',
    // The artwork sits on a white square; use only the black box so no white band shows in a 9:16 crop.
    crop: { x: 0.158, y: 0.18, w: 0.684, h: 0.64 },
    focus: { x: 0.62, y: 0.36 }
  },
  routinexBox: {
    src: '/xircle/assets/product/routinex-box-960.webp',
    width: 960,
    height: 1075,
    label: 'กล่อง RoutineX พร้อมซอง Daily Routine Pack',
    source: 'CloverX product artwork (xircle/assets/real-app/README.md)',
    provenance: '/xircle/assets/real-app/README.md',
    publicPath: 'assets/products/routinex-box.webp',
    focus: { x: 0.55, y: 0.55 }
  }
};

// The sample set used by "ลองด้วยภาพตัวอย่าง" and by the pre-rendered demo clips.
export const SAMPLE_SET = ['scaleLifestyle', 'scaleBox'];

export const SAMPLE_STORY = 'มีรูปเครื่องชั่งเมื่อเช้า พี่ไม่อยากออกกล้อง อยากทำคลิปสั้นแบบคุยกับเพื่อน';

// Source rectangle in pixels for an official image (whole image when it has no crop).
export function sourceRect(key, width, height) {
  const c = OFFICIAL_IMAGES[key]?.crop || { x: 0, y: 0, w: 1, h: 1 };
  return { sx: Math.round(c.x * width), sy: Math.round(c.y * height), sw: Math.round(c.w * width), sh: Math.round(c.h * height) };
}

export function publicUrl(key) {
  const item = OFFICIAL_IMAGES[key];
  if (!item) return null;
  return item.publicPath ? XVISOR_RAW + item.publicPath : 'https://www.myclover.com' + item.src;
}
