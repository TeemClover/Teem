export const NAME_POOL = Object.freeze([
  "มิ้นท์", "แพร", "โอม", "พลอย", "นนท์", "ฟ้า", "บีม", "เจน", "ปอนด์", "ขิม",
  "ต้น", "เมย์", "วิน", "ฝน", "นัท", "ใบหม่อน", "กาย", "มุก", "ภัทร", "พิม",
  "ไนซ์", "เพลง", "เจ", "อิง", "มาร์ค", "น้ำ", "คิว", "ตาล", "โบนัส", "ปั้น",
  "ออม", "ออย", "อ้อ", "อุ้ม", "อุ่น", "อิม", "เอม", "เอิร์น", "เอ๋", "เอิน",
  "แอม", "แอน", "แนน", "แพรว", "แพท", "แพม", "แป้ง", "แป๋ม", "แก้ม", "แก้ว",
  "กวาง", "กิ๊ฟ", "กิ่ง", "เกด", "เกรซ", "เก้า", "กานต์", "ก้อย", "กุ๊ก", "กุ้ง",
  "ข้าว", "ขวัญ", "ขิง", "เข็ม", "ไข่มุก", "ครีม", "คิม", "เค้ก", "เคท", "แคท",
  "จอย", "จ๋า", "จูน", "จิ๊บ", "จิน", "จีน", "เจี๊ยบ", "แจน", "แจง", "ฉัตร",
  "ชา", "ชาช่า", "ชมพู่", "ชิน", "ชิชา", "ซัน", "ซิน", "ซีน", "ซู", "เซฟ",
  "เซน", "เซีย", "ดรีม", "ดิว", "ดีน", "ดีดี", "เดียร์", "เดย์", "โดนัท", "ต้า",
  "ต่าย", "ตอง", "ตั้ม", "ตูน", "เตย", "เติ้ล", "เต้", "เต้ย", "แตง", "แต้ม",
  "โต้ง", "ทราย", "ท็อป", "ทิว", "ทิม", "ทีม", "เท็น", "เทพ", "ธาม", "ธีร์",
  "นัน", "นา", "นานา", "นาว", "น้ำตาล", "นิก", "นิด", "นิว", "นุ่น", "เนย",
  "เนส", "โน้ต", "บาส", "บี", "บิว", "เบน", "เบส", "เบล", "ใบเตย", "ใบเฟิร์น",
  "ปาล์ม", "ป่าน", "ปิ่น", "ปุ๊ก", "ปุ๋ย", "เป้", "เป๊ก", "เปียโน", "แป๊ะ", "ผิง",
  "ฝ้าย", "ฝัน", "ฟาง", "ฟิล์ม", "เฟิร์น", "เฟย์", "แฟง", "พี", "พีช", "พีท",
  "พิ้งค์", "พั้นช์", "พัท", "พัทธ์", "พาย", "เพชร", "เพียว", "แพง", "โฟกัส", "ภูมิ",
  "ภูมิใจ", "มด", "มายด์", "มาย", "มิ้น", "มิว", "เม", "เมจิ", "เมฆ", "โม",
  "โมจิ", "โมเม", "มอส", "ยิ้ม", "ยีน", "ยุ้ย", "โย", "โยเกิร์ต", "ริน", "ริว",
  "รุ้ง", "โรส", "ลิน", "ลิลลี่", "ลูกแก้ว", "ลูกน้ำ", "วิว", "วินนี่", "วุ้น", "เส้น",
  "ส้ม", "ส้มโอ", "สกาย", "สตางค์", "สตาร์", "สโนว์", "สไปร์ท", "อาร์ต", "อาร์ม", "อิคคิว",
  "อิ๊ง", "อีฟ", "อู๋", "อ๊อฟ", "อั้ม", "อั๋น", "อัน", "อันนา", "อะตอม", "ฮอลล์",
  "ฮานะ", "ฮาร์ท", "ฮิวโก้", "ฮัท", "เจมส์", "เจเจ", "โจ", "โจ้", "โจ๊กเกอร์", "แจ็ค",
  "กอล์ฟ", "กัน", "กันต์", "กัปตัน", "ก้อง", "คอปเตอร์", "คอป", "คีน", "เคน", "เควิน",
  "ชาร์ป", "ชาร์ลี", "ชาย", "ซันนี่", "ซี", "ซีเกมส์", "ติน", "ตี๋", "ตุลย์", "เตอร์",
  "โตโต้", "ไทม์", "แทน", "แทนคุณ", "ทาม", "ทอย", "ทัช", "ทิวา", "ธัน", "ธันวา",
  "นีโอ", "บอส", "บอล", "บูม", "เบียร์", "ปิง", "ปริ๊นซ์", "ปุณณ์", "ปุณ", "พีร์",
  "พอร์ช", "ภีม", "แม็กซ์", "มิกซ์", "ไมค์", "ยูโร", "รัน", "เรย์", "ลีโอ", "วอร์ม",
  "วินเซนต์", "วาย", "วายุ", "เวฟ", "สิงห์", "โอ๊ต", "โอห์ม", "ออกัส", "อัพ", "อาโป",
  "อเล็กซ์", "เอิร์ธ", "เอ็ม", "เอฟ", "เอส", "ไอซ์", "บลู", "บราวน์", "แชมป์", "เชน",
  "เด่น", "ดอม", "ดัช", "เต๋า", "แทค", "นอร์ท", "พีค", "พีเจ", "ฟอร์ด", "ฟลุ๊ค",
  "ม่อน", "มีน", "มิก", "เม่น", "แม็ก", "ว่าน", "วุฒิ", "อ้น", "อูโน่", "ฮิม"
]);

