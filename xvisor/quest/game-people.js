export const NAME_POOL = Object.freeze([
  "มิ้นท์", "แพร", "โอม", "พลอย", "นนท์", "ฟ้า", "บีม", "เจน", "ปอนด์", "ขิม",
  "ต้น", "เมย์", "วิน", "ฝน", "นัท", "ใบหม่อน", "กาย", "มุก", "ภัทร", "พิม",
  "ไนซ์", "เพลง", "เจ", "อิง", "มาร์ค", "น้ำ", "คิว", "ตาล", "โบนัส", "ปั้น",
]);

export const APPEARANCES = Object.freeze([
  { skin: "#cb8f69", hair: "#263e4b", shirt: "#4db783", accent: "#f6ce5a" },
  { skin: "#e0a17a", hair: "#513943", shirt: "#ef8078", accent: "#fff2d4" },
  { skin: "#b9785d", hair: "#253948", shirt: "#5fa9d7", accent: "#f6ce5a" },
  { skin: "#e0ab78", hair: "#6e4d35", shirt: "#e4b94e", accent: "#ffffff" },
  { skin: "#9f664f", hair: "#222d38", shirt: "#8d78c7", accent: "#f4d35e" },
  { skin: "#d49a78", hair: "#342d4b", shirt: "#e58ca9", accent: "#f8efd4" },
  { skin: "#bd7c5e", hair: "#553a2d", shirt: "#6eb6a0", accent: "#ffe177" },
  { skin: "#efba8f", hair: "#27364a", shirt: "#ed9659", accent: "#fff0c7" },
  { skin: "#8f5d49", hair: "#1e2c35", shirt: "#5f8fd3", accent: "#d8f09b" },
  { skin: "#d8946c", hair: "#6a3440", shirt: "#54b7a9", accent: "#ffd565" },
  { skin: "#b26f50", hair: "#3a2f28", shirt: "#d77969", accent: "#d7f2ff" },
  { skin: "#e8ad86", hair: "#263e4b", shirt: "#7b9bd4", accent: "#fff2a3" },
  { skin: "#a86d54", hair: "#493341", shirt: "#81b85f", accent: "#ffdf78" },
  { skin: "#d08b68", hair: "#203240", shirt: "#d88ab7", accent: "#dff8ec" },
  { skin: "#f0bb91", hair: "#68432f", shirt: "#55a3c8", accent: "#f5ce5c" },
  { skin: "#985f49", hair: "#252a36", shirt: "#c98a54", accent: "#d8f4ff" },
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

export function createPerson({ seed, usedNames = [], source = "relationship", index = 1, tutorial = false }) {
  const availableNames = NAME_POOL.filter((name) => !usedNames.includes(name));
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
    },
  };
}

export function getPersona(id) {
  return PERSONAS.find((persona) => persona.id === id) || PERSONAS[0];
}
