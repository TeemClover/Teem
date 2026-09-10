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
  "โต้ง", "ทราย", "ท็อป", "ทิว", "ทิม", "ธันว์", "เท็น", "เทพ", "ธาม", "ธีร์",
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

export const NPC_HAIR_STYLES = Object.freeze(["short", "long", "ponytail", "bob", "bun", "curly", "spiky", "buzz", "wavy", "half-up", "sidepart", "pixie"]);
export const NPC_CLOTHING = Object.freeze(["tee", "polo", "shirt", "cardigan", "hoodie", "dress"]);
const RESERVED_NAMES = new Set(["ทีม", "เอโกะ", "teem", "ako"]);
const normalizedName = name => String(name || "").trim().normalize("NFC").toLocaleLowerCase("en");
export const isReservedNpcName = name => RESERVED_NAMES.has(normalizedName(name));

function identityHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b) >>> 0;
  return (hash ^ hash >>> 16) >>> 0;
}

/** Each visible trait has its own stable hash, independent of simulation RNG. */
export function createPersonAppearance(identityKey) {
  const pickTrait = (key, choices) => choices[Math.floor(identityHash(`${identityKey}:${key}`) / 4294967296 * choices.length)];
  const clothing = pickTrait("clothing", NPC_CLOTHING);
  return {
    version: 3, identityKey: String(identityKey),
    skin: pickTrait("skin", APPEARANCES.map(item => item.skin)),
    hair: pickTrait("hair", ["#242326", "#44332d", "#644937", "#825b40", "#403d48", "#71675e", "#ad8660", "#363e3a"]),
    shirt: pickTrait("shirt", APPEARANCES.map(item => item.shirt)),
    accent: pickTrait("accent", ["#f6ce5a", "#fff2d4", "#d7f2ff", "#f4d8b5", "#d8f09b", "#f1c9d9"]),
    pants: pickTrait("pants", ["#344e4f", "#3f4e6c", "#655447", "#6b6759", "#424047", "#607364"]),
    hairStyle: pickTrait("hair-style", NPC_HAIR_STYLES),
    glasses: pickTrait("glasses", [false, false, false, "round", "square"]),
    clothing, dress: clothing === "dress",
    accessory: pickTrait("accessory", ["none", "none", "earrings", "hairclip", "headband", "scarf"]),
    freckles: pickTrait("freckles", [false, false, false, true]),
    faceShape: pickTrait("face-shape", ["round", "oval"])
  };
}

/** Shared NPC fallback for world and portraits; narrator palettes are separate. */
export function getPersonAppearance(person = {}) {
  const appearance = person?.appearance || {};
  if ([2, 3].includes(appearance.version) && appearance.identityKey && !appearance.characterId
    && NPC_HAIR_STYLES.includes(appearance.hairStyle) && NPC_CLOTHING.includes(appearance.clothing)
    && appearance.skin && appearance.hair && appearance.shirt && appearance.pants
    && typeof appearance.freckles === "boolean" && Object.hasOwn(appearance, "glasses")) return appearance;
  const identityKey = appearance.identityKey || `npc:${person?.personId || person?.id || person?.name || "visitor"}`;
  const legacyPalette = Object.keys(appearance).every(key => ["skin", "hair", "shirt", "accent"].includes(key))
    && APPEARANCES.some(item => ["skin", "hair", "shirt", "accent"].every(key => item[key] === appearance[key]));
  const { characterId, ...explicit } = legacyPalette ? {} : appearance;
  const generated = createPersonAppearance(identityKey);
  const clothing = explicit.clothing || (explicit.dress ? "dress" : generated.clothing);
  return { ...generated, ...explicit, version: [2, 3].includes(explicit.version) ? explicit.version : 3, identityKey, clothing, dress: clothing === "dress" };
}