export const APPEARANCES = Object.freeze([
  { skin: "#f0bf98", hair: "#1f3039", shirt: "#4db783", accent: "#f6ce5a" },
  { skin: "#e8b38b", hair: "#29323b", shirt: "#ef8078", accent: "#fff2d4" },
  { skin: "#d99d78", hair: "#20333f", shirt: "#5fa9d7", accent: "#f6ce5a" },
  { skin: "#efb98f", hair: "#2d333b", shirt: "#e4b94e", accent: "#ffffff" },
  { skin: "#c98667", hair: "#1e2c35", shirt: "#8d78c7", accent: "#f4d35e" },
  { skin: "#dfa781", hair: "#302e39", shirt: "#e58ca9", accent: "#f8efd4" },
  { skin: "#d29470", hair: "#25313a", shirt: "#6eb6a0", accent: "#ffe177" },
  { skin: "#f2c19a", hair: "#24333e", shirt: "#ed9659", accent: "#fff0c7" },
  { skin: "#bd7f62", hair: "#1d2b34", shirt: "#5f8fd3", accent: "#d8f09b" },
  { skin: "#e4aa82", hair: "#352d34", shirt: "#54b7a9", accent: "#ffd565" },
  { skin: "#ca8969", hair: "#242c33", shirt: "#d77969", accent: "#d7f2ff" },
  { skin: "#edb790", hair: "#20323d", shirt: "#7b9bd4", accent: "#fff2a3" },
  { skin: "#c38364", hair: "#2d3038", shirt: "#81b85f", accent: "#ffdf78" },
  { skin: "#d99b76", hair: "#1e303a", shirt: "#d88ab7", accent: "#dff8ec" },
  { skin: "#f3c49d", hair: "#303038", shirt: "#55a3c8", accent: "#f5ce5c" },
  { skin: "#b9795e", hair: "#202b34", shirt: "#c98a54", accent: "#d8f4ff" },
]);

