(()=>{
  'use strict';
  const script=document.currentScript||[...document.scripts].find(s=>/\/xircle\/_shared\/story\.js(?:\?|$)/.test(s.src));
  const zoneRoot=script?new URL('../',script.src):new URL('/xircle/',location.origin);
  const dataURL=name=>new URL(`data/${name}.json`,zoneRoot).href;
  const zoneStyle=document.createElement('link');zoneStyle.rel='stylesheet';zoneStyle.href=new URL('_shared/zone.css',zoneRoot).href;document.head.append(zoneStyle);
  const normalizePath=p=>{let x=(p||'/').replace(/\/index\.html$/,'/');if(!x.endsWith('/'))x+='/';return x.replace(/\/{2,}/g,'/');};
  const currentPath=normalizePath(location.pathname);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const progress=document.querySelector('.progress');
  const updateProgress=()=>{if(!progress)return;const d=document.documentElement;const max=d.scrollHeight-innerHeight;progress.style.width=(max>0?(scrollY/max)*100:0)+'%';};
  addEventListener('scroll',updateProgress,{passive:true});updateProgress();

  if('IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target);}}),{threshold:.1,rootMargin:'0px 0px -4%'});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  }else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('on'));

  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href');if(!id||id.length<2)return;const target=document.querySelector(id);if(!target)return;e.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));

  // Blueprint minimum preview mode: visible build banner on the entire subtree.
  const zonebar=document.createElement('div');
  zonebar.className='zonebar';
  zonebar.innerHTML=`<div class="zonebar__inner"><span class="zonebar__pulse" aria-hidden="true"></span><strong>XIRCLE BUILD ZONE</strong><span class="zonebar__copy">Guild Member Preview · Under Construction</span><a href="${new URL('source/',zoneRoot).href}">Source Status</a></div>`;
  document.body.prepend(zonebar);

  const launcher=document.createElement('button');
  launcher.type='button';launcher.className='zone-launcher';launcher.setAttribute('aria-label','Open Xircle Zone navigation');launcher.setAttribute('aria-expanded','false');
  launcher.innerHTML='<span class="zone-launcher__ring"></span><span>ZONE</span>';
  document.body.append(launcher);

  const backdrop=document.createElement('div');backdrop.className='zone-backdrop';backdrop.hidden=true;document.body.append(backdrop);
  const drawer=document.createElement('aside');drawer.className='zone-drawer';drawer.setAttribute('aria-hidden','true');
  drawer.innerHTML=`<div class="zone-drawer__head"><div><div class="zone-drawer__eyebrow">MYCLOVER · GUILD X</div><strong>Xircle Build Zone</strong></div><button type="button" class="zone-close" aria-label="Close navigation">×</button></div><div class="zone-current" id="zone-current">Loading source status…</div><label class="zone-search"><span>⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="Search Xircle Zone…" aria-label="Search Xircle Zone"></label><nav class="zone-tree" aria-label="Xircle local navigation"></nav><div class="zone-drawer__foot"><a href="${zoneRoot.href}">Zone Home</a><a href="${new URL('source/',zoneRoot).href}">Source Control</a><a href="/">Exit to myClover</a></div>`;
  document.body.append(drawer);

  const openDrawer=()=>{drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;requestAnimationFrame(()=>backdrop.classList.add('show'));launcher.setAttribute('aria-expanded','true');document.documentElement.classList.add('zone-nav-open');setTimeout(()=>drawer.querySelector('input')?.focus(),120);};
  const closeDrawer=()=>{drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.classList.remove('show');launcher.setAttribute('aria-expanded','false');document.documentElement.classList.remove('zone-nav-open');setTimeout(()=>{backdrop.hidden=true;},220);};
  launcher.addEventListener('click',()=>drawer.classList.contains('open')?closeDrawer():openDrawer());
  backdrop.addEventListener('click',closeDrawer);drawer.querySelector('.zone-close').addEventListener('click',closeDrawer);
  addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();openDrawer();}});

  const fallbackStatus={labels:{canon:{label:'CANON',symbol:'●'},internal:{label:'INTERNAL',symbol:'◆'},building:{label:'BUILDING',symbol:'◌'},provisional:{label:'PROVISIONAL',symbol:'△'},conflict:{label:'CONFLICT',symbol:'!'},need_source:{label:'NEED SOURCE',symbol:'?'},deprecated:{label:'DEPRECATED',symbol:'×'}}};
  const fetchJSON=async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();};

  Promise.allSettled([fetchJSON(dataURL('routes')),fetchJSON(dataURL('status')),fetchJSON(dataURL('sources'))]).then(results=>{
    const routes=results[0].status==='fulfilled'?results[0].value:[];
    const statuses=results[1].status==='fulfilled'?results[1].value:fallbackStatus;
    const sourceData=results[2].status==='fulfilled'?results[2].value:{sources:[],last_reviewed:'2026-08-11'};
    const current=routes.find(r=>normalizePath(r.path)===currentPath)||routes.find(r=>currentPath.startsWith(normalizePath(r.path))&&r.path!='/xircle/')||routes.find(r=>r.id==='home');
    const statusKey=current?.status||'building';const meta=statuses.labels?.[statusKey]||fallbackStatus.labels.building;
    document.documentElement.dataset.zoneStatus=statusKey;
    if(current?.id) document.documentElement.dataset.zoneRoute=current.id;

    const currentEl=drawer.querySelector('#zone-current');
    currentEl.innerHTML=`<span class="status-pill status-${esc(statusKey)}">${esc(meta.symbol||'')} ${esc(meta.label||statusKey)}</span><span>${esc(current?.label||document.title)}</span>`;

    const tree=drawer.querySelector('.zone-tree');
    const groups=[...new Set(routes.map(r=>r.group))];
    tree.innerHTML=groups.map(group=>{
      const items=routes.filter(r=>r.group===group);
      return `<section class="zone-group"><button type="button" class="zone-group__toggle" aria-expanded="true"><span>${esc(group)}</span><span>−</span></button><div class="zone-group__links">${items.map(r=>`<a href="${esc(new URL(r.path,location.origin).href)}" data-zone-search="${esc((r.label+' '+r.id+' '+r.group).toLowerCase())}" class="${normalizePath(r.path)===currentPath?'current':''}"><span>${esc(r.label)}</span>${r.visibility==='internal'?'<small>INTERNAL</small>':''}</a>`).join('')}</div></section>`;
    }).join('');
    tree.querySelectorAll('.zone-group__toggle').forEach(b=>b.addEventListener('click',()=>{const group=b.closest('.zone-group');const collapsed=group.classList.toggle('collapsed');b.setAttribute('aria-expanded',String(!collapsed));b.lastElementChild.textContent=collapsed?'+':'−';}));

    const input=drawer.querySelector('.zone-search input');
    input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();tree.querySelectorAll('a[data-zone-search]').forEach(a=>{a.hidden=!!q&&!a.dataset.zoneSearch.includes(q);});tree.querySelectorAll('.zone-group').forEach(g=>{g.hidden=!!q&&![...g.querySelectorAll('a[data-zone-search]')].some(a=>!a.hidden);});});

    injectStatusRail(current,statusKey,meta);
    injectSourceFooter(current,statusKey,meta,sourceData);
  }).catch(()=>{injectStatusRail(null,'building',fallbackStatus.labels.building);injectSourceFooter(null,'building',fallbackStatus.labels.building,{sources:[],last_reviewed:'2026-08-11'});});

  function injectStatusRail(current,key,meta){
    const main=document.querySelector('main')||document.body;
    const rail=document.createElement('div');rail.className='zone-status-rail';
    rail.innerHTML=`<div class="zone-status-rail__inner"><span class="status-pill status-${esc(key)}">${esc(meta.symbol||'')} ${esc(meta.label||key)}</span><span class="zone-status-rail__path">${esc(current?.group||'XIRCLE')} / ${esc(current?.label||document.title.replace(/\s+[—|-].*$/,''))}</span>${current?.visibility==='internal'?'<span class="zone-sensitive">Internal-sensitive</span>':''}<button type="button" class="zone-open-source">SOURCE ↗</button></div>`;
    const first=main.firstElementChild;main.insertBefore(rail,first||null);rail.querySelector('.zone-open-source').addEventListener('click',openDrawer);
  }

  function injectSourceFooter(current,key,meta,sourceData){
    if(document.querySelector('.zone-source-footer'))return;
    const map=new Map((sourceData.sources||[]).map(s=>[s.id,s]));const ids=current?.source||[];
    const footer=document.createElement('footer');footer.className='zone-source-footer';
    const sourceRows=ids.length?ids.map(id=>{const s=map.get(id);return `<li><b>${esc(id)}</b><div><strong>${esc(s?.label||id)}</strong><span>${esc(s?.scope||'Core source')}</span>${s?.note?`<em>${esc(s.note)}</em>`:''}</div></li>`;}).join(''):'<li><b>—</b><div><strong>Source mapping pending</strong><span>Check Source Control before reuse.</span></div></li>';
    footer.innerHTML=`<div class="wrap"><details><summary><span><small>SOURCE / STATUS</small><strong>${esc(meta.symbol||'')} ${esc(meta.label||key)} · reviewed ${esc(sourceData.last_reviewed||'2026-08-11')}</strong></span><span class="source-chevron">⌄</span></summary><div class="source-panel"><p>This page is part of the self-contained Guild build preview. Source status is context, not a public advertising approval.</p><ul>${sourceRows}</ul><div class="source-actions"><a href="${new URL('source/',zoneRoot).href}">Open Source Control</a><a href="${zoneRoot.href}">Zone Home</a><button type="button" class="copy-source">Copy page ref</button></div></div></details><div class="zone-mini-footer"><span>Xircle Build Zone · Guild Member Preview</span><span>Source v1.0 · Updated 11 Aug 2026</span></div></div>`;
    document.body.append(footer);
    footer.querySelector('.copy-source')?.addEventListener('click',async e=>{const text=`${document.title}\n${location.href}\nSTATUS: ${meta.label||key}\nSOURCE: ${ids.join(', ')||'CHECK SOURCE CONTROL'}`;try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent='Copy page ref',1500);}catch{e.currentTarget.textContent='Copy failed';}});
  }
})();
