/**
 * Tiny, local RGBS experiences. No storage, analytics, fetch, or live AI calls.
 * validateReward(color, null) returns an empty state; malformed records return null.
 * mountReward calls onChange(state), then onComplete(state, outcome) once, after
 * the outcome is rendered. Restoring a completed record never repeats completion.
 * Callers own durable saving and must never put these records into telemetry.
 */
const own = (value, key) => Object.hasOwn(value, key);
const oneOf = (value, choices) => choices.includes(value) ? value : '';
const cleanTitle = value => typeof value === 'string'
  ? Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 52).join('') : '';
const COLORS = ['red', 'green', 'blue', 'silver'];
export const AKO_REWARD_IMAGE = '/frontdoor/art/seed-red-ako-v2.webp';
export const FOOD_REWARD_IMAGES = Object.freeze({
  bright: '/frontdoor/art/seed-food-bright-v2.webp',
  warm: '/frontdoor/art/seed-food-warm-v2.webp'
});
// Curated material, not visitor uploads. Only these local images can travel into
// the sandboxed gallery; the user's title stays in their local checkpoint.
export const CRAFT_COLLECTIONS = Object.freeze({
  garden: {label:'โลกเล็ก ๆ', title:'โลกที่อยากเก็บไว้', caption:'ออกไปพบ แล้วกลับมาเล่า', photos:[
    ['underpaper-valley-mobile.webp','น้ำตกที่ซ่อนอยู่','เริ่มจากสิ่งที่ทำให้เราอยากหยุดมอง'],
    ['seed-green-pause-v2-mobile.webp','มุมพักของวัน','เว้นที่ให้เรื่องเล็ก ๆ ที่มีความหมาย'],
    ['seed-silver-maker-v2-mobile.webp','โลกบนโต๊ะทำงาน','เปลี่ยนสิ่งที่เห็น ให้เป็นสิ่งที่สร้าง']]},
  food: {label:'โต๊ะของอร่อย', title:'เรื่องอร่อยบนโต๊ะเรา', caption:'สามภาพ สามรสของหนึ่งเรื่อง', photos:[
    ['seed-food-bright-v2-mobile.webp','สด เปรี้ยว กรอบ','มะเขือเทศ แตงกวา และมะนาว'],
    ['seed-food-warm-v2-mobile.webp','หอมงาคั่ว','จานเดิม เปลี่ยนรสด้วยงาคั่วบุบ'],
    ['seed-red-ako-v2-mobile.webp','มื้อที่อยากแบ่งปัน','จากของอร่อย ไปถึงคนที่นั่งร่วมโต๊ะ']]},
  maker: {label:'ห้องทดลอง', title:'จากไอเดีย สู่ของที่เล่นได้', caption:'เริ่มเล็ก แล้วทำให้มีชีวิต', photos:[
    ['seed-silver-maker-v2-mobile.webp','จากกระดาษสู่หน้าเว็บ','สิ่งที่เคยอยู่ในหัว เริ่มกดเล่นได้'],
    ['seed-blue-teem-v2-mobile.webp','ลงมือด้วยกัน','ลองหนึ่งอย่าง แล้วดูสิ่งที่เปลี่ยน'],
    ['underpaper-valley-mobile.webp','แรงบันดาลใจถัดไป','ของที่สร้าง พาเราออกไปพบสิ่งใหม่']]}
});
export const craftPhotoPath = name => `/frontdoor/art/${name}`;
export const craftPhotoFocus = name => /seed-(green|red|blue)-/.test(name) ? '50% 18%' : '50% 50%';

export function validateReward(color, input) {
  if (!COLORS.includes(color)) return null;
  const value = input == null ? {} : input;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  if (own(value, 'version') && value.version !== 1) return null;
  if (own(value, 'color') && value.color !== color) return null;
  const base = {version: 1, color};
  if (color === 'red') {
    const flavor = oneOf(value.flavor, ['bright', 'warm']);
    return {...base, flavor, opened: !!flavor && value.opened === true};
  }
  if (color === 'green') {
    const context = oneOf(value.context, ['sleep', 'move', 'food']);
    const moment = context ? oneOf(value.moment, ['now', 'next']) : '';
    const action = context ? oneOf(value.action, ['legacy', ...Object.keys(CARE[context].actions)])
      || (!own(value, 'action') && moment && value.complete === true ? 'legacy' : Object.keys(CARE[context].actions)[0]) : '';
    return {...base, context, moment, action, complete: !!moment && value.complete === true};
  }
  if (color === 'blue') {
    const scenario = oneOf(value.scenario, ['executive', 'team', 'solo', 'course', 'network']);
    const offer = scenario === 'network' ? oneOf(value.offer, ['skill', 'time', 'project']) : '';
    const need = offer ? oneOf(value.need, ['first-test', 'partner', 'mentor']) : '';
    // Keep old comparisons complete without inventing a chosen time budget.
    const constraint = scenario && scenario !== 'network'
      ? oneOf(value.constraint, ['short', 'roomy']) : '';
    const learningPath = scenario === 'course' ? oneOf(value.learningPath, ['comic', 'hands-on']) : '';
    // Missing optional mode is the original course experiment, never a new route.
    return {...base, scenario, constraint, offer, need,
      ...(learningPath ? {learningPath} : {}),
      compared: !!scenario && (scenario !== 'network' || !!need) && value.compared === true};
  }
  const title = cleanTitle(value.title);
  const collection = oneOf(value.collection, Object.keys(CRAFT_COLLECTIONS));
  return {...base, title, design: oneOf(value.design, ['editorial', 'signal']) || 'editorial',
    ...(collection ? {collection, photo:Number.isInteger(value.photo) && value.photo >= 0 && value.photo < 3 ? value.photo : 0} : {}),
    edited: value.edited === true, complete: !!title && value.edited === true && value.complete === true};
}

