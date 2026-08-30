export const EXAM_DOMAINS = Object.freeze([
  "xircle",
  "routinex",
  "care",
  "ethics",
  "customer",
]);

export const QUESTION_POOL = Object.freeze([
  {
    id: "xircle-band-scale",
    domain: "xircle",
    question: "Band กับ Scale มีหน้าที่ต่างกันอย่างไร?",
    choices: [
      ["a", "Band วัดทั้งหมด ส่วน Scale ใช้ยืนยัน"],
      ["b", "Band ช่วยเห็นสิ่งที่ทำ ส่วน Scale ช่วยเห็นสิ่งที่ร่างกายตอบ"],
      ["c", "ทั้งคู่ใช้ข้อมูลชุดเดียวกัน"],
    ],
    correct: "b",
    repair: "Band สะท้อนสิ่งที่ทำระหว่างวัน ส่วน Scale ประเมิน Body Composition และ Trend คนละชั้นกัน",
  },
  {
    id: "xircle-scale-boundary",
    domain: "xircle",
    question: "ข้อมูลข้อไหนไม่ได้มาจาก Scale โดยตรง?",
    choices: [
      ["a", "Body Fat trend"],
      ["b", "Weight"],
      ["c", "Sleep จากเมื่อคืน"],
    ],
    correct: "c",
    repair: "Sleep มาจาก Band/ข้อมูลที่ระบบรองรับ ไม่ใช่ค่าที่ Scale วัดโดยตรง",
  },
  {
    id: "routinex-control",
    domain: "routinex",
    question: "ใน ABCD ส่วนไหนไม่มีสินค้า?",
    choices: [
      ["a", "A · Absorb"],
      ["b", "C · Control"],
      ["c", "D · Daily Balance"],
    ],
    correct: "b",
    repair: "C · Control คือการเลือกและพฤติกรรมที่คนต้องลงมือเอง จึงไม่มีขาย",
  },
  {
    id: "routinex-product-fit",
    domain: "routinex",
    question: "ลูกค้ายังจัดมื้อไม่ได้และยังไม่พร้อมเพิ่มหลายอย่าง ควรเริ่มอย่างไร?",
    choices: [
      ["a", "ซื้อครบทุกตัว"],
      ["b", "เริ่มจาก C · Control และสิ่งที่ทำได้จริง"],
      ["c", "ถ้าไม่ครบจะเห็นผลยาก"],
    ],
    correct: "b",
    repair: "สินค้าเป็นตัวช่วยตามบริบท ไม่ใช่เหตุผลให้เริ่มทุกอย่างพร้อมกัน",
  },
  {
    id: "care-context",
    domain: "care",
    question: "Xircle แสดงว่า Sleep ลดลงหลายวัน ควรทำอะไรก่อน?",
    choices: [
      ["a", "สรุปว่ามีปัญหาสุขภาพ"],
      ["b", "ถามบริบทชีวิต"],
      ["c", "เพิ่มสินค้า"],
    ],
    correct: "b",
    repair: "ข้อมูลช่วยให้เห็นสัญญาณ แต่บริบทจากคนช่วยให้เข้าใจว่าเกิดอะไรขึ้นจริง",
  },
  {
    id: "care-followup",
    domain: "care",
    question: "ลูกค้าเริ่มหลุดจาก Routine การติดตามแบบไหนเหมาะที่สุด?",
    choices: [
      ["a", "ถามว่าติดตรงไหนและช่วยเลือก Next Action เล็กลง"],
      ["b", "ตรวจการบ้านและตำหนิ"],
      ["c", "รอให้กลับมาเอง"],
    ],
    correct: "a",
    repair: "การติดตามคือการช่วยให้กลับมาได้ ไม่ใช่ตัดสินว่าทำดีหรือไม่ดี",
  },
  {
    id: "ethics-diagnosis",
    domain: "ethics",
    question: "Scale บอกไขมันสูง แปลว่าเป็นโรคไหม?",
    choices: [
      ["a", "ใช่"],
      ["b", "ไม่วินิจฉัย อธิบายว่าเป็นค่าประเมิน/Trend และส่งต่อเมื่อเหมาะสม"],
      ["c", "ชั่ง 3 ครั้งแล้ววินิจฉัยจากค่าเฉลี่ย"],
    ],
    correct: "b",
    repair: "X-VISOR ไม่วินิจฉัยโรค และต้องอธิบายขอบเขตของค่าประเมินอย่างชัดเจน",
  },
  {
    id: "ethics-claim",
    domain: "ethics",
    question: "ลูกค้าถามว่าสินค้ารักษาโรคได้ไหม ควรตอบอย่างไร?",
    choices: [
      ["a", "รับประกันว่าได้ ถ้าใช้ครบ"],
      ["b", "ใช้เฉพาะข้อมูล/คำกล่าวอ้างที่ยืนยันแล้ว และไม่อ้างการรักษา"],
      ["c", "เล่าจากเคสที่ดีที่สุดแทนหลักฐาน"],
    ],
    correct: "b",
    repair: "ใช้ approved claim เท่านั้น ไม่รับประกัน และส่งต่อผู้เชี่ยวชาญเมื่อคำถามเกินขอบเขต",
  },
  {
    id: "customer-next-action",
    domain: "customer",
    question: "ลูกค้าบอกว่าแผนเยอะเกินไปและเริ่มไม่ไหว คุณควรทำอะไร?",
    choices: [
      ["a", "เพิ่มแรงจูงใจด้วยสินค้าอีกตัว"],
      ["b", "เลือกสิ่งเดียวที่สำคัญและทำได้จริงก่อน"],
      ["c", "ให้ทำแผนเดิมต่อโดยไม่เปลี่ยน"],
    ],
    correct: "b",
    repair: "Next Action ที่เล็กและเหมาะกับชีวิตจริงช่วยให้คนกลับมาเดินต่อได้",
  },
  {
    id: "customer-consent",
    domain: "customer",
    question: "ก่อนดู health summary ของลูกค้า ต้องทำอะไร?",
    choices: [
      ["a", "ขออนุญาตและดูเฉพาะข้อมูลที่จำเป็น"],
      ["b", "เปิดข้อมูลทั้งหมดเพื่อความแม่นยำ"],
      ["c", "ส่งให้ทีมดูก่อน"],
    ],
    correct: "a",
    repair: "ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว ต้องมี consent และใช้เท่าที่จำเป็นต่อการดูแล",
  },
]);

function advanceSeed(seed) {
  return (Math.imul(Number(seed || 1), 1103515245) + 12345) >>> 0;
}

export function buildExam(seed = 1) {
  let nextSeed = Number(seed || 1) >>> 0;
  const questions = EXAM_DOMAINS.map((domain) => {
    const pool = QUESTION_POOL.filter((question) => question.domain === domain);
    nextSeed = advanceSeed(nextSeed);
    return pool[nextSeed % pool.length].id;
  });
  return { questions, nextSeed };
}

export function getQuestion(id) {
  return QUESTION_POOL.find((question) => question.id === id) || QUESTION_POOL[0];
}

export function questionDomains(questionIds) {
  return questionIds.map((id) => getQuestion(id).domain);
}