export function getSafeNpcName(name, identityKey, usedNames = []) {
  if (!isReservedNpcName(name)) return name;
  const used = new Set(usedNames.map(normalizedName));
  const start = identityHash(`npc-name:${identityKey}`) % NAME_POOL.length;
  for (let offset = 0; offset < NAME_POOL.length; offset += 1) {
    const candidate = NAME_POOL[(start + offset) % NAME_POOL.length];
    if (!isReservedNpcName(candidate) && !used.has(normalizedName(candidate))) return candidate;
  }
  const base = NAME_POOL[start];
  let suffix = 2;
  while (used.has(normalizedName(`${base} ${suffix}`))) suffix += 1;
  return `${base} ${suffix}`;
}

/** Rename only NPC records and linked person rows, never narrator copy or IDs. */
export function normalizeNpcIdentities(state) {
  if (!state || typeof state !== "object") return state;
  const lists = ["prospects", "customers", "team"];
  const people = lists.flatMap(key => Array.isArray(state[key]) ? state[key] : []).filter(person => person && (person.id || person.personId));
  if (!people.length) return state;
  const parents = new Map();
  const root = id => {
    if (!parents.has(id)) parents.set(id, id);
    const parent = parents.get(id);
    if (parent !== id) parents.set(id, root(parent));
    return parents.get(id);
  };
  for (const person of people) {
    const id = String(person.personId || person.id), alias = String(person.id || person.personId);
    const a = root(id), b = root(alias);
    if (a !== b) parents.set(a < b ? b : a, a < b ? a : b);
  }
  const groups = new Map();
  for (const person of people) {
    const key = root(String(person.personId || person.id));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(person);
  }
  const usedNames = people.filter(person => !isReservedNpcName(person.name)).map(person => person.name);
  const identities = new Map(), renamedByName = new Map();
  for (const key of [...groups.keys()].sort()) {
    const members = groups.get(key);
    const reserved = members.filter(person => isReservedNpcName(person.name));
    const existingNames = members.map(person => person.name).filter(name => name && !isReservedNpcName(name)).sort();
    const name = reserved.length ? existingNames[0] || getSafeNpcName(reserved[0].name, key, usedNames) : null;
    if (name) usedNames.push(name);
    const representative = [...members].sort((a, b) => Number(b.appearance?.version || 0) - Number(a.appearance?.version || 0) || String(a.id).localeCompare(String(b.id)))[0];
    const appearance = getPersonAppearance({ ...representative, personId: key });
    const identity = { name, appearance, oldNames: new Set(reserved.map(person => normalizedName(person.name))) };
    for (const person of members) for (const id of [person.id, person.personId].filter(Boolean)) identities.set(String(id), identity);
    for (const person of reserved) {
      const old = normalizedName(person.name);
      if (!renamedByName.has(old)) renamedByName.set(old, new Set());
      renamedByName.get(old).add(name);
    }
  }
  const result = { ...state };
  let changed = false;
  for (const key of lists) if (Array.isArray(state[key])) {
    const people = state[key].map(person => {
      if (!person) return person;
      const identity = identities.get(String(person.personId || person.id));
      if (!identity) return person;
      const name = identity.name && isReservedNpcName(person.name) ? identity.name : person.name;
      const appearance = identity.appearance;
      const sameAppearance = person.appearance === appearance || person.appearance
        && Object.keys(person.appearance).length === Object.keys(appearance).length
        && Object.entries(appearance).every(([key, value]) => person.appearance[key] === value);
      if (name === person.name && sameAppearance) return person;
      changed = true;
      return { ...person, name, appearance: { ...appearance } };
    });
    result[key] = people.every((person, index) => person === state[key][index]) ? state[key] : people;
  }
  // Appearance updates never need to copy ledgers. Once migrated, normalization
  // returns the original state, including all 24 months of financial history.
  if (!renamedByName.size) return changed ? result : state;

  const nameFields = new Set(["name", "customerName", "personName", "targetName", "memberName", "leaderName", "sourceName"]);
  const namedPersonLists = new Set(["directG1", "mentoringBreakdown", "teamBreakdown", "leaderBreakdown", "leaders", "topLeaders", "teamReports"]);
  const uniqueReplacement = name => {
    const names = renamedByName.get(normalizedName(name));
    return names?.size === 1 ? [...names][0] : null;
  };
  const walk = (value, context = "") => {
    if (Array.isArray(value)) return value.map(item => walk(item, context));
    if (!value || typeof value !== "object") return value;
    const identity = ["customerId", "personId", "targetId", "memberId", "leaderId", "sourcePersonId", "sourceId", "id"]
      .map(key => identities.get(String(value[key] || ""))).find(Boolean);
    const item = {};
    for (const [key, field] of Object.entries(value)) {
      if (nameFields.has(key) && typeof field === "string" && isReservedNpcName(field)) {
        const fallback = namedPersonLists.has(context) || context === "sceneReport" && ["g1", "candidate", "first-g1"].includes(value.kind);
        item[key] = identity?.name || (fallback ? uniqueReplacement(field) || "สมาชิกเดิม" : null) || field;
      } else if (key === "label" && typeof field === "string" && identity?.name && value.targetId) {
        // Mission labels identify a person explicitly. Do not replace ordinary
        // occurrences of the Thai word for team inside arbitrary story text.
        let label = field;
        for (const old of identity.oldNames) {
          if (label.endsWith(` ${old}`)) label = `${label.slice(0, -old.length)}${identity.name}`;
          else if (label.startsWith(`${old} · `)) label = `${identity.name}${label.slice(old.length)}`;
        }
        item[key] = label;
      } else item[key] = walk(field, key);
    }
    return item;
  };
  for (const key of ["economy", "settlements", "monthSummaries", "organizationReports", "lastOrganizationReport", "sceneReport", "liveReport", "monthOpeningReport", "missions", "eventLog", "xircleHistory", "pendingLive", "pendingXircle", "organization"]) {
    if (state[key] && typeof state[key] === "object") result[key] = walk(state[key], key);
  }
  return result;
}

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

