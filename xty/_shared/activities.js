/* Activity copy shown in Create Party stays deliberately short. The metadata
   below is for deterministic Ending source generation, not for the picker UI. */

function freezeMeta(value) {
  const comicGuidance = Object.freeze({ ...value.comicGuidance });
  return Object.freeze({
    ...value,
    tone: Object.freeze([...(value.tone || [])]),
    visualCues: Object.freeze([...(value.visualCues || [])]),
    objectCues: Object.freeze([...(value.objectCues || [])]),
    sceneIdeas: Object.freeze([...(value.sceneIdeas || [])]),
    endingMotifs: Object.freeze([...(value.endingMotifs || [])]),
    avoid: Object.freeze([...(value.avoid || [])]),
    comicGuidance,
  });
}

function activity(id, labelTh, character, hintTh, metadata, options = {}) {
  return Object.freeze({
    id,
    labelTh,
    character,
    hintTh,
    art: options.art || `/xty/assets/art/activities/activity-${id}.webp`,
    selectable: options.selectable !== false,
    metadata: freezeMeta({ key: id, label: labelTh, ...metadata }),
    color: options.color || null,
  });
}

const DEFINITIONS = Object.freeze([
  activity('walk', 'เดิน', 'แมวส้ม', 'ออกไปเดินในจังหวะของตัวเอง', {
    category: 'body', tone: ['gentle', 'steady', 'everyday'],
    storyFrame: 'เริ่มจากก้าวเล็ก ๆ แล้วค่อยไปต่อ',
    successMeaning: 'ออกไปเดินจริงและกลับมาทำต่อได้อย่างสม่ำเสมอ',
    teamMeaning: 'ต่างคนต่างเดิน แล้วกลับมาอยู่ในสมุดเดียวกัน',
    visualCues: ['ทางเดิน', 'ต้นไม้', 'แสงเช้าหรือเย็น', 'route marker'],
    objectCues: ['รองเท้า', 'ขวดน้ำ', 'checklist'],
    sceneIdeas: ['เริ่มเดิน', 'ออกไปใช้ชีวิต', 'วันที่เหนื่อยแต่ยังออกไป', 'กลับมาลงชื่อ'],
    endingMotifs: ['ก้าวเล็ก', 'ความสม่ำเสมอ', 'เส้นทางของตัวเอง'],
    avoid: ['กีฬาแข่งขันหนัก', 'podium', 'medal overload'],
    comicGuidance: { panel1: 'เริ่มก้าวแรก', panel2: 'เดินในชีวิตจริง', panel3: 'ผ่านวันที่ไม่อยากออกไป', panel4: 'มองย้อนเส้นทางที่เดินมา' },
  }, { color: 'red' }),
  activity('run', 'วิ่ง', 'ปอมขาว', 'ออกไปวิ่งเท่าที่วันนี้ไหว', {
    category: 'body', tone: ['active', 'energizing', 'supportive'],
    storyFrame: 'วิ่งในจังหวะของตัวเอง แล้วกลับมาเล่าเรื่องวันนั้น',
    successMeaning: 'กลับมาวิ่งอย่างต่อเนื่องในแบบที่ทำไหว',
    teamMeaning: 'ไม่ต้อง pace เดียวกัน แค่รู้ว่ายังมีคนอื่นกำลังไปต่อ',
    visualCues: ['running route', 'track', 'sunrise', 'park'],
    objectCues: ['running shoes', 'stopwatch', 'water bottle'],
    sceneIdeas: ['warm-up', 'ออกวิ่ง', 'วันที่เหนื่อยแต่ยังไป', 'กลับมาลงชื่อ'],
    endingMotifs: ['จังหวะของตัวเอง', 'แรงใจ', 'ไปต่อ'],
    avoid: ['แข่งกันรุนแรง', 'body comparison'],
    comicGuidance: { panel1: 'ผูกเชือกรองเท้า', panel2: 'ออกวิ่งใน pace ของตัวเอง', panel3: 'ผ่านวันที่เหนื่อย', panel4: 'มองย้อนระยะทางที่สะสม' },
  }, { color: 'red' }),
  activity('workout', 'ออกกำลัง', 'ควาย', 'ขยับร่างกายในแบบที่เลือก', {
    category: 'body', tone: ['disciplined', 'supportive', 'energetic'],
    storyFrame: 'ขยับร่างกายในแบบที่เหมาะกับตัวเอง',
    successMeaning: 'ได้ขยับร่างกายตามที่ตั้งใจ',
    teamMeaning: 'ต่างคนต่างออกกำลัง แล้วกลับมาเห็นกัน',
    visualCues: ['stretching', 'dumbbells', 'home workout', 'gym corner'],
    objectCues: ['เสื่อออกกำลัง', 'ผ้าขนหนู', 'ขวดน้ำ'],
    sceneIdeas: ['วอร์มร่างกาย', 'ฝึกตามแผน', 'ปรับท่าให้ทำไหว', 'กลับมาลงชื่อ'],
    endingMotifs: ['วินัย', 'แรงใจ', 'แข็งแรงในแบบของตัวเอง'],
    avoid: ['body shaming', 'before-after cliché', 'extreme fitness'],
    comicGuidance: { panel1: 'ปูเสื่อและตั้งเป้า', panel2: 'ขยับร่างกายในแบบที่ทำไหว', panel3: 'กลับมาทำในวันที่อยากผัด', panel4: 'เห็นความสม่ำเสมอแทนการเปรียบเทียบรูปร่าง' },
  }, { color: 'red' }),
  activity('enjoy-food', 'กินอร่อย', 'หมู', 'หาอะไรอร่อย ๆ ให้วันนี้', {
    category: 'body', tone: ['joyful', 'sensory', 'everyday'],
    storyFrame: 'ให้มื้อหนึ่งเป็นความสุขเล็ก ๆ ของวัน',
    successMeaning: 'ได้กินหรือชิมสิ่งที่ตั้งใจและมีความสุขกับมัน',
    teamMeaning: 'ต่างคนต่างมีมื้อของตัวเอง แล้วเอาเรื่องกลับมาแบ่งกัน',
    visualCues: ['favorite food', 'street food', 'cafe', 'restaurant table'],
    objectCues: ['จานอาหาร', 'ช้อนส้อม', 'แก้วน้ำ'],
    sceneIdeas: ['เลือกของที่อยากกิน', 'ได้กินจริง', 'เก็บ moment ของรสชาติ', 'กลับมาลงชื่อ'],
    endingMotifs: ['รสชาติ', 'ความสุขเล็ก ๆ', 'มื้อที่จำได้'],
    avoid: ['diet judgement', 'body shame', 'overeating comedy'],
    comicGuidance: { panel1: 'เลือกสิ่งที่อยากกิน', panel2: 'ได้กินจริง', panel3: 'มี moment เล็ก ๆ ที่จำได้', panel4: 'เก็บมื้อนั้นไว้เป็นเรื่องของวัน' },
  }, { color: 'red' }),

  activity('eat', 'กินให้ดี', 'หมู', 'ดูแลตัวเองผ่านมื้ออาหาร', {
    category: 'life', tone: ['caring', 'healthy', 'everyday'],
    storyFrame: 'ดูแลตัวเองผ่านมื้อเล็ก ๆ ที่ตั้งใจขึ้นทุกวัน',
    successMeaning: 'เลือกกินในแบบที่ตัวเองตั้งใจได้อย่างต่อเนื่อง',
    teamMeaning: 'ต่างคนต่างดูแลมื้อของตัวเอง แล้วกลับมาเห็นกัน',
    visualCues: ['balanced meal', 'lunchbox', 'water', 'grocery prep'],
    objectCues: ['จานอาหาร', 'กล่องข้าว', 'ขวดน้ำ'],
    sceneIdeas: ['เตรียมมื้อ', 'กินให้ตรงเวลา', 'เลือกสิ่งที่ทำได้จริง', 'กลับมาลงชื่อ'],
    endingMotifs: ['มื้อเล็กที่ตั้งใจ', 'การดูแล', 'ทำได้จริง'],
    avoid: ['diet extremism', 'body shame', 'weight-loss before-after'],
    comicGuidance: { panel1: 'วางแผนมื้อที่ทำไหว', panel2: 'ลงมือกินและดื่มน้ำตามจริง', panel3: 'หาทางเลือกในวันที่ยุ่ง', panel4: 'รวมมื้อเล็ก ๆ เป็นนิสัยที่อ่อนโยน' },
  }, { color: 'green' }),
  activity('sleep', 'นอนให้พอ', 'แมวขาว', 'ให้เวลากับการพักผ่อน', {
    category: 'life', tone: ['calm', 'restorative', 'gentle'],
    storyFrame: 'การพักผ่อนก็เป็นเรื่องจริงที่ควรให้เวลากับมัน',
    successMeaning: 'ดูแลจังหวะชีวิตและเวลานอนให้ดีขึ้น',
    teamMeaning: 'ต่างคนต่างพัก แล้วกลับมาอยู่ในเรื่องเดียวกัน',
    visualCues: ['moon', 'bed', 'pillow', 'cozy room', 'night checklist'],
    objectCues: ['นาฬิกา', 'โคมไฟ', 'ผ้าห่ม'],
    sceneIdeas: ['ปิดวัน', 'วางโทรศัพท์', 'รักษาเวลานอน', 'เช้าที่ได้พักพอ'],
    endingMotifs: ['การพัก', 'จังหวะชีวิต', 'ความอ่อนโยน'],
    avoid: ['ทำให้การพักดูเป็นความขี้เกียจ'],
    comicGuidance: { panel1: 'ตั้งเวลาปิดวัน', panel2: 'ทำ ritual ก่อนนอน', panel3: 'เลือกพักแทนการฝืน', panel4: 'เช้าที่สดขึ้นจากการพักต่อเนื่อง' },
  }, { color: 'green' }),
  activity('housework', 'งานบ้าน', 'ไก่', 'ดูแลพื้นที่ที่เราใช้ชีวิต', {
    category: 'life', tone: ['warm', 'practical', 'satisfying'],
    storyFrame: 'งานเล็ก ๆ ในบ้านก็เป็นส่วนหนึ่งของชีวิตที่เราดูแลได้',
    successMeaning: 'บ้านและชีวิตเบาขึ้นจากสิ่งที่ลงมือทำ',
    teamMeaning: 'ให้คุณค่ากับงานประจำวันที่แต่ละคนกำลังทำ',
    visualCues: ['broom', 'tidy room', 'laundry', 'shelf', 'cleaning tools'],
    objectCues: ['ไม้กวาด', 'ตะกร้าผ้า', 'กล่องเก็บของ'],
    sceneIdeas: ['เลือกหนึ่งมุม', 'เก็บทีละชิ้น', 'จัดพื้นที่', 'พักในบ้านที่เบาขึ้น'],
    endingMotifs: ['พื้นที่เบา', 'งานเล็กที่มีค่า', 'บ้านที่ดูแลแล้ว'],
    avoid: ['บ้านสมบูรณ์แบบเกินจริง', 'ดูแคลนงานบ้าน'],
    comicGuidance: { panel1: 'เลือกมุมเล็ก ๆ ที่จะจัด', panel2: 'ลงมือเก็บกวาด', panel3: 'ค่อย ๆ ทำให้เสร็จ', panel4: 'นั่งพักในพื้นที่ที่เบาขึ้น' },
  }, { color: 'green' }),
  activity('wellness', 'ดูแลตัวเอง', 'แมวขาว', 'ทำเรื่องเล็ก ๆ ให้ตัวเอง', {
    category: 'life', tone: ['nurturing', 'gentle', 'small rituals'],
    storyFrame: 'สัญญาเล็ก ๆ กับตัวเองที่ค่อย ๆ ทำได้จริง',
    successMeaning: 'กลับมาดูแลชีวิตตัวเองอย่างอ่อนโยน',
    teamMeaning: 'ต่างคนต่างดูแลตัวเอง แล้วกลับมาเห็นกันโดยไม่กดดัน',
    visualCues: ['water', 'health routine', 'grooming', 'care items', 'checklist'],
    objectCues: ['แก้วน้ำ', 'ของใช้ดูแลตัวเอง', 'checklist'],
    sceneIdeas: ['เลือก ritual เล็ก', 'ลงมือดูแล', 'ทำซ้ำอย่างไม่กดดัน', 'เห็นกิจวัตรที่กลับมา'],
    endingMotifs: ['สัญญากับตัวเอง', 'ritual เล็ก', 'ความอ่อนโยน'],
    avoid: ['vanity tone', 'product-heavy commercial vibe', 'medical claim'],
    comicGuidance: { panel1: 'เลือก ritual ที่ทำได้จริง', panel2: 'ทำเรื่องเล็กเพื่อดูแลตัวเอง', panel3: 'กลับมาทำโดยไม่กดดัน', panel4: 'เห็นสัญญาเล็กกลายเป็นกิจวัตร' },
  }, { color: 'green' }),

  activity('read', 'อ่าน', 'เต่า', 'เปิดอ่านสิ่งที่อยากอ่าน', {
    category: 'mind', tone: ['calm', 'thoughtful', 'focused'],
    storyFrame: 'เปิดอ่านทีละนิด แล้วกลับมาเก็บสิ่งที่ได้ไว้',
    successMeaning: 'อ่านต่อเนื่องและได้บางอย่างกลับมา',
    teamMeaning: 'ต่างคนต่างอ่าน แล้วกลับมาเห็นกันในสมุดเดียวกัน',
    visualCues: ['books', 'bookmark', 'notes', 'warm reading corner'],
    objectCues: ['หนังสือ', 'ที่คั่น', 'ดินสอ', 'โน้ต'],
    sceneIdeas: ['เปิดเล่ม', 'อ่านในมุมของตัวเอง', 'จดสิ่งที่ได้', 'กลับมาลงชื่อ'],
    endingMotifs: ['หน้าที่เปิดแล้ว', 'สิ่งที่ได้กลับมา', 'สมาธิ'],
    avoid: ['academic pressure เกินจำเป็น'],
    comicGuidance: { panel1: 'เปิดหนังสือและวางที่คั่นหน้าแรก', panel2: 'อ่านในมุมของตัวเอง', panel3: 'เก็บประโยคหรือบทเรียนที่ได้', panel4: 'วางหน้าที่อ่านสะสมไว้เป็นความทรงจำ' },
  }, { color: 'blue' }),
  activity('study', 'เรียน', 'กา', 'เรียนหรือทบทวนสิ่งใหม่', {
    category: 'mind', tone: ['focused', 'encouraging', 'steady'],
    storyFrame: 'เรียนทีละเรื่องในจังหวะของตัวเอง',
    successMeaning: 'ทบทวน ฝึก หรือทำโจทย์ตามแผน',
    teamMeaning: 'ไม่ต้องเรียนเรื่องเดียวกัน แค่รู้ว่ายังมีคนอื่นพยายามอยู่',
    visualCues: ['desk', 'notebook', 'flashcards', 'calendar', 'exam notes'],
    objectCues: ['สมุด', 'บัตรคำ', 'ปฏิทิน', 'ดินสอ'],
    sceneIdeas: ['ตั้งแผน', 'ทำโจทย์', 'ผ่านบทที่ยาก', 'กลับมาลงชื่อ'],
    endingMotifs: ['ความเข้าใจ', 'การฝึก', 'ไปทีละบท'],
    avoid: ['panic exam drama เกินจริง'],
    comicGuidance: { panel1: 'เปิดสมุดและแบ่งบทเรียน', panel2: 'ฝึกในเวลาของตัวเอง', panel3: 'คลี่จุดที่ติด', panel4: 'มองเห็นสิ่งที่เข้าใจเพิ่มขึ้น' },
  }, { color: 'blue' }),
  activity('mindfulness', 'พักใจ', 'ยูนิคอร์น', 'หยุดพักและกลับมาอยู่กับตัวเอง', {
    category: 'mind', tone: ['soft', 'safe', 'healing'],
    storyFrame: 'มีพื้นที่หายใจโดยไม่ต้องเร่งตัวเอง',
    successMeaning: 'กลับมาดูแลใจตัวเองทีละนิด',
    teamMeaning: 'ต่างคนต่างมีพื้นที่ของตัวเอง แต่ไม่จำเป็นต้องผ่านวันหนักเพียงลำพัง',
    visualCues: ['breeze', 'leaves', 'warm light', 'quiet corner', 'tea'],
    objectCues: ['ถ้วยชา', 'เบาะนั่ง', 'ใบไม้', 'สมุดเล็ก'],
    sceneIdeas: ['หยุดหายใจ', 'นั่งเงียบ ๆ', 'ให้พื้นที่ตัวเอง', 'กลับไปต่ออย่างเบาลง'],
    endingMotifs: ['พื้นที่ปลอดภัย', 'ลมหายใจ', 'ไม่เร่ง'],
    avoid: ['dramatic sadness', 'medical claim'],
    comicGuidance: { panel1: 'จัดมุมพักใจ', panel2: 'หยุดหายใจในจังหวะตัวเอง', panel3: 'ให้พื้นที่กับตัวเอง', panel4: 'กลับไปต่อพร้อมพื้นที่ในใจมากขึ้น' },
  }, { color: 'blue' }),
  activity('game', 'เกม', 'แมวส้ม + ปอมขาว', 'เล่นเกมในแบบที่ชอบ', {
    category: 'mind', tone: ['joyful', 'social', 'playful'],
    storyFrame: 'เกมที่เล่นกลายเป็น moment หนึ่งของวันและของกลุ่ม',
    successMeaning: 'ได้เล่นเกมที่ตั้งใจ ไม่ว่าจะเล่นคนเดียวหรือกับคนอื่น',
    teamMeaning: 'ไม่ต้องเล่นเกมเดียวกัน การกลับมาเล่าหรือเห็นกันก็เป็นเรื่องร่วมได้',
    visualCues: ['board game table', 'cards', 'dice', 'puzzle pieces', 'game pieces'],
    objectCues: ['กระดาน', 'การ์ด', 'ลูกเต๋า', 'ตัวหมาก'],
    sceneIdeas: ['หยิบเกมขึ้นมา', 'เริ่มเล่น', 'ช็อตคิดหรือพลิกเกม', 'เก็บเกมพร้อมความทรงจำ'],
    endingMotifs: ['การเล่น', 'ความคิด', 'moment ที่จำได้'],
    avoid: ['casino feel', 'พนัน', 'เงินรางวัล', 'specific game IP'],
    comicGuidance: { panel1: 'จัดเกมหรืออุปกรณ์', panel2: 'เล่นในแบบที่ชอบ', panel3: 'เก็บช็อตคิดหรือพลิกเกม', panel4: 'ปิดเกมพร้อมเรื่องเล่าของวัน' },
  }, { color: 'blue', art: '/xty/assets/art/activities/activity-board-game.webp' }),

  activity('work', 'ทำงาน', 'ปอมขาว', 'โฟกัสงานสำคัญให้เดินหน้า', {
    category: 'craft', tone: ['focused', 'reliable', 'constructive'],
    storyFrame: 'เปลี่ยนงานที่ค้างให้กลายเป็นของจริงทีละชิ้น',
    successMeaning: 'ทำจริง ส่งจริง และขยับงานให้เดินหน้า',
    teamMeaning: 'ต่างคนต่างทำงาน แล้วกลับมาเห็นว่าทุกคนยังเดินหน้าอยู่',
    visualCues: ['laptop', 'task list', 'files', 'desk', 'shipped item'],
    objectCues: ['แล็ปท็อป', 'รายการงาน', 'แฟ้ม', 'ปากกา'],
    sceneIdeas: ['เลือกงานสำคัญ', 'ลงมือทำ', 'แก้จุดติด', 'ส่งงานจริง'],
    endingMotifs: ['ของจริง', 'ความรับผิดชอบ', 'งานที่ส่งแล้ว'],
    avoid: ['burnout glory', 'corporate coldness'],
    comicGuidance: { panel1: 'เลือกงานหนึ่งชิ้นจากรายการ', panel2: 'ลงมือทำในโต๊ะทำงานที่อบอุ่น', panel3: 'คลี่งานที่ติด', panel4: 'วางชิ้นงานที่ส่งแล้วบนหน้าสมุด' },
  }, { color: 'silver' }),
  activity('create', 'สร้างสรรค์', 'จิ้งจอก', 'วาด เขียน ทำ หรือทดลองไอเดีย', {
    category: 'craft', tone: ['imaginative', 'playful', 'hopeful'],
    storyFrame: 'ไอเดียที่อยู่ในหัวเริ่มกลายเป็นของจริง',
    successMeaning: 'ลงมือสร้าง ไม่ใช่แค่คิด',
    teamMeaning: 'ได้แรงจากการเห็นคนอื่นกำลังสร้างของตัวเองด้วย',
    visualCues: ['sketchbook', 'colors', 'camera', 'music tools', 'handmade objects'],
    objectCues: ['สมุดสเก็ตช์', 'สีไม้', 'กล้อง', 'เครื่องมือทำมือ'],
    sceneIdeas: ['ร่างไอเดีย', 'ทดลอง', 'ทำงานระหว่างทาง', 'วางผลงานจริง'],
    endingMotifs: ['ไอเดียเป็นจริง', 'การทดลอง', 'งานที่สร้างแล้ว'],
    avoid: ['generic office look'],
    comicGuidance: { panel1: 'ร่างไอเดียลงสมุด', panel2: 'ทดลองสร้าง', panel3: 'ผ่านช่วงที่งานไม่ลงตัว', panel4: 'วางผลงานจริงไว้บนโต๊ะ' },
  }, { color: 'silver' }),
  activity('trade', 'ซื้อขาย', 'ยูนิคอร์น', 'วางแผนและทำตามระบบของตัวเอง', {
    category: 'craft', tone: ['disciplined', 'analytical', 'steady'],
    storyFrame: 'ดูข้อมูล วางแผน และกลับมาทำตามระบบอย่างมีวินัย',
    successMeaning: 'ไม่ใช่แค่กำไร แต่คือการทำตามแผนและรักษาวินัย',
    teamMeaning: 'ต่างคนต่างตัดสินใจของตัวเอง และกลับมาเก็บสิ่งที่เรียนรู้ไว้',
    visualCues: ['trading screen', 'market chart', 'candlestick chart', 'monitor', 'notebook', 'trade journal'],
    objectCues: ['laptop', 'checklist', 'pen', 'chart annotations'],
    sceneIdeas: ['เช็กตลาดก่อนเริ่ม', 'จดแผน', 'ผ่านตลาดผันผวนโดยยังยึดระบบ', 'สรุปสิ่งที่ทำได้ตามแผน'],
    endingMotifs: ['วินัย', 'แผน', 'สติ', 'ไม่ FOMO'],
    avoid: ['casino vibe', 'jackpot', 'เงินปลิว', 'rich-quick fantasy', 'celebration of reckless risk'],
    comicGuidance: { panel1: 'ตั้งกติกาและเปิดกราฟก่อนเริ่ม', panel2: 'ดูตลาดและจดแผน', panel3: 'ตลาดผันผวนแต่ยังยึดระบบ', panel4: 'ภูมิใจในวินัยและสิ่งที่เรียนรู้' },
  }, { color: 'silver' }),
  activity('project', 'ทำโปรเจ็กต์', 'จิ้งจอก', 'ค่อย ๆ สร้างสิ่งหนึ่งให้เดินหน้า', {
    category: 'craft', tone: ['constructive', 'focused', 'iterative'],
    storyFrame: 'ค่อย ๆ เปลี่ยนสิ่งที่อยากสร้างให้มีรูปร่างขึ้นทุกวัน',
    successMeaning: 'ขยับโปรเจ็กต์อย่างน้อยหนึ่งส่วนตามที่ตั้งใจ',
    teamMeaning: 'ต่างคนต่างสร้างของตัวเอง แล้วกลับมาเห็นความคืบหน้าของกันและกัน',
    visualCues: ['project desk', 'prototype', 'laptop', 'parts', 'sticky notes', 'workbench'],
    objectCues: ['สมุด', 'เครื่องมือ', 'prototype', 'แล็ปท็อป'],
    sceneIdeas: ['ตั้งสิ่งที่จะทำ', 'ลงมือสร้าง', 'แก้จุดที่ติด', 'เห็นของจริงเดินหน้า'],
    endingMotifs: ['สิ่งที่กำลังสร้าง', 'ความคืบหน้า', 'ทำต่อทีละส่วน'],
    avoid: ['generic corporate meeting', 'finished-success fantasy'],
    comicGuidance: { panel1: 'เลือกส่วนเล็กที่จะทำ', panel2: 'ลงมือสร้าง', panel3: 'แก้จุดติด', panel4: 'เห็นโปรเจ็กต์เดินหน้าอีกหนึ่งส่วน' },
  }, { color: 'silver' }),

  activity('custom', 'กำหนดเอง', 'แมวส้ม', 'เขียนกิจกรรมของตัวเอง', {
    category: 'custom', tone: ['warm', 'personal', 'real-life'],
    storyFrame: 'สิ่งที่เจ้าของเลือกเองค่อย ๆ กลายเป็นส่วนหนึ่งของเรื่องในสมุด',
    successMeaning: 'ลงมือทำสิ่งที่ตัวเองตั้งใจและกลับมาลงชื่อ',
    teamMeaning: 'ไม่ต้องทำสิ่งเดียวกัน แค่กลับมาอยู่ในสมุดเดียวกัน',
    visualCues: ['notebook', 'path', 'checklist', 'shared objects inferred from the activity and Book Log'],
    objectCues: ['วัตถุจริงที่อนุมานจากกิจกรรมและกติกา'],
    sceneIdeas: ['เริ่มจากกิจกรรมจริง', 'ลงมือทำ', 'ใช้ moment จริงจาก log', 'จบตาม outcome จริง'],
    endingMotifs: ['สิ่งที่เลือกเอง', 'การลงมือ', 'เรื่องของคนคนนั้น'],
    avoid: ['random props ที่ไม่สัมพันธ์กับเรื่องจริง'],
    comicGuidance: { panel1: 'เริ่มจากกิจกรรมจริง', panel2: 'แสดงสิ่งที่สมาชิกทำจริง', panel3: 'ใช้ turning point ที่มีหลักฐานใน log', panel4: 'จบตาม outcome จริงโดยไม่สร้างชัยชนะปลอม' },
  }),
]);