const FLAVORS = {
  bright: {label: 'สด เปรี้ยว กรอบ', title: 'มะเขือเทศ แตงกวา และมะนาว',
    ingredients: ['มะเขือเทศ 1 ลูก', 'แตงกวา ½ ลูก', 'น้ำมะนาว 1 ช้อนชา'],
    method: 'หั่นพอดีคำ คลุกกับมะนาว แล้วชิมก่อนเติมอะไรอีก',
    discovery: 'ลองแตงกวาคำหนึ่งก่อน แล้วอีกคำหลังคลุกมะนาว สังเกตว่ารสเปลี่ยนตรงไหน'},
  warm: {label: 'หอม นุ่ม มีอะไรให้เคี้ยว', title: 'มะเขือเทศ แตงกวา และงาคั่ว',
    ingredients: ['มะเขือเทศ 1 ลูก', 'แตงกวา ½ ลูก', 'งาขาวคั่ว 1 ช้อนชา'],
    method: 'หั่นพอดีคำ บุบงาคั่วเล็กน้อย แล้วโรยก่อนกิน',
    discovery: 'แบ่งงาคั่วครึ่งหนึ่ง บุบเฉพาะส่วนแรก แล้วลองดมเทียบกันก่อนโรย'}
};
const CARE = {
  sleep: {label: 'การพัก', title: 'เว้นหนึ่งจังหวะก่อนนอน', now: 'หลังปิดหน้านี้', next: 'หลังแปรงฟันคืนนี้',
    later: 'ก่อนนอน', notice: 'อะไรทำให้หยุดพักได้ง่ายขึ้น?', actions: {
      pause: {label: 'พักจากหน้าจอ', action: 'วางหน้าจอไว้ไกลมือ 2 นาที', minutes: 2},
      prepare: {label: 'เคลียร์เรื่องพรุ่งนี้', action: 'เตรียมของที่ต้องใช้พรุ่งนี้ 1 อย่าง', minutes: 2}}},
  move: {label: 'การขยับ', title: 'ให้ร่างกายได้เปลี่ยนท่า', now: 'หลังปิดหน้านี้', next: 'หลังจบงานชิ้นถัดไป',
    later: 'พักครั้งถัดไป', notice: 'ท่าไหนทำให้รู้สึกสบายกว่าเดิม?', actions: {
      change: {label: 'เปลี่ยนอิริยาบถ', action: 'เปลี่ยนอิริยาบถแบบที่สบาย 1 นาที', minutes: 1},
      walk: {label: 'เดินใกล้ ๆ', action: 'เดินในระยะที่สะดวก 2 นาที', minutes: 2}}},
  food: {label: 'มื้ออาหาร', title: 'หนึ่งมื้อที่เลือกด้วยตัวเอง', now: 'หลังปิดหน้านี้', next: 'ก่อนสั่งหรือเตรียมมื้อถัดไป',
    later: 'หลังมื้อถัดไป', notice: 'มีอะไรในมื้อนี้ที่อยากกินอีก?', actions: {
      choose: {label: 'เลือกของที่อยากกิน', action: 'เลือกของอร่อยให้มื้อถัดไป 1 อย่าง', minutes: 1},
      space: {label: 'เว้นที่ให้มื้อนี้', action: 'จัดที่กิน แล้ววางสิ่งรบกวนไว้ข้าง ๆ', minutes: 1}}}
};
const LEGACY_CARE = {
  sleep: {next: 'ก่อนนอนคืนนี้', action: 'นึกถึงหนึ่งเรื่องที่ดีของวันนี้',
    nowSummary: 'ตอนนี้ ฉันจะนึกถึงหนึ่งเรื่องที่ดีของวันนี้', nextSummary: 'ก่อนนอนคืนนี้ ฉันจะนึกถึงหนึ่งเรื่องที่ดีของวันนี้'},
  move: {next: 'พักครั้งถัดไป', action: 'เปลี่ยนอิริยาบถหนึ่งครั้ง แล้วสังเกตตัวเอง',
    nowSummary: 'ตอนนี้ ฉันจะเปลี่ยนอิริยาบถหนึ่งครั้ง แล้วสังเกตตัวเอง', nextSummary: 'พักครั้งถัดไป ฉันจะเปลี่ยนอิริยาบถหนึ่งครั้ง แล้วสังเกตตัวเอง'},
  food: {next: 'ก่อนมื้อถัดไป', action: 'เลือกสิ่งที่อยากกินหนึ่งอย่าง',
    nowSummary: 'ตอนนี้ ฉันจะเลือกของอร่อยหนึ่งอย่างให้มื้อถัดไป', nextSummary: 'ก่อนมื้อถัดไป ฉันจะหยุดเลือกสิ่งที่อยากกินหนึ่งอย่าง'}
};
const WORKS = {
  executive: {label: 'ตัดสินใจเรื่องงาน', title: 'ลอง AI กับงานเดียวก่อน', before: '“เอา AI มาใช้ในบริษัท”', budget: {short: 20, roomy: 40},
    result: 'คำตอบ FAQ ที่ตรวจแล้ว พร้อมเวลาที่ใช้', steps: [
      ['scope', 'เลือก FAQ สาธารณะ 2 ข้อ', 'เก็บคำตอบเดิมไว้เทียบ ไม่ใส่ข้อมูลลูกค้า', 5],
      ['draft', 'ลองร่างคำตอบ', 'ใช้ข้อมูลจาก FAQ เท่านั้น', 5],
      ['review', 'คนตรวจทุกข้อ', 'ผิดข้อเท็จจริง → แก้ก่อนใช้', 10],
      ['compare', 'เทียบกับการเขียนเอง', 'ดูทั้งเวลาและจำนวนจุดที่ต้องแก้', 10],
      ['decide', 'เลือกว่าจะทำต่อไหม', 'ถ้าตรวจนานกว่าเดิม เปลี่ยนงานที่ทดลอง', 10]]},
  team: {label: 'ช่วยทีมทำงาน', title: 'ประชุมจบ งานเริ่มต่อได้', before: '“ช่วยสรุปประชุม”', budget: {short: 10, roomy: 20},
    result: 'หนึ่งงาน / เจ้าของ / วันส่ง / สิ่งที่ต้องยืนยัน', steps: [
      ['task', 'ดึงงานถัดไป 1 งาน', 'ตัวอย่าง: แก้ FAQ ก่อนปล่อยหน้าเว็บ', 3],
      ['owner', 'ใครรับงานนี้?', 'ไม่ได้ตกลงในประชุม → ต้องยืนยัน', 4],
      ['due', 'ส่งเมื่อไร?', 'ยังไม่มีวันส่ง → ต้องยืนยัน', 3],
      ['ask', 'แยกสิ่งที่ยังไม่ได้ตกลง', 'ตัวอย่าง: ใครเป็นคนอนุมัติข้อความ?', 5],
      ['share', 'ส่งให้เจ้าของงานยืนยัน', 'สรุปยังไม่ใช่ข้อตกลง จนกว่าจะตอบรับ', 5]]},
  solo: {label: 'ทำโปรเจกต์ของตัวเอง', title: 'ลองให้เล็กพอที่จะรู้จริง', before: '“หาไอเดียที่น่าจะเวิร์ก”', budget: {short: 30, roomy: 90},
    result: 'หลักฐานจากปัญหาจริง ก่อนลงแรงสร้างต่อ', steps: [
      ['person', 'เลือกคนที่อาจเจอปัญหา 1 คน', 'เริ่มจากคนที่คุยด้วยได้ ไม่ซื้อโฆษณาก่อน', 5],
      ['ask', 'ถามถึงครั้งล่าสุดที่เจอปัญหา', 'เกิดอะไรขึ้น? ตอนนั้นแก้อย่างไร?', 15],
      ['note', 'จดสิ่งที่เกิดขึ้นจริง', 'แยกคำชมไอเดียออกจากปัญหาที่เขาเจอ', 10],
      ['repeat', 'คุยอีก 2 คน', 'ใช้คำถามเดิม แล้วมองหาสิ่งที่ซ้ำกัน', 40],
      ['test', 'เลือกหนึ่งอย่างที่จะลองต่อ', 'ถ้าไม่เจอปัญหาซ้ำ เปลี่ยนโจทย์ได้เลย', 20]]},
  course: {label: 'เริ่มเรียน AI', title: 'เรียน AI ด้วยงานชิ้นเดียว', before: '“ต้องเรียนให้ครบทุกเครื่องมือ”', budget: {short: 10, roomy: 20},
    result: 'อีเมลสมมติหนึ่งฉบับที่ตรวจเองได้', steps: [
      ['brief', 'ตั้งโจทย์อีเมล 3 บรรทัด', 'ถึงใคร / ต้องการอะไร / รู้ข้อเท็จจริงใดบ้าง', 2],
      ['draft', 'ลองให้ AI ร่างจากโจทย์นี้', 'ใช้เรื่องสมมติ ไม่มีข้อมูลส่วนตัว', 3],
      ['check', 'ขีดสิ่งที่โจทย์ไม่ได้บอก', 'ชื่อ วันเวลา หรือคำสัญญาที่เดา → ตัดออก', 5],
      ['tone', 'ลองเปลี่ยนคนอ่าน', 'ข้อความถึงเพื่อนกับหัวหน้าต่างกันตรงไหน?', 5],
      ['revise', 'เก็บฉบับที่ชัดที่สุด', 'อ่านแล้วรู้ไหมว่าอยากให้ผู้รับทำอะไร?', 5]]}
};
const OFFERS = {skill: 'ทักษะที่ทำได้', time: 'เวลาที่พร้อมลงมือ', project: 'โปรเจกต์ที่เริ่มแล้ว'};
const NEEDS = {'first-test': 'ลองให้มีคนใช้', partner: 'คนร่วมทำ', mentor: 'คนช่วยมองทาง'};
const OFFER_STEPS = {
  skill: ['ของในมือ', 'เลือกผลงาน 1 ชิ้นที่แสดงว่าคุณช่วยเรื่องอะไรได้'],
  time: ['ของในมือ', 'ระบุช่วงเวลาที่ลองทำได้จริง และงานที่พร้อมรับผิดชอบ'],
  project: ['ของในมือ', 'เลือกส่วนที่ทำงานแล้ว 1 จุด กับจุดที่ยังติดอยู่']
};
const NEED_STEPS = {
  'first-test': [['ลองกับใคร', 'หาคนที่เจอปัญหานี้จริง 1 คน ให้ลองขนาดเล็กก่อน'], ['ดูอะไรต่อ', 'ถามว่าเขาใช้ต่อเพราะอะไร ก่อนเพิ่มเงินหรือเวลา']],
  partner: [['กำลังขาดอะไร', 'ระบุงานที่ขาด 1 อย่าง แล้วลองร่วมงานชิ้นเล็ก'], ['คุยให้ชัดก่อน', 'บทบาท เวลา ค่าใช้จ่าย และสิทธิ์ในงาน ต้องตกลงกัน']],
  mentor: [['เตรียมโจทย์เดียว', 'เรื่องที่ต้องตัดสินใจ ทางที่ลองแล้ว และจุดที่ติด'], ['ใช้คำแนะนำอย่างไร', 'เลือกรอบทดลองถัดไป แล้วค่อยดูว่าควรเดินต่อกับใคร']]
};
const LEARNING = {
  comic: {label: 'เริ่มจากการ์ตูน', title: 'คำตอบลื่นไหล อาจแอบเดา',
    example: {label: 'ลองจับสิ่งที่โจทย์ไม่ได้บอก', title: 'เพิ่มมาไม่กี่คำ ก็เปลี่ยนเรื่องได้',
      rows: [['โจทย์', 'ขอเลื่อนประชุมจากวันอังคารเป็นวันพุธ'],
        ['สิ่งที่แอบแต่งเพิ่ม', '“เพราะติดธุระ นัดกัน 10 โมง”'],
        ['จุดที่คุณตรวจได้', 'โจทย์ไม่ได้บอกเหตุผลหรือเวลา']],
      note: 'คำตอบที่อ่านลื่น ยังต้องแยกให้ออกว่าอะไรคือข้อมูล อะไรคือการเดา'}},
  'hands-on': {label: 'ลอง AI ใส่ซอส', title: 'เติมบริบท คำขอก็ชัดขึ้น',
    example: {label: 'คำขอเดิม → เพิ่มสิ่งที่ต้องการจริง', title: 'จาก “เขียนอีเมลให้หน่อย” เป็น…',
      rows: [['เพิ่มบริบท', 'ขอเลื่อนประชุม อังคาร → พุธ · ถามว่าผู้รับสะดวกไหม'],
        ['ฉบับที่ตรวจได้', 'ขอเลื่อนประชุมจากวันอังคารเป็นวันพุธ สะดวกไหมครับ?'],
        ['ไม่แต่งเพิ่ม', 'ชื่อผู้รับ เหตุผล และเวลา ที่ยังไม่รู้']],
      note: 'บอกว่าอยากให้ผู้รับทำอะไร คำตอบก็มีทิศทาง โดยไม่ต้องเดาข้อมูลเพิ่ม'}}
};

