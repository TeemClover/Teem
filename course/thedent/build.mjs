// Rebuild public teaching downloads after editing the course or resource files.
// Run: node course/thedent/build.mjs (Node.js + Python 3; no third-party packages).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { COURSE_CONTENT_FILES } from '../../api/course-content.js';
const root=path.dirname(fileURLToPath(import.meta.url));
// Keep the course download identical to its canonical source shelf revision.
fs.copyFileSync(path.join(root,'../../shelf/source/thedent/public-company.md'),path.join(root,'resources/clinic-public-source.md'));
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'course-content.js'),'utf8'),context);
const d=context.window.DENT_COURSE;
const write=(name,text)=>fs.writeFileSync(path.join(root,'resources',name),text+'\n');
write('prompt-library.md',`# The Dent · พรอมป์พร้อมใช้ ${d.prompts.length} ใบ\n\nแนบไฟล์ที่ระบุ แล้วคัดลอกคำสั่งไปวางใน Claude Cowork หรือ ChatGPT ได้เลย\n\n`+d.prompts.map((p,i)=>`## ${i+1}. ${p.title}\n\n**ใช้เมื่อ:** ${p.when}\n\n**แนบไฟล์:** ${p.input}\n\n**จะได้:** ${p.output}\n\n\`\`\`text\n${p.text}\n\`\`\``).join('\n\n'));
write('slide-notes.md','# The Dent · สไลด์และโน้ตผู้สอน\n\n12 กันยายน 2026 · 14:00–17:00\n\n14:00–14:10 รู้จักเครื่องมือ: /course/thedent/tools.html\n14:10–14:35 AI ใส่ซอส: /course/thedent/opening.html#slide/1\nอ่านโน้ตประกอบ PDF ใน opening-notes.md\n\nเริ่มสไลด์ Workshop ตอน 14:35: /course/thedent/#present/5\nสไลด์ HTML หน้า 1–4 ด้านล่างเป็นเนื้อหาอ้างอิง ไม่ต้องบรรยายซ้ำหลังชุดเปิดคลาส\n\n'+d.slides.map(s=>`## ${s.id}. ${s.title.replaceAll('\n',' ')}\n\n${s.kicker} · ${s.chapter}\n\n${s.lead}\n\n${s.points.map(p=>'- '+p).join('\n')}\n\n**โน้ตผู้สอน**\n\n${s.note}\n\n**เปิดบทลงมือ:** /course/thedent/#learn/${s.activityId}`).join('\n\n---\n\n'));
const resources=Object.fromEntries(COURSE_CONTENT_FILES.filter(f=>f.startsWith('resources/')&&f.endsWith('.md')).sort().map(f=>[path.basename(f),fs.readFileSync(path.join(root,f),'utf8')]));
fs.writeFileSync(path.join(root,'course-resources.js'),'/* Embedded public training files for offline reading. */\nwindow.DENT_RESOURCES = '+JSON.stringify(resources,null,2)+';\n');
fs.mkdirSync(path.join(root,'downloads'),{recursive:true});
execFileSync('python3',['-c',`import pathlib,sys,zipfile
import json
root=pathlib.Path(sys.argv[1])
files=json.loads(sys.argv[2])+['START-HERE.md']
with zipfile.ZipFile(root/'downloads/the-dent-course-kit.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  info=zipfile.ZipInfo('the-dent-course/'+file,date_time=(2026,9,11,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o644<<16
  archive.writestr(info,(root/file).read_bytes())
print('Packaged',len(files),'files')`,root,JSON.stringify(COURSE_CONTENT_FILES.filter(f=>f!=='advance.html'&&!f.startsWith('downloads/')))],{stdio:'inherit'});
const kitBytes=fs.statSync(path.join(root,'downloads/the-dent-course-kit.zip')).size;
if(kitBytes>3_200_000)throw new Error('Course kit exceeds the safe download size: '+kitBytes);
console.log('Offline kit bytes:',kitBytes);
console.log(`${d.slides.length} slides; ${d.prompts.length} prompts; ${Object.keys(resources).length} resources; ${d.agenda.reduce((n,a)=>n+a.minutes,0)} minutes`);