const ALIASES = Object.freeze({
  exercise: 'workout', eat_well: 'eat', rest_mind: 'mindfulness', selfcare: 'wellness',
  creative: 'create', boardgame: 'game', board_game: 'game', 'board-game': 'game',
  trading: 'trade', delicious: 'enjoy-food', tasty: 'enjoy-food', project_work: 'project',
});

export const XTY_ACTIVITY_CATALOG = DEFINITIONS;
export const XTY_ACTIVITIES = Object.freeze(DEFINITIONS.filter(item => item.selectable));

export const ACTIVITY_BY_ID = Object.freeze(DEFINITIONS.reduce((map, item) => {
  map[item.id] = item;
  return map;
}, {}));

export const XTY_ACTIVITY_METADATA = Object.freeze(DEFINITIONS.reduce((map, item) => {
  map[item.id] = item.metadata;
  return map;
}, {}));

export function canonicalActivityId(id) {
  const wanted = String(id || '').trim().toLowerCase();
  return ACTIVITY_BY_ID[wanted] ? wanted : (ALIASES[wanted] || 'custom');
}

export function activityById(id) {
  return ACTIVITY_BY_ID[canonicalActivityId(id)] || ACTIVITY_BY_ID.custom;
}

export function activityMetadataById(id) {
  return activityById(id).metadata;
}

