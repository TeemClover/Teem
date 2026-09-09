// Small, complete home recipes. These are editorial starting points, not claims
// that Ako personally tested each recipe or measured medical/nutrition outcomes.
const ingredient = (name, quantity, unit, note = '') => ({name, quantity, unit, note});
const photo = (path, alt) => ({path, mobile: path.replace('.webp', '-mobile.webp'), alt});
export const RECIPES = Object.freeze([
  {
    id: 'tomato-lime', category: 'salad', name: 'มะเขือเทศฉ่ำ · มะนาวสด',
    short: 'เปรี้ยวสด กรุบฉ่ำ ไม่ต้องเปิดเตา', minutes: 5, servings: 2,
    image: photo('/frontdoor/art/seed-food-bright-v2.webp', 'ภาพประกอบสลัดมะเขือเทศ แตงกวา และมะนาว'),
    ingredients: [ingredient('มะเขือเทศเชอร์รี', 200, 'กรัม'), ingredient('แตงกวา', 150, 'กรัม'), ingredient('น้ำมะนาว', 2, 'ช้อนชา'), ingredient('น้ำมันมะกอก', 1, 'ช้อนชา'), ingredient('เกลือ', null, '', 'หยิบมือเล็ก ๆ แล้วชิม')],
    steps: ['ล้างผัก ผ่ามะเขือเทศครึ่งลูก หั่นแตงกวาเป็นชิ้นพอดีคำ แล้วซับน้ำออก', 'คนน้ำมะนาว น้ำมัน และเกลือให้เข้ากันในชามที่จะเสิร์ฟ', 'ใส่ผัก คลุกเบา ๆ ชิมก่อนเติมเกลือหรือมะนาว แล้วกินตอนที่แตงกวายังกรอบ'],
    technique: 'ซับผักให้แห้งก่อนคลุก น้ำสลัดจะเกาะผัก และรสไม่ถูกน้ำที่ติดผักเจือจาง',
    swap: 'ใช้มะเขือเทศลูกใหญ่หั่นชิ้นแทนเชอร์รีได้ ถ้ามีน้ำเยอะให้ตักเมล็ดและน้ำออกบางส่วน',
    finish: 'เป็นจานข้างที่เสร็จเร็ว จะกินคู่ไข่ต้ม เต้าหู้ หรือข้าวที่มีอยู่ก็ได้',
    allergens: [], pair: 'yogurt-mustard',
  },
  {
    id: 'tomato-sesame', category: 'salad', name: 'มะเขือเทศแตงกวา · งาคั่ว',
    short: 'ผักชุดเดิม หอมขึ้นอีกทาง', minutes: 7, servings: 2,
    image: photo('/frontdoor/art/seed-food-warm-v2.webp', 'ภาพประกอบมะเขือเทศและแตงกวาคลุกงาขาวคั่ว'),
    ingredients: [ingredient('มะเขือเทศเชอร์รี', 200, 'กรัม'), ingredient('แตงกวา', 150, 'กรัม'), ingredient('งาขาว', 2, 'ช้อนชา'), ingredient('น้ำส้มสายชูข้าว', 2, 'ช้อนชา'), ingredient('ซีอิ๊วขาว', 1, 'ช้อนชา'), ingredient('น้ำมันรสอ่อน', 1, 'ช้อนชา')],
    steps: ['คั่วงาในกระทะแห้งด้วยไฟอ่อน 1–2 นาที เขย่ากระทะจนหอม แล้วตักออกทันที ถ้ามีงาคั่วอยู่แล้วให้ข้ามขั้นนี้', 'บดงาหยาบ ๆ ผสมน้ำส้มสายชู ซีอิ๊ว และน้ำมัน', 'หั่นผัก ซับให้แห้ง คลุกกับน้ำสลัด แล้วชิมก่อนเสิร์ฟ'],
    technique: 'บดงาแค่พอแตก กลิ่นจะออกชัดกว่าโรยเมล็ดทั้งเมล็ด และไม่ต้องเพิ่มน้ำมันงา',
    swap: 'น้ำมะนาวใช้แทนน้ำส้มสายชูข้าวได้ เริ่มน้อยกว่าสูตรแล้วค่อยชิมเติม',
    finish: 'ถ้าชอบแตงกวากรุบ ๆ ค่อยคลุกตอนที่จะกิน',
    allergens: ['งา', 'ถั่วเหลือง', 'ซีอิ๊วบางชนิดมีข้าวสาลี'], pair: 'soy-lime',
  },
  {
    id: 'egg-crunch', category: 'salad', name: 'สลัดไข่ต้ม · โยเกิร์ตมัสตาร์ด',
    short: 'ผักกรอบ ไข่นุ่ม น้ำสลัดไม่หนัก', minutes: 15, servings: 2,
    image: photo('/ako/kitchen/art/egg-salad-v1.webp', 'ภาพประกอบสลัดผัก ไข่ต้ม มะเขือเทศและน้ำสลัดโยเกิร์ต'),
    ingredients: [ingredient('ไข่ไก่', 2, 'ฟอง'), ingredient('ผักคอสหรือผักสลัด', 100, 'กรัม'), ingredient('แตงกวา', 100, 'กรัม'), ingredient('มะเขือเทศ', 100, 'กรัม'), ingredient('โยเกิร์ตรสธรรมชาติไม่หวาน', 4, 'ช้อนโต๊ะ'), ingredient('มัสตาร์ด', 1, 'ช้อนชา'), ingredient('น้ำเลมอนหรือน้ำมะนาว', 2, 'ช้อนชา'), ingredient('เกลือและพริกไทย', null, '', 'เล็กน้อย แล้วชิม')],
    steps: ['วางไข่ในหม้อ เติมน้ำให้ท่วม พอน้ำเดือดลดเป็นเดือดอ่อน ต้มต่อ 9–10 นาทีให้ไข่สุก แล้วแช่น้ำเย็นก่อนปอก', 'ระหว่างต้มไข่ ล้างและซับผักให้แห้ง หั่นแตงกวาและมะเขือเทศ', 'คนโยเกิร์ต มัสตาร์ด น้ำเลมอน เกลือและพริกไทย ชิมให้ได้รสที่ชอบ', 'ผ่าไข่เป็นเสี้ยว วางบนผัก ราดน้ำสลัดแค่พอเคลือบ ที่เหลือวางแยกไว้เติม'],
    technique: 'อย่าเทน้ำสลัดทั้งหมดทีเดียว เริ่มทีละช้อน ผักจะยังกรอบและแต่ละคำไม่แฉะ',
    swap: 'ไม่มีมัสตาร์ด ใช้น้ำเลมอนเพิ่มเล็กน้อยกับพริกไทยได้ ถ้าไม่กินไข่ ใช้เต้าหู้สุกหั่นชิ้นแทน',
    finish: 'กินทันทีหลังคลุก ถ้าเตรียมล่วงหน้า แยกผัก ไข่ และน้ำสลัดไว้ในตู้เย็น',
    allergens: ['ไข่', 'นม', 'มัสตาร์ด'], pair: 'yogurt-mustard',
  },
  {
    id: 'tofu-rice', category: 'meal', name: 'ข้าวเต้าหู้เห็ด · ซีอิ๊วมะนาว',
    short: 'จานอุ่นจากกระทะใบเดียว', minutes: 20, servings: 2,
    image: photo('/ako/kitchen/art/tofu-mushroom-rice-v1.webp', 'ภาพประกอบข้าว เต้าหู้ย่าง เห็ดชิเมจิและบรอกโคลี'),
    ingredients: [ingredient('ข้าวสุก', 2, 'ถ้วย'), ingredient('เต้าหู้แข็ง', 200, 'กรัม'), ingredient('เห็ดชิเมจิ', 150, 'กรัม'), ingredient('บรอกโคลี', 150, 'กรัม'), ingredient('น้ำมันรสอ่อน', 2, 'ช้อนชา'), ingredient('ซีอิ๊วขาว', 2, 'ช้อนชา'), ingredient('น้ำมะนาว', 2, 'ช้อนชา'), ingredient('น้ำเปล่า', 2, 'ช้อนโต๊ะ')],
    steps: ['หั่นเต้าหู้เป็นลูกเต๋า ซับให้แห้ง ตัดโคนเห็ด และหั่นบรอกโคลีเป็นชิ้นเล็ก', 'ตั้งกระทะไฟกลาง ใส่น้ำมัน จี่เต้าหู้ด้านละประมาณ 3 นาทีจนเหลือง แล้วพักข้างกระทะ', 'ใส่เห็ด บรอกโคลีและน้ำเปล่า ปิดฝา 3–4 นาที เปิดฝาและผัดจนผักสุกและน้ำงวด', 'เติมซีอิ๊ว คลุกให้ทั่ว ปิดไฟแล้วเติมน้ำมะนาว เสิร์ฟบนข้าวสุกอุ่น ๆ'],
    technique: 'ซับเต้าหู้ให้แห้งและรอให้ด้านแรกเหลืองก่อนพลิก จะได้ผิวสวยโดยไม่ต้องทอดน้ำมันท่วม',
    swap: 'ใช้เห็ดนางฟ้าแทนชิเมจิ หรือถั่วแขกแทนบรอกโคลีได้ หั่นให้ชิ้นใกล้กันเพื่อให้สุกพร้อมกัน',
    finish: 'ถ้าเริ่มจากข้าวดิบ ให้เผื่อเวลาหุงแยกจาก 20 นาทีนี้',
    allergens: ['ถั่วเหลือง', 'ซีอิ๊วบางชนิดมีข้าวสาลี'], pair: 'soy-lime',
  },
  {
    id: 'yogurt-mustard', category: 'dressing', name: 'โยเกิร์ตมัสตาร์ด · คนแล้วจบ',
    short: 'ครีมมี่ เปรี้ยวนิด เข้ากับไข่และผักกรอบ', minutes: 3, servings: 2,
    image: photo('/ako/kitchen/art/yogurt-dressing-v1.webp', 'ภาพประกอบน้ำสลัดโยเกิร์ต เลมอนและมัสตาร์ด'),
    ingredients: [ingredient('โยเกิร์ตรสธรรมชาติไม่หวาน', 4, 'ช้อนโต๊ะ'), ingredient('มัสตาร์ด', 1, 'ช้อนชา'), ingredient('น้ำเลมอนหรือน้ำมะนาว', 2, 'ช้อนชา'), ingredient('น้ำเปล่า', 1, 'ช้อนชา'), ingredient('เกลือและพริกไทย', null, '', 'เล็กน้อย แล้วชิม')],
    steps: ['คนโยเกิร์ตกับมัสตาร์ดจนเนียน เติมน้ำเลมอน เกลือและพริกไทย', 'เติมน้ำทีละครึ่งช้อนชา จนไหลจากช้อนเป็นสายสั้น ๆ ไม่เหลวเป็นน้ำ', 'ลองชิมกับผักหนึ่งชิ้นก่อนเติมรส เพราะรสบนผักจะอ่อนกว่าชิมน้ำสลัดเปล่า ๆ'],
    technique: 'ชิมกับสิ่งที่จะกินจริง น้ำสลัดที่เข้มไปบนช้อนอาจพอดีเมื่อเคลือบผัก',
    swap: 'ใช้โยเกิร์ตจากพืชแบบไม่หวานแทนได้ แต่ความข้นต่างกัน จึงค่อย ๆ เติมน้ำ',
    finish: 'สูตรนี้พอเคลือบสลัดข้างจานประมาณ 2 ที่ ถ้ายังไม่กินให้ปิดฝาแช่เย็น',
    allergens: ['นม', 'มัสตาร์ด'], pair: 'egg-crunch',
  },
  {
    id: 'soy-lime', category: 'dressing', name: 'ซีอิ๊วมะนาว · เบาและสด',
    short: 'น้ำสลัดใส ใช้กับผักหรือเต้าหู้อุ่น', minutes: 3, servings: 2,
    ingredients: [ingredient('ซีอิ๊วขาว', 2, 'ช้อนชา'), ingredient('น้ำมะนาว', 2, 'ช้อนชา'), ingredient('น้ำเปล่า', 2, 'ช้อนชา'), ingredient('น้ำมันรสอ่อน', 1, 'ช้อนชา'), ingredient('น้ำตาล', 0.5, 'ช้อนชา')],
    steps: ['คนน้ำตาลกับน้ำเปล่าจนละลาย แล้วเติมซีอิ๊วและน้ำมะนาว', 'เติมน้ำมัน ตีด้วยส้อมให้เข้ากัน หรือปิดฝาขวดแล้วเขย่า', 'ชิมกับเต้าหู้หรือผักหนึ่งชิ้น ถ้าเข้มไปเติมน้ำทีละนิด เขย่าอีกครั้งก่อนราด'],
    technique: 'น้ำมันกับน้ำจะแยกชั้นได้เป็นปกติ เขย่าก่อนใช้ก็กลับมาคลุกอาหารได้',
    swap: 'ใช้ซีอิ๊วชนิดที่คุณกินอยู่แล้ว และเริ่มน้อยกว่าสูตรได้ เพราะแต่ละยี่ห้อเค็มไม่เท่ากัน',
    finish: 'ไม่ต้องเทหมดขวด เริ่มราดทีละช้อนแล้วค่อยเติม',
    allergens: ['ถั่วเหลือง', 'ซีอิ๊วบางชนิดมีข้าวสาลี'], pair: 'tofu-rice',
    mixing: ['ซีอิ๊ว 2', 'มะนาว 2', 'น้ำ 2'], mixingUnit: 'ช้อนชา · สำหรับ 2 ที่',
  },
  {
    id: 'peanut-lime', category: 'dressing', name: 'ถั่วลิสงมะนาว · ข้นนัว',
    short: 'คลุกผักกรอบ หรือวางไว้เป็นดิป', minutes: 5, servings: 2,
    ingredients: [ingredient('เนยถั่วลิสงเนื้อเนียนไม่หวาน', 1, 'ช้อนโต๊ะ'), ingredient('น้ำมะนาว', 2, 'ช้อนชา'), ingredient('ซีอิ๊วขาว', 1, 'ช้อนชา'), ingredient('น้ำอุ่น', 2, 'ช้อนโต๊ะ'), ingredient('น้ำตาล', 0.5, 'ช้อนชา')],
    steps: ['คนเนยถั่วกับน้ำอุ่นทีละช้อนจนเนียน อย่าเทน้ำทั้งหมดทีเดียว', 'เติมน้ำมะนาว ซีอิ๊วและน้ำตาล คนให้เข้ากัน', 'ถ้าจะใช้เป็นดิปให้หยุดตอนข้น ถ้าจะคลุกสลัดเติมน้ำอีกทีละช้อนชาจนเคลือบผักได้บาง ๆ'],
    technique: 'น้ำทำให้เนยถั่วจับตัวข้นช่วงแรกได้ คนต่อและเติมทีละนิด เนื้อจะกลับมาเนียน',
    swap: 'ถ้าไม่มีเนยถั่ว ใช้ถั่วลิสงคั่วไม่เค็มบดละเอียด เนื้อจะหยาบขึ้น เหมาะกับผักกรอบ',
    finish: 'เหมาะกับแตงกวา แครอต หรือเต้าหู้สุก ไม่จำเป็นต้องมีผักหลายชนิด',
    allergens: ['ถั่วลิสง', 'ถั่วเหลือง', 'ซีอิ๊วบางชนิดมีข้าวสาลี'], pair: 'tomato-lime',
    mixing: ['คนทีละนิด', 'ชิมกับผัก', 'ปรับความข้น'], mixingUnit: 'น้ำสลัดหรือดิป · คุณเลือกได้',
  },
]);

