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
  });
}

const DEFINITIONS = Object.freeze([
  activity('walk', 'เดิน', 'แมวส้ม', 'เดินเล่นหรือเก็บก้าวด้วยกัน', {
    category: 'wellness', tone: ['gentle', 'steady', 'everyday'],
    storyFrame: 'เริ่มจากก้าวเล็ก ๆ แล้วค่อยไปต่อด้วยกัน',
    successMeaning: 'ออกไปเดินจริงและกลับมาทำต่อได้อย่างสม่ำเสมอ',
    teamMeaning: 'มีเพื่อนทำให้วันธรรมดากลายเป็นเส้นทางร่วมกัน',
    visualCues: ['ทางเดิน', 'ต้นไม้', 'แสงเช้าหรือเย็น', 'route marker'],
    objectCues: ['รองเท้า', 'ขวดน้ำ', 'checklist'],
    sceneIdeas: ['เริ่มเดิน', 'มีเพื่อนมาสมทบ', 'วันที่เหนื่อยแต่ยังออกไป', 'จบเส้นทางด้วยกัน'],
    endingMotifs: ['ก้าวเล็ก', 'ความสม่ำเสมอ', 'เส้นทางร่วมกัน'],
    avoid: ['กีฬาแข่งขันหนัก', 'podium', 'medal overload'],
    comicGuidance: { panel1: 'เริ่มก้าวแรก', panel2: 'เดินในชีวิตจริงด้วยกัน', panel3: 'ช่วยกันผ่านวันที่ไม่อยากออกไป', panel4: 'มองย้อนเส้นทางที่เดินมาด้วยกัน' },
  }),
  activity('run', 'วิ่ง', 'ปอมขาว', 'ออกไปวิ่งในจังหวะของตัวเอง', {
    category: 'fitness', tone: ['active', 'energizing', 'supportive'],
    storyFrame: 'ไม่จำเป็นต้อง pace เดียวกัน แต่รู้ว่ามีคนกำลังวิ่งไปด้วยกัน',
    successMeaning: 'กลับมาวิ่งและ Commit ต่อเนื่อง',
    teamMeaning: 'ตี้ช่วยให้ไม่หลุดและไปได้ไกลขึ้น',
    visualCues: ['running route', 'track', 'sunrise', 'park'],
    objectCues: ['running shoes', 'stopwatch', 'water bottle'],
    sceneIdeas: ['warm-up', 'ออกวิ่ง', 'วันที่เหนื่อยแต่เพื่อนยังอยู่', 'เข้าเส้นชัยของ Quest'],
    endingMotifs: ['จังหวะของตัวเอง', 'แรงเชียร์', 'ไปต่อ'],
    avoid: ['แข่งกันรุนแรง', 'body comparison'],
    comicGuidance: { panel1: 'ผูกเชือกรองเท้าและตั้งเส้นทาง', panel2: 'วิ่งคนละ pace แต่เห็นกันอยู่', panel3: 'เพื่อนช่วยประคองวันที่เหนื่อย', panel4: 'จบเส้นทางของ Quest ด้วยกัน' },
  }),
  activity('workout', 'ออกกำลัง', 'ควาย', 'ขยับร่างกายแบบที่ทำไหว', {
    category: 'fitness', tone: ['disciplined', 'supportive', 'energetic'],
    storyFrame: 'มีทีมช่วยให้ลงมือแม้ในวันที่อยากผัด',
    successMeaning: 'ทำตามเป้าได้สม่ำเสมอ',
    teamMeaning: 'ช่วยกันเชียร์และกลับมา Commit',
    visualCues: ['stretching', 'dumbbells', 'home workout', 'gym corner'],
    objectCues: ['เสื่อออกกำลัง', 'ผ้าขนหนู', 'ขวดน้ำ'],
    sceneIdeas: ['วอร์มร่างกาย', 'ฝึกตามแผน', 'ปรับท่าให้ทำไหว', 'ฉลองความสม่ำเสมอ'],
    endingMotifs: ['วินัย', 'แรงเชียร์', 'แข็งแรงในแบบของตัวเอง'],
    avoid: ['body shaming', 'before-after cliché', 'extreme fitness'],
    comicGuidance: { panel1: 'ปูเสื่อและตั้งเป้า', panel2: 'ขยับร่างกายในแบบที่ทำไหว', panel3: 'ทีมชวนกลับมาในวันที่ผัด', panel4: 'เห็นความสม่ำเสมอแทนการเปรียบเทียบรูปร่าง' },
  }),
  activity('sleep', 'นอนให้พอ', 'แมวขาว', 'ช่วยกันรักษาเวลาพักผ่อน', {
    category: 'recovery', tone: ['calm', 'restorative', 'gentle'],
    storyFrame: 'การพักผ่อนก็เป็นภารกิจจริงที่ควรทำให้สำเร็จ',
    successMeaning: 'ดูแลจังหวะชีวิตและเวลานอนให้ดีขึ้น',
    teamMeaning: 'มีเพื่อนช่วยให้การพักไม่ถูกเลื่อนออกไปเรื่อย ๆ',
    visualCues: ['moon', 'bed', 'pillow', 'cozy room', 'night checklist'],
    objectCues: ['นาฬิกา', 'โคมไฟ', 'ผ้าห่ม'],
    sceneIdeas: ['ปิดวัน', 'วางโทรศัพท์', 'รักษาเวลานอน', 'เช้าที่ได้พักพอ'],
    endingMotifs: ['การพัก', 'จังหวะชีวิต', 'ความอ่อนโยน'],
    avoid: ['ทำให้การพักดูเป็นความขี้เกียจ'],
    comicGuidance: { panel1: 'ตั้งเวลาปิดวัน', panel2: 'ทำ ritual ก่อนนอน', panel3: 'เพื่อนเตือนให้พักแทนการฝืน', panel4: 'เช้าที่สดขึ้นจากการพักต่อเนื่อง' },
  }),
  activity('eat', 'กินให้ดี', 'หมู', 'ดูแลมื้ออาหารโดยไม่ตัดสินรูปร่าง', {
    category: 'wellness', tone: ['caring', 'healthy', 'everyday'],
    storyFrame: 'ดูแลตัวเองผ่านมื้อเล็ก ๆ ที่ตั้งใจขึ้นทุกวัน',
    successMeaning: 'เลือกกินดีขึ้นอย่างต่อเนื่อง',
    teamMeaning: 'แชร์แรงใจและนิสัยที่ทำได้จริง',
    visualCues: ['balanced meal', 'lunchbox', 'water', 'grocery prep'],
    objectCues: ['จานอาหาร', 'กล่องข้าว', 'ขวดน้ำ'],
    sceneIdeas: ['เตรียมมื้อ', 'กินให้ตรงเวลา', 'แชร์ไอเดียที่ทำได้จริง', 'โต๊ะอาหารที่ดูแลตัวเองได้'],
    endingMotifs: ['มื้อเล็กที่ตั้งใจ', 'การดูแล', 'ทำได้จริง'],
    avoid: ['diet extremism', 'body shame', 'weight-loss before-after'],
    comicGuidance: { panel1: 'วางแผนมื้อที่ทำไหว', panel2: 'ลงมือกินและดื่มน้ำตามจริง', panel3: 'เพื่อนช่วยหาทางเลือกในวันที่ยุ่ง', panel4: 'รวมมื้อเล็ก ๆ เป็นนิสัยที่อ่อนโยน' },
  }),
  activity('read', 'อ่าน', 'เต่า', 'อ่านทีละนิดแต่ไปด้วยกัน', {
    category: 'learning', tone: ['calm', 'thoughtful', 'focused'],
    storyFrame: 'เปิดหนังสือแล้วไปต่อได้เพราะรู้ว่ามีคนอื่นกำลังอ่านอยู่ด้วย',
    successMeaning: 'อ่านต่อเนื่องและได้บางอย่างกลับมา',
    teamMeaning: 'มีเพื่อนช่วยให้ไม่หลุดจากสิ่งที่ตั้งใจอ่าน',
    visualCues: ['books', 'bookmark', 'notes', 'warm reading corner'],
    objectCues: ['หนังสือ', 'ที่คั่น', 'ดินสอ', 'โน้ต'],
    sceneIdeas: ['เปิดเล่ม', 'อ่านคนละมุม', 'แชร์สิ่งที่ได้', 'ปิด Quest ด้วยหน้าที่อ่านสะสม'],
    endingMotifs: ['หน้าที่เปิดแล้ว', 'สิ่งที่ได้กลับมา', 'สมาธิ'],
    avoid: ['academic pressure เกินจำเป็น'],
    comicGuidance: { panel1: 'เปิดหนังสือและวางที่คั่นหน้าแรก', panel2: 'อ่านคนละมุมแต่ไปด้วยกัน', panel3: 'แบ่งปันประโยคหรือบทเรียนที่ช่วยทีม', panel4: 'วางกองหน้าที่อ่านสะสมไว้เป็นความทรงจำ' },
  }),
  activity('study', 'เรียน', 'กา', 'เรียนหรือทบทวนสิ่งใหม่', {
    category: 'learning', tone: ['focused', 'encouraging', 'steady'],
    storyFrame: 'ไม่ต้องเรียนพร้อมกัน แต่เดินบทเรียนเดียวกันได้',
    successMeaning: 'ทบทวน ฝึก หรือทำโจทย์ตามแผน',
    teamMeaning: 'รู้ว่ายังมีคนอื่นพยายามอยู่ด้วยกัน',
    visualCues: ['desk', 'notebook', 'flashcards', 'calendar', 'exam notes'],
    objectCues: ['สมุด', 'บัตรคำ', 'ปฏิทิน', 'ดินสอ'],
    sceneIdeas: ['ตั้งแผน', 'ทำโจทย์', 'ช่วยกันผ่านบทที่ยาก', 'เช็กบทเรียนที่เดินมา'],
    endingMotifs: ['ความเข้าใจ', 'การฝึก', 'ไปทีละบท'],
    avoid: ['panic exam drama เกินจริง'],
    comicGuidance: { panel1: 'เปิดสมุดและแบ่งบทเรียน', panel2: 'ฝึกคนละเวลาในแผนเดียวกัน', panel3: 'ช่วยกันคลี่จุดที่ติด', panel4: 'มองเห็นสิ่งที่เข้าใจเพิ่มขึ้น' },
  }),
  activity('work', 'ทำงาน', 'ปอมขาว', 'โฟกัสงานสำคัญให้เสร็จ', {
    category: 'productivity', tone: ['focused', 'reliable', 'constructive'],
    storyFrame: 'เปลี่ยนงานที่ค้างให้กลายเป็นของจริงทีละชิ้น',
    successMeaning: 'ทำจริง ส่งจริง Commit จริง',
    teamMeaning: 'มีคนช่วยให้ไม่ปล่อยงานลอยหายไป',
    visualCues: ['laptop', 'task list', 'files', 'desk', 'shipped item'],
    objectCues: ['แล็ปท็อป', 'รายการงาน', 'แฟ้ม', 'ปากกา'],
    sceneIdeas: ['เลือกงานสำคัญ', 'ลงมือทำ', 'แก้จุดติด', 'ส่งงานจริง'],
    endingMotifs: ['ของจริง', 'ความรับผิดชอบ', 'งานที่ส่งแล้ว'],
    avoid: ['burnout glory', 'corporate coldness'],
    comicGuidance: { panel1: 'เลือกงานหนึ่งชิ้นจากรายการ', panel2: 'ลงมือทำในโต๊ะทำงานที่อบอุ่น', panel3: 'ทีมช่วยกันคลี่งานที่ติด', panel4: 'วางชิ้นงานที่ส่งแล้วบนหน้าสมุด' },
  }),
  activity('housework', 'งานบ้าน', 'ไก่', 'เก็บกวาดทีละมุม', {
    category: 'daily_life', tone: ['warm', 'practical', 'satisfying'],
    storyFrame: 'งานเล็ก ๆ ในบ้านก็กลายเป็น Quest ที่จบได้',
    successMeaning: 'บ้านและชีวิตเบาขึ้นจากสิ่งที่ลงมือทำ',
    teamMeaning: 'ให้คุณค่ากับงานประจำวันที่มักถูกมองข้าม',
    visualCues: ['broom', 'tidy room', 'laundry', 'shelf', 'cleaning tools'],
    objectCues: ['ไม้กวาด', 'ตะกร้าผ้า', 'กล่องเก็บของ'],
    sceneIdeas: ['เลือกหนึ่งมุม', 'เก็บทีละชิ้น', 'ช่วยกันแบ่งงาน', 'พักในบ้านที่เบาขึ้น'],
    endingMotifs: ['พื้นที่เบา', 'งานเล็กที่มีค่า', 'บ้านที่ดูแลแล้ว'],
    avoid: ['บ้านสมบูรณ์แบบเกินจริง', 'ดูแคลนงานบ้าน'],
    comicGuidance: { panel1: 'เลือกมุมเล็ก ๆ ที่จะจัด', panel2: 'ลงมือเก็บกวาด', panel3: 'แบ่งงานและช่วยกัน', panel4: 'นั่งพักในพื้นที่ที่เบาขึ้น' },
  }),
  activity('mindfulness', 'พักใจ', 'ยูนิคอร์น', 'หยุดหายใจและกลับมาอยู่กับตัวเอง', {
    category: 'emotional_wellbeing', tone: ['soft', 'safe', 'healing'],
    storyFrame: 'มีพื้นที่หายใจและมีคนคอยอยู่ข้าง ๆ โดยไม่ต้องเร่ง',
    successMeaning: 'กลับมาดูแลใจตัวเองทีละนิด',
    teamMeaning: 'ไม่ต้องผ่านวันที่หนักเพียงลำพัง',
    visualCues: ['breeze', 'leaves', 'warm light', 'quiet corner', 'tea'],
    objectCues: ['ถ้วยชา', 'เบาะนั่ง', 'ใบไม้', 'สมุดเล็ก'],
    sceneIdeas: ['หยุดหายใจ', 'นั่งเงียบ ๆ', 'เพื่อนอยู่ข้างกัน', 'กลับไปต่ออย่างเบาลง'],
    endingMotifs: ['พื้นที่ปลอดภัย', 'ลมหายใจ', 'ไม่เร่ง'],
    avoid: ['dramatic sadness', 'medical claim'],
    comicGuidance: { panel1: 'จัดมุมพักใจ', panel2: 'หยุดหายใจในจังหวะตัวเอง', panel3: 'เพื่อนอยู่ข้าง ๆ โดยไม่เร่ง', panel4: 'กลับไปต่อพร้อมพื้นที่ในใจมากขึ้น' },
  }),
  activity('wellness', 'ดูแลตัวเอง', 'แมวขาว', 'ทำเรื่องเล็ก ๆ ให้ตัวเองสบายขึ้น', {
    category: 'wellness', tone: ['nurturing', 'gentle', 'small rituals'],
    storyFrame: 'สัญญาเล็ก ๆ กับตัวเองที่ค่อย ๆ ทำได้จริง',
    successMeaning: 'กลับมาดูแลชีวิตตัวเองอย่างอ่อนโยน',
    teamMeaning: 'มีคนเตือนกันแบบไม่กดดัน',
    visualCues: ['water', 'health routine', 'grooming', 'care items', 'checklist'],
    objectCues: ['แก้วน้ำ', 'ของใช้ดูแลตัวเอง', 'กล่องยาเมื่อเกี่ยวข้อง', 'checklist'],
    sceneIdeas: ['เลือก ritual เล็ก', 'ลงมือดูแล', 'เตือนกันเบา ๆ', 'เห็นกิจวัตรที่กลับมา'],
    endingMotifs: ['สัญญากับตัวเอง', 'ritual เล็ก', 'ความอ่อนโยน'],
    avoid: ['vanity tone', 'product-heavy commercial vibe', 'medical claim'],
    comicGuidance: { panel1: 'เลือก ritual ที่ทำได้จริง', panel2: 'ทำเรื่องเล็กเพื่อดูแลตัวเอง', panel3: 'เพื่อนเตือนกันโดยไม่กดดัน', panel4: 'เห็นสัญญาเล็กกลายเป็นกิจวัตร' },
  }),
  activity('create', 'สร้างสรรค์', 'จิ้งจอก', 'วาด เขียน ทำของ หรือทดลองไอเดีย', {
    category: 'creative', tone: ['imaginative', 'playful', 'hopeful'],
    storyFrame: 'ไอเดียที่อยู่ในหัวเริ่มกลายเป็นของจริง',
    successMeaning: 'ลงมือสร้าง ไม่ใช่แค่คิด',
    teamMeaning: 'ได้แรงจากการเห็นเพื่อนสร้างของตัวเองด้วย',
    visualCues: ['sketchbook', 'colors', 'camera', 'music tools', 'handmade objects'],
    objectCues: ['สมุดสเก็ตช์', 'สีไม้', 'กล้อง', 'เครื่องมือทำมือ'],
    sceneIdeas: ['ร่างไอเดีย', 'ทดลอง', 'แชร์งานระหว่างทาง', 'วางผลงานจริงร่วมกัน'],
    endingMotifs: ['ไอเดียเป็นจริง', 'การทดลอง', 'งานที่สร้างแล้ว'],
    avoid: ['generic office look'],
    comicGuidance: { panel1: 'ร่างไอเดียลงสมุด', panel2: 'ทดลองสร้างคนละแบบ', panel3: 'ทีมช่วยกันผ่านช่วงที่งานไม่ลงตัว', panel4: 'วางผลงานจริงไว้บนโต๊ะเดียวกัน' },
  }),
  activity('board-game', 'บอร์ดเกม', 'แมวส้ม + ปอมขาว', 'นัดเล่นเกมโต๊ะด้วยกัน', {
    category: 'social_play', tone: ['joyful', 'social', 'playful'],
    storyFrame: 'เวลาที่ได้มาเล่นด้วยกันคือเรื่องราวร่วมกัน',
    successMeaning: 'ได้เจอกัน เล่น และมี moment ที่จำได้',
    teamMeaning: 'ตี้คือประสบการณ์ร่วม ไม่ใช่แค่ task',
    visualCues: ['board game table', 'cards', 'dice', 'snacks', 'laughter'],
    objectCues: ['กระดาน', 'การ์ด', 'ลูกเต๋า', 'ขนม'],
    sceneIdeas: ['จัดโต๊ะ', 'เริ่มเล่น', 'ช็อตพลิกเกมหรือเสียงหัวเราะ', 'เก็บเกมพร้อมความทรงจำ'],
    endingMotifs: ['เวลาได้เจอกัน', 'เสียงหัวเราะ', 'เรื่องเล่าร่วม'],
    avoid: ['casino feel', 'พนัน', 'เงินรางวัล'],
    comicGuidance: { panel1: 'ชวนกันมาจัดโต๊ะเกม', panel2: 'เล่นและหัวเราะรอบกระดาน', panel3: 'เก็บช็อตพลิกเกมจริงจาก Quest', panel4: 'ถ่ายภาพจำก่อนเก็บกล่องเกม' },
  }),
  activity('trade', 'ซื้อขาย', 'ยูนิคอร์น', 'วางแผนและรักษาวินัยไปด้วยกัน', {
    category: 'trading', tone: ['disciplined', 'analytical', 'steady', 'team-based'],
    storyFrame: 'ทีมเทรดที่ช่วยกันดูตลาด วางแผน และกลับมา Commit อย่างมีวินัย',
    successMeaning: 'ไม่ใช่แค่กำไร แต่คือการทำตามแผนและรักษาวินัยอย่างสม่ำเสมอ',
    teamMeaning: 'มีทีมช่วยลดการหลุดวินัย ช่วยกันมองข้อมูล และเพิ่มคุณภาพการตัดสินใจ',
    visualCues: ['trading screen', 'market chart', 'candlestick chart', 'monitor', 'notebook', 'trade journal'],
    objectCues: ['laptop', 'checklist', 'pen', 'chart annotations'],
    sceneIdeas: ['เช็กตลาดก่อนเริ่ม', 'คุยแผนหรือแชร์มุมมอง', 'ผ่านตลาดผันผวนโดยยังยึดระบบ', 'สรุปสิ่งที่ทำได้ตามแผน'],
    endingMotifs: ['วินัย', 'แผน', 'ทีม', 'สติ', 'ไม่ FOMO'],
    avoid: ['casino vibe', 'jackpot', 'เงินปลิว', 'rich-quick fantasy', 'celebration of reckless risk'],
    comicGuidance: { panel1: 'ตั้งกติกาและเปิดกราฟก่อนเริ่ม', panel2: 'ช่วยกันดูตลาดและจดแผน', panel3: 'ตลาดผันผวนแต่ทีมยังยึดระบบและ Commit ตามที่ตกลง', panel4: 'ภูมิใจในวินัยและการทำงานเป็นทีม' },
  }, { art: '/xty/assets/art/activities/activity-trade.webp', selectable: false }),
  activity('custom', 'กำหนดเอง', 'แมวส้ม', 'เขียนกิจกรรมของตี้เอง', {
    category: 'custom', tone: ['warm', 'collaborative', 'real-life'],
    storyFrame: 'กลุ่มเพื่อนที่ช่วยกันทำเป้าหมายของตี้ให้เกิดขึ้นจริง',
    successMeaning: 'ลงมือทำสิ่งที่ตกลงกันและกลับมา Commit',
    teamMeaning: 'มีเพื่อนร่วมทางทำให้เป้าหมายไปต่อได้ง่ายและสนุกขึ้น',
    visualCues: ['notebook', 'path', 'checklist', 'shared objects inferred from the activity and Quest Log'],
    objectCues: ['วัตถุจริงที่อนุมานจากกิจกรรมและกติกา'],
    sceneIdeas: ['เริ่มจากกติกาจริง', 'ลงมือทำตามกิจกรรม', 'ใช้ moment จริงจาก log', 'จบตาม outcome จริง'],
    endingMotifs: ['เป้าหมายจริง', 'การลงมือ', 'เพื่อนร่วมทาง'],
    avoid: ['random props ที่ไม่สัมพันธ์กับเรื่องจริง'],
    comicGuidance: { panel1: 'เริ่มจากกิจกรรมและกติกาจริง', panel2: 'แสดงสิ่งที่สมาชิกทำจริง', panel3: 'ใช้ turning point ที่มีหลักฐานใน log', panel4: 'จบตาม outcome จริงโดยไม่สร้างชัยชนะปลอม' },
  }),
]);

const ALIASES = Object.freeze({
  exercise: 'workout', eat_well: 'eat', rest_mind: 'mindfulness', selfcare: 'wellness',
  creative: 'create', boardgame: 'board-game', board_game: 'board-game',
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
