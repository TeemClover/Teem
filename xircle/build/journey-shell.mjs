/** Shared, static wayfinding. Run with --check in CI; no client rendering required. */
import {readFile, writeFile, readdir} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const check = process.argv.includes('--check');
const escape = text => text.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const links = [['/xircle/','รู้จัก XIRCLE'],['/xircle/learn/','ห้องความรู้แมวขาว'],['/xircle/hardware/','อุปกรณ์'],['/xircle/products/','ผลิตภัณฑ์'],['/xircle/doc/','ข้อมูลเชิงลึก']];
async function htmlFiles(dir) {
  const entries = await readdir(new URL(dir, root), {withFileTypes:true});
  return (await Promise.all(entries.map(e => e.isDirectory() && !['assets','_shared'].includes(e.name) ? htmlFiles(dir+e.name+'/') : e.name.endsWith('.html') ? [dir+e.name] : []))).flat();
}
const files = ['index.html', ...(await Promise.all(['learn/','hardware/','products/','doc/'].map(htmlFiles))).flat()];
let stale = 0;
for (const file of files) {
  const url = new URL(file, root), before = await readFile(url, 'utf8');
  let html = before;
  const route = '/xircle/'+file.replace(/index\.html$/,'');
  const current = route === '/xircle/' ? links[0] : links.slice(1).find(([href]) => route.startsWith(href));
  const nav = links.map(([href,label]) => `<a href="${href}"${href===current?.[0]?' aria-current="page"':''}>${label}</a>`).join('');
  const booking = '<a class="journey-book" href="https://buy.xircle.health/login?ref=O5F3LN" target="_blank" rel="noopener">เปิด Xircle <span aria-hidden="true">↗</span></a>';
  const shell = `<!-- xircle-shell:start -->
<a class="journey-skip" href="#journey-content">ข้ามไปเนื้อหา</a>
<header class="journey-header"><div class="journey-header-inner"><a class="journey-brand" href="/xircle/" aria-label="XIRCLE หน้าเริ่มต้น"><i aria-hidden="true"></i>XIRCLE<span>BY CLOVER X</span></a><nav class="journey-desktop-nav" aria-label="เมนู XIRCLE">${nav}</nav>${booking}<details class="journey-menu"><summary>เมนู <span aria-hidden="true">＋</span></summary><nav aria-label="เมนู XIRCLE บนมือถือ">${nav}${booking}<a class="journey-home" href="/">กลับบ้าน myClover ↗</a></nav></details></div></header>
<!-- xircle-shell:end -->`;
  const footer = `<!-- xircle-footer:start -->
<footer class="journey-footer"><div><a class="journey-brand" href="/xircle/"><i aria-hidden="true"></i>XIRCLE</a><p>ชีวิตจริง มีมากกว่าตัวเลข</p></div><nav aria-label="ไปต่อจาก XIRCLE"><a href="/xircle/learn/">ห้องความรู้แมวขาว</a><a href="https://buy.xircle.health/login?ref=O5F3LN" target="_blank" rel="noopener">เปิดระบบ Xircle ↗</a><a href="/">กลับบ้าน myClover ↗</a></nav><p class="journey-fine">ข้อมูลเพื่อการเรียนรู้และติดตามพฤติกรรม ไม่ใช่การวินิจฉัยโรค<br><a href="/xircle/doc/source/">ที่มาและสถานะข้อมูล</a> · <a href="/privacy/">ความเป็นส่วนตัว</a></p></footer>
<!-- xircle-footer:end -->`;
  if (html.includes('<!-- xircle-shell:start -->')) html=html.replace(/<!-- xircle-shell:start -->[\s\S]*?<!-- xircle-shell:end -->/,shell);
  else {
    // The deep documents retain their section links as a local table of contents.
    html=html.replace(/<header class="xp-top">[\s\S]*?<\/header>/,'');
    html=html.replace(/<nav class="nav">([\s\S]*?)<\/nav>/,'<nav class="journey-local-nav" aria-label="หัวข้อในหน้านี้">$1</nav>');
    html=html.replace(/(<body\b[^>]*>)/, '$1\n'+shell);
  }
  if(html.includes('<!-- xircle-footer:start -->')) html=html.replace(/<!-- xircle-footer:start -->[\s\S]*?<!-- xircle-footer:end -->/,footer);
  else html=html.replace('</body>',footer+'\n</body>');
  if(!html.includes('id="journey-content"')) html=html.replace(/<main\b/,'<main id="journey-content" tabindex="-1"');
  if(route!=='/xircle/' && !html.includes('class="journey-breadcrumb"')) {
    const title=(html.match(/<title>([^<]+)/)?.[1] || '').replace(/ — Xircle.*/,'');
    const trail = current && route!==current[0] ? `<a href="${current[0]}">${current[1]}</a><span aria-hidden="true">/</span><span>${escape(title)}</span>` : `<span>${current?.[1]||'ข้อมูลอ้างอิง'}</span>`;
    html=html.replace('<!-- xircle-shell:end -->','<!-- xircle-shell:end -->\n<nav class="journey-breadcrumb" aria-label="ตำแหน่งปัจจุบัน"><a href="/xircle/">XIRCLE</a><span aria-hidden="true">/</span>'+trail+'</nav>');
  }
  if(!html.includes('/xircle/journey.css')) html=html.replace('</head>','<link rel="stylesheet" href="/xircle/journey.css?v=20261109-company">\n<script src="/xircle/journey.js?v=20261109-company" defer></script>\n</head>');
  if(!html.includes('journey-root') && route==='/xircle/') html=html.replace('<body','<body class="journey-root"');
  if(!html.includes('journey-reference') && route!=='/xircle/') html=html.replace(/<body(?: class="([^"]*)")?/,(_,c)=>`<body class="${c?c+' ':''}journey-reference${route.startsWith('/xircle/learn/')?' journey-library':''}${route.includes('/doc/')&&route!=='/xircle/doc/'?' journey-document':''}"`);
  if(html!==before) { if(check){console.error('Stale shell: '+file);stale++;} else await writeFile(url,html); }
}
if(stale) process.exitCode=1;
else console.log(`XIRCLE shared journey ${check?'verified':'built'}: ${files.length} pages`);
