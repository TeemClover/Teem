import {readFile,writeFile,mkdir,copyFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLuckyArchive} from './build-lucky-source.mjs';
import {ZIP_NAME,VERSION,readZip} from './lucky-source-archive.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildLuckyReceive(){
 const zip=await buildLuckyArchive(),entries=readZip(zip),prompt=entries.get('01-START-PROMPT.txt').toString('utf8').trimEnd();
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const values={ZIP_NAME,VERSION,SIZE:String(Math.round(zip.length/1024)),PROMPT:prompt};
 const template=await readFile(path.join(root,'app/receive/index.html'),'utf8');
 const html=template.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in values))throw Error('Unknown receive token '+key);return escape(values[key]);});
 const out=path.join(root,'receive');await mkdir(out,{recursive:true});
 for(const name of await readdir(out))if(/^lucky-source-house-v[\d.]+\.zip$/.test(name)&&name!==ZIP_NAME)await unlink(path.join(out,name));
 await writeFile(path.join(out,ZIP_NAME),zip);await writeFile(path.join(out,'index.html'),html);
 for(const file of ['receive.css','receive.js'])await copyFile(path.join(root,'app/receive',file),path.join(out,file));
 console.log('Built inbox handoff page /showcase/house/receive/');
}