function workExample(scenario, steps) {
  const included = new Set(steps.map(step => step.id));
  if (!steps.length) return null;
  if (scenario === 'executive') return {label: 'ลองกับข้อมูลสมมติ', title: 'คำตอบหนึ่งข้อ ที่ตรวจกลับได้',
    rows: [
      ['ข้อมูลต้นทาง', 'ร้านเปิด จ.–ศ. 09:00–17:00'],
      ['คำตอบที่ยึดข้อมูล', 'เปิดวันจันทร์ถึงศุกร์ 9 โมงถึง 5 โมงเย็น'],
      ...(included.has('compare') ? [['สิ่งที่ห้ามเดาเพิ่ม', 'เปิดวันหยุด / มีคนตอบตลอดเวลา'], ['ก่อนใช้กับทีม', 'เทียบเวลาร่าง + ตรวจ กับการเขียนเอง']] : [])],
    note: 'เปลี่ยนจาก “ตอบดูดี” เป็น “ตรวจจากต้นทางได้”'};
  if (scenario === 'team') return {label: 'บันทึกประชุมสมมติ → งานที่ทำต่อได้', title: 'แก้ FAQ ก่อนวันศุกร์',
    rows: [['งาน', 'ปรับคำตอบ FAQ'], ['เจ้าของงาน', 'ต้องยืนยัน'], ['วันส่ง', 'วันศุกร์ ตามบันทึก'],
      ...(included.has('ask') ? [['คำถามที่ยังค้าง', 'ใครเป็นคนอนุมัติข้อความ?']] : []),
      ...(included.has('share') ? [['ก่อนนับว่าได้ตกลง', 'ส่งให้เจ้าของงานตอบรับ']] : [])],
    note: 'ช่องที่ไม่รู้ยังว่างไว้ ไม่แต่งคนรับผิดชอบขึ้นมา'};
  if (scenario === 'solo') return {label: 'รอบทดลองที่พอดีกับเวลา', title: included.has('repeat') ? '3 คน · มองหาสิ่งที่เกิดซ้ำ' : '1 คน · ฟังเหตุการณ์จริง',
    rows: [['เริ่มคุย', 'ครั้งล่าสุดที่เจอปัญหานี้ เกิดอะไรขึ้น?'], ['ฟังต่อ', 'ตอนนั้นคุณแก้มันอย่างไร?'],
      ...(included.has('repeat') ? [['มองหาร่วมกัน', 'ปัญหาไหนเกิดซ้ำในเรื่องของทั้ง 3 คน?']] : [])],
    note: included.has('test') ? 'ถ้าไม่พบปัญหาซ้ำ ยังเปลี่ยนโจทย์ได้ ก่อนลงเงินสร้าง' : 'วันนี้ยังไม่ต้องพิสูจน์ทุกอย่าง แค่รู้ว่าเคยเกิดขึ้นจริงไหม'};
  return {label: 'โจทย์สมมติ · ขอเลื่อนประชุม อังคาร → พุธ', title: 'อีเมลที่รู้ว่าขออะไร',
    rows: [['ถึงผู้รับ', included.has('tone')
      ? 'ขอเลื่อนประชุมจากวันอังคารเป็นวันพุธ ไม่ทราบว่าสะดวกไหมครับ? ถ้าไม่สะดวก รบกวนเสนอช่วงเวลาได้เลยครับ'
      : 'ขอเลื่อนประชุมจากวันอังคารเป็นวันพุธ สะดวกไหมครับ?'],
      ['ไม่ได้เดาเพิ่ม', 'ชื่อผู้รับ เวลา และเหตุผลที่โจทย์ไม่ได้ให้'],
      ...(included.has('revise') ? [['สิ่งที่ผู้รับทำต่อได้', 'ตอบรับ หรือเสนอเวลาใหม่']] : [])],
    note: 'ข้อความใช้ได้ เริ่มจากความชัดและข้อมูลที่ตรวจได้'};
}