export function getRecipe(id) { return RECIPES.find(recipe => recipe.id === id) || RECIPES[0]; }
export function normalizePortions(value) { const n = Number(value); return [1, 2, 4].includes(n) ? n : 2; }
export function quantityText(value) {
  if (value === null) return '';
  const whole = Math.floor(value), fraction = value - whole;
  const fractions = new Map([[0.25, '¼'], [0.5, '½'], [0.75, '¾']]);
  return fractions.has(fraction) ? `${whole || ''}${fractions.get(fraction)}` : String(Number(value.toFixed(2)));
}
export function scaledIngredients(recipe, portions) {
  const scale = normalizePortions(portions) / recipe.servings;
  return recipe.ingredients.map(item => ({...item, amount: quantityText(item.quantity === null ? null : item.quantity * scale)}));
}

export const KITCHEN_KEY = 'myclover:ako:kitchen:v1';
export function validateKitchenState(input) {
  const validId = id => RECIPES.some(recipe => recipe.id === id);
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const recipeId = validId(value.recipeId) ? value.recipeId : RECIPES[0].id;
  const recipe = getRecipe(recipeId);
  return {
    version: 1, recipeId, portions: normalizePortions(value.portions),
    savedIds: [...new Set(Array.isArray(value.savedIds) ? value.savedIds.filter(validId) : [])],
    checkedSteps: [...new Set(Array.isArray(value.checkedSteps) ? value.checkedSteps.filter(n => Number.isInteger(n) && n >= 0 && n < recipe.steps.length) : [])],
  };
}
export function loadKitchenState(storage) {
  try { return validateKitchenState(JSON.parse(storage.getItem(KITCHEN_KEY))); }
  catch { return validateKitchenState(null); }
}
export function persistKitchenState(storage, input) {
  const state = validateKitchenState(input), serialized = JSON.stringify(state);
  try { storage.setItem(KITCHEN_KEY, serialized); return {ok: storage.getItem(KITCHEN_KEY) === serialized, state}; }
  catch { return {ok: false, state}; }
}
