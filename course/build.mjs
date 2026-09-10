// Rebuild public teaching downloads after editing the course or resource files.
// Run: node course/build.mjs (Node.js + Python 3; no third-party packages).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'course-content.js'),'utf8'),context);
const d=context.window.DENT_COURSE;
const write=(name,text)=>fs.writeFileSync(path.join(root,'resources',name),text+'\n');
write('prompt-library.md','# The Dent · พรอมป์พร้อมใช้ทั้ง 8 ใบ\n\nแก้ข้อความใน [วงเล็บ] แล้วแนบเฉพาะไฟล์ฝึกที่เกี่ยวข้อง ใช้กับ Claude Cowork หรือ ChatGPT โดยให้คนอ่านและตรวจผลก่อนใช้ต่อ\n\n'+d.prompts.map((p,i)=>`## ${i+1}. ${p.title}\n\n**ใช้เมื่อ:** ${p.when}\n\n**ข้อมูลเข้า:** ${p.input}\n\n**ผลลัพธ์:** ${p.output}\n\n\`\`\`text\n${p.text}\n\`\`\``).join('\n\n'));
write('slide-notes.md','# The Dent · สไลด์และโน้ตผู้สอน\n\n12 กันยายน 2026 · 14:00–17:00 · โหมดสไลด์อยู่ที่ /course/#present/1\n\n'+d.slides.map(s=>`## ${s.id}. ${s.title.replaceAll('\n',' ')}\n\n${s.kicker} · ${s.chapter}\n\n${s.lead}\n\n${s.points.map(p=>'- '+p).join('\n')}\n\n**โน้ตผู้สอน**\n\n${s.note}\n\n**เปิดบทลงมือ:** /course/#learn/${s.activityId}`).join('\n\n---\n\n'));
const resources=Object.fromEntries(fs.readdirSync(path.join(root,'resources')).filter(f=>/\.(md|csv)$/.test(f)).sort().map(f=>[f,fs.readFileSync(path.join(root,'resources',f),'utf8')]));
fs.writeFileSync(path.join(root,'course-resources.js'),'/* Embedded public training files for offline reading. */\nwindow.DENT_RESOURCES = '+JSON.stringify(resources,null,2)+';\n');
fs.mkdirSync(path.join(root,'downloads'),{recursive:true});
execFileSync('python3',['-c',`import pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1])
files=['index.html','course.css','course.js','course-content.js','course-resources.js','daily-brief.html','START-HERE.md']
files += [str(p.relative_to(root)) for folder in ['fonts','resources'] for p in sorted((root/folder).rglob('*')) if p.is_file()]
with zipfile.ZipFile(root/'downloads/the-dent-course-kit.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  info=zipfile.ZipInfo('the-dent-course/'+file,date_time=(2026,9,11,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o644<<16
  archive.writestr(info,(root/file).read_bytes())
print('Packaged',len(files),'files')`,root],{stdio:'inherit'});
console.log(`${d.slides.length} slides; ${d.prompts.length} prompts; ${Object.keys(resources).length} resources; ${d.agenda.reduce((n,a)=>n+a.minutes,0)} minutes`);