/** Pure, prepared artifacts: these organize choices, never infer a person's health or call AI. */
export function getCarePlan(input) {
  const state = validateReward('green', input);
  if (!state?.context) return null;
  const care = CARE[state.context];
  if (state.action === 'legacy') {
    const old = LEGACY_CARE[state.context];
    return {title: care.title, anchor: state.moment === 'now' ? 'ตอนนี้' : state.moment ? old.next : '',
      action: old.action, minutes: 0, later: care.later, notice: care.notice,
      summary: state.moment ? old[`${state.moment}Summary`] : ''};
  }
  const action = care.actions[state.action];
  return {title: care.title, anchor: state.moment ? care[state.moment] : '', action: action.action,
    minutes: action.minutes, later: care.later, notice: care.notice,
    summary: state.moment ? `${care[state.moment]} → ${action.action}` : ''};
}

export function getWorkPlan(input) {
  const state = validateReward('blue', input);
  if (!state?.scenario) return null;
  if (state.scenario === 'network') {
    if (!state.offer || !state.need) return null;
    return {title: `${OFFERS[state.offer]} → ${NEEDS[state.need]}`, result: 'โจทย์ที่พร้อมคุยกับคนที่ช่วยได้',
      summary: `${OFFERS[state.offer]}ของคุณ เริ่มจาก${NEEDS[state.need]}ในขนาดที่ลองได้จริง`,
      budget: 0, used: 0, parked: 0,
      steps: [OFFER_STEPS[state.offer], ...NEED_STEPS[state.need]].map(([label, detail], i) => ({id: `network-${i}`, label, detail, minutes: 0}))};
  }
  if (state.scenario === 'course' && state.learningPath) {
    const learning = LEARNING[state.learningPath];
    return {title: learning.title, result: learning.example.note, summary: learning.example.note,
      budget: 0, used: 0, parked: 0, steps: [], example: learning.example};
  }
  const work = WORKS[state.scenario];
  const budget = state.constraint ? work.budget[state.constraint] : state.compared ? work.budget.roomy : 0;
  let used = 0;
  const steps = [];
  for (const [id, label, detail, minutes] of work.steps) {
    if (used + minutes > budget) break;
    used += minutes;steps.push({id, label, detail, minutes});
  }
  return {title: work.title, result: work.result, budget, used, steps, parked: work.steps.length - steps.length,
    example: workExample(state.scenario, steps),
    summary: `${work.label} · เริ่มด้วย ${steps.length} ขั้นใน ${used} นาที ไม่ต้องทำทุกอย่างพร้อมกัน`};
}

