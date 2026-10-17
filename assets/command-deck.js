/* AI ใส่ซอส · บท 5 SEASON — ชั้นคำสั่งลัด (Command Deck)
   หยิบ ลาก วางคำสั่งสั้น ๆ ลงกระทะ แตะเลือกสไตล์ แล้วได้ Prompt เต็มที่พร้อมส่ง Claude / ChatGPT / Gemini
   ทุกอย่างทำงานในเบราว์เซอร์ของผู้เรียน ไม่มีข้อมูลถูกส่งออกไปไหน
   Pure helpers are exposed on window.MC_DECK for tests: buildPrompt, shortCommand, matchCommands, buildPack, queryFromSearch. */
(function(){
'use strict';
const RATIO={k:'ratio',label:'สัดส่วน',choices:[['9x16','9:16 แนวตั้ง','a vertical 9:16 frame'],['4x5','4:5 ฟีด','a 4:5 portrait frame'],['1x1','1:1 จัตุรัส','a square 1:1 frame'],['16x9','16:9 แนวนอน','a horizontal 16:9 frame']]};
const LENGTH={k:'len',label:'ความยาว',choices:[['15','15 วิ','15'],['30','30 วิ','30'],['60','60 วิ','60']]};
const CATS=[
 {id:'all',icon:'✨',name:'ทั้งหมด'},
 {id:'image',icon:'📸',name:'ภาพ',color:'#d9733b'},
 {id:'video',icon:'🎬',name:'วิดีโอ & โมชัน',color:'#7d55c7'},
 {id:'write',icon:'✍️',name:'โพสต์ & ข้อความ',color:'#2d7fc1'},
 {id:'sell',icon:'🛍️',name:'ขายของ & แบรนด์',color:'#b8860b'},
 {id:'work',icon:'🧠',name:'งาน & สรุป',color:'#2c7a4b'},
 {id:'build',icon:'🌐',name:'เว็บ & แอป',color:'#c2416f'}
];
// ⟦…⟧ marks a chosen style and ⟪…⟫ marks the learner's own words, so the preview can highlight what changed.
const F=(value,fallback)=>value?'⟪'+value+'⟫':fallback;
const COMMANDS=[
 {id:'foodangle',cat:'image',icon:'🍜',name:'มุมอาหารน่ากิน',desc:'แนบรูปอาหาร ได้ภาพมุมมือโปร แสงสวย น่ากินขึ้นทันที',need:'photo',keys:'อาหาร กิน เมนู ร้านอาหาร ถ่ายอาหาร ข้าว ก๋วยเตี๋ยว ขนม เครื่องดื่ม กาแฟ น่ากิน food',
  opts:[{k:'angle',label:'มุมกล้อง',choices:[['hero','45° ฮีโร่','a 45-degree hero angle at table height'],['top','ท็อปวิว','a top-down flat lay shot from directly above'],['macro','ซูมเท็กซ์เจอร์','an extreme close-up that shows texture, steam and gloss'],['side','ระดับสายตา','a straight-on eye-level angle']]},
   {k:'mood',label:'บรรยากาศ',choices:[['cafe','คาเฟ่สว่าง','bright, airy window light on a light wooden table'],['moody','ดาร์กมู้ดดี้','dark, moody low-key light with one soft highlight'],['night','ตลาดกลางคืน','a lively Thai night-market setting with warm bokeh lights'],['home','ครัวบ้านอบอุ่น','a warm Thai home kitchen with everyday props']]},{...RATIO,def:'4x5'}],
  field:{label:'ชื่อเมนูหรือร้าน',ph:'เช่น ข้าวมันไก่ต้ม ร้านเจ๊หมวย',ex:['ข้าวมันไก่ต้ม ร้านเจ๊หมวย','ชาไทยเย็น หวานน้อย','ส้มตำปูปลาร้า','ครัวซองต์อัลมอนด์อบใหม่']},
  build:(o,f)=>`Use the attached photo of ${F(f,'my dish')}. Recreate it as professional food photography: ${o.angle}, ${o.mood}, ${o.ratio}. Keep the real dish exactly the same — same ingredients, portion, plate and colours, no new toppings or fake garnish. Improve only light, angle, styling and sharpness so it looks fresh and appetizing. No text, logo or watermark.`,
  pack:'Recreate my attached food photo as pro food photography (default: 45° hero angle, bright café light, 4:5). Keep the real dish identical; improve only light, angle, styling. No text.'},
 {id:'outfit',cat:'image',icon:'👗',name:'ลองชุดใหม่',desc:'แนบรูปตัวเอง เปลี่ยนเฉพาะชุดและฉาก หน้ายังเป็นคุณเหมือนเดิม',need:'photo',keys:'ชุด แต่งตัว เสื้อผ้า แฟชั่น ลองชุด ใส่ชุด ลุค outfit ไปงาน',
  opts:[{k:'style',label:'สไตล์ชุด',choices:[['thai','ไทยร่วมสมัย','a modern Thai outfit in contemporary silk with a clean cut'],['office','ออฟฟิศสมาร์ต','smart office wear with a tailored blazer'],['street','สตรีท','relaxed streetwear with an oversized jacket and sneakers'],['minimal','มินิมอลญี่ปุ่น','Japanese minimal style in neutral tones and natural fabrics'],['evening','ออกงานกลางคืน','an elegant evening outfit']]},
   {k:'scene',label:'ฉาก',choices:[['keep','ฉากเดิม','keep the original background'],['studio','สตูดิโอเรียบ','place me in a clean studio backdrop'],['city','ถนนในเมือง','place me on a city street in soft daylight'],['cafe','คาเฟ่','place me in a cozy café']]},{...RATIO,def:'4x5'}],
  field:{label:'สีหรือรายละเอียดที่อยากได้',ph:'เช่น โทนเขียวเข้ม ใส่แว่นกรอบทอง',ex:['โทนเขียวเข้ม ใส่แว่นกรอบทอง','สีครีมทั้งชุด','มีผ้าพันคอลายไทย']},
  build:(o,f)=>`Use the attached photo of me. Change only my outfit to ${o.style}${f?', with '+F(f):''}, and ${o.scene}. Keep my face, hairstyle, body shape, skin tone and pose exactly the same — it must still clearly be me. Realistic fabric, natural fit and lighting that matches the scene, ${o.ratio}. No text.`,
  pack:'Change only the outfit in my attached photo (style = words after the command, default modern Thai). Keep my face, hair, body and pose identical.'},
 {id:'product',cat:'image',icon:'🧴',name:'ภาพสินค้าขายได้',desc:'รูปสินค้าธรรมดา กลายเป็นภาพโฆษณาพร้อมลงร้านออนไลน์',need:'photo',keys:'สินค้า ขาย ร้านค้า โฆษณา แพ็กเกจ ขวด กล่อง ลงร้าน shopee lazada product',
  opts:[{k:'bg',label:'พื้นหลัง',choices:[['studio','สตูดิโอขาว','a seamless white studio background'],['life','วางในบ้านจริง','a real lifestyle home setting'],['nature','ธรรมชาติ','natural props such as stone, leaves and soft sunlight'],['luxury','หรูโทนเข้ม','a dark premium backdrop with rim light'],['pastel','พาสเทลป๊อป','a playful pastel colour-block set']]},
   {k:'angle',label:'มุม',choices:[['three','สามมิติ 3/4','a three-quarter angle'],['front','หน้าตรง','a straight front view'],['flat','วางราบ','a flat lay from above']]},{...RATIO,def:'1x1'}],
  field:{label:'สินค้าคืออะไร / จุดเด่น',ph:'เช่น สบู่สมุนไพร กลิ่นตะไคร้ ผิวไม่แห้ง',ex:['สบู่สมุนไพร กลิ่นตะไคร้','น้ำพริกเผาสูตรยาย','เทียนหอมกลิ่นมะลิ']},
  build:(o,f)=>`Use the attached product photo. Create a clean, sell-ready product shot: ${o.angle}, ${o.bg}, ${o.ratio}. Keep the product, its shape, colours, label text and logo exactly as in the photo — do not redesign or misspell the packaging. Soft realistic shadow, crisp edges, true-to-life colour.${f?' Hint at its key benefit visually: '+F(f)+'.':''} Leave clean space for a headline. No added text.`,
  pack:'Turn my attached product photo into a sell-ready product shot (default: white studio, 3/4 angle, 1:1). Never change the label, logo or packaging.'},
 {id:'headshot',cat:'image',icon:'🧑‍💼',name:'รูปโปรไฟล์มือโปร',desc:'เซลฟีธรรมดา กลายเป็นรูปโปรไฟล์ที่ใช้สมัครงานหรือขึ้นเว็บได้',need:'photo',keys:'โปรไฟล์ รูปหน้า สมัครงาน linkedin เรซูเม่ resume รูปติดบัตร headshot',
  opts:[{k:'vibe',label:'ฟีล',choices:[['corp','องค์กรมืออาชีพ','a polished corporate look, soft grey backdrop, business attire'],['creative','สตูดิโอครีเอทีฟ','a creative studio look with a coloured backdrop and confident pose'],['warm','แสงธรรมชาติอบอุ่น','warm natural window light with a softly blurred background'],['bw','ขาวดำเอดิทอเรียล','a black-and-white editorial portrait']]},{...RATIO,def:'1x1'}],
  field:{label:'จะเอาไปใช้ที่ไหน',ph:'เช่น LinkedIn, หน้าเว็บบริษัท',ex:['LinkedIn','หน้าทีมบนเว็บบริษัท','ปกเรซูเม่']},
  build:(o,f)=>`Use the attached photo of me to create a professional headshot: ${o.vibe}, head-and-shoulders crop, ${o.ratio}${f?', suitable for '+F(f):''}. Keep my face, features, skin tone and hairstyle exactly the same — retouch only light and clean up small distractions. Natural, not plastic. No text.`,
  pack:'Turn my attached selfie into a professional headshot (default: corporate, 1:1). Keep my face exactly the same.'},
 {id:'restyle',cat:'image',icon:'🎨',name:'เปลี่ยนสไตล์ภาพ',desc:'ภาพเดิม องค์ประกอบเดิม แต่เปลี่ยนลายมือศิลปินได้ในแตะเดียว',need:'photo',keys:'สไตล์ วาด การ์ตูน ภาพวาด ศิลปะ สีน้ำ อนิเมะ ฟิล์ม ลายไทย พิกเซล ปั้น restyle',
  opts:[{k:'style',label:'สไตล์',choices:[['water','สีน้ำ','a loose watercolour painting on textured paper'],['mural','จิตรกรรมฝาผนังไทย','a Thai temple mural painting with gold leaf and flowing kanok lines'],['clay','3D ดินปั้น','a cute 3D claymation scene'],['pixel','พิกเซลอาร์ต','16-bit pixel art'],['anime','อนิเมะวาดมือ','a hand-painted anime film still'],['film','ฟิล์ม 90s','a 1990s 35mm film photo with natural grain'],['comic','การ์ตูนลายเส้น','clean comic line art with flat colours']]},{...RATIO,def:'4x5'}],
  field:{label:'อยากเน้นอะไรเป็นพิเศษ',ph:'เช่น ให้แมวเด่นที่สุด',ex:['ให้แมวเด่นที่สุด','บรรยากาศยามเย็น','สีโทนอบอุ่น']},
  build:(o,f)=>`Redraw the attached image as ${o.style}. Keep the composition, the people (still recognisable) and the key objects the same${f?'; emphasise '+F(f):''}. Output as ${o.ratio}. No text or signature.`,
  pack:'Redraw my attached image in the style I name after the command (default watercolour). Keep composition and people recognisable.'},
 {id:'roomglow',cat:'image',icon:'🛋️',name:'แต่งห้องใหม่',desc:'ถ่ายห้องจริง ได้ภาพห้องที่แต่งเสร็จ พร้อมลิสต์ของที่ต้องซื้อ',need:'photo',keys:'ห้อง บ้าน แต่งห้อง ตกแต่ง คอนโด ออฟฟิศ ร้าน รีโนเวท interior',
  opts:[{k:'style',label:'สไตล์ห้อง',choices:[['japandi','Japandi','a calm Japandi interior'],['tropical','ทรอปิคอลไทยโมเดิร์น','a tropical Thai modern interior with rattan, teak and plants'],['white','มินิมอลขาว','a bright minimal white interior'],['cafe','คาเฟ่อบอุ่น','a warm café-style interior'],['budget','งบน้อย','a low-budget refresh using only paint, textiles, plants and lamps']]}],
  field:{label:'ห้องนี้ใช้ทำอะไร / งบประมาณ',ph:'เช่น ห้องนอน งบ 5,000 บาท',ex:['ห้องนอน งบ 5,000 บาท','มุมทำงานในคอนโด','หน้าร้านกาแฟ 3x4 เมตร']},
  build:(o,f)=>`Use the attached photo of my room${f?' ('+F(f)+')':''}. Redesign it as ${o.style}. Keep the walls, windows, doors and room size exactly as they are — change only furniture, colours, decor and lighting, and keep it realistic and buildable. Then list in Thai the 5 key items to buy or change.`,
  pack:'Redesign my attached room photo (style after the command, default Japandi). Keep walls, windows and size; then list 5 items to buy in Thai.'},
 {id:'poster',cat:'image',icon:'🪧',name:'โปสเตอร์จากเรื่องของคุณ',desc:'พิมพ์งานหรือโปรโมชัน 1 บรรทัด ได้โปสเตอร์พร้อมโพสต์',need:'text',keys:'โปสเตอร์ ป้าย ประกาศ อีเวนต์ งาน กิจกรรม ใบปลิว poster banner',
  opts:[{k:'style',label:'สไตล์',choices:[['swiss','Swiss มินิมอล','clean Swiss-style typography with a strict grid'],['retro','หนังไทยย้อนยุค','a hand-painted retro Thai movie poster'],['neon','นีออน','bold neon on a dark background'],['editorial','นิตยสาร','an elegant magazine-cover layout'],['cute','น่ารักพาสเทล','a cute pastel illustration style']]},{...RATIO,def:'4x5'}],
  field:{label:'งานหรือโปรโมชันคืออะไร',ph:'เช่น ตลาดนัดต้นไม้ 25 ต.ค. ที่สวนหลังบ้าน',ex:['ตลาดนัดต้นไม้ 25 ต.ค. ที่สวนหลังบ้าน','เปิดคลาสสอนปั้นดิน ทุกวันเสาร์','ลด 20% ทุกเมนูกาแฟ สัปดาห์นี้']},
  build:(o,f)=>`Design a poster for: "${F(f,'[งานหรือโปรโมชันของฉัน]')}". Style: ${o.style}, ${o.ratio}. One strong headline, one clear date/place line, lots of breathing room. Use Thai for all text, keep each line short and spell it exactly as I wrote it. If Thai lettering would come out wrong, leave clean blank space for the text instead.`,
  pack:'Design a poster for the event I describe after the command (default: Swiss minimal, 4:5). Thai text short and spelled exactly; leave space if Thai lettering fails.'},
 {id:'brushstory',cat:'video',icon:'🖌️',name:'แอนิเมชันเล่าเรื่อง + เพลง',desc:'ได้ไฟล์แอนิเมชันพร้อมเพลงประกอบ กดดาวน์โหลดเป็นวิดีโอได้',need:'text',tools:'Claude · ChatGPT',hot:true,keys:'วิดีโอ คลิป แอนิเมชัน เล่าเรื่อง เพลง ดนตรี พู่กัน ลายไทย ตัวหนังสือ mp4 animation story',
  opts:[{k:'art',label:'Art direction',choices:[['brush','พู่กันจีน','Chinese brush strokes (sumi ink, dry-brush texture, rice-paper grain)'],['mural','จิตรกรรมไทย','Thai temple mural painting (gold leaf, red ochre, deep green, flowing kanok lines)'],['ukiyo','ภาพพิมพ์ญี่ปุ่น','Japanese ukiyo-e woodblock prints (bold outlines, flat colour, wave patterns)'],['paper','กระดาษตัดซ้อนชั้น','layered paper cut-out with soft drop shadows'],['neon','นีออนซินธ์เวฟ','neon synthwave (glowing lines, grid horizon, magenta and cyan)'],['water','สีน้ำ','loose watercolour washes bleeding on textured paper'],['pixel','พิกเซลอาร์ต','retro 16-bit pixel art (chunky pixels, limited palette, game-style text boxes)']]},
   {k:'culture',label:'องค์ประกอบ',choices:[['thai','วัฒนธรรมไทย','Thai culture (temples, lotus, longtail boats, street food, elephants, Thai patterns)'],['japan','ญี่ปุ่น','Japanese culture (torii gates, sakura, lanterns, waves)'],['china','จีน','Chinese culture (lanterns, mountains, dragons, tea)'],['korea','เกาหลี','Korean culture (hanok roofs, hanbok, palace gardens)'],['global','สากลร่วมสมัย','a contemporary global city']]},
   {k:'type',label:'ตัวอักษร',choices:[['modern','Modern Bold','modern bold sans-serif kinetic TYPOGRAPHY'],['serif','Elegant Serif','elegant high-contrast serif TYPOGRAPHY'],['hand','ลายมือ','hand-lettered brush TYPOGRAPHY'],['brutal','Brutalist','raw brutalist TYPOGRAPHY with huge letters']]},
   {...LENGTH,def:'30'},{...RATIO,def:'9x16'}],
  field:{label:'เรื่องที่อยากเล่า',ph:'ใส่เรื่องที่อยากทำตรงนี้',multi:true,ex:['วันแรกที่ร้านกาแฟเล็ก ๆ ของฉันเปิดร้าน','การเดินทางของใบชาจากดอยถึงแก้วของคุณ','ตำนานแม่โพสพกับข้าวหอมมะลิ','เด็กหญิงริมโขงที่อยากเป็นนักบินอวกาศ']},
  build:(o,f)=>`Create JavaScript animation with music (and downloadable to mp4) using ${o.art} as key main art direction but make elements according to ${o.culture} plus ${o.type} style to tell the story.

Story will be about, "${F(f,'ใส่เรื่องที่อยากทำตรงนี้')}"

Requirements:
- One self-contained HTML file (Canvas + JavaScript), about ${o.len} seconds, ${o.ratio}.
- Split the story into 4–6 scenes with smooth transitions; each scene has one short Thai line that animates in with the typography style.
- Music: compose an original soundtrack with the Web Audio API that fits the mood (no external audio files) and fade it out at the end.
- Controls: Play / Replay, plus a "Download video" button that records the canvas and audio with MediaRecorder (MP4 when the browser supports it, otherwise WebM) and saves the file.
- Fonts only from Google Fonts; no other external assets.`,
  pack:'Create a self-contained HTML/JS animation with Web Audio music and a MediaRecorder "Download video" button (MP4 if supported, else WebM) telling the story after the command (default: Chinese brush strokes + Thai culture elements + modern typography, 30s, 9:16).'},
 {id:'kinetic',cat:'video',icon:'🔠',name:'คลิปตัวหนังสือเด้ง',desc:'ข้อความเดียว กลายเป็นคลิป Kinetic Typography ตามจังหวะเพลง',need:'text',tools:'Claude · ChatGPT',keys:'คลิป ตัวหนังสือ คำคม ข้อความ typography คลิปข้อความ เพลง จังหวะ quote',
  opts:[{k:'look',label:'ลุค',choices:[['pop','ป๊อปสีสด','bold pop colours with bouncy motion'],['mono','มินิมอลขาวดำ','minimal black and white with precise motion'],['hand','ลายมือ','hand-written strokes that draw themselves'],['retro','เรโทร 80s','retro 80s chrome and grid']]},{...LENGTH,def:'15'},{...RATIO,def:'9x16'}],
  field:{label:'ข้อความที่อยากให้เด้ง',ph:'เช่น ใครเจอเรา คนนั้นโชคดี',multi:true,ex:['ใครเจอเรา คนนั้นโชคดี','เริ่มจากสิ่งที่มี แล้วทำให้ดีขึ้นทุกวัน','ร้านเปิดแล้ว! แวะมาชิมกันนะ']},
  build:(o,f)=>`Create a kinetic typography video as one self-contained HTML file (Canvas + JavaScript): ${o.look}, about ${o.len} seconds, ${o.ratio}. Text (Thai, keep my exact words and line breaks): "${F(f,'[ข้อความของฉัน]')}". Animate word by word in sync with an original beat made with the Web Audio API. Add Play / Replay and a "Download video" button using MediaRecorder (MP4 if supported, otherwise WebM). Fonts only from Google Fonts with Thai support.`,
  pack:'Make a kinetic-typography HTML/JS clip of the Thai text after the command, synced to a Web Audio beat, with a MediaRecorder download button (default pop, 15s, 9:16).'},
 {id:'reel',cat:'video',icon:'📱',name:'สคริปต์ Reels / TikTok',desc:'ได้ฮุค 3 วิ ช็อตลิสต์ แคปชันบนจอ และเสียงพากย์ พร้อมถ่ายหรือทำด้วย AI',need:'text',keys:'คลิป วิดีโอ reels tiktok คลิปสั้น สคริปต์ ถ่ายคลิป ช็อต วิดีโอสั้น shorts',
  opts:[{k:'tone',label:'โทน',choices:[['fun','สนุกเป็นกันเอง','fun and friendly'],['teach','สอนเข้าใจง่าย','clear and educational'],['story','เล่าเรื่องซึ้ง','heartfelt storytelling'],['sell','ขายตรงประเด็น','direct and persuasive']]},{...LENGTH,def:'30'}],
  field:{label:'คลิปนี้เกี่ยวกับอะไร',ph:'เช่น 3 เมนูใหม่ของร้านเดือนนี้',ex:['3 เมนูใหม่ของร้านเดือนนี้','เบื้องหลังการทำเทียนหอม 1 ชิ้น','ทริคใช้ AI ทำงานเร็วขึ้น 2 เท่า']},
  build:(o,f)=>`Plan a ${o.len}-second vertical (9:16) short video about "${F(f,'[หัวข้อของฉัน]')}". Tone: ${o.tone}. Give me: 3 options for a 2-second hook; a scene-by-scene table (time, what we see, Thai on-screen text, Thai voice-over); a closing call-to-action; 5 hashtags. Keep it shootable with a phone or makeable with AI images. Write everything for the viewer in Thai.`,
  pack:'Plan a 9:16 short video about the topic after the command: 3 hooks, scene table (time, visual, Thai text, Thai VO), CTA, 5 hashtags (default 30s, fun tone).'},
 {id:'img2vid',cat:'video',icon:'🎞️',name:'ทำภาพให้ขยับ',desc:'แนบภาพนิ่ง ได้ Prompt สั่งภาพขยับสำหรับ Veo, Kling, Sora หรือ Higgsfield',need:'photo',keys:'ภาพขยับ ภาพเคลื่อนไหว image to video veo kling sora higgsfield กล้อง เคลื่อนกล้อง',
  opts:[{k:'cam',label:'กล้อง',choices:[['push','ซูมเข้าช้า ๆ','a slow push-in'],['orbit','หมุนรอบ','a gentle orbit around the subject'],['hand','ถือกล้องด้วยมือ','subtle handheld movement'],['drone','โดรนถอยออก','a drone pull-back that reveals the scene'],['parallax','พารัลแลกซ์','a soft parallax slide']]},
   {k:'mood',label:'อารมณ์',choices:[['calm','สงบ','calm'],['epic','ยิ่งใหญ่','epic'],['dreamy','ฝัน ๆ','dreamy'],['energy','คึกคัก','energetic']]},{k:'len',label:'ความยาว',choices:[['5','5 วิ','5'],['10','10 วิ','10']],def:'5'}],
  field:{label:'อยากให้อะไรขยับ',ph:'เช่น ไอน้ำลอยขึ้นจากแก้วกาแฟ',ex:['ไอน้ำลอยขึ้นจากแก้วกาแฟ','ผมปลิวเบา ๆ ตามลม','ใบไม้ร่วงช้า ๆ']},
  build:(o,f)=>`Look at the attached image and write one ready-to-paste image-to-video prompt (English, under 70 words) for tools like Veo, Kling, Sora or Higgsfield: ${o.cam}, ${o.mood} mood, ${o.len} seconds${f?', where '+F(f):''}, natural physics, keep the subject and faces unchanged, no morphing, no text. Then give 2 alternatives with a different camera move, and explain each in one Thai sentence.`,
  pack:'From my attached image, write an image-to-video prompt (under 70 words, English) + 2 alternatives with different camera moves; keep faces unchanged.'},
 {id:'storyboard',cat:'video',icon:'🎬',name:'สตอรีบอร์ด 6 ช็อต',desc:'ไอเดียเดียว แตกเป็น 6 เฟรม พร้อม Prompt สร้างภาพแต่ละช็อต',need:'text',keys:'สตอรีบอร์ด storyboard ช็อต ฉาก หนังสั้น โฆษณา เล่าเรื่อง การ์ตูน',
  opts:[{k:'style',label:'สไตล์ภาพ',choices:[['cine','ภาพยนตร์สมจริง','cinematic photorealism'],['anime','อนิเมะวาดมือ','hand-painted anime'],['clay','3D ดินปั้น','3D claymation'],['comic','การ์ตูนลายเส้น','comic line art']]}],
  field:{label:'ไอเดียหรือเรื่องย่อ',ph:'เช่น แมวส้มที่อยากเป็นบาริสต้า',multi:true,ex:['แมวส้มที่อยากเป็นบาริสต้า','วันแรกของพนักงานใหม่ที่ทำทุกอย่างพัง แต่จบดี','โฆษณาน้ำพริกสูตรยาย 30 วิ']},
  build:(o,f)=>`Turn this idea into a 6-panel storyboard: "${F(f,'[ไอเดียของฉัน]')}". For each panel give: shot type, what happens, a Thai caption (max 12 words) and a short English image prompt in ${o.style} style so I can generate each frame. Keep the main character's design identical in every panel.`,
  pack:'Turn the idea after the command into a 6-panel storyboard: shot type, action, Thai caption, English image prompt per panel; consistent character.'},
 {id:'caption',cat:'write',icon:'✍️',name:'แคปชันพร้อมโพสต์',desc:'แนบรูปหรือเล่า 1 บรรทัด ได้แคปชัน 3 แบบ เลือกโพสต์ได้ทันที',need:'either',keys:'แคปชัน caption โพสต์ เฟซบุ๊ก ไอจี instagram facebook ข้อความโพสต์ เขียนโพสต์',
  opts:[{k:'platform',label:'ลงที่ไหน',choices:[['fb','Facebook','Facebook'],['ig','Instagram','Instagram'],['tt','TikTok','TikTok'],['line','LINE OA','a LINE Official Account broadcast']]},
   {k:'tone',label:'น้ำเสียง',choices:[['friendly','เป็นกันเอง','friendly and casual'],['pro','มืออาชีพ','professional'],['funny','ขำ ๆ','playful and funny'],['warm','อบอุ่น','warm and sincere']]}],
  field:{label:'เล่าสั้น ๆ ว่าโพสต์อะไร',ph:'เช่น เปิดเมนูใหม่ ชาไทยปั่นนมสด',ex:['เปิดเมนูใหม่ ชาไทยปั่นนมสด','ขอบคุณลูกค้าที่มาครบ 1 ปี','รับสมัครพนักงาน Part-time']},
  build:(o,f)=>`Write 3 caption options in Thai for ${o.platform} from the attached photo${f?' and this note: "'+F(f)+'"':''}. Tone: ${o.tone}. Each option: a scroll-stopping first line, 2–4 short lines, a soft call-to-action and up to 5 relevant hashtags. Do not invent prices, dates or claims that are not in my photo, note or Source.`,
  pack:'Write 3 Thai caption options (hook line, 2–4 lines, CTA, ≤5 hashtags) for my attached photo or the note after the command. Never invent prices or claims.'},
 {id:'reply',cat:'write',icon:'💬',name:'ตอบลูกค้า 3 โทน',desc:'วางข้อความลูกค้า ได้คำตอบ 3 แบบ ไม่รับปากเกินข้อมูลจริง',need:'text',keys:'ตอบลูกค้า ตอบแชต ลูกค้าถาม ข้อความ แชต inbox ตอบกลับ คอมเมนต์ reply',
  opts:[{k:'len',label:'ความยาว',choices:[['short','สั้นกระชับ','under 3 lines'],['mid','พอดี','under 5 lines'],['full','ละเอียด','under 8 lines with clear next steps']]}],
  field:{label:'ข้อความลูกค้า + ข้อมูลจริงที่มี',ph:'เช่น ลูกค้าถาม “ของถึงพรุ่งนี้ไหม?” ร้านส่งได้เร็วสุดวันศุกร์ ยังไม่รู้วันรับ',multi:true,ex:['ลูกค้าถาม “ของถึงพรุ่งนี้ไหม?” ร้านส่งได้เร็วสุดวันศุกร์ แต่ยังไม่ทราบวันรับ','ลูกค้าขอส่วนลดเพราะซื้อ 3 ชิ้น ร้านให้ได้แค่ส่งฟรี','ลูกค้าบ่นว่าสีสินค้าไม่ตรงรูป']},
  build:(o,f)=>`Draft 3 replies in Thai — warm, professional and short — to this customer situation: "${F(f,'[ข้อความลูกค้า + ข้อมูลจริง]')}". Each reply ${o.len}. Only promise what the facts support; if something is unknown (for example the delivery date), say so honestly and offer the next step.`,
  pack:'Draft 3 Thai replies (warm / professional / short) to the customer situation after the command. Promise only what the facts support.'},
 {id:'hook',cat:'write',icon:'🪝',name:'10 ประโยคเปิดหยุดนิ้ว',desc:'ได้ฮุคเปิดโพสต์หรือคลิป 10 แบบ จัดกลุ่มตามอารมณ์',need:'text',keys:'ฮุค hook ประโยคเปิด หัวข้อ พาดหัว ดึงดูด คนหยุดดู headline',
  opts:[{k:'fmt',label:'ใช้กับ',choices:[['clip','คลิปสั้น','a short video (spoken in the first 2 seconds)'],['post','โพสต์','a social post (first line)'],['ad','โฆษณา','an ad headline']]}],
  field:{label:'หัวข้อ',ph:'เช่น ประหยัดเวลาทำบัญชีร้านด้วย AI',ex:['ประหยัดเวลาทำบัญชีร้านด้วย AI','ทำไมกาแฟร้านเราขมน้อยกว่า','3 ที่เที่ยวเชียงใหม่ที่คนยังไม่รู้']},
  build:(o,f)=>`Write 10 Thai hooks for ${o.fmt} about "${F(f,'[หัวข้อของฉัน]')}". Group them: curiosity, pain point, surprising fact, story, bold claim (only claims I can actually back up). Max 14 words each. Star your top 2 and say why in one Thai line.`,
  pack:'Write 10 Thai hooks (≤14 words) about the topic after the command, grouped by curiosity / pain / fact / story / bold claim; star the best 2.'},
 {id:'thaify',cat:'write',icon:'🇹🇭',name:'ภาษาไทยให้เป็นธรรมชาติ',desc:'แปลหรือเกลาให้ไทยลื่น เหมือนคนไทยเขียนเอง ไม่ใช่ภาษาแปล',need:'text',keys:'แปล ภาษาไทย เกลา ขัดเกลา แก้คำ ทางการ ไม่ทางการ translate',
  opts:[{k:'mode',label:'ทำอะไร',choices:[['tr','แปลอังกฤษ→ไทย','Translate this English into natural Thai'],['polish','เกลาไทยเดิม','Polish this Thai so it reads naturally'],['formal','ให้ทางการขึ้น','Rewrite this Thai to be more formal and polite'],['casual','ให้เป็นกันเอง','Rewrite this Thai to be casual and friendly']]}],
  field:{label:'ข้อความ',ph:'วางข้อความที่นี่',multi:true,ex:['We are excited to announce our new collection.','ทางเราขอแจ้งให้ทราบว่าสินค้าจะทำการจัดส่งภายในระยะเวลา 3 วันทำการค่ะ']},
  build:(o,f)=>`${o.mode}: "${F(f,'[ข้อความ]')}". Keep the meaning, names and numbers exactly; remove translated-sounding phrases; keep it about the same length. Give the result first, then up to 3 notes on what you changed.`,
  pack:'Translate or polish the text after the command into natural Thai (keep names and numbers); result first, then ≤3 notes.'},
 {id:'promo',cat:'sell',icon:'🏷️',name:'โปรโมชันที่คนอยากกด',desc:'ได้ไอเดียโปร 3 แบบ พร้อมข้อความโพสต์และพาดหัวป้าย',need:'text',keys:'โปรโมชัน โปร ลดราคา แคมเปญ ขายดี ส่วนลด ของแถม promotion sale',
  opts:[{k:'type',label:'แบบโปร',choices:[['launch','เปิดตัวสินค้าใหม่','a new product launch'],['flash','ลดเวลาจำกัด','a limited-time flash sale'],['bundle','จับคู่ขายคู่','a bundle deal'],['loyal','ลูกค้าประจำ','a loyalty reward for regulars']]}],
  field:{label:'สินค้า / ข้อจำกัด (งบ, ส่วนลดสูงสุด)',ph:'เช่น เค้กมะพร้าว ลดได้ไม่เกิน 15%',ex:['เค้กมะพร้าว ลดได้ไม่เกิน 15%','คอร์สโยคะ 8 ครั้ง ช่วงปิดเทอม','เสื้อยืดลายไทย เหลือสต็อก 40 ตัว']},
  build:(o,f)=>`Plan ${o.type} for: "${F(f,'[สินค้าและข้อจำกัด]')}". Give 3 promotion ideas that stay within my limits, and for the best one: a Thai post (under 6 lines), a 5-word Thai poster headline and the exact terms (dates, conditions). Do not exceed the discount or budget I gave.`,
  pack:'Plan 3 promotions within the limits after the command; for the best: Thai post, 5-word headline, exact terms. Never exceed my discount or budget.'},
 {id:'review',cat:'sell',icon:'⭐',name:'ตอบรีวิวให้ปัง',desc:'วางรีวิวลูกค้า ได้คำตอบที่สุภาพ จริงใจ และกู้ใจลูกค้าได้',need:'text',keys:'รีวิว คอมเมนต์ ติชม ลูกค้าบ่น ดาว google review ตอบรีวิว',
  opts:[{k:'kind',label:'รีวิวแบบไหน',choices:[['good','ชม','a positive review'],['bad','ติ / บ่น','a negative review'],['mixed','ทั้งชมทั้งติ','a mixed review']]}],
  field:{label:'วางรีวิว',ph:'วางรีวิวลูกค้าที่นี่',multi:true,ex:['อาหารอร่อย แต่รอนานไป 40 นาที','บริการดีมาก น้องพนักงานยิ้มแย้ม จะกลับมาอีก']},
  build:(o,f)=>`Write 2 Thai replies to ${o.kind}: "${F(f,'[รีวิว]')}". Sound like a real owner: thank them, address the specific point, no excuses, and offer one concrete next step if something went wrong. Under 5 lines each.`,
  pack:'Write 2 Thai owner replies to the review after the command: thank, address the specific point, one concrete next step; ≤5 lines.'},
 {id:'brandkit',cat:'sell',icon:'🎨',name:'แบรนด์คิตจากซอส',desc:'ได้สี ฟอนต์ น้ำเสียง และกติกาแบรนด์ ที่ใช้คุมงานทุกชิ้น',need:'sauce',keys:'แบรนด์ โลโก้ สี ฟอนต์ ซีไอ ci brand ตัวตน น้ำเสียงแบรนด์',
  opts:[{k:'vibe',label:'ฟีล',choices:[['modern','โมเดิร์น','modern and clean'],['heritage','มรดกไทย','heritage Thai craft'],['playful','สนุกสดใส','playful and colourful'],['premium','พรีเมียม','quiet premium luxury']]}],
  field:{label:'แบรนด์หรือธุรกิจ (ถ้าไม่แนบซอส)',ph:'เช่น ร้านขนมไทยของยาย เปิดมา 30 ปี',ex:['ร้านขนมไทยของยาย เปิดมา 30 ปี','สตูดิโอโยคะเล็ก ๆ ในซอย','แบรนด์เสื้อผ้าฝ้ายย้อมคราม']},
  build:(o,f)=>`Create a one-page brand kit${f?' for '+F(f):' from my Source'} with a ${o.vibe} feel: a 5-colour palette with hex codes and where to use each; 2 Google Fonts that support Thai (headline + body); brand voice in 3 adjectives with do/don't examples in Thai; 3 photo-style rules; and one sample Thai post written in this voice.`,
  pack:'Create a one-page brand kit from my Source or the brand after the command: 5 hex colours, 2 Thai-capable Google Fonts, voice + do/don’t, 3 photo rules, one sample Thai post.'},
 {id:'menu',cat:'sell',icon:'📋',name:'เมนูร้านพร้อมพิมพ์',desc:'วางรายการเมนู ได้ไฟล์ HTML เมนูสวย พิมพ์ A4 หรือเปิดบนมือถือได้',need:'text',keys:'เมนู ราคา ร้านอาหาร ร้านกาแฟ ใบเมนู พิมพ์ menu',
  opts:[{k:'look',label:'หน้าตา',choices:[['chalk','กระดานชอล์ก','a chalkboard look'],['minimal','มินิมอลขาว','a clean minimal white look'],['street','ร้านข้างทางไทย','a fun Thai street-food look'],['cafe','คาเฟ่อบอุ่น','a warm café look with soft illustrations']]}],
  field:{label:'รายการเมนูและราคา',ph:'เช่น ลาเต้ 55, อเมริกาโน่ 45, ชาไทย 50',multi:true,ex:['ลาเต้ 55, อเมริกาโน่ 45, ชาไทย 50, ครัวซองต์ 65','ข้าวผัดกุ้ง 70, กะเพราหมูกรอบ 60, ต้มยำ 120']},
  build:(o,f)=>`Make a menu as one self-contained HTML file: ${o.look}, prints neatly on A4 and also reads well on a phone. Items and prices (use exactly these, do not add or change prices): "${F(f,'[รายการเมนูและราคา]')}". Group items into sensible sections, Thai text, Google Fonts with Thai support, no other external assets.`,
  pack:'Make a printable A4 + mobile HTML menu from the items and prices after the command (never change prices; group into sections; Thai fonts).'},
 {id:'meeting',cat:'work',icon:'📝',name:'สรุปประชุมเป็นงาน',desc:'วางโน้ตหรือบทถอดเสียง ได้สรุป 5 บรรทัด และตารางใครทำอะไรเมื่อไร',need:'text',keys:'ประชุม สรุป โน้ต minutes บันทึก ถอดเสียง งานที่ต้องทำ todo meeting',
  opts:[{k:'out',label:'ส่งต่อให้ใคร',choices:[['team','ทีมเดียวกัน','the same team'],['boss','หัวหน้า','my manager (decisions first)'],['client','ลูกค้า','the client (polite and clear)']]}],
  field:{label:'วางโน้ตประชุม',ph:'วางโน้ตหรือข้อความถอดเสียงที่นี่',multi:true,ex:['คุยเรื่องเปิดสาขาใหม่ พี่เอรับหาโลเคชัน ภายในศุกร์หน้า งบตกแต่งไม่เกิน 2 แสน ยังไม่สรุปชื่อร้าน']},
  build:(o,f)=>`Summarise this meeting for ${o.out}: "${F(f,'[โน้ตประชุม]')}". Give: a 5-line Thai summary; decisions made; a table of tasks (task, owner, due date) — write "ยังไม่กำหนด" when the notes do not say; open questions. Do not invent owners or dates.`,
  pack:'Summarise the meeting notes after the command: 5-line Thai summary, decisions, task table (task/owner/due — "ยังไม่กำหนด" if unknown), open questions.'},
 {id:'plan7',cat:'work',icon:'📅',name:'แผนคอนเทนต์ 7 วัน',desc:'ได้แผนโพสต์ 1 สัปดาห์ที่ทำไหวจริงตามเวลาที่มี',need:'sauce',keys:'แผน คอนเทนต์ content plan ตารางโพสต์ สัปดาห์ ปฏิทิน โพสต์อะไรดี',
  opts:[{k:'time',label:'เวลาที่มีต่อวัน',choices:[['15','15 นาที','15 minutes'],['30','30 นาที','30 minutes'],['60','1 ชั่วโมง','1 hour']],def:'30'}],
  field:{label:'ธุรกิจ / เป้าหมายสัปดาห์นี้',ph:'เช่น ร้านต้นไม้ อยากได้ลูกค้าใหม่จาก IG',ex:['ร้านต้นไม้ อยากได้ลูกค้าใหม่จาก IG','ครูสอนพิเศษ อยากเปิดคอร์สปิดเทอม']},
  build:(o,f)=>`Make a 7-day content plan${f?' for '+F(f):' from my Source'} that I can actually make with ${o.time} a day. Table: day, format, Thai headline, what to shoot or create, call-to-action. Reuse one piece of work in different formats instead of making everything from scratch.`,
  pack:'Make a doable 7-day content plan (table: day, format, Thai headline, what to create, CTA) for the goal after the command or my Source; reuse one piece across formats.'},
 {id:'tutor',cat:'work',icon:'🧑‍🏫',name:'ติวเตอร์ส่วนตัว',desc:'ให้ AI สอนทีละขั้น ถามเช็กความเข้าใจ และปรับความยากตามคำตอบ',need:'text',keys:'ติว สอน เรียน สอบ อธิบาย ไม่เข้าใจ การบ้าน ครู tutor',
  opts:[{k:'level',label:'ระดับ',choices:[['new','เพิ่งเริ่ม','a complete beginner'],['mid','พอรู้บ้าง','someone with some basics'],['exam','เตรียมสอบ','someone preparing for an exam']]}],
  field:{label:'อยากเข้าใจเรื่องอะไร',ph:'เช่น ภาษีเงินได้บุคคลธรรมดา',ex:['ภาษีเงินได้บุคคลธรรมดา','สูตรพื้นที่วงกลม','การทำงบกำไรขาดทุนร้านเล็ก']},
  build:(o,f)=>`Be my patient tutor on "${F(f,'[หัวข้อ]')}" for ${o.level}. Teach in short steps, in Thai: explain one idea with an everyday example, then ask me one check question and wait for my answer. Adjust difficulty from my answers. After 5 steps, give a one-page summary.`,
  pack:'Tutor me on the topic after the command in Thai: one idea + example per step, one check question, wait for my answer, adjust difficulty; summary after 5 steps.'},
 {id:'sop',cat:'work',icon:'📘',name:'คู่มือ SOP จากซอส',desc:'เปลี่ยนวิธีทำงานที่อยู่ในหัว ให้เป็นคู่มือที่คนอื่นทำตามได้',need:'sauce',keys:'sop คู่มือ ขั้นตอน วิธีทำงาน มาตรฐาน checklist เช็กลิสต์ สอนพนักงาน',
  opts:[{k:'reader',label:'คนอ่าน',choices:[['new','พนักงานใหม่','a brand-new staff member'],['team','ทีมเดิม','an existing team member'],['part','พาร์ตไทม์','a part-timer on their first shift']]}],
  field:{label:'งานอะไร (ถ้าไม่แนบซอส)',ph:'เช่น เปิดร้านตอนเช้า',ex:['เปิดร้านตอนเช้า','รับออร์เดอร์ทาง LINE','ปิดยอดขายสิ้นวัน']},
  build:(o,f)=>`Write an SOP${f?' for "'+F(f)+'"':' from my Source'} that ${o.reader} can follow alone. Thai. Include: purpose, what to prepare, numbered steps (one action each), a checklist, common mistakes and who to ask. Mark anything you are unsure of as "ต้องยืนยัน" instead of guessing.`,
  pack:'Write a Thai SOP (purpose, prep, numbered steps, checklist, common mistakes, who to ask) from my Source or the task after the command; mark guesses "ต้องยืนยัน".'},
 {id:'readme',cat:'work',icon:'📄',name:'README หน้าแรกของโปรเจกต์',desc:'สรุปโปรเจกต์หรือโฟลเดอร์ให้คนใหม่อ่านจบแล้วเริ่มงานได้',need:'sauce',keys:'readme อ่านก่อน โปรเจกต์ โฟลเดอร์ เอกสาร ส่งต่องาน handover',
  opts:[{k:'depth',label:'ความละเอียด',choices:[['quick','อ่าน 2 นาที','a 2-minute read'],['full','ฉบับเต็ม','a complete handover document']]}],
  field:{label:'โปรเจกต์อะไร (ถ้าไม่แนบซอส)',ph:'เช่น โฟลเดอร์งานออกแบบแบรนด์ลูกค้า A',ex:['โฟลเดอร์งานออกแบบแบรนด์ลูกค้า A','โปรเจกต์เว็บร้านกาแฟ']},
  build:(o,f)=>`Write a README.md${f?' for "'+F(f)+'"':' from my Source and attached files'} as ${o.depth}: what this is, who it is for, what is inside (file map), how to start, current status, rules not to break, contacts. Thai, Markdown, short sections.`,
  pack:'Write a Thai README.md (what, who, file map, how to start, status, rules, contacts) for the project after the command or my Source.'},
 {id:'onepage',cat:'build',icon:'🌐',name:'เว็บหน้าเดียวจากซอส',desc:'ได้ไฟล์ HTML หน้าเดียวที่เปิดบนมือถือได้ทันที ไม่ต้องเขียนโค้ดเอง',need:'sauce',tools:'Claude · ChatGPT',keys:'เว็บ เว็บไซต์ หน้าเว็บ landing page แนะนำตัว ร้าน html website',
  opts:[{k:'style',label:'สไตล์',choices:[['clean','สะอาดมินิมอล','clean minimal with lots of white space'],['bold','ตัวใหญ่จัดจ้าน','bold editorial with big typography'],['warm','อบอุ่นมีภาพประกอบ','warm and friendly with soft illustrations'],['dark','ดาร์กพรีเมียม','dark premium with gold accents']]},
   {k:'goal',label:'เป้าหมาย',choices:[['contact','ให้คนทักมา','get people to contact me'],['sell','ขายสินค้า','sell a product'],['profile','แนะนำตัว','introduce me or my work']]}],
  field:{label:'เว็บของใคร / อะไร (ถ้าไม่แนบซอส)',ph:'เช่น ร้านดอกไม้ของฉันที่ขอนแก่น',ex:['ร้านดอกไม้ของฉันที่ขอนแก่น','พอร์ตงานช่างภาพงานแต่ง','คลาสสอนว่ายน้ำเด็ก']},
  build:(o,f)=>`Build a one-page website as one self-contained HTML file${f?' for '+F(f):' from my Source'}. Style: ${o.style}. Goal: ${o.goal}. Mobile-first, Thai text, Google Fonts with Thai support, smooth scroll and small tasteful animations, no other external assets. Use only facts from my Source or note; put [ใส่ข้อมูล] where something is missing.`,
  pack:'Build a self-contained mobile-first one-page HTML site from my Source or the note after the command; Thai fonts; [ใส่ข้อมูล] for missing facts.'},
 {id:'minigame',cat:'build',icon:'🎮',name:'มินิเกมจากเรื่องของคุณ',desc:'ได้เกมเล็ก ๆ ในไฟล์เดียว เล่นบนมือถือได้ ส่งให้เพื่อนเล่นได้เลย',need:'text',tools:'Claude · ChatGPT',keys:'เกม มินิเกม เล่น game สนุก กิจกรรม ลูกค้าเล่น',
  opts:[{k:'genre',label:'แนวเกม',choices:[['catch','รับของตก','a catch-the-falling-items game'],['memory','จับคู่ความจำ','a memory card-matching game'],['runner','วิ่งหลบ','an endless runner'],['quiz','ตอบคำถามจับเวลา','a timed quiz game']]}],
  field:{label:'ธีมของเกม',ph:'เช่น แมวเก็บปลาทูในตลาดน้ำ',ex:['แมวเก็บปลาทูในตลาดน้ำ','บาริสต้าทำกาแฟให้ทันลูกค้า','จับคู่ผลไม้ไทย']},
  build:(o,f)=>`Make ${o.genre} as one self-contained HTML file. Theme: "${F(f,'[ธีมของฉัน]')}". Touch and keyboard controls, works on a phone, 60–90 seconds per round, score + best score saved in localStorage, cute shapes drawn in code (no image files), sound effects with the Web Audio API, Thai UI text.`,
  pack:'Make a self-contained mobile HTML mini-game (default catch game) with the theme after the command: touch controls, score + best score, Web Audio SFX, Thai UI.'},
 {id:'quiz',cat:'build',icon:'❓',name:'แบบทดสอบแชร์ผลได้',desc:'ได้ควิซ 8 ข้อ จบแล้วมีการ์ดผลลัพธ์ให้แคปไปแชร์',need:'text',tools:'Claude · ChatGPT',keys:'ควิซ แบบทดสอบ quiz คำถาม ทดสอบ บุคลิก ความรู้ แชร์ผล',
  opts:[{k:'kind',label:'แบบไหน',choices:[['persona','คุณเป็นแบบไหน','a personality quiz (“which type are you?”)'],['know','วัดความรู้','a knowledge quiz with a score']]}],
  field:{label:'หัวข้อควิซ',ph:'เช่น คุณเป็นกาแฟแบบไหน',ex:['คุณเป็นกาแฟแบบไหน','รู้จักผักพื้นบ้านไทยแค่ไหน','สไตล์การทำงานของคุณ']},
  build:(o,f)=>`Make ${o.kind} as one self-contained HTML file about "${F(f,'[หัวข้อ]')}": 8 questions, one at a time with a progress bar, then a beautiful result card (big title, short Thai description, emoji) sized for a phone screenshot, plus a Retry button. Thai text, mobile-first, no external assets except Google Fonts.`,
  pack:'Make a self-contained mobile HTML quiz (8 questions, progress bar, shareable result card, retry) on the topic after the command; Thai text.'}
];
const REMIX=[
 {id:'again',icon:'🔁',name:'ขอใหม่ 3 แบบ',text:'Give me 3 new versions that are clearly different from each other and from the last one. Keep everything that comes from my Source true.'},
 {id:'fix',icon:'🎯',name:'แก้จุดเดียว',text:'Change only this: [จุดที่อยากแก้]. Keep everything else exactly the same.'},
 {id:'closer',icon:'🫙',name:'เช็กกับซอส',text:'Compare your last result with my Source. List anything that does not match (names, numbers, facts, tone), then fix only those points.'},
 {id:'keep',icon:'🔒',name:'ล็อกหน้า/โลโก้',text:'Keep faces, logos, product labels and Thai text exactly as in my original. Regenerate only the rest.'},
 {id:'bright',icon:'☀️',name:'สว่างขึ้น',text:'Same image, but brighter and warmer light with more contrast on the subject. Nothing else changes.'},
 {id:'shorter',icon:'✂️',name:'สั้นลงครึ่งหนึ่ง',text:'Cut it to half the length. Keep the key point and the call-to-action.'},
 {id:'thai',icon:'🇹🇭',name:'ไทยให้ลื่น',text:'Rewrite the Thai so it sounds natural, like a real Thai person wrote it. Remove translated-sounding phrases.'},
 {id:'why',icon:'💡',name:'บอกว่าแก้อะไร',text:'In 3 short Thai bullet points, explain what you changed and why.'}
];
const SAUCE_LINE='Use my attached Source (.md) as the ground truth for names, facts, prices and tone, and never contradict it.';
const NO_QUESTIONS='If something is missing, make a sensible choice and state it in one line instead of asking me first.';
const THAI_LINE='Reply to me in Thai.';
const byId=Object.fromEntries(COMMANDS.map(c=>[c.id,c]));
function defaults(command){const out={};for(const opt of command.opts||[])out[opt.k]=opt.def&&opt.choices.some(c=>c[0]===opt.def)?opt.def:opt.choices[0][0];return out;}
function phrases(command,chosen,mark){
 const out={};
 for(const opt of command.opts||[]){const id=chosen?.[opt.k];const choice=opt.choices.find(c=>c[0]===id)||opt.choices.find(c=>c[0]===defaults(command)[opt.k]);out[opt.k]=mark?'⟦'+choice[2]+'⟧':choice[2];}
 return out;
}
function clean(text){return String(text||'').replace(/[⟦⟧⟪⟫]/g,'').replace(/\s+$/,'').trim();}
// Markers survive into the returned string; callers strip (copy) or highlight (preview) them.
function buildMarked(selection,settings={}){
 const items=(selection||[]).map(item=>({command:byId[item.id],options:item.options||{},field:clean(item.field)})).filter(item=>item.command);
 if(!items.length)return '';
 const parts=items.map(item=>item.command.build(phrases(item.command,item.options,true),item.field));
 let body=parts.length===1?parts[0]:'Do these in order, one result per step:\n\n'+parts.map((part,i)=>(i+1)+') '+part).join('\n\n');
 const footer=[];
 if(settings.sauce!==false)footer.push(SAUCE_LINE);
 footer.push(NO_QUESTIONS);
 if(settings.thai!==false)footer.push(THAI_LINE);
 return body+'\n\n'+footer.join(' ');
}
function buildPrompt(selection,settings){return buildMarked(selection,settings).replace(/[⟦⟧⟪⟫]/g,'');}
function shortCommand(selection){
 return (selection||[]).map(item=>{
  const command=byId[item.id];if(!command)return '';
  const base=defaults(command);const words=[];
  for(const opt of command.opts||[]){const id=item.options?.[opt.k];if(id&&id!==base[opt.k]){const choice=opt.choices.find(c=>c[0]===id);if(choice)words.push(choice[1]);}}
  const field=clean(item.field);
  return ('/'+command.id+(words.length?' '+words.join(' · '):'')+(field?' — '+field:'')).trim();
 }).filter(Boolean).join('\n');
}
function buildPack(ids){
 const list=(ids&&ids.length?ids:COMMANDS.map(c=>c.id)).map(id=>byId[id]).filter(Boolean);
 return 'You now have my personal slash commands. When my message starts with one of them, follow its recipe right away. Words after the command are my details or style choices and override the defaults. If I attach a photo or file, it is the input. '+SAUCE_LINE.replace('my attached Source','any Source I attach')+' '+NO_QUESTIONS+' Reply in Thai unless the recipe says otherwise.\n\n'+list.map(c=>'/'+c.id+' — '+c.pack).join('\n')+'\n\nIf I type /help, list the commands with a one-line Thai explanation each.';
}
const PERSONAS={
 shop:{icon:'🛍️',img:'agent-shop',role:'แอดมินร้าน',roleEn:'shop admin',name:'น้องซอส',mission:'Help me run my shop: answer customers, write posts and promotions, and reply to reviews.',skills:['reply','caption','promo','review','hook','foodangle','product'],demo:[['user','ลูกค้าถามว่าส่งพรุ่งนี้ทันไหม'],['bot','ร้านส่งได้เร็วสุดวันศุกร์ค่ะ ยังยืนยันวันรับไม่ได้ ถ้าต้องใช้พรุ่งนี้อาจไม่ทันนะคะ 🙏'],['user','/caption เมนูใหม่ ชาไทยปั่น'],['bot','3 แคปชันพร้อมโพสต์ — แบบที่ 1: “ร้อนนี้ต้องปั่น 🧋…”']]},
 tutor:{icon:'🧑‍🏫',img:'agent-tutor',role:'ติวเตอร์ส่วนตัว',roleEn:'personal tutor',name:'ครูซอส',mission:'Teach me and my learners step by step, check understanding and turn lessons into practice material.',skills:['tutor','quiz','thaify','storyboard','meeting'],demo:[['user','/tutor ภาษีเงินได้ เพิ่งเริ่ม'],['bot','ขั้นที่ 1: ภาษีคิดจาก “เงินได้สุทธิ” เหมือนเก็บค่าน้ำตามมิเตอร์ ลองตอบ: เงินเดือนคือเงินได้ประเภทไหน?'],['user','40(1)'],['bot','ถูกต้อง! ไปขั้นที่ 2 กัน ✨']]},
 secretary:{icon:'🗂️',img:'agent-secretary',role:'เลขาฯ ส่วนตัว',roleEn:'personal secretary',name:'เลขาซอส',mission:'Keep my work organised: summarise meetings, write SOPs and READMEs, plan the week and draft replies.',skills:['meeting','sop','readme','plan7','reply','thaify'],demo:[['user','/meeting (วางโน้ตประชุม)'],['bot','สรุป 5 บรรทัด + ตาราง: หาโลเคชัน · พี่เอ · ศุกร์หน้า / ตั้งชื่อร้าน · ยังไม่กำหนด'],['user','/sop เปิดร้านตอนเช้า'],['bot','SOP 9 ขั้น พร้อมเช็กลิสต์ ✅ (2 จุดทำเครื่องหมาย “ต้องยืนยัน”)']]},
 creator:{icon:'🎬',img:'agent-creator',role:'ผู้กำกับคอนเทนต์',roleEn:'content director',name:'ผู้กำกับซอส',mission:'Turn my Source into content: plan, script, design and animate posts and short videos.',skills:['plan7','reel','hook','caption','brushstory','kinetic','img2vid','storyboard','poster'],demo:[['user','/plan7 ร้านต้นไม้ อยากได้ลูกค้าใหม่'],['bot','แผน 7 วัน ใช้คลิปเดียวแตก 4 รูปแบบ 📅'],['user','/brushstory จิตรกรรมไทย — ต้นไม้ต้นแรกของร้าน'],['bot','ได้ไฟล์ HTML แอนิเมชัน + เพลง + ปุ่มดาวน์โหลดวิดีโอ 🎬']]}
};
const TONES={friendly:['เป็นกันเอง','warm, friendly and casual'],polite:['สุภาพ','polite and professional'],direct:['ตรงไปตรงมา','direct and concise'],playful:['ขี้เล่น','playful with light humour']};
const RULES=[
 {id:'facts',on:true,th:'ห้ามเดาราคา วันที่ หรือเงื่อนไขที่ไม่มีในซอส',en:'Never guess prices, dates or terms that are not in the Source; say you need to check.'},
 {id:'handoff',on:true,th:'เรื่องเงิน คืนเงิน หรือร้องเรียน ส่งต่อให้ฉันตัดสินใจ',en:'Hand payments, refunds and complaints to me (the owner) with a short summary instead of deciding.'},
 {id:'privacy',on:true,th:'ไม่ขอหรือทวนข้อมูลส่วนตัวของลูกค้าเกินจำเป็น',en:'Never ask for or repeat personal data beyond what the task needs.'},
 {id:'short',on:true,th:'ตอบสั้น ไม่เกิน 6 บรรทัด ถ้าไม่ได้ขอเพิ่ม',en:'Keep replies under 6 lines unless I ask for more.'},
 {id:'options',on:false,th:'เวลาต้องตัดสินใจ เสนอ 2 ทางเลือกพร้อมข้อดีข้อเสีย',en:'When I must decide, give 2 options with one pro and one con each.'},
 {id:'ask',on:false,th:'ข้อมูลไม่พอ ถามกลับได้ 1 ข้อ',en:'When something important is missing, ask one short clarifying question before working.'}
];
function buildAgent(cfg={}){
 const persona=PERSONAS[cfg.persona]||PERSONAS.shop;
 const name=String(cfg.name||'').trim().slice(0,40)||persona.name;
 const tone=(TONES[cfg.tone]||TONES.friendly)[1];
 const ids=(cfg.skills&&cfg.skills.length?cfg.skills:persona.skills).map(id=>byId[id]).filter(Boolean);
 const rules=RULES.filter(rule=>cfg.rules?cfg.rules[rule.id]===true:rule.on);
 const askRule=rules.some(rule=>rule.id==='ask');
 return '# '+name+' — '+persona.role+'\n\nYou are '+name+', my '+persona.roleEn+' agent. '+persona.mission+'\nPersonality: '+tone+'. Speak Thai to me and to anyone I serve unless asked otherwise.\n\n## Knowledge\nTreat the Source (.md) files in this project as the single source of truth for names, facts, prices and tone. If the Source does not say, say so honestly and tell me what to check. '+(askRule?'':NO_QUESTIONS)+'\n\n## Rules\n'+(rules.length?rules.map(rule=>'- '+rule.en).join('\n'):'- Follow the Source and be honest about what you do not know.')+'\n\n## Skills\nWhen my message starts with a slash command, run that recipe right away. Words after the command are my details or style choices and override the defaults. If I attach a photo or file, it is the input.\n'+ids.map(c=>'/'+c.id+' — '+c.pack).join('\n')+'\n/help — list these commands with one Thai line each.\n\n## Start\nIn every new chat, greet me in one short Thai line as '+name+' and show /help.';
}
function normalise(text){return String(text||'').toLowerCase().replace(/\s+/g,' ').trim();}
function matchCommands(query,limit=4){
 const q=normalise(query);if(!q)return [];
 const slash=q.match(/^\/?([a-z0-9]+)/);
 const scored=COMMANDS.map(command=>{
  let score=0;
  if(slash&&command.id.startsWith(slash[1]))score+=slash[1].length>=3?20:6;
  for(const key of command.keys.split(' '))if(key&&q.includes(key.toLowerCase()))score+=key.length>=4?4:2;
  if(q.includes(command.name.toLowerCase()))score+=8;
  for(const word of q.split(' '))if(word.length>=2&&(command.name.includes(word)||command.desc.includes(word)))score+=1;
  return {command,score};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
 return scored.slice(0,limit).map(item=>item.command.id);
}
function queryFromSearch(search){
 try{const params=new URLSearchParams(search||'');return params.has('q')?params.get('q').trim():null;}catch{return null;}
}
window.MC_DECK={COMMANDS,REMIX,CATS,PERSONAS,TONES,RULES,buildPrompt,shortCommand,buildPack,buildAgent,matchCommands,queryFromSearch,defaults};
if(typeof document==='undefined')return;

/* ═══ Interface ═══ */
const KEY='mc_command_deck_v1';
const MAX=3;
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// The site's smooth-scroll layer (Lenis) owns the scroll position when present; native smooth
// scrolling would be overridden by it, so route jumps through it.
function scrollToEl(el){if(!el)return;const lenis=window.cloverMotion?.lenis;if(lenis){lenis.scrollTo(el,{offset:-136,duration:1.1,immediate:reduce()});return;}el.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'start'});}
let state={wok:[],options:{},fields:{},sauce:true,thai:true,cat:'all',packIds:null,platform:'claude'};
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Array.isArray(saved.wok))state={...state,...saved,wok:saved.wok.filter(id=>byId[id]).slice(0,MAX)};if(state.agent&&!PERSONAS[state.agent.persona])state.agent=null;}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function selection(){return state.wok.map(id=>({id,options:{...defaults(byId[id]),...(state.options[id]||{})},field:state.fields[id]||''}));}
let toastTimer;
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),2200);}
async function copy(text){
 try{await navigator.clipboard.writeText(text);return true;}catch{}
 try{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}catch{return false;}
}
function needLabel(need){return {photo:'📎 แนบรูป',text:'✍️ พิมพ์ 1 บรรทัด',either:'📎 รูป หรือ ✍️ ข้อความ',sauce:'🫙 แนบซอส .md'}[need]||'';}
function catOf(command){return CATS.find(c=>c.id===command.cat);}
function renderCats(){
 const host=$('deckCats');if(!host)return;
 host.innerHTML=CATS.map(cat=>{const count=cat.id==='all'?COMMANDS.length:COMMANDS.filter(c=>c.cat===cat.id).length;return '<button type="button" role="tab" data-cat="'+cat.id+'" aria-selected="'+(state.cat===cat.id)+'"'+(cat.color?' style="--c:'+cat.color+'"':'')+'><span aria-hidden="true">'+cat.icon+'</span>'+esc(cat.name)+'<i>'+count+'</i></button>';}).join('');
}
function cardHTML(command){
 const cat=catOf(command);
 return '<article class="dc" data-id="'+command.id+'" data-cat="'+command.cat+'" style="--c:'+cat.color+'" tabindex="-1">'+
  '<div class="dc-top"><span class="dc-icon" aria-hidden="true">'+command.icon+'</span><code class="dc-slash">/'+command.id+'</code>'+(command.hot?'<span class="dc-hot">HOT</span>':'')+'</div>'+
  '<b class="dc-name">'+esc(command.name)+'</b><p class="dc-desc">'+esc(command.desc)+'</p>'+
  '<div class="dc-foot"><span class="dc-need">'+needLabel(command.need)+'</span><button type="button" class="dc-add" data-add="'+command.id+'" aria-label="ใส่ /'+command.id+' ลงกระทะ"><span aria-hidden="true">+</span></button></div></article>';
}
function renderCards(){
 const host=$('deckCards');if(!host)return;
 const list=COMMANDS.filter(c=>state.cat==='all'||c.cat===state.cat);
 host.innerHTML=list.map(cardHTML).join('');
 paintCards();
}
function paintCards(){document.querySelectorAll('.dc').forEach(card=>{const inWok=state.wok.includes(card.dataset.id);card.dataset.in=String(inWok);const add=card.querySelector('.dc-add');if(add){add.setAttribute('aria-pressed',String(inWok));add.firstElementChild.textContent=inWok?'✓':'+';}});}
function optionHTML(command,opt){
 const chosen=(state.options[command.id]||{})[opt.k]||defaults(command)[opt.k];
 return '<div class="opt"><span class="opt-l">'+esc(opt.label)+'</span><div class="seg" role="group" aria-label="'+esc(opt.label)+'">'+opt.choices.map(c=>'<button type="button" data-opt="'+command.id+'|'+opt.k+'|'+c[0]+'" aria-pressed="'+(c[0]===chosen)+'">'+esc(c[1])+'</button>').join('')+'</div></div>';
}
function wokItemHTML(command,i){
 const cat=catOf(command);const field=command.field;const value=state.fields[command.id]||'';
 const input=field.multi?'<textarea rows="3" data-field="'+command.id+'" placeholder="'+esc(field.ph)+'">'+esc(value)+'</textarea>':'<input type="text" data-field="'+command.id+'" value="'+esc(value)+'" placeholder="'+esc(field.ph)+'">';
 return '<article class="wi" data-id="'+command.id+'" style="--c:'+cat.color+';--d:'+(i*60)+'ms">'+
  '<header><span class="wi-icon" aria-hidden="true">'+command.icon+'</span><div class="wi-title"><code>/'+command.id+'</code><b>'+esc(command.name)+'</b></div><span class="wi-need">'+needLabel(command.need)+'</span><button type="button" class="wi-x" data-remove="'+command.id+'" aria-label="เอา /'+command.id+' ออกจากกระทะ">×</button></header>'+
  (command.opts||[]).map(opt=>optionHTML(command,opt)).join('')+
  '<label class="fld"><span>'+esc(field.label)+' <em>(ไม่ใส่ก็ได้)</em></span><div class="fld-row">'+input+'<button type="button" class="dice" data-dice="'+command.id+'" title="สุ่มตัวอย่าง" aria-label="สุ่มตัวอย่างให้ช่อง '+esc(field.label)+'">🎲</button></div></label></article>';
}
function renderWok(){
 const wok=$('wok'),items=$('wokItems');if(!wok||!items)return;
 wok.dataset.empty=String(state.wok.length===0);
 items.innerHTML=state.wok.map((id,i)=>wokItemHTML(byId[id],i)).join('');
 setText($('wokCount'),state.wok.length+' / '+MAX);
 renderOutput();paintCards();paintDock();
}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
function renderOutput(){
 const out=$('forgeOut');if(!out)return;
 const sel=selection();
 const marked=buildMarked(sel,state);
 const plain=marked.replace(/[⟦⟧⟪⟫]/g,'');
 out.innerHTML=marked?esc(marked).replace(/⟦(.*?)⟧/gs,'<mark>$1</mark>').replace(/⟪(.*?)⟫/gs,'<mark class="f">$1</mark>'):'<span class="ph">ลากการ์ดคำสั่งมาวางในกระทะด้านบน หรือแตะการ์ด — Prompt เต็มจะปรุงเสร็จตรงนี้ทันที</span>';
 setText($('forgeLen'),marked?plain.length.toLocaleString('th-TH')+' ตัวอักษร':'ยังว่าง');
 const short=shortCommand(sel);setText($('shortCmd'),short||'/foodangle ท็อปวิว — ข้าวมันไก่');
 const needsPhoto=sel.some(item=>['photo','either'].includes(byId[item.id].need));
 const needsSauce=state.sauce||sel.some(item=>byId[item.id].need==='sauce');
 setText($('forgeHint'),!marked?'':(needsPhoto&&needsSauce?'วาง Prompt ในแชต แล้วแนบรูป + ซอส .md ก่อนกดส่ง':needsPhoto?'วาง Prompt ในแชต แล้วแนบรูปก่อนกดส่ง':needsSauce?'วาง Prompt ในแชต แล้วแนบซอส .md ของคุณก่อนกดส่ง':'วาง Prompt ในแชต แล้วกดส่งได้เลย'));
 document.querySelectorAll('[data-ship]').forEach(btn=>{btn.toggleAttribute('aria-disabled',!marked);});
 const sauce=$('optSauce'),thai=$('optThai');if(sauce)sauce.checked=state.sauce!==false;if(thai)thai.checked=state.thai!==false;
}
function paintDock(){
 const dock=$('dock');if(!dock)return;
 dock.querySelector('.dock-items').innerHTML=state.wok.map(id=>'<span title="/'+id+'">'+byId[id].icon+'</span>').join('')||'<span class="dock-empty">🍳</span>';
 setText(dock.querySelector('.dock-label'),state.wok.length?'กระทะ '+state.wok.length+'/'+MAX+' · ไปปรุงเลย ↓':'วางการ์ดลงกระทะ');
 dock.dataset.show=String(dragging||(state.wok.length>0&&!forgeVisible));
}
function fly(from,icon){
 if(reduce()||!from)return;
 const target=forgeVisible?$('wok'):$('dock');if(!target)return;
 const a=from.getBoundingClientRect(),b=target.getBoundingClientRect();
 const el=document.createElement('span');el.className='flyer';el.textContent=icon;el.setAttribute('aria-hidden','true');
 el.style.left=(a.left+a.width/2-18)+'px';el.style.top=(a.top+a.height/2-18)+'px';document.body.appendChild(el);
 const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+Math.min(b.height,80)/2-(a.top+a.height/2);
 el.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx*0.5+'px,'+(dy*0.5-90)+'px) scale(1.4)',opacity:1,offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale(.6)',opacity:.2}],{duration:620,easing:'cubic-bezier(.3,.7,.4,1)'}).onfinish=()=>{el.remove();const wok=$('wok');wok?.classList.remove('sizzle');void wok?.offsetWidth;wok?.classList.add('sizzle');};
}
function add(id,from){
 const command=byId[id];if(!command)return;
 if(state.wok.includes(id)){toast('/'+id+' อยู่ในกระทะแล้ว');return;}
 if(state.wok.length>=MAX){toast('กระทะเต็มแล้ว — ปรุงได้ทีละ '+MAX+' คำสั่ง');return;}
 state.wok.push(id);save();fly(from,command.icon);renderWok();
 toast(command.icon+' ใส่ /'+id+' ลงกระทะแล้ว'+(state.wok.length>1?' · คอมโบ '+state.wok.length+' คำสั่ง!':''));
}
function remove(id){state.wok=state.wok.filter(x=>x!==id);save();renderWok();}
function loadPreset(id,options,field){
 if(!byId[id])return;
 state.wok=[id];state.options[id]={...(state.options[id]||{}),...options};if(field!==undefined)state.fields[id]=field;save();renderWok();
 scrollToEl($('forge'));
 toast(byId[id].icon+' โหลด /'+id+' ลงกระทะแล้ว');
}
/* ═══ Smart search ═══ */
function renderSuggest(){
 const input=$('deckQ'),host=$('deckSuggest');if(!input||!host)return;
 const ids=matchCommands(input.value);
 $('deckQClear')?.toggleAttribute('hidden',!input.value);
 if(!input.value.trim()){host.innerHTML='<span class="sg-hint">ลองพิมพ์: “อยากให้รูปข้าวมันไก่น่ากินขึ้น” · “ทำคลิปเล่าเรื่องร้าน” · “ตอบลูกค้า”</span>';return;}
 host.innerHTML=ids.length?'<span class="sg-label">AI ใส่ซอสแนะนำ</span>'+ids.map((id,i)=>'<button type="button" class="sg" data-add="'+id+'" style="--c:'+catOf(byId[id]).color+'"><span aria-hidden="true">'+byId[id].icon+'</span><code>/'+id+'</code> '+esc(byId[id].name)+(i===0?' <i>ตรงที่สุด</i>':'')+'</button>').join(''):'<span class="sg-hint">ยังไม่เจอคำสั่งที่ตรง — ลองเลือกหมวดด้านล่าง หรือใช้ /onepage /caption ซึ่งรับงานได้กว้าง</span>';
}
/* ═══ Drag and drop (mouse, pen, and touch after a short hold) ═══ */
let drag=null,dragging=false,ghost=null,suppressClick=0,forgeVisible=false;
function overDrop(x,y){const el=document.elementFromPoint(x,y);return el?.closest('#wok,#dock')||null;}
function beginDrag(d,x,y){
 d.active=true;dragging=true;document.body.classList.add('deck-dragging');
 const command=byId[d.id];ghost=document.createElement('div');ghost.className='drag-ghost';ghost.setAttribute('aria-hidden','true');
 ghost.innerHTML='<span>'+command.icon+'</span><code>/'+command.id+'</code>';document.body.appendChild(ghost);
 d.card.classList.add('lifted');moveDrag(x,y);paintDock();
 try{navigator.vibrate?.(12);}catch{}
}
function moveDrag(x,y){
 if(!ghost)return;ghost.style.transform='translate('+(x-40)+'px,'+(y-28)+'px) rotate(-4deg)';
 const over=overDrop(x,y);document.querySelectorAll('.drop-hot').forEach(el=>{if(el!==over)el.classList.remove('drop-hot');});over?.classList.add('drop-hot');
}
function endDrag(x,y,cancel){
 const d=drag;drag=null;clearTimeout(d?.timer);
 if(!d?.active)return;
 const over=cancel?null:overDrop(x,y);
 document.querySelectorAll('.drop-hot').forEach(el=>el.classList.remove('drop-hot'));
 d.card.classList.remove('lifted');ghost?.remove();ghost=null;dragging=false;document.body.classList.remove('deck-dragging');
 suppressClick=Date.now();
 if(over)add(d.id,null);else paintDock();
}
function bindDrag(){
 const host=$('deckCards');if(!host)return;
 host.addEventListener('pointerdown',event=>{
  const card=event.target.closest('.dc');if(!card||event.button!==0||event.target.closest('.dc-add'))return;
  const d={id:card.dataset.id,card,x:event.clientX,y:event.clientY,pointer:event.pointerId,type:event.pointerType,active:false};
  if(event.pointerType==='touch')d.timer=setTimeout(()=>{if(drag===d&&!d.moved)beginDrag(d,d.lastX??d.x,d.lastY??d.y);},280);
  drag=d;
 });
 document.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  drag.lastX=event.clientX;drag.lastY=event.clientY;
  if(!drag.active){
   if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
   if(drag.type==='touch'){drag.moved=true;clearTimeout(drag.timer);drag=null;return;}
   beginDrag(drag,event.clientX,event.clientY);
  }
  event.preventDefault();moveDrag(event.clientX,event.clientY);
 },{passive:false});
 document.addEventListener('touchmove',event=>{if(drag?.active)event.preventDefault();},{passive:false});
 document.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.pointer)endDrag(event.clientX,event.clientY,false);});
 document.addEventListener('pointercancel',event=>{if(drag&&event.pointerId===drag.pointer)endDrag(0,0,true);});
 host.addEventListener('contextmenu',event=>{if(drag||dragging)event.preventDefault();});
}
/* ═══ Agent builder (a persona + the slash commands it knows + house rules) ═══ */
const PLATFORMS={
 claude:{name:'Claude',url:'https://claude.ai/new',steps:['เปิด claude.ai → Projects → สร้าง Project ใหม่ ตั้งชื่อตาม Agent','วางข้อความที่คัดลอกในช่อง Project instructions แล้วอัปโหลดซอส .md ไว้ในไฟล์ของ Project','เปิดแชตใน Project นั้น พิมพ์ /help — Agent จะทักและโชว์คำสั่งทั้งหมด'],alt:'อยากให้ทุกแชตรู้จักคุณ: วางใน Settings → Profile ช่อง personal preferences ด้วยก็ได้'},
 chatgpt:{name:'ChatGPT',url:'https://chatgpt.com/gpts/editor',steps:['เปิด ChatGPT → GPTs → Create (หรือสร้าง Project ใหม่)','แท็บ Configure: วางข้อความในช่อง Instructions แล้วอัปโหลดซอส .md ใน Knowledge','บันทึก แล้วเปิดแชตกับ GPT นั้น พิมพ์ /help'],alt:'ถ้าบัญชีสร้าง GPTs ไม่ได้ ใช้ Project แล้ววางใน Instructions แทน'},
 gemini:{name:'Gemini',url:'https://gemini.google.com/gems/create',steps:['เปิด Gemini → Gems → New Gem ตั้งชื่อตาม Agent','วางข้อความในช่อง Instructions แล้วแนบซอส .md เป็น Knowledge','บันทึก เปิด Gem แล้วพิมพ์ /help'],alt:'Gem ใช้ได้ทั้งบนเว็บและแอปมือถือ'}
};
function agentState(){if(!state.agent||typeof state.agent!=='object')state.agent={persona:'shop',name:'',tone:'friendly',rules:null};return state.agent;}
function agentRules(){const a=agentState();if(!a.rules){a.rules={};for(const rule of RULES)a.rules[rule.id]=rule.on;}return a.rules;}
function packIds(){return [...document.querySelectorAll('[data-pack]')].filter(cb=>cb.checked).map(cb=>cb.dataset.pack);}
function agentConfig(){const a=agentState();return {persona:a.persona,name:a.name,tone:a.tone,skills:packIds(),rules:agentRules()};}
function renderPack(){
 const list=$('packList'),steps=$('packSteps'),tabs=$('packTabs');if(!list||!steps||!tabs)return;
 const a=agentState();const persona=PERSONAS[a.persona]||PERSONAS.shop;
 const ids=state.packIds||persona.skills;
 const personas=$('agPersonas');if(personas)personas.innerHTML=Object.entries(PERSONAS).map(([id,p])=>'<button type="button" class="ag-persona" data-persona="'+id+'" aria-pressed="'+(id===a.persona)+'"><img src="/img/classroom-lesson5-20261018/'+p.img+'.jpg" alt="" width="64" height="64" loading="lazy" decoding="async"><b>'+p.icon+' '+esc(p.role)+'</b><small>'+p.skills.length+' ทักษะ</small></button>').join('');
 const name=$('agName');if(name){name.placeholder=persona.name;if(document.activeElement!==name)name.value=a.name||'';}
 const tones=$('agTone');if(tones)tones.innerHTML=Object.entries(TONES).map(([id,t])=>'<button type="button" data-tone="'+id+'" aria-pressed="'+(id===a.tone)+'">'+esc(t[0])+'</button>').join('');
 const rules=$('agRules');if(rules){const r=agentRules();rules.innerHTML=RULES.map(rule=>'<label><input type="checkbox" data-rule="'+rule.id+'"'+(r[rule.id]?' checked':'')+'><span>'+esc(rule.th)+'</span></label>').join('');}
 list.innerHTML=CATS.filter(c=>c.id!=='all').map(cat=>'<fieldset style="--c:'+cat.color+'"><legend>'+cat.icon+' '+esc(cat.name)+'</legend>'+COMMANDS.filter(c=>c.cat===cat.id).map(c=>'<label><input type="checkbox" data-pack="'+c.id+'"'+(ids.includes(c.id)?' checked':'')+'><code>/'+c.id+'</code></label>').join('')+'</fieldset>').join('');
 tabs.querySelectorAll('[data-platform]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.platform===state.platform)));
 const p=PLATFORMS[state.platform]||PLATFORMS.claude;
 steps.innerHTML='<ol>'+p.steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol><p class="pack-alt">💡 '+esc(p.alt)+' · เมนูอาจย้ายตำแหน่งตามเวอร์ชันของแอป</p>';
 const open=$('packOpen');if(open){open.href=p.url;open.textContent='คัดลอก + เปิด '+p.name+' ↗';}
 paintPackCount();
}
function paintPackCount(){
 const cfg=agentConfig();const persona=PERSONAS[cfg.persona]||PERSONAS.shop;const text=buildAgent(cfg);
 setText($('packCount'),cfg.skills.length+' ทักษะ · '+Object.values(cfg.rules).filter(Boolean).length+' กฎ · '+text.length.toLocaleString('th-TH')+' ตัวอักษร');
 const prev=$('packPreview');if(prev)prev.textContent=text;
 const card=$('agCard');if(card){
  card.querySelector('.ag-avatar').src='/img/classroom-lesson5-20261018/'+persona.img+'.jpg';
  setText(card.querySelector('.ag-name'),(cfg.name||'').trim()||persona.name);
  setText(card.querySelector('.ag-role'),persona.icon+' '+persona.role+' · '+TONES[cfg.tone||'friendly'][0]);
  card.querySelector('.ag-skills').innerHTML=cfg.skills.slice(0,12).map(id=>'<span>/'+id+'</span>').join('')+(cfg.skills.length>12?'<span>+'+(cfg.skills.length-12)+'</span>':'')||'<span class="none">ยังไม่มีทักษะ</span>';
  setText(card.querySelector('.ag-level'),'LV.'+Math.max(1,Math.min(99,cfg.skills.length*7+Object.values(cfg.rules).filter(Boolean).length*3)));
 }
}
function choosePersona(id,scroll){
 if(!PERSONAS[id])return;const a=agentState();a.persona=id;state.packIds=null;save();renderPack();
 if(scroll)scrollToEl($('agent'));
 toast(PERSONAS[id].icon+' เลือก Agent “'+PERSONAS[id].role+'” แล้ว — ปรับชื่อ ทักษะ และกฎได้เลย');
}
/* ═══ Events ═══ */
function bind(){
 document.addEventListener('click',async event=>{
  const t=event.target;
  const addBtn=t.closest('[data-add]');if(addBtn){event.preventDefault();add(addBtn.dataset.add,addBtn.closest('.dc')||addBtn);return;}
  const card=t.closest('.dc');if(card&&!t.closest('button')){if(Date.now()-suppressClick<350)return;add(card.dataset.id,card);return;}
  const cat=t.closest('[data-cat]');if(cat){state.cat=cat.dataset.cat;save();renderCats();renderCards();return;}
  const rm=t.closest('[data-remove]');if(rm){remove(rm.dataset.remove);return;}
  const opt=t.closest('[data-opt]');if(opt){const [id,k,v]=opt.dataset.opt.split('|');state.options[id]={...(state.options[id]||{}),[k]:v};save();opt.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===opt)));renderOutput();return;}
  const dice=t.closest('[data-dice]');if(dice){const c=byId[dice.dataset.dice];const pool=c.field.ex.filter(x=>x!==state.fields[c.id]);const pick=pool[Math.floor(Math.random()*pool.length)]||c.field.ex[0];state.fields[c.id]=pick;save();const input=document.querySelector('[data-field="'+c.id+'"]');if(input)input.value=pick;renderOutput();return;}
  const ship=t.closest('[data-ship]');if(ship){
   const text=buildPrompt(selection(),state);
   if(!text){event.preventDefault();toast('ใส่คำสั่งลงกระทะก่อนนะ');scrollToEl($('deck'));return;}
   const ok=await copy(text);const where=ship.dataset.ship;
   toast(ok?(where==='copy'?'📋 คัดลอกแล้ว — ไปวางในแชต AI ได้เลย':'📋 คัดลอกแล้ว — วางในแชต '+where+' (กด วาง/⌘V)'):'คัดลอกไม่สำเร็จ — กดค้างที่กล่อง Prompt แล้วเลือกคัดลอก');
   ship.dataset.done='true';setTimeout(()=>{ship.dataset.done='false';},1600);
   try{const used=JSON.parse(localStorage.getItem('mc_command_deck_used')||'0')+1;localStorage.setItem('mc_command_deck_used',JSON.stringify(used));}catch{}
   return;
  }
  if(t.closest('#shortCopy')){const text=shortCommand(selection())||$('shortCmd')?.textContent||'';const ok=await copy(text);toast(ok?'คัดลอกคำสั่งสั้นแล้ว — ใช้ได้เมื่อติดตั้งชุดคำสั่งแล้ว':'คัดลอกไม่สำเร็จ');return;}
  const remix=t.closest('[data-remix]');if(remix){const item=REMIX.find(r=>r.id===remix.dataset.remix);const ok=await copy(item.text);remix.dataset.done='true';setTimeout(()=>{remix.dataset.done='false';},1400);toast(ok?item.icon+' คัดลอก “'+item.name+'” แล้ว — วางต่อในแชตเดิม':'คัดลอกไม่สำเร็จ');return;}
  const preset=t.closest('[data-preset]');if(preset){try{const p=JSON.parse(preset.dataset.preset);loadPreset(p.id,p.options||{},p.field);}catch{}return;}
  const plat=t.closest('[data-platform]');if(plat){state.platform=plat.dataset.platform;save();renderPack();return;}
  const tab=t.closest('[data-sc-tab]');if(tab){const name=tab.dataset.scTab;tab.parentElement.querySelectorAll('[data-sc-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));document.querySelectorAll('.sc-panel').forEach(panel=>{panel.hidden=panel.dataset.panel!==name;});return;}
  const persona=t.closest('[data-persona]');if(persona){choosePersona(persona.dataset.persona,false);return;}
  const agentGo=t.closest('[data-agent]');if(agentGo){choosePersona(agentGo.dataset.agent,true);return;}
  const tone=t.closest('[data-tone]');if(tone){agentState().tone=tone.dataset.tone;save();tone.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===tone)));paintPackCount();return;}
  if(t.closest('#packAll')){document.querySelectorAll('[data-pack]').forEach(cb=>{cb.checked=true;});state.packIds=packIds();save();paintPackCount();return;}
  if(t.closest('#packMine')){const mine=new Set(state.wok);if(!mine.size){toast('ยังไม่มีคำสั่งในกระทะ — เลือกทั้งหมดไว้ให้ก่อน');return;}document.querySelectorAll('[data-pack]').forEach(cb=>{cb.checked=mine.has(cb.dataset.pack);});state.packIds=packIds();save();paintPackCount();return;}
  const packCopy=t.closest('[data-pack-copy]');if(packCopy){const ids=packIds();if(!ids.length){event.preventDefault();toast('เลือกอย่างน้อย 1 คำสั่ง');return;}const ok=await copy(buildAgent(agentConfig()));toast(ok?'🤖 คัดลอก Agent พร้อม '+ids.length+' ทักษะแล้ว — ไปวางตามขั้นตอน':'คัดลอกไม่สำเร็จ');return;}
  if(t.closest('#dockGo')){scrollToEl($('forge'));return;}
  if(t.closest('#wokClear')){state.wok=[];save();renderWok();return;}
 });
 document.addEventListener('input',event=>{
  const t=event.target;
  if(t.matches('[data-field]')){state.fields[t.dataset.field]=t.value.slice(0,1200);save();renderOutput();return;}
  if(t.id==='agName'){agentState().name=t.value.slice(0,40);save();paintPackCount();return;}
  if(t.id==='deckQ'){renderSuggest();try{sessionStorage.setItem('mc_deck_q',t.value);}catch{}return;}
 });
 document.addEventListener('change',event=>{
  const t=event.target;
  if(t.id==='optSauce'){state.sauce=t.checked;save();renderOutput();return;}
  if(t.id==='optThai'){state.thai=t.checked;save();renderOutput();return;}
  if(t.matches('[data-pack]')){state.packIds=packIds();save();paintPackCount();return;}
  if(t.matches('[data-rule]')){agentRules()[t.dataset.rule]=t.checked;save();paintPackCount();}
 });
 $('deckQClear')?.addEventListener('click',()=>{const q=$('deckQ');q.value='';renderSuggest();q.focus();try{sessionStorage.removeItem('mc_deck_q');}catch{}});
 $('deckQ')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const first=matchCommands(event.target.value)[0];if(first)add(first,$('deckSuggest')?.querySelector('.sg'));}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag?.active)endDrag(0,0,true);});
 document.addEventListener('deck:preset',event=>{const d=event.detail||{};loadPreset(d.id,d.options||{},d.field);});
 const forge=$('forge');
 if(forge&&'IntersectionObserver' in window){new IntersectionObserver(entries=>{forgeVisible=entries[0].isIntersecting;paintDock();},{threshold:.15}).observe(forge);}
}
function mount(){
 if(!$('deckCards'))return;
 load();
 const fromUrl=queryFromSearch(location.search);
 const q=$('deckQ');
 if(q){let stored=null;try{stored=sessionStorage.getItem('mc_deck_q');}catch{}q.value=fromUrl!==null?fromUrl:(stored||'');}
 if(fromUrl)state.cat='all';
 renderCats();renderCards();renderWok();renderSuggest();renderPack();bindDrag();bind();
 document.documentElement.dataset.deck='ready';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