export function activityContextForParty(party = {}) {
  let id = canonicalActivityId(party.activityId || party.activity_id);
  const activityText = String(party.activity || '').trim();
  if (id === 'custom' && activityText) {
    const exact = [...DEFINITIONS]
      .filter(item => item.id !== 'custom')
      .sort((a, b) => b.labelTh.length - a.labelTh.length)
      .find(item => activityText === item.labelTh || activityText.startsWith(`${item.labelTh} `));
    if (exact) id = exact.id;
  }
  const metadata = activityMetadataById(id);
  return {
    ...metadata,
    key: id,
    color: activityById(id).color,
    inferred: id === 'custom',
    activityText: activityText || metadata.label,
  };
}

export const XTY_PRESETS = Object.freeze([
  { id: 'casual', labelTh: 'สบาย ๆ', hintTh: 'ทำตามจังหวะของแต่ละคน', art: ACTIVITY_BY_ID.walk.art, budget: 'social' },
  { id: 'challenge', labelTh: 'ชาเลนจ์', hintTh: 'มีเป้าหมายชัด ชวนกันทำต่อ', art: ACTIVITY_BY_ID.run.art, budget: 'normal' },
  { id: 'mission', labelTh: 'ภารกิจ', hintTh: 'ร่วมมือให้ของหนึ่งอย่างเสร็จ', art: ACTIVITY_BY_ID.create.art, budget: 'normal' },
  { id: 'verified', labelTh: 'ช่วยยืนยัน', hintTh: 'Commit แล้วให้เพื่อนหนึ่งคน Confirm', art: ACTIVITY_BY_ID.study.art, budget: 'quiet' },
]);
