import {stories as concepts} from './catalog.js';
import {creatorProfiles, novels} from './content-library.js';
import {pilotEpisodes} from './media-pilots.js';

function creatorCredit(id) {
  const profile = creatorProfiles.find(creator => creator.id === id);
  if (!profile) return {avatarImage:`./assets/creators/${id}.webp`};
  return {creator:profile.name, studio:profile.studio, city:profile.city,
    creatorKind:profile.kind || 'individual', avatarImage:`./${profile.portrait}`};
}

// Only completed, downloaded clips belong in this list.
export const availablePilots = ['rain', 'village', 'naga'];
export const stories = concepts.map(story => {
  const pilots = availablePilots.includes(story.id) ? pilotEpisodes[story.id] : [];
  const extra = story.id === 'hr' ? {
    episodes: 2, status: '2 ตอนอ่านได้', episodeNames: ['ลางานไปบุกกรุงลงกา', 'ใบเสร็จแห่งกรุงลงกา'],
    comicChapters: [story.comicPages, [
      {image:'comic-v2/hr-expenses-1',title:'ค่าเดินทาง หรือค่ากล้วย?',caption:'หนุมาน: “พี่ครับ ขอเบิกค่าเดินทาง” ทศกัณฐ์: “แล้วมะพร้าวสิบสองลูกนี่เดินทางไปไหน?” หนุมาน: “ของว่างระหว่างเหาะครับ” สิบหัวเปิดใบเสร็จพร้อมกัน และพบว่าค่ากล้วยแพงกว่าค่าส่งทั้งเดือน'},
      {image:'comic-v2/hr-expenses-2',title:'หนึ่งแก้ว สิบหลอด',caption:'หนุมานยื่นกาแฟหนึ่งแก้วให้สิบหัว “ประหยัดงบครับพี่” ทศกัณฐ์ถอนใจ “นี่ HR ไม่ใช่หารสิบ” สุดท้ายทั้งคู่ลงไปซื้อกาแฟหน้าตึก แล้วตกลงกันว่าเรื่องยาก ๆ คุยกันทีละหัวก็ได้'}
    ]], aiUsage:'ภาพการ์ตูนสร้างด้วย AI · บทสนทนาไทยเขียนใหม่สำหรับเดโม', sampleLength:'2 ตอน · 5 หน้าการ์ตูน'
  } : {};
  return {...story, ...extra, ...creatorCredit(story.id), poster:`./assets/${story.id}.webp`, creatorId:story.id, pilots,
    ...(pilots?.length ? {episodes:pilots.length, episodeNames:pilots.map(p=>p.title), status:'คลิปนำร่อง', badge:'เล่นวิดีโอจริง', aiUsage:`ภาพและคลิปสร้างด้วย ${[...new Set(pilots.map(p=>p.provider))].join(' / ')} · บทไทยต้นฉบับ`, sampleLength:`${pilots.length} คลิปนำร่อง`, heroImage:`./assets/clips/${story.id}-1.webp`} : {})};
});
for (const novel of novels) {
  const creator = concepts.find(s=>s.id===novel.creatorId);
  stories.push({...creator, ...novel, ...creatorCredit(novel.creatorId), poster:`./${novel.cover}`, episodes:novel.chapters.length, episodeNames:novel.chapters.map(c=>c.title), badge:'อ่านจบใน 3 บท', position:'center', sampleLength:'เรื่องสั้นต้นฉบับ · 3 บท', pilots:[]});
}