export function createPurchaseIntent({ seed, id, source = "known", fitProducts = [], tutorial = false }) {
  const intentSeed = identityHash(`purchase:${seed || 1}:${id}:${source}`);
  const ready = !tutorial && fitProducts.length > 0 && intentSeed / 4294967296 < 0.08;
  const householdRoll = identityHash(`household:${intentSeed}`) / 4294967296;
  return { kind: ready ? "ready" : "exploring", seed: intentSeed, requestedQuantity: ready ? householdRoll < 0.07 ? 3 : householdRoll < 0.32 ? 2 : 1 : 1 };
}

export function createPerson({ seed, usedNames = [], source = "known", index = 1, tutorial = false }) {
  const used = new Set((usedNames || []).map((name) => String(name || "").normalize("NFC")));
  const availableNames = NAME_POOL.filter((name) => !used.has(name.normalize("NFC")));
  const names = availableNames.length ? availableNames : NAME_POOL;
  const namePick = pick(seed, names);
  const appearanceSeed = advanceSeed(namePick.nextSeed);
  const personaPool = tutorial ? PERSONAS.filter((persona) => persona.tutorial) : PERSONAS;
  const personaPick = pick(appearanceSeed, personaPool);
  const readinessSeed = advanceSeed(personaPick.nextSeed);
  // Intent is independent of the gameplay RNG stream. Existing identity,
  // persona and future-person draws retain their original sequence.
  const purchaseIntent = createPurchaseIntent({ seed: Number(seed || 1), id: index, source, fitProducts: personaPick.value.fitProducts, tutorial });

  return {
    nextSeed: readinessSeed,
    person: {
      id: `person-${index}`,
      name: namePick.value,
      appearance: createPersonAppearance(`npc:person-${index}:${Number(seed || 1)}`),
      persona: personaPick.value.id,
      concern: personaPick.value.concern,
      quote: personaPick.value.quote,
      need: personaPick.value.need,
      fitProducts: [...personaPick.value.fitProducts],
      source,
      purchaseIntent,
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
