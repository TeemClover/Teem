const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = process.argv[2] || path.resolve(__dirname,'../../..');
const output = path.resolve(__dirname, '../../clover20/assets/photos');
const sources = fs.readdirSync(root).filter(n => /^Screenshot.*\.jpg$/.test(n)).sort();
const selections = [
  ['table',16,'ความโชคดีเริ่มจากบทสนทนา',[0,0,3444,1760]],
  ['hands',15,'ส่งต่อความหวังดี',[200,80,3244,1760]],
  ['book',14,'สิ่งที่เราได้เรียนรู้',[0,0,3444,1760]],
  ['meeting',49,'ได้รู้จักคนที่พร้อมเติบโตไปด้วยกัน',null],
  ['stage',6,'จากห้องเล็ก ๆ สู่เวทีที่เราเคยยืนด้วยกัน',null],
  ['hall-empty',33,'เก้าอี้ที่เคยว่างเปล่า',null],
  ['hall',34,'วันที่ฮอลใหญ่เต็มไปด้วยความหวัง',[420,0,3024,1790]],
  ['crowd',30,'ความทรงจำของผู้คนมากมาย',[0,0,3444,1630]],
  ['together',5,'รอยยิ้มที่ยังจำได้',null],
  ['travel',41,'โลกกว้างที่เราเคยออกไปเห็นด้วยกัน',null],
  ['bridge',39,'เส้นทางที่มีเพื่อนร่วมเดิน',null],
  ['friends',27,'เติบโตไปในเส้นทางของตัวเอง',[0,0,3444,1550]],
  ['celebrate',51,'ความสุขเล็ก ๆ ที่เราเคยแบ่งปัน',null],
  ['home',57,'กลับมาพบกันอีกครั้ง',[0,0,3300,1770]],
  // Smaller, softer frames move through the background of the journey.
  ['anniversary-blue',1,'เคยฉลองวันสำคัญด้วยกัน',null,'memory'],
  ['anniversary-six',2,'อีกหนึ่งปีที่มีเพื่อนอยู่ข้าง ๆ',null,'memory'],
  ['anniversary-seven',3,'วันเวลาที่เราได้เติบโตมาด้วยกัน',null,'memory'],
  ['first-friends',4,'คนที่ได้รู้จักในวันนั้น',null,'memory'],
  ['stage-blue',7,'รอยยิ้มบนเวทีเดียวกัน',null,'memory'],
  ['stage-wide',8,'ช่วงเวลาที่เรายืนอยู่ด้วยกัน',null,'memory'],
  ['hall-lights',9,'แสงไฟและผู้คนในความทรงจำ',null,'memory'],
  ['red-carpet',11,'วันที่เราได้พบคนอีกมากมาย',null,'memory'],
  ['a-small-book',13,'หนังสือเล่มหนึ่งที่เปิดโลกให้เรา',null,'memory'],
  ['a-shared-moment',17,'อยากเก็บช่วงเวลานี้ไว้',null,'memory'],
  ['on-stage',18,'ความกล้าที่ได้รับจากกันและกัน',null,'memory'],
  ['learning-days',19,'สิ่งที่ได้เรียนรู้ยังเดินทางไปกับเรา',null,'memory'],
  ['old-friends',20,'เพื่อนร่วมทางในวันวาน',[0,300,3444,1450],'memory'],
  ['gala-friends',21,'ยังจำรอยยิ้มเหล่านี้ได้',[0,0,3444,1250],'memory'],
  ['white-shirts',26,'วันธรรมดาที่กลายเป็นความทรงจำ',[0,0,3444,1650],'memory'],
  ['family-time',28,'ความอบอุ่นที่เราเคยมีให้กัน',[0,0,3444,1630],'memory'],
  ['clover-crowd',29,'ความหวังดีของคนมากมาย',[0,0,3444,1620],'memory'],
  ['impact-arrival',32,'ก่อนประตูฮอลจะเปิด',null,'memory'],
  ['banquet',36,'อีกค่ำคืนที่ยังอยู่ในใจ',null,'memory'],
  ['on-the-road',40,'ออกไปเห็นโลกใบเดิมในมุมใหม่',null,'memory'],
  ['cooking-together',42,'ความสุขระหว่างทาง',null,'memory'],
  ['congratulations',44,'ยินดีกับทุกก้าวของเพื่อน',[0,250,3400,1520],'memory'],
  ['many-smiles',46,'ได้เจอรอยยิ้มอีกมากมาย',[0,0,3444,1570],'memory'],
  ['purple-reunion',47,'ความทรงจำที่มีสีสัน',[0,150,3310,1670],'memory'],
  ['giving-back',48,'ส่งต่อสิ่งดี ๆ ให้คนรอบตัว',null,'memory'],
  ['listening-together',50,'ความคิดดี ๆ ที่เราเคยรับฟัง',null,'memory'],
  ['candlelight',52,'บางช่วงเวลาไม่ต้องมีคำพูด',null,'memory'],
  ['dinner-friends',53,'เรื่องเล่ารอบโต๊ะอาหาร',null,'memory'],
  ['pool-memories',54,'เสียงหัวเราะที่ยังจำได้',null,'memory'],
  ['steps-together',56,'ทุกก้าวเคยมีคนเดินไปด้วยกัน',[0,610,3444,1150],'memory'],
  ['one-more-photo',58,'ถ่ายรูปด้วยกันอีกสักครั้ง',[0,0,3300,1770],'memory'],
];
(async()=>{
  const manifest=[];
  for (const [id,number,caption,crop,role='chapter'] of selections) {
    let pipeline=sharp(path.join(root,sources[number-1]));
    if(crop) pipeline=pipeline.extract({left:crop[0],top:crop[1],width:crop[2],height:crop[3]});
    pipeline=pipeline.resize({width:role==='memory'?960:1440,withoutEnlargement:true}).modulate({saturation:0.9,brightness:1.025});
    if(role==='chapter')pipeline=pipeline.sharpen({sigma:0.65,m1:0.4,m2:1.2});
    await pipeline.webp({quality:role==='memory'?74:81}).toFile(path.join(output,`${id}.webp`));
    const meta=await sharp(path.join(output,`${id}.webp`)).metadata();
    manifest.push({id,src:`./assets/photos/${id}.webp`,caption,width:meta.width,height:meta.height,source:sources[number-1],crop,role});
  }
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Prepared ${manifest.length} archival photographs. Original faces preserved; subtitles and excluded signage omitted by crop.`);
})();