export const PERSONAS = Object.freeze([
  { id: "afternoon", concern: "ช่วงบ่ายไม่มีแรง", quote: "ช่วงบ่ายเรามักหมดแรง แล้วกลับบ้านก็ไม่อยากทำอะไร", need: "จัดมื้อและจังหวะช่วงเช้า", fitProducts: ["gus"], tutorial: true },
  { id: "late-sleep", concern: "นอนดึกและตื่นไม่สดชื่น", quote: "ช่วงนี้นอนดึกติดกันหลายวัน ตื่นมาไม่ค่อยพร้อม", need: "เริ่มจากเวลานอนที่สม่ำเสมอ", fitProducts: [], tutorial: false },
  { id: "exercise", concern: "อยากกลับมาออกกำลัง", quote: "อยากกลับไปขยับตัว แต่เริ่มทีไรก็ทำได้ไม่กี่วัน", need: "วางการขยับที่ทำซ้ำได้", fitProducts: ["protein-hmb"], tutorial: true },
  { id: "weight", concern: "น้ำหนักเริ่มขึ้น", quote: "น้ำหนักเริ่มขึ้น แต่เราไม่อยากตัดสินจากเลขครั้งเดียว", need: "ดูแนวโน้มและจัดมื้อ", fitProducts: ["gus", "vita-matrix"], tutorial: true },
  { id: "muscle", concern: "อยากรักษามวลกล้ามเนื้อ", quote: "เราอยากดูแลกล้ามเนื้อให้ดีขึ้นพร้อมกับกลับมาออกกำลัง", need: "โปรตีนและการขยับที่เหมาะสม", fitProducts: ["protein-hmb"], tutorial: true },
  { id: "irregular", concern: "ชีวิตไม่สม่ำเสมอ", quote: "แต่ละวันไม่เหมือนกันเลย เลยไม่รู้ว่าจะเริ่มตรงไหน", need: "ลด decision fatigue ด้วยสิ่งเดียว", fitProducts: [], tutorial: false },
  { id: "self-care", concern: "อยากเริ่มดูแลตัวเอง", quote: "ไม่ได้อยากเปลี่ยนทุกอย่าง แค่อยากเริ่มให้ถูกจุด", need: "วาง Daily Balance ที่ไม่หนักเกินไป", fitProducts: ["vita-matrix", "astamega"], tutorial: true },
]);

export function advanceSeed(seed) {
  return (Math.imul(Number(seed || 1), 1664525) + 1013904223) >>> 0;
}

function pick(seed, list) {
  const nextSeed = advanceSeed(seed);
  return { value: list[nextSeed % list.length], nextSeed };
}

export function createPerson({ seed, usedNames = [], source = "known", index = 1, tutorial = false }) {
  const used = new Set((usedNames || []).map((name) => String(name || "").normalize("NFC")));
  const availableNames = NAME_POOL.filter((name) => !used.has(name.normalize("NFC")));
  const names = availableNames.length ? availableNames : NAME_POOL;
  const namePick = pick(seed, names);
  const appearancePick = pick(namePick.nextSeed, APPEARANCES);
  const personaPool = tutorial ? PERSONAS.filter((persona) => persona.tutorial) : PERSONAS;
  const personaPick = pick(appearancePick.nextSeed, personaPool);
  const readinessSeed = advanceSeed(personaPick.nextSeed);

  return {
    nextSeed: readinessSeed,
    person: {
      id: `person-${index}`,
      name: namePick.value,
      appearance: appearancePick.value,
      persona: personaPick.value.id,
      concern: personaPick.value.concern,
      quote: personaPick.value.quote,
      need: personaPick.value.need,
      fitProducts: [...personaPick.value.fitProducts],
      source,
      journey: "new",
      status: "เพิ่งรู้จัก",
      trust: tutorial ? 36 : 22,
      readiness: tutorial ? 64 : 36 + (readinessSeed % 43),
      consent: false,
      measured: false,
      routinePlan: null,
      activePlan: false,
      day: 0,
      followups: 0,
      adherence: 40,
      result: "ยังไม่ชัด",
      successCase: false,
      referralReady: false,
      referralAsked: false,
      nextOfferMonth: null,
      scheduled: false,
      meetings: 0,
      lastContactMonth: 0,
      advocacy: 0,
      xvisorInterest: false,
      xvisorStage: null,
      candidateProgress: 0,
      selfDirected: false,
    },
  };
}

export function getPersona(id) {
  return PERSONAS.find((persona) => persona.id === id) || PERSONAS[0];
}
