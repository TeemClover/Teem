(function(){
  'use strict';

  const COPY = {
    en: {
      '.nav-links a:nth-child(1)': 'The Game',
      '.nav-links a:nth-child(2)': 'The Box',
      '.nav-links a:nth-child(3)': 'Pledges',
      '.nav-links a:nth-child(4)': 'Founder',
      '.nav-cta': 'Choose a pledge',
      '.ksv2-play-nav': 'Play now',
      '.hero-lead': 'A 32-card game you can teach in ten seconds. No draw luck. No random outcomes. Every result comes from the two humans across the table.',
      '.micro-proof': '28 word cards · 4 rule cards · 0% RNG · 1 box for two complete hands',
      '#promise article:nth-child(1) span': 'to learn',
      '#promise article:nth-child(2) span': 'your CORE7',
      '#promise article:nth-child(3) span': 'only decisions',
      '#promise article:nth-child(4) span': 'two complete hands',
      '.origin-copy .eyebrow': 'THE DESIGN METHOD',
      '.origin-copy h2': 'We did not build CORE7 by adding rules.<br><em>We found it by removing them.</em>',
      '.origin-copy p:nth-of-type(2)': 'Early prototypes carried more information. My daughter and I kept asking one question: what can we remove without losing the game? Every rule that needed another explanation disappeared.',
      '.origin-copy blockquote': 'Three colors created the rules.<br>Silver created the game.',
      '.origin-copy p:nth-of-type(3)': 'Three colors formed a complete cycle. Then we added Silver—with no meaning, no power and no random effect. It was simply an empty card you could choose to throw away. That one empty choice created timing, sacrifice, bluffing and doubt.',
      '.origin-copy .origin-proof': 'We began playtesting when she was six. If a child understands the game and still asks for one more, the simplicity is working.',
      '.game .section-heading .eyebrow': 'CORE7 · QUICK PLAY',
      '.game .section-heading h2': 'A complete game in minutes.<br>A deeper memory when you play again.',
      '.game .section-heading > p:last-child': 'Choose secretly. Reveal together. Color resolves the round. The person across the table creates everything unpredictable.',
      '.rules-poster figcaption': 'The complete system fits on one card.',
      '.gray-rule span': 'blocks any color. It adds uncertainty—not randomness.',
      '.how-list li:nth-child(1) b': 'Choose your CORE7.',
      '.how-list li:nth-child(1) p': 'Each player begins with seven cards.',
      '.how-list li:nth-child(2) b': 'Choose in secret.',
      '.how-list li:nth-child(2) p': 'Commit one card face down, then reveal together.',
      '.how-list li:nth-child(3) b': 'Resolve the Round.',
      '.how-list li:nth-child(3) p': 'The three-color cycle decides instantly. Silver blocks.',
      '.how-list li:nth-child(4) b': 'Manage what remains.',
      '.how-list li:nth-child(4) p': 'The winner discards one. The loser discards the played card plus one more.',
      '.how-list li:nth-child(5) b': 'Win three Rounds.',
      '.how-list li:nth-child(5) p': 'That wins one Quick Play. Keep or change your hand before the next game.',
      '#formatGuide .quick span': 'QUICK PLAY',
      '#formatGuide .quick h3': 'Choose seven. Win three Rounds.',
      '#formatGuide .quick p': 'One complete game. For the next Quick Play, keep the same seven or choose a new hand.',
      '#formatGuide .standard span': 'STANDARD · LOCKED CORE7 · BO5',
      '#formatGuide .standard h3': 'Same hand. Next game. Different feeling each time.',
      '#formatGuide .standard p': 'Lock one CORE7 for the match. Reset the same seven after every Quick Play. First to win three Quick Plays wins.',
      '.game-truth p': '0% RNG. The hand may stay the same.',
      '.game-truth strong': 'The humans never do.',
      '.carry-copy .eyebrow': 'ONE BOX · TWO PEOPLE',
      '.carry-copy h2': 'Choose seven.<br>Hand over twenty-one.',
      '.carry-copy > p': 'The owner chooses seven words to carry, then offers the remaining twenty-one to the person across the table. No second deck and no shared language required.',
      '.carry-copy .check-list li:nth-child(1)': 'Play with someone you just met',
      '.carry-copy .check-list li:nth-child(2)': 'Teach the rules in ten seconds',
      '.carry-copy .check-list li:nth-child(3)': 'Change hands between Quick Plays',
      '.carry-copy .check-list li:nth-child(4)': 'Lock the same hand for Standard',
      '.carry-copy .check-list li:nth-child(5)': 'Let the conversation outlast the game',
      '.pocket-note span': 'HOW YOU CHOOSE<br>TO SHOW UP TODAY',
      '#memory .eyebrow': 'THE GAME AFTER THE GAME',
      '#memory h2': 'You may forget the score.<br><em>You remember how the hand felt.</em>',
      '#memory .memory-copy p:nth-child(1)': 'You may not remember all seven words. You remember the feeling they created together—and the human who chose them.',
      '#memory .memory-copy p:nth-child(2)': 'Before the game, you are strangers. During it, your decisions become shared history. After it, the words give that history something real to talk about.',
      '#memory blockquote': 'Quick Play creates the first impression.<br>Standard Match strengthens it.',
      '#memory .memory-copy > strong': 'CORE7 keeps working after the game is over.',
      '.language .section-heading .eyebrow': 'WHY THE WORDS MATTER',
      '.language .section-heading h2': 'Colors make it playable.<br><em>Words make it personal.</em>',
      '.language .section-heading > p:last-child': 'The mechanic works with four colored scraps. The experience does not. Your seven words are not a permanent definition of who you are—they show how you chose to arrive at this table today.',
      '.gallery-caption': 'FIRST HAND · 28 cards · seven meanings in each color',
      '#box .section-heading .eyebrow': 'WHAT COMES IN THE BOX',
      '#box .section-heading h2': 'Thirty-two cards.<br>Nothing that does not need to be there.',
      '.open-copy .eyebrow': 'OUR PROMISE',
      '.open-copy h2': 'Four colored scraps can run the game.<br>The printed words create the memory.',
      '.open-copy > p:first-of-type': 'Write RED, BLUE, GREEN and SILVER on paper. CORE7 still works. The rules stay open and online play stays free.',
      '.ai-copy .eyebrow': 'THE AI LAYER',
      '.ai-copy h2': 'One small file lets the machine understand the deck.',
      '.ai-copy > p:first-of-type': 'Every box links to a clean Markdown knowledge file: card meanings, rules, boundaries and responsible ways to extend the system.',
      '.ai-boundary': 'AI does not tell you your fate. It helps you see more choices.',
      '#pledges .section-heading .eyebrow': 'CHOOSE YOUR FIRST HAND',
      '#pledges .section-heading h2': 'Back the artifact.<br>Keep the game open.',
      '#stretch .section-heading h2': 'Make the same box better.<br>Do not create a second project.',
      '.future-copy .eyebrow': 'ONE LANGUAGE · MANY HANDS',
      '.future-copy h2': 'New words. New artists.<br>Never a fifth color.',
      '.future-copy p': 'Future sets add meanings, art and cultures without making the First Hand obsolete.',
      '.timeline .section-heading .eyebrow': 'THE ROAD TO YOUR TABLE',
      '.timeline .section-heading h2': 'A small box deserves a disciplined plan.',
      '.risks .eyebrow': 'BUILT TO ARRIVE',
      '.risks h2': 'A late game may still arrive.<br><em>Its table may not.</em>',
      '.risk-copy p:nth-child(1)': 'I have backed games for years, become a Kickstarter Superbacker and filled my home with hundreds of boxes. Some arrived so late that they were never opened—the friends and excitement that had waited for them had moved on.',
      '.risk-copy p:nth-child(2)': 'CORE7 is intentionally controlled: thirty-two cards, one compact box, no miniatures, no required app and no second game hiding inside the stretch goals. One creator is accountable for every decision.',
      '.risk-copy p:nth-child(3)': 'Final dates will be based on signed manufacturing and fulfillment quotes, with time reserved for proof correction and international freight.',
      '.faq .eyebrow': 'FAQ',
      '.faq h2': 'The questions we would ask before backing.',
      '#founder .eyebrow': 'NEARLY 30 YEARS OF GAMES',
      '#founder h2': 'This is the first one<br><em>I do not want to keep to myself.</em>',
      '#founder .founder-head > p:last-child': 'I designed the system. My daughter and I discovered the game together.',
      '#founder .founder-story p:nth-child(1)': 'I have designed games for nearly thirty years and played with people across ages, countries and cultures—from a rural temple in Japan with an abbot to the 2024 Flesh and Blood World Championship in Osaka, where I competed as one of 397 players.',
      '#founder .founder-story p:nth-child(2)': 'I have led six-hour game experiences for fifty people and worked as a System Builder and Lead Trainer for an online platform serving more than five million users.',
      '#founder .founder-story p:nth-child(3)': 'But CORE7 became real across a table with my daughter, beginning when she was six. We kept removing until the rules could disappear and only the human decisions remained.',
      '#founder blockquote': 'I have made games for almost thirty years.<br>This is the first one I want everyone in the world to try.',
      '.final-cta .eyebrow': 'THE FIRST HAND',
      '.final-cta h2': 'Carry seven words.<br>Meet someone.',
      '.final-cta > .wrap > p:not(.eyebrow)': 'Play one Quick Play. Leave with a shared memory—and a reason to ask for one more.',
      '.final-cta .button': 'Choose your pledge'
    },
    th: {
      '.nav-links a:nth-child(1)': 'ตัวเกม',
      '.nav-links a:nth-child(2)': 'ในกล่อง',
      '.nav-links a:nth-child(3)': 'ระดับสนับสนุน',
      '.nav-links a:nth-child(4)': 'ผู้สร้าง',
      '.nav-cta': 'เลือกระดับสนับสนุน',
      '.ksv2-play-nav': 'เล่นตอนนี้',
      '.hero-lead': 'เกมการ์ด 32 ใบที่สอนได้ในสิบวินาที ไม่มีดวงจั่ว ไม่มีผลลัพธ์สุ่ม ทุกอย่างเกิดจากการตัดสินใจของมนุษย์สองคนตรงหน้า',
      '.micro-proof': 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · หนึ่งกล่องสร้างมือได้สองคน',
      '#promise article:nth-child(1) span': 'ใช้เวลาเรียนรู้',
      '#promise article:nth-child(2) span': 'CORE7 ของคุณ',
      '#promise article:nth-child(3) span': 'มีแต่การตัดสินใจ',
      '#promise article:nth-child(4) span': 'สร้างมือได้สองคน',
      '.origin-copy .eyebrow': 'วิธีที่เกมนี้ถูกค้นพบ',
      '.origin-copy h2': 'เราไม่ได้สร้าง CORE7 ด้วยการเพิ่มกติกา<br><em>เราค้นพบมันด้วยการถอดออก</em>',
      '.origin-copy p:nth-of-type(2)': 'ต้นแบบแรกมีข้อมูลบนการ์ดมากกว่านี้ ผมกับลูกสาวถามกันซ้ำ ๆ ว่า เราถอดอะไรออกได้อีกโดยที่เกมยังอยู่ กติกาทุกข้อที่ต้องอธิบายเพิ่มจึงค่อย ๆ หายไป',
      '.origin-copy blockquote': 'สามสีสร้างกติกา<br>สีเงินสร้างเกม',
      '.origin-copy p:nth-of-type(3)': 'สามสีสร้างวงจรที่สมบูรณ์ แล้วเราเพิ่มสีเงินเข้าไปโดยไม่ให้ความหมาย ไม่ให้พลัง และไม่เพิ่มผลสุ่ม มันเป็นเพียงการ์ดว่างที่เลือกทิ้งได้ แต่ทางเลือกว่างนั้นกลับสร้างจังหวะ การเสียสละ การลวง และความลังเล',
      '.origin-copy .origin-proof': 'เราเริ่มทดลองเล่นตั้งแต่ลูกสาวอายุหกขวบ ถ้าเด็กเข้าใจแล้วยังขออีกเกม แปลว่าความเรียบง่ายนั้นทำงานแล้ว',
      '.game .section-heading .eyebrow': 'CORE7 · QUICK PLAY',
      '.game .section-heading h2': 'เกมเต็มหนึ่งเกมในไม่กี่นาที<br>และความทรงจำที่ลึกขึ้นเมื่อเล่นต่อ',
      '.game .section-heading > p:last-child': 'เลือกแบบลับ เปิดพร้อมกัน สีตัดสินรอบ ส่วนมนุษย์ตรงหน้าสร้างทุกสิ่งที่คาดเดาไม่ได้',
      '.rules-poster figcaption': 'ระบบทั้งหมดอยู่บนการ์ดกติกาเพียงใบเดียว',
      '.gray-rule span': 'บล็อกทุกสี มันเพิ่มความไม่แน่นอน แต่ไม่เพิ่มความสุ่ม',
      '.how-list li:nth-child(1) b': 'เลือก CORE7 ของคุณ',
      '.how-list li:nth-child(1) p': 'ผู้เล่นแต่ละคนเริ่มด้วยการ์ดเจ็ดใบ',
      '.how-list li:nth-child(2) b': 'เลือกแบบลับ',
      '.how-list li:nth-child(2) p': 'คว่ำการ์ดหนึ่งใบ แล้วเปิดพร้อมกัน',
      '.how-list li:nth-child(3) b': 'ตัดสินรอบ',
      '.how-list li:nth-child(3) p': 'วงจรสามสีตัดสินทันที สีเงินบล็อก',
      '.how-list li:nth-child(4) b': 'บริหารสิ่งที่เหลือ',
      '.how-list li:nth-child(4) p': 'ผู้ชนะทิ้งหนึ่งใบ ผู้แพ้ทิ้งใบที่เล่นและเพิ่มอีกหนึ่งใบ',
      '.how-list li:nth-child(5) b': 'ชนะสามรอบ',
      '.how-list li:nth-child(5) p': 'เท่ากับชนะหนึ่ง Quick Play เกมถัดไปจะใช้มือเดิมหรือเปลี่ยนมือก็ได้',
      '#formatGuide .quick span': 'QUICK PLAY',
      '#formatGuide .quick h3': 'เลือกเจ็ดใบ ชนะสามรอบ',
      '#formatGuide .quick p': 'หนึ่งเกมที่สมบูรณ์ ก่อน Quick Play ถัดไปจะใช้เจ็ดใบเดิมหรือเลือกมือใหม่ก็ได้',
      '#formatGuide .standard span': 'STANDARD · ล็อก CORE7 · BO5',
      '#formatGuide .standard h3': 'มือเดิม เกมถัดไป ความรู้สึกไม่เหมือนเดิม',
      '#formatGuide .standard p': 'ล็อก CORE7 หนึ่งชุดตลอด Match รีเซ็ตเจ็ดใบเดิมหลังจบทุก Quick Play ใครชนะสาม Quick Play ก่อนเป็นผู้ชนะ',
      '.game-truth p': 'สุ่ม 0% มืออาจยังเหมือนเดิม',
      '.game-truth strong': 'แต่มนุษย์ไม่เคยเหมือนเดิม',
      '.carry-copy .eyebrow': 'หนึ่งกล่อง · สองคน',
      '.carry-copy h2': 'เลือกเจ็ดใบ<br>ส่งอีกยี่สิบเอ็ดใบให้เขา',
      '.carry-copy > p': 'เจ้าของกล่องเลือกเจ็ดคำที่อยากถือ แล้วส่งอีกยี่สิบเอ็ดใบให้คนตรงหน้าเลือกมือของเขา ไม่ต้องมีเด็คที่สอง และไม่ต้องพูดภาษาเดียวกัน',
      '.carry-copy .check-list li:nth-child(1)': 'เล่นกับคนที่เพิ่งพบกันได้',
      '.carry-copy .check-list li:nth-child(2)': 'สอนกติกาในสิบวินาที',
      '.carry-copy .check-list li:nth-child(3)': 'เปลี่ยนมือระหว่าง Quick Play ได้',
      '.carry-copy .check-list li:nth-child(4)': 'ล็อกมือเดิมสำหรับ Standard',
      '.carry-copy .check-list li:nth-child(5)': 'ปล่อยให้บทสนทนายาวกว่าเกม',
      '.pocket-note span': 'วิธีที่คุณเลือก<br>จะปรากฏตัวในวันนี้',
      '#memory .eyebrow': 'เกมหลังจากเกมจบ',
      '#memory h2': 'คุณอาจลืมผลแพ้ชนะ<br><em>แต่จำได้ว่ามือนั้นให้ความรู้สึกอย่างไร</em>',
      '#memory .memory-copy p:nth-child(1)': 'คุณอาจจำไม่ได้ครบทั้งเจ็ดคำ แต่จะจำความรู้สึกที่คำเหล่านั้นสร้างร่วมกัน และจำมนุษย์ที่เป็นคนเลือกมัน',
      '#memory .memory-copy p:nth-child(2)': 'ก่อนเกมเราเป็นคนแปลกหน้า ระหว่างเกมการตัดสินใจกลายเป็นประวัติร่วมกัน หลังเกมคำบนการ์ดทำให้ประวัตินั้นมีเรื่องให้พูดต่อ',
      '#memory blockquote': 'Quick Play สร้างความรู้สึกแรก<br>Standard Match ทำให้มันฝังแน่นขึ้น',
      '#memory .memory-copy > strong': 'CORE7 ยังทำงานต่อหลังจากเกมจบ',
      '.language .section-heading .eyebrow': 'ทำไมคำบนการ์ดจึงสำคัญ',
      '.language .section-heading h2': 'สีทำให้เกมเล่นได้<br><em>คำทำให้เกมเป็นเรื่องของเรา</em>',
      '.language .section-heading > p:last-child': 'กลไกเล่นได้ด้วยเศษกระดาษสี่สี แต่ประสบการณ์ทำไม่ได้ เจ็ดคำไม่ใช่คำตัดสินว่าคุณเป็นใครตลอดไป มันคือวิธีที่คุณเลือกจะมานั่งที่โต๊ะนี้ในวันนี้',
      '.gallery-caption': 'FIRST HAND · 28 ใบ · เจ็ดความหมายในแต่ละสี',
      '#box .section-heading .eyebrow': 'มีอะไรในกล่อง',
      '#box .section-heading h2': 'การ์ดสามสิบสองใบ<br>ไม่มีสิ่งใดที่ไม่จำเป็น',
      '.open-copy .eyebrow': 'คำสัญญาของเรา',
      '.open-copy h2': 'เศษกระดาษสี่สีทำให้เกมเล่นได้<br>คำที่พิมพ์ทำให้ความทรงจำเกิดขึ้น',
      '.open-copy > p:first-of-type': 'เขียน แดง ฟ้า เขียว เงิน ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี',
      '.ai-copy .eyebrow': 'ชั้น AI',
      '.ai-copy h2': 'ไฟล์เล็กหนึ่งไฟล์ทำให้เครื่องเข้าใจเด็คได้',
      '.ai-copy > p:first-of-type': 'ทุกกล่องเชื่อมไปยังไฟล์ Markdown ที่สะอาด มีความหมายของการ์ด กติกา ขอบเขต และวิธีต่อยอดระบบอย่างรับผิดชอบ',
      '.ai-boundary': 'AI ไม่ได้บอกชะตา มันช่วยให้คุณเห็นทางเลือกมากขึ้น',
      '#pledges .section-heading .eyebrow': 'เลือก FIRST HAND ของคุณ',
      '#pledges .section-heading h2': 'สนับสนุนวัตถุ<br>รักษาเกมให้เปิดกว้าง',
      '#stretch .section-heading h2': 'ทำให้กล่องเดิมดีขึ้น<br>อย่าสร้างโครงการที่สอง',
      '.future-copy .eyebrow': 'หนึ่งภาษา · หลายมือ',
      '.future-copy h2': 'คำใหม่ ศิลปินใหม่<br>แต่ไม่มีสีที่ห้า',
      '.future-copy p': 'ชุดอนาคตเพิ่มความหมาย ภาพ และวัฒนธรรม โดยไม่ทำให้ First Hand ล้าสมัย',
      '.timeline .section-heading .eyebrow': 'เส้นทางสู่โต๊ะของคุณ',
      '.timeline .section-heading h2': 'กล่องเล็กสมควรได้รับแผนงานที่มีวินัย',
      '.risks .eyebrow': 'สร้างมาให้ส่งถึง',
      '.risks h2': 'เกมที่มาช้าอาจยังมาถึง<br><em>แต่โต๊ะที่รอมันอาจไม่อยู่แล้ว</em>',
      '.risk-copy p:nth-child(1)': 'ผมสนับสนุนเกมผ่าน Kickstarter มาหลายปีจนเป็น Superbacker และมีเกมหลายร้อยกล่องอยู่ที่บ้าน บางกล่องมาช้าจนไม่เคยถูกเปิด เพราะเพื่อนและความตื่นเต้นที่เคยรอมันเดินต่อไปแล้ว',
      '.risk-copy p:nth-child(2)': 'CORE7 ตั้งใจควบคุมขอบเขตให้ชัด: การ์ดสามสิบสองใบ กล่องเล็กหนึ่งกล่อง ไม่มีฟิกเกอร์ ไม่มีแอปบังคับ และไม่มีเกมที่สองซ่อนอยู่ใน Stretch Goal ผู้สร้างหนึ่งคนรับผิดชอบทุกการตัดสินใจ',
      '.risk-copy p:nth-child(3)': 'กำหนดส่งจริงจะอิงใบเสนอราคาจากโรงงานและผู้จัดส่งที่ลงนามแล้ว พร้อมเวลาสำรองสำหรับแก้ตัวอย่างและขนส่งระหว่างประเทศ',
      '.faq .eyebrow': 'คำถามที่พบบ่อย',
      '.faq h2': 'คำถามที่เราจะถามก่อนกดสนับสนุน',
      '#founder .eyebrow': 'เกือบ 30 ปีที่อยู่กับเกม',
      '#founder h2': 'นี่คือเกมแรก<br><em>ที่ผมไม่อยากเก็บไว้กับตัวเอง</em>',
      '#founder .founder-head > p:last-child': 'ผมออกแบบระบบ แต่ผมกับลูกสาวค้นพบเกมนี้ด้วยกัน',
      '#founder .founder-story p:nth-child(1)': 'ผมออกแบบเกมมาเกือบสามสิบปี และเล่นกับผู้คนต่างวัย ต่างประเทศ ต่างวัฒนธรรม ตั้งแต่วัดชนบทในญี่ปุ่นกับเจ้าอาวาส ไปจนถึง Flesh and Blood World Championship 2024 ที่โอซาก้า ในฐานะหนึ่งในผู้เล่น 397 คน',
      '#founder .founder-story p:nth-child(2)': 'ผมเคยนำประสบการณ์เกมยาวหกชั่วโมงสำหรับห้าสิบคน และทำงานเป็น System Builder กับ Lead Trainer ให้แพลตฟอร์มออนไลน์ที่มีผู้ใช้มากกว่าห้าล้านคน',
      '#founder .founder-story p:nth-child(3)': 'แต่ CORE7 กลายเป็นเกมจริงบนโต๊ะกับลูกสาว ตั้งแต่เธออายุหกขวบ เราถอดทุกอย่างออกจนกติกาแทบหายไป และเหลือเพียงการตัดสินใจของมนุษย์',
      '#founder blockquote': 'ผมทำเกมมาเกือบสามสิบปี<br>แต่นี่คือเกมแรกที่อยากให้ทุกคนในโลกได้ลอง',
      '.final-cta .eyebrow': 'FIRST HAND',
      '.final-cta h2': 'พกเจ็ดคำ<br>แล้วออกไปพบใครสักคน',
      '.final-cta > .wrap > p:not(.eyebrow)': 'เล่น Quick Play หนึ่งเกม กลับออกมาพร้อมความทรงจำร่วม และเหตุผลที่จะพูดว่า “อีกเกมไหม”',
      '.final-cta .button': 'เลือกระดับสนับสนุน'
    }
  };

  function setNode(selector, value){
    const node = document.querySelector(selector);
    if(!node || value == null) return;
    if(value.includes('<')) node.innerHTML = value;
    else node.textContent = value;
  }

  function applyCoreCopy(lang){
    const copy = COPY[lang] || COPY.en;
    Object.entries(copy).forEach(([selector,value]) => setNode(selector,value));
    const originNumber = document.querySelector('.origin-number');
    if(originNumber) originNumber.innerHTML = lang === 'th' ? '03<span>สี</span>' : '03<span>COLORS</span>';
    const promiseStrong = document.querySelectorAll('#promise article strong');
    const values = lang === 'th' ? ['10 วิ','7 ใบ','สุ่ม 0%','1 กล่อง'] : ['10 sec','7 cards','0% RNG','1 box'];
    promiseStrong.forEach((node,index) => { if(values[index]) node.textContent = values[index]; });
    const pocketNote = document.querySelector('.pocket-note span');
    if(pocketNote) pocketNote.innerHTML = lang === 'th' ? 'วิธีที่คุณเลือก<br>จะปรากฏตัวในวันนี้' : 'HOW YOU CHOOSE<br>TO SHOW UP TODAY';
  }

  function applyInjectedCopy(lang){
    const th = lang === 'th';
    setNode('#play-online .ksv2-kicker', th ? 'ลองก่อนสนับสนุน' : 'TRY BEFORE YOU BACK');
    setNode('#play-online .ksv2-title', th ? 'เกมมีอยู่แล้ว<br>คุณเล่นได้ตอนนี้' : 'The game already exists.<br>You can play it now.');
    setNode('#play-online .ksv2-lead', th ? 'CORE7 เล่นออนไลน์ได้จริง ฟรีตลอดไป ไม่มีโฆษณา ไม่มีความได้เปรียบจากการจ่ายเงิน และไม่ต้องเชื่อคำสัญญาว่าเกมสนุกหรือไม่' : 'CORE7 is already playable online and free forever. No ads. No paid advantage. No need to imagine whether the game works.');
    const onlineButtons = document.querySelectorAll('#play-online .ksv2-button');
    if(onlineButtons[0]) onlineButtons[0].textContent = th ? 'เล่น CORE7 ตอนนี้' : 'Play CORE7 now';
    if(onlineButtons[1]) onlineButtons[1].textContent = th ? 'อ่านกติกาสิบวินาที' : 'Read the ten-second rules';

    setNode('#tournament .ksv2-scoreboard-top b', 'STANDARD MATCH');
    setNode('#tournament .ksv2-scoreboard-top span', th ? 'ล็อก CORE7' : 'LOCKED CORE7');
    setNode('#tournament .ksv2-scoreboard > p', th ? 'ชนะ 3 Rounds = 1 Quick Play · ชนะ 3 Quick Plays = Match' : 'Win 3 Rounds = 1 Quick Play · Win 3 Quick Plays = Match');
    setNode('#tournament .ksv2-kicker', th ? 'STANDARD FORMAT · ล็อกมือ · BO5' : 'STANDARD FORMAT · LOCKED HAND · BO5');
    setNode('#tournament .ksv2-title', th ? 'มือเดิม เกมถัดไป<br>ความรู้สึกไม่เหมือนเดิม' : 'Same hand. Next game.<br>Different feeling each time.');
    setNode('#tournament .ksv2-lead', th ? 'เลือก CORE7 หนึ่งชุดและล็อกไว้ตลอด Match หลังจบแต่ละ Quick Play ให้รีเซ็ตเจ็ดใบเดิม ไม่มีข้อมูลใหม่จากการสุ่ม มีเพียงความจำ การปรับตัว และมนุษย์ที่เริ่มอ่านกันออก' : 'Choose one CORE7 and lock it for the match. Reset the same seven after every Quick Play. No random input creates the next experience—memory, adaptation and the other human do.');
    const pointTitles = th ? ['ชนะหนึ่ง Quick Play','รีเซ็ตมือเดิม','ชนะ Standard Match'] : ['Win one Quick Play','Reset the same hand','Win the Standard Match'];
    const pointBodies = th ? ['ชนะสาม Rounds','เริ่มเกมถัดไปด้วย CORE7 เจ็ดใบเดิม','ชนะสาม Quick Plays ก่อน'] : ['Win three Rounds.','Begin the next game with the same seven-card CORE7.','Be first to win three Quick Plays.'];
    document.querySelectorAll('.ksv2-competitive-points article').forEach((node,index) => { const b=node.querySelector('b'); const p=node.querySelector('p'); if(b&&pointTitles[index]) b.textContent=pointTitles[index]; if(p&&pointBodies[index]) p.textContent=pointBodies[index]; });

    setNode('#card-back .ksv2-kicker', th ? 'หลังเดียว · ทุกชุด' : 'ONE BACK · EVERY SET');
    setNode('#card-back .ksv2-title', th ? 'ด้านหน้าสร้างความหมาย<br>ด้านหลังรักษาเกม' : 'The front carries meaning.<br>The back protects the game.');
    setNode('#card-back .ksv2-lead', th ? 'การ์ดทุกใบใช้หลังเดียวกัน เพื่อให้คำใหม่ ศิลปินใหม่ และวัฒนธรรมใหม่เข้ามาได้ โดยข้อมูลลับของ CORE7 ยังเหมือนเดิม' : 'Every playable card shares one back, so new words, artists and cultures can enter while CORE7 keeps the same hidden information.');
    setNode('.ksv2-cardback-copy blockquote', th ? 'ภาษาหนึ่งภาษาเปิดพื้นที่ให้ศิลปินหลายคนทิ้งลายเซ็นของตัวเองไว้ด้านหน้า' : 'One shared language leaves room for every artist to sign the front in their own way.');
    setNode('#ksv2FlipButton', th ? '↻ พลิกการ์ด' : '↻ Flip the card');

    setNode('#foil-cores .ksv2-kicker', th ? 'FOIL CORE ทั้งสี่' : 'THE FOUR FOIL CORES');
    setNode('#foil-cores .ksv2-title', th ? 'ร่างกาย จิตใจ จิตวิญญาณ งานสร้าง' : 'Body. Mind. Soul. Craft.');
    setNode('#foil-cores .ksv2-lead', th ? 'สามอย่างคือสิ่งที่ประกอบเป็นชีวิต ส่วนที่สี่คือสิ่งที่มนุษย์สร้างขึ้นจากมัน' : 'Three are what a living person carries. The fourth is what a human creates from them.');

    setNode('#possibilities .ksv2-kicker', th ? 'หลังเกมจบ' : 'AFTER THE GAME');
    setNode('#possibilities .ksv2-title', th ? 'เกมหนึ่งเกม<br>เปิดเรื่องต่อได้อีกมาก' : 'One game.<br>Many conversations.');
    setNode('#possibilities .ksv2-lead', th ? 'CORE7 ไม่ได้พยายามแทนบทสนทนา มันเพียงสร้างประสบการณ์ร่วมที่ทำให้คนสองคนมีเหตุผลจะคุยกันต่อ' : 'CORE7 does not replace conversation. It creates the shared experience that gives two people a reason to continue one.');
    setNode('.ksv2-unlimited strong', th ? '4 สี<br>ความเป็นไปได้ไม่จำกัด' : '4 Colours.<br>Unlimited Possibilities.');
    setNode('.ksv2-unlimited span', th ? 'สีทำให้ทุกคนเล่นร่วมกันได้ คำ ศิลปิน และผู้เล่นทำให้แต่ละโต๊ะไม่เหมือนกัน' : 'Colors let everyone play together. Words, artists and humans make every table different.');
  }

  function lockRuleCardFront(){
    const src = '/core7/assets/core7-rule.webp?v=20260803-distilled';
    document.querySelectorAll('img[src*="core7-rule"]').forEach(img => { img.src=src; img.style.objectFit='contain'; });
    const front = document.getElementById('ksv2CardFront');
    if(!front) return;
    const ensure = () => { if(front.querySelector('img[src*="core7-rule"]')) return; front.innerHTML='<img src="'+src+'" alt="CORE7 Quick Play and Standard Format rule card">'; };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(front,{childList:true,subtree:true});
    [80,250,700,1500].forEach(delay => window.setTimeout(ensure,delay));
  }

  function applyAll(){
    const lang = document.documentElement.lang === 'th' ? 'th' : 'en';
    applyCoreCopy(lang);
    applyInjectedCopy(lang);
    lockRuleCardFront();
  }

  document.addEventListener('DOMContentLoaded',() => {
    applyAll();
    const observer = new MutationObserver(() => window.setTimeout(applyAll,0));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    window.setTimeout(applyAll,120);
    window.setTimeout(applyAll,700);
  });
})();
