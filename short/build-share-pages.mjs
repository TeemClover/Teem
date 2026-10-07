import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stories} from './library.js';

const template=await readFile(new URL('./index.html',import.meta.url),'utf8');
const origin='https://www.myclover.com';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
for(const story of stories){
  const url=`${origin}/short/story/${story.id}/`;
  const image=`${origin}/short/assets/og/${story.id}-${story.shareVersion || 'v2'}.jpg`;
  const title=`${story.title} | ตอนต่อ`;
  const description=`${story.shareDescription || story.description} · ${story.formatLabel} AI ภาษาไทย · เรื่องตัวอย่างที่ตอนต่อ — เรื่องสั้น ความรู้สึกยาว`;
  const tags=[
    `<meta name="description" content="${escape(description)}">`,
    `<title>${escape(title)}</title>`,
    `<link rel="canonical" href="${url}">`,
    ...Object.entries({'og:type':'website','og:site_name':'ตอนต่อ','og:locale':'th_TH','og:title':title,'og:description':description,'og:url':url,'og:image':image,'og:image:secure_url':image,'og:image:type':'image/jpeg','og:image:width':'1200','og:image:height':'630','og:image:alt':`${story.title} — เรื่องตัวอย่างที่ตอนต่อ`}).map(([key,value])=>`<meta property="${key}" content="${escape(value)}">`),
    ...Object.entries({'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image,'twitter:image:alt':`${story.title} — ตอนต่อ`}).map(([key,value])=>`<meta name="${key}" content="${escape(value)}">`)
  ].join('\n  ');
  let html=template.replace(/<!-- SHARE_META_START -->[\s\S]*?<!-- SHARE_META_END -->/,`<!-- SHARE_META_START -->\n  ${tags}\n  <!-- SHARE_META_END -->`).replace('<body>',`<body data-story="${story.id}">`);
  // Useful story text also reaches visitors whose browser cannot execute JavaScript.
  html=html.replace('<noscript><div class="noscript">',`<noscript><div class="noscript"><strong>${escape(story.title)}</strong> — ${escape(story.description)}<br>`);
  const directory=new URL(`./story/${story.id}/`,import.meta.url);
  await mkdir(directory,{recursive:true});await writeFile(new URL('index.html',directory),html);
}
console.log(`Generated ${stories.length} crawlable story pages with server-readable social metadata.`);
