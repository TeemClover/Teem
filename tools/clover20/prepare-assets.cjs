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
];
(async()=>{
  const manifest=[];
  for (const [id,number,caption,crop] of selections) {
    let pipeline=sharp(path.join(root,sources[number-1]));
    if(crop) pipeline=pipeline.extract({left:crop[0],top:crop[1],width:crop[2],height:crop[3]});
    await pipeline.resize({width:1440,withoutEnlargement:true}).modulate({saturation:0.9,brightness:1.025}).sharpen({sigma:0.65,m1:0.4,m2:1.2}).webp({quality:81}).toFile(path.join(output,`${id}.webp`));
    const meta=await sharp(path.join(output,`${id}.webp`)).metadata();
    manifest.push({id,src:`./assets/photos/${id}.webp`,caption,width:meta.width,height:meta.height,source:sources[number-1],crop});
  }
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Prepared ${manifest.length} archival photographs. Original faces preserved; subtitles and excluded signage omitted by crop.`);
})();