export function getRewardOutcome(color, input) {
  const state = validateReward(color, input);
  const empty = {complete: false, title: '', summary: ''};
  if (!state) return empty;
  if (color === 'red' && state.opened) return {complete: true,
    title: FLAVORS[state.flavor].title, summary: FLAVORS[state.flavor].discovery};
  if (color === 'green' && state.complete) return {complete: true,
    title: CARE[state.context].title, summary: getCarePlan(state).summary};
  if (color === 'blue' && state.compared) return {complete: true,
    title: state.scenario === 'network' || state.learningPath ? getWorkPlan(state).title : WORKS[state.scenario].label,
    summary: getWorkPlan(state).example?.note || getWorkPlan(state).summary};
  if (color === 'silver' && state.complete) return {complete: true,
    title: state.title, summary: state.collection ? 'คุณประกอบเว็บที่เปิดภาพและเล่าเรื่องได้แล้ว' : 'คุณเปลี่ยนข้อความและหน้าตาของเว็บชิ้นนี้ได้แล้ว'};
  return empty;
}

export function mountReward(host, {color, initial, onChange = () => {}, onComplete = () => {}} = {}) {
  const doc = host?.ownerDocument;
  let state = validateReward(color, initial);
  if (!doc || !state) throw new TypeError('A reward host, known color, and valid state are required');
  let destroyed = false, notified = getRewardOutcome(color, state).complete;
  let choosingScenario = !state.scenario;
  let choosingLearning = !!state.learningPath;
  const section = doc.createElement('section');
  section.className = `seed-reward seed-reward--${color}`;
  section.setAttribute('aria-label', 'สิ่งที่คุณค้นพบอีกฝั่ง');
  host.replaceChildren(section);
  const node = (tag, className, text) => {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  };
  const text = (copy, className = 'seed-reward-copy') => node('p', className, copy);
  const title = copy => node('h3', 'seed-reward-title', copy);
  const button = (copy, fn, selected = undefined) => {
    const el = node('button', 'seed-reward-choice', copy);
    el.type = 'button';
    if (selected !== undefined) el.setAttribute('aria-pressed', String(selected));
    el.addEventListener('click', () => {if (!destroyed) fn();});
    return el;
  };
  const options = () => node('div', 'seed-reward-options');
  const snapshot = () => ({...state});
  const announce = () => {
    onChange(snapshot());
    const outcome = getRewardOutcome(color, state);
    if (outcome.complete && !notified) {notified = true; onComplete(snapshot(), outcome);}
  };
  const update = patch => {
    if (destroyed) return;
    const focused = section.contains(doc.activeElement) && doc.activeElement.tagName === 'BUTTON'
      ? doc.activeElement.textContent : '';
    state = validateReward(color, {...state, ...patch});
    render();
    if (focused) Array.from(section.querySelectorAll('button')).find(el => el.textContent === focused)?.focus({preventScroll: true});
    announce();
  };
  const outcomePanel = () => {
    const outcome = getRewardOutcome(color, state);
    if (!outcome.complete) return;
    const el = node('div', 'seed-reward-outcome');
    el.setAttribute('role', 'status');
    el.append(text(color === 'green' ? 'หนึ่งอย่างที่คุณเลือกให้วันนี้' : 'นี่คือสิ่งที่คุณค้นพบ', 'seed-reward-note'),
      text(outcome.summary));
    section.append(el);
  };

  function red() {
    const figure = node('figure', 'seed-reward-food');
    const img = node('img');
    img.src = AKO_REWARD_IMAGE;
    img.srcset = `${AKO_REWARD_IMAGE.replace('.webp', '-mobile.webp')} 720w, ${AKO_REWARD_IMAGE} 1200w`;
    img.sizes = '(max-width: 700px) 90vw, 33vw';
    img.alt = 'ภาพประกอบเอโกะในครัว สร้างจากภาพอ้างอิงจริง';
    img.width = 1200; img.height = 1200; img.decoding = 'async';
    figure.append(img, node('figcaption', '', 'เอโกะ · คนที่รักการกิน'));
    section.append(figure, title('ของอร่อย เริ่มจากความอยากของคุณ'), text('ลองเปลี่ยนรสของวัตถุดิบคู่เดิม'));
    const choices = options();
    for (const [key, flavor] of Object.entries(FLAVORS))
      choices.append(button(flavor.label, () => update({flavor: key, opened: true}), state.flavor === key));
    section.append(choices);
    if (!state.opened) return;
    const flavor = FLAVORS[state.flavor];
    const plate = node('img', 'seed-reward-dish');
    plate.src = FOOD_REWARD_IMAGES[state.flavor];
    plate.srcset = `${plate.src.replace('.webp', '-mobile.webp')} 600w, ${plate.src} 1000w`;
    plate.sizes = '(max-width: 700px) calc(100vw - 48px), (max-width: 1100px) 40vw, 440px';
    plate.alt = state.flavor === 'bright'
      ? 'ภาพประกอบมะเขือเทศฉ่ำ แตงกวากรอบ และมะนาว ในชามเซรามิก'
      : 'ภาพประกอบมะเขือเทศและแตงกวา โรยงาขาวคั่วบุบ ในชามเซรามิก';
    plate.width = 1000; plate.height = 667; plate.decoding = 'async';
    const recipe = node('div', 'seed-reward-recipe');
    recipe.append(plate, title(flavor.title), text(flavor.ingredients.join(' · ')), text(flavor.method),
      text('การทดลองรสเล็ก ๆ สำหรับลองทำในครัวคุณ', 'seed-reward-note'));
    section.append(recipe);
    outcomePanel();
  }

  function green() {
    section.append(title('ให้เรื่องเล็ก มีที่อยู่ในวันนี้'), text('ลองจัดหนึ่งจังหวะให้ตัวเอง'));
    const choices = options();
    for (const [key, care] of Object.entries(CARE)) choices.append(button(care.label,
      () => update({context: key, action: '', moment: '', complete: false}), state.context === key));
    section.append(choices);
    if (!state.context) return;
    const care = CARE[state.context], plan = getCarePlan(state);
    const actionChoices = options();
    actionChoices.classList.add('seed-reward-options--small');
    for (const [key, action] of Object.entries(care.actions)) actionChoices.append(button(action.label,
      () => update({action: key}), state.action === key));
    section.append(actionChoices);
    const rhythm = node('div', 'seed-reward-rhythm');
    rhythm.dataset.arranged = String(!!state.moment);
    rhythm.setAttribute('aria-label', 'จังหวะหนึ่งวันของคุณ');
    rhythm.append(text(state.moment ? 'มีที่เริ่มแล้ว' : 'จาก “ไว้วันว่าง” เป็น…', 'seed-reward-note'));
    const timeline = node('ol', 'seed-reward-timeline');
    const stages = state.moment
      ? [['จังหวะเริ่ม', plan.anchor], [plan.minutes ? `${plan.minutes} นาทีของคุณ` : 'สิ่งที่คุณเลือกไว้', plan.action], ['ค่อยสังเกต', plan.notice]]
      : [['จังหวะเริ่ม', 'ยังไม่มีที่ในวัน'], [`${plan.minutes} นาทีของคุณ`, plan.action], ['ค่อยสังเกต', plan.notice]];
    for (const [i, [label, copy]] of stages.entries()) {
      const step = node('li', 'seed-reward-rhythm-step');
      step.style.setProperty('--step', i);
      step.append(node('span', 'seed-reward-step-label', label), node('strong', '', copy));
      timeline.append(step);
    }
    rhythm.append(timeline);section.append(rhythm);
    section.append(text(state.action === 'legacy' ? 'รอยเดิมที่คุณเลือกไว้ · ปรับจังหวะใหม่ได้' : 'ผูกกับจังหวะที่มีอยู่แล้ว', 'seed-reward-note'));
    const moments = options();
    const pickedMoment = moment => update({moment, complete: true,
      action: state.action === 'legacy' ? Object.keys(care.actions)[0] : state.action});
    moments.append(button(care.now, () => pickedMoment('now'), state.action !== 'legacy' && state.moment === 'now'),
      button(care.next, () => pickedMoment('next'), state.action !== 'legacy' && state.moment === 'next'));
    section.append(moments);
    if (state.complete) {
      outcomePanel();
      section.append(text('แผนที่คุณจัดไว้ ยังไม่ใช่บันทึกว่าทำแล้ว', 'seed-reward-note'));
    }
  }

  function blue() {
    section.append(title(state.scenario && state.scenario !== 'network' ? WORKS[state.scenario].title : 'ทำให้น้อยลง แต่เริ่มได้จริง'));
    if (!state.scenario) section.append(text('เลือกเรื่องที่อยากขยับ แล้วลองจัดทางของมัน'));
    if (choosingScenario) {
      const choices = options();
      for (const [key, work] of Object.entries({...WORKS, network: {label: 'หาโอกาสต่อยอด'}})) choices.append(button(work.label,
        () => {
          choosingScenario = false;choosingLearning = key === 'course';
          update({scenario: key, constraint: '', offer: '', need: '', learningPath: '', compared: false});
          section.querySelector('.seed-reward-step-choices')?.querySelector('button')?.focus({preventScroll:true});
        }, state.scenario === key));
      section.append(choices);
    } else {
      const subject = node('div', 'seed-reward-subject');
      subject.append(node('span', '', state.scenario === 'network' ? 'หาโอกาสต่อยอด' : WORKS[state.scenario].label),
        button('เปลี่ยนเรื่อง', () => {choosingScenario = true;render();section.querySelector('button')?.focus({preventScroll:true});}));
      section.append(subject);
    }
    if (!state.scenario) return;
    if (state.scenario === 'network') {
      section.append(text('วันนี้ มีอะไรอยู่ในมือ?', 'seed-reward-note'));
      const offers = options();
      offers.classList.add('seed-reward-step-choices');
      for (const [key, label] of Object.entries(OFFERS)) offers.append(button(label,
        () => update({offer: key, need: '', compared: false}), state.offer === key));
      section.append(offers);
      if (!state.offer) return;
      const held = node('div', 'seed-reward-held');
      held.append(node('span', '', OFFERS[state.offer]), node('span', 'seed-reward-held-arrow', '→'),
        node('span', '', state.need ? NEEDS[state.need] : 'อยากต่อด้วยอะไร?'));
      section.append(held);
      const needs = options();
      for (const [key, label] of Object.entries(NEEDS)) needs.append(button(label,
        () => update({need: key, compared: true}), state.need === key));
      section.append(needs);
    } else if (state.scenario === 'course' && choosingLearning) {
      section.append(text(state.learningPath ? 'อยากลองอีกแบบ ก็เปลี่ยนได้' : 'อยากเริ่มแบบไหน?', 'seed-reward-note'));
      const modes = options();modes.classList.add('seed-reward-step-choices');
      for (const [key, learning] of Object.entries(LEARNING)) modes.append(button(learning.label,
        () => update({learningPath: key, constraint: '', compared: true}), state.learningPath === key));
      section.append(modes);
    } else {
      const work = WORKS[state.scenario];
      if (!state.compared) section.append(node('blockquote', 'seed-reward-before', work.before));
      section.append(text(state.compared ? state.constraint ? 'ลองเปลี่ยนเวลา ดูว่าสิ่งไหนต่อเข้ามา'
        : 'ตัวอย่างที่คุณเก็บไว้ · เลือกเวลาที่สะดวกรอบนี้ได้' : 'ถ้าให้เวลาลองรอบแรก…', 'seed-reward-note'));
      const time = options();
      time.classList.add('seed-reward-step-choices');
      for (const key of ['short', 'roomy']) time.append(button(`${work.budget[key]} นาที`,
        () => update({constraint: key, compared: true}), state.constraint === key));
      section.append(time);
      if (state.scenario === 'course') section.append(button('เลือกทางเรียนอีกแบบ', () => {
        choosingLearning = true;update({constraint: '', compared: false});
      }));
    }
    const plan = getWorkPlan(state);
    if (plan && state.compared) {
      const artifact = node('div', 'seed-reward-work');
      artifact.dataset.constraint = state.learningPath || state.constraint || state.need;
      artifact.setAttribute('aria-label', 'แผนทดลองที่เปลี่ยนตามสิ่งที่คุณเลือก');
      if (plan.example) {
        const example = node('div', 'seed-reward-example');
        example.append(text(plan.example.label, 'seed-reward-step-label'), node('h5', '', plan.example.title));
        const sheet = node('dl', 'seed-reward-example-sheet');
        for (const [label, copy] of plan.example.rows) {
          const row = node('div');row.append(node('dt', '', label), node('dd', '', copy));sheet.append(row);
        }
        example.append(sheet);artifact.append(example);
      }
      const steps = node('ol', 'seed-reward-work-steps');
      for (const [i, step] of plan.steps.entries()) {
        const item = node('li');item.dataset.step = step.id;item.style.setProperty('--step', i);
        const index = node('span', 'seed-reward-work-index', String(i + 1).padStart(2, '0'));
        const content = node('div');content.append(node('strong', '', step.label), text(step.detail));
        item.append(index, content);
        if (step.minutes) item.append(node('span', 'seed-reward-work-minutes', `${step.minutes}′`));
        steps.append(item);
      }
      if (plan.example && plan.steps.length) {
        const method = node('details', 'seed-reward-method');
        method.append(node('summary', '', `ดูวิธีลอง ${plan.steps.length} ขั้น · ${plan.used} นาที`), steps);
        artifact.append(method);
      } else if (plan.steps.length) artifact.append(steps);
      if (plan.parked) artifact.append(text(`อีก ${plan.parked} ขั้นพักไว้ก่อน · ลองเพิ่มเวลา แล้วดูแผนต่อกัน`, 'seed-reward-parked'));
      if (!plan.example) artifact.append(text(plan.result, 'seed-reward-result'));section.append(artifact);
      outcomePanel();
    }
    section.append(text(state.scenario === 'network'
      ? 'เตรียมเรื่องเดียวให้ชัด แล้วค่อยเลือกคนที่จะเดินต่อด้วย'
      : state.scenario === 'course' && choosingLearning ? 'ตัวอย่างที่เตรียมไว้ให้ลองสังเกต · ไม่ใช่ AI ตอบสด'
      : 'แบบจำลองที่เตรียมไว้ แผนจัดใหม่ตามเวลาที่คุณเลือก · ไม่ใช่ AI ตอบสด', 'seed-reward-note'));
  }

  function silver() {
    const legacy = !state.collection && !!state.title;
    section.append(title('แตะภาพ แล้วสร้างโลกเล็ก ๆ'), text(state.collection
      ? 'เว็บนี้กดเล่นได้แล้ว · ลองเปิดภาพ หรือเปลี่ยนการจัดวาง'
      : legacy ? 'ชิ้นเดิมของคุณยังอยู่ เลือกภาพได้เมื่ออยากเริ่มชิ้นใหม่'
      : 'เลือกภาพที่สะดุดตา เดี๋ยวมันจะกลายเป็นเว็บของคุณ'));
    const materials = node('div', 'seed-craft-materials');
    for (const [key, collection] of Object.entries(CRAFT_COLLECTIONS)) {
      const choice = button('', () => update({collection:key, photo:0, title:collection.title,
        design:state.design, edited:true, complete:true}), state.collection === key);
      choice.classList.add('seed-craft-material');choice.dataset.collection = key;
      choice.setAttribute('aria-label', collection.label);
      const photo = node('img');photo.src = craftPhotoPath(collection.photos[0][0]);photo.alt = '';photo.loading = 'lazy';
      choice.append(photo, node('span', '', collection.label));materials.append(choice);
    }
    section.append(materials);
    if (!state.collection && !legacy) return;
    const designs = options();
    for (const [key, copy] of [['editorial', 'เล่าเป็นเรื่อง'], ['signal', 'ให้ภาพนำ']]) {
      const choice = button(copy, () => {
        state = validateReward(color, {...state, design:key, edited:true});paint();
        for (const el of designs.children) el.setAttribute('aria-pressed', String(el.dataset.design === key));
        announce();
      }, state.design === key);
      choice.dataset.design = key;designs.append(choice);
    }
    section.append(designs);
    const preview = node('div', `seed-reward-preview${state.collection ? ' seed-craft-gallery' : ''}`);
    preview.setAttribute('aria-label', 'เว็บที่คุณกำลังสร้าง');
    const header = node('div', 'seed-craft-heading');
    const previewTitle = node('h4');
    header.append(node('span', 'seed-reward-preview-overline', 'MY LITTLE WORLD'), previewTitle);
    preview.append(header);
    let image, imageTitle, imageNote, enlarge, thumbs;
    if (state.collection) {
      const viewer = node('div', 'seed-craft-viewer');
      enlarge = button('', () => {
        const expanded = preview.dataset.expanded !== 'true';preview.dataset.expanded = String(expanded);
        enlarge.setAttribute('aria-expanded', String(expanded));
        enlarge.setAttribute('aria-label', expanded ? 'ย่อภาพกลับ' : 'เปิดภาพเต็ม');
      });
      enlarge.classList.add('seed-craft-open');enlarge.setAttribute('aria-expanded', 'false');
      image = node('img');image.decoding = 'async';enlarge.append(image, node('span', 'seed-craft-zoom', '↗'));
      viewer.append(enlarge);
      const caption = node('div', 'seed-craft-caption');imageTitle = node('strong');imageNote = node('p');caption.append(imageTitle, imageNote);viewer.append(caption);
      thumbs = node('div', 'seed-craft-thumbs');
      CRAFT_COLLECTIONS[state.collection].photos.forEach((item, i) => {
        const thumb = button('', () => {
          state = validateReward(color, {...state, photo:i});paint();announce();
        }, i === state.photo);
        thumb.setAttribute('aria-label', `ดูภาพ ${i+1}: ${item[1]}`);
        const img = node('img');img.src = craftPhotoPath(item[0]);img.alt = '';img.loading = 'lazy';thumb.append(img);thumbs.append(thumb);
      });
      viewer.append(thumbs);preview.append(viewer);
    } else preview.append(text('เริ่มจากสิ่งเล็ก ๆ ที่เป็นของเรา'));
    section.append(preview);
    const edits = node('details', 'seed-craft-edit');
    edits.open = legacy && !state.complete;
    edits.append(node('summary', '', 'ตั้งชื่อให้เป็นของฉัน'));
    const label = node('label', 'seed-reward-label', 'ชื่อบนหน้าเว็บ');
    const input = node('input', 'seed-reward-input');input.type = 'text';input.maxLength = 104;
    input.value = state.title;input.autocomplete = 'off';input.spellcheck = false;label.append(input);edits.append(label);
    const finish = button('ใช้ชื่อนี้', () => update({complete:true}));edits.append(finish);section.append(edits);
    function paint() {
      preview.dataset.design = state.design;previewTitle.textContent = state.title;
      finish.disabled = !state.title || !state.edited;
      if (!image) return;
      const item = CRAFT_COLLECTIONS[state.collection].photos[state.photo];
      image.src = craftPhotoPath(item[0]);image.style.objectPosition = craftPhotoFocus(item[0]);
      image.alt = item[1];imageTitle.textContent = item[1];imageNote.textContent = item[2];
      enlarge.setAttribute('aria-label', preview.dataset.expanded === 'true' ? 'ย่อภาพกลับ' : 'เปิดภาพเต็ม');
      Array.from(thumbs.children).forEach((el,i) => el.setAttribute('aria-pressed', String(i === state.photo)));
    }
    input.addEventListener('input', () => {
      if (destroyed) return;
      state = validateReward(color, {...state, title:input.value, edited:true, complete:!!state.collection});
      paint();announce();
    });
    input.addEventListener('change', () => {input.value = state.title;});
    paint();
    section.append(text(state.collection ? 'ประกอบด้วยภาพที่เตรียมไว้ให้ลอง · เปลี่ยนชื่อเมื่อไรก็ได้' : 'ชิ้นเดิมและข้อความของคุณยังอยู่', 'seed-reward-note'));
  }

  function render() {
    section.replaceChildren();
    ({red, green, blue, silver})[color]();
  }
  render();
  return {snapshot, destroy() {if (destroyed) return;destroyed = true;section.remove();}};
}
