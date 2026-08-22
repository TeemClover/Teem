(() => {
  if (!/^\/command\/?(?:index\.html)?$/.test(location.pathname)) return;
  const API = '/api/telemetry-stats';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const n = value => new Intl.NumberFormat('th-TH').format(Number(value || 0));
  const mins = seconds => Number(seconds || 0) < 60 ? `${n(seconds)} วิ` : `${(Number(seconds || 0) / 60).toFixed(1)} นาที`;
  const when = value => { if (!value) return 'ยังไม่มี'; try { return new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value)); } catch { return '—'; } };

  function installStyle() {
    if (document.getElementById('behavior-style')) return;
    const style = document.createElement('style');
    style.id = 'behavior-style';
    style.textContent = `
      .behavior-wrap{display:grid;gap:12px}.behavior-metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}.behavior-card{border:1px solid var(--line);background:#0b1712;border-radius:15px;padding:14px}.behavior-card span{display:block;color:#8fa59a;font-size:11px;font-weight:900}.behavior-card strong{display:block;font-size:27px;margin:8px 0 4px}.behavior-card small{color:#82968d;font-size:12px}.behavior-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.behavior-table{width:100%;border-collapse:collapse;font-size:12px}.behavior-table th{text-align:left;color:#82968d;font-size:10px;letter-spacing:.05em;padding:8px;border-bottom:1px solid var(--line)}.behavior-table td{padding:9px 8px;border-bottom:1px solid #21352c;color:#bdcbc4;vertical-align:top}.behavior-table tr:last-child td{border-bottom:0}.behavior-table b{color:#f2efe5}.behavior-table .num{text-align:right;font-variant-numeric:tabular-nums}.behavior-scroll{overflow:auto;max-height:420px}.behavior-attention{display:grid;gap:8px}.behavior-alert{border:1px solid #315042;background:#0a1611;border-radius:12px;padding:12px}.behavior-alert.warn{border-color:#6b5830;background:#17140c}.behavior-alert.ok{border-color:#315c42}.behavior-alert b{display:block;font-size:14px}.behavior-alert p{margin:5px 0 0;color:#9fb0a8;font-size:12px;line-height:1.55}.behavior-line{width:100%;height:190px;display:block;margin-top:10px}.behavior-line .grid{stroke:#22372e;stroke-width:1}.behavior-line .views{fill:none;stroke:var(--green);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.behavior-line .commits{fill:none;stroke:var(--gold);stroke-width:2.5}.behavior-line .blue{fill:none;stroke:#89b7f4;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.behavior-line .whitecat{fill:none;stroke:#f3f0e8;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.behavior-line text{fill:#70877b;font-size:10px}.behavior-note{color:#859a90;font-size:12px;line-height:1.55;margin-top:10px}.returning{color:#9bd5ae;font-weight:850}.anon{color:#83988d;font-size:10px}.special-op{border:1px solid #6d6345;background:radial-gradient(circle at 90% 0,rgba(236,220,170,.1),transparent 32%),linear-gradient(145deg,#131812,#0b1310);border-radius:20px;padding:18px;box-shadow:0 22px 60px rgba(0,0,0,.18)}.special-op-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.special-op-head h3{font-size:24px;margin:4px 0 5px}.special-op-head p{margin:0;color:#9fb0a8;font-size:13px;line-height:1.55}.special-badge{border:1px solid #75673c;border-radius:999px;padding:7px 10px;color:#ead18c;font-size:10px;font-weight:950;letter-spacing:.08em;white-space:nowrap}.special-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:14px}.special-metric{border:1px solid #35453a;background:#0b1511;border-radius:13px;padding:12px}.special-metric span{display:block;color:#879b90;font-size:10px;font-weight:900}.special-metric strong{display:block;font-size:25px;margin:7px 0 3px}.special-metric small{font-size:11px;color:#778b81}.growth-vs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.cohort-card{border:1px solid var(--line);border-radius:14px;background:#0b1712;padding:14px}.cohort-card.xircle{border-color:#35664a}.cohort-card.normal{border-color:#45505c}.cohort-card h4{font-size:19px;margin:0 0 9px}.cohort-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.cohort-stats div{border-top:1px solid #263a30;padding-top:8px}.cohort-stats span{display:block;color:#82968d;font-size:9px;font-weight:900}.cohort-stats b{display:block;font-size:19px;margin-top:4px}.growth-winner{margin-top:10px;border:1px solid #5e5130;background:#17150d;border-radius:12px;padding:12px}.growth-winner b{color:#ead18c;font-size:15px}.growth-winner p{margin:4px 0 0;color:#a99e7e;font-size:12px;line-height:1.55}.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;color:#82968d;font-size:11px}.legend i{display:inline-block;width:18px;height:3px;border-radius:2px;margin-right:5px;vertical-align:middle;background:var(--green)}.legend .gold{background:var(--gold)}.legend .blue{background:#89b7f4}.legend .white{background:#f3f0e8}@media(max-width:900px){.behavior-metrics{grid-template-columns:repeat(3,1fr)}.behavior-grid,.growth-vs{grid-template-columns:1fr}.special-metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.behavior-metrics{grid-template-columns:1fr 1fr}.behavior-card strong{font-size:24px}.behavior-table{font-size:11px}.special-op{padding:14px}.special-op-head{display:block}.special-badge{display:inline-block;margin-top:10px}.special-metrics{grid-template-columns:1fr 1fr}.cohort-stats{grid-template-columns:1fr 1fr}}
    `;
    document.head.append(style);
  }

  function section() {
    let node = document.getElementById('behavior-observatory');
    if (node) return node;
    node = document.createElement('section');
    node.className = 'section';
    node.id = 'behavior-observatory';
    node.innerHTML = `<div class="head"><div><p class="eyebrow">BEHAVIOR OBSERVATORY</p><h2>คนเข้ามาแล้วทำอะไรจริง</h2></div><p id="behaviorUpdated">เริ่มเก็บ baseline ตั้งแต่วันนี้</p></div><div class="behavior-wrap"><div class="behavior-metrics" id="behaviorMetrics"><div class="behavior-card"><span>ARMED</span><strong>…</strong><small>กำลังอ่าน telemetry</small></div></div><div class="behavior-grid"><article class="panel"><div class="chart-head"><div><p class="eyebrow">7 DAY FLOW</p><h3>คนเข้า · เปิดหน้า · ลงชื่อ</h3></div><span class="chip ok">LIVE</span></div><svg class="behavior-line" id="behaviorChart" viewBox="0 0 900 190" preserveAspectRatio="none"></svg><p class="behavior-note" id="behaviorLast">ยังไม่มี signal</p></article><aside class="panel"><p class="eyebrow">BEHAVIOR ATTENTION</p><h3>สิ่งที่ควรเรียนรู้จากคนใช้</h3><div class="behavior-attention" id="behaviorAttention"></div></aside></div><div class="behavior-grid"><article class="panel"><p class="eyebrow">PAGE READING</p><h3>หน้าไหนถูกเปิดและอ่านจริง</h3><div class="behavior-scroll" id="behaviorPages"></div></article><article class="panel"><p class="eyebrow">PEOPLE / ACTORS</p><h3>ใครกลับมา · ส่งข้อความ · ลงชื่อ</h3><div class="behavior-scroll" id="behaviorActors"></div></article></div></div>`;
    const infrastructure = [...document.querySelectorAll('.section')].find(s => s.querySelector('h2')?.textContent?.includes('บริการที่ TeamBook พึ่ง'));
    if (infrastructure?.parentNode) infrastructure.parentNode.insertBefore(node, infrastructure);
    else document.querySelector('main')?.append(node);
    return node;
  }

  function growthSection() {
    let node = document.getElementById('growth-observatory');
    if (node) return node;
    node = document.createElement('section');
    node.className = 'section';
    node.id = 'growth-observatory';
    node.innerHTML = `<div class="head"><div><p class="eyebrow">SPECIAL GROWTH WATCH</p><h2>สมุดแมวขาว · Xircle vs Normal</h2></div><p>วัดการขยายจริง ไม่ใช้ยอดรวมหลอกตา</p></div><div class="special-op"><div class="special-op-head"><div><p class="eyebrow">WHITE CAT × CLOVER X</p><h3>สมุดแมวขาวกำลังพาคนเข้ามาแค่ไหน</h3><p>นับคนที่เปิด invite และคนที่เปิดสมุดจริงแบบรายวัน · invite code ถูก resolve เป็น book id แล้วทิ้ง ไม่เก็บรหัสเชิญใน analytics</p></div><span class="special-badge">LIVE COHORT</span></div><div class="special-metrics" id="whiteCatMetrics"></div><svg class="behavior-line" id="whiteCatChart" viewBox="0 0 900 190" preserveAspectRatio="none"></svg><div class="legend"><span><i class="white"></i>คนเปิดสมุดแมวขาว</span><span><i class="gold"></i>คนเปิดลิงก์เชิญแมวขาว</span></div></div><div class="special-op" style="margin-top:12px"><div class="special-op-head"><div><p class="eyebrow">EXPANSION TEST</p><h3>Xircle โตเร็วกว่าสมุดปกติไหม</h3><p>นิยาม Xircle = preset xircle / xircle_xvisor · สมาชิกใหม่ไม่นับเจ้าของสมุด เพื่อวัดการชวนคนเพิ่มจริง</p></div><span class="special-badge">7 DAY RACE</span></div><div class="growth-vs" id="growthVs"></div><div class="growth-winner" id="growthWinner"></div><svg class="behavior-line" id="growthChart" viewBox="0 0 900 190" preserveAspectRatio="none"></svg><div class="legend"><span><i></i>สมาชิกใหม่ Xircle</span><span><i class="blue"></i>สมาชิกใหม่ Normal</span></div></div>`;
    const behavior = section();
    behavior.parentNode?.insertBefore(node, behavior.nextSibling);
    return node;
  }

  function points(values, width=900, height=190, pad=25, maxValue=null) {
    const max = maxValue || Math.max(1, ...values.map(Number));
    return values.map((value,index) => {
      const x = pad + index * (width-pad*2) / Math.max(1, values.length-1);
      const y = height-pad - Number(value||0)/max*(height-pad*2);
      return `${x},${y}`;
    }).join(' ');
  }

  function dualChart(targetId, labels, primary, secondary, primaryClass='views', secondaryClass='commits') {
    const max=Math.max(1,...primary,...secondary), width=900,height=190,pad=25;
    const grid=[.25,.5,.75,1].map(r=>{const y=height-pad-r*(height-pad*2);return `<line class="grid" x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}"/>`}).join('');
    const axes=labels.map((label,i)=>{const x=pad+i*(width-pad*2)/Math.max(1,labels.length-1);return `<text x="${x}" y="184" text-anchor="middle">${esc(String(label).slice(5))}</text>`}).join('');
    const target=document.getElementById(targetId);
    if(target) target.innerHTML=`${grid}<polyline class="${primaryClass}" points="${points(primary,width,height,pad,max)}"/><polyline class="${secondaryClass}" points="${points(secondary,width,height,pad,max)}"/>${axes}`;
  }

  function renderChart(data) {
    const labels=data.daily?.labels||[], views=data.daily?.pageViews||[], commits=data.daily?.commits||[];
    dualChart('behaviorChart', labels, views, commits, 'views', 'commits');
  }

  function actorRows(data) {
    const identified=(data.actors||[]).map(a=>`<tr><td><b>${esc(a.alias||a.actorId)}</b>${a.returning?'<br><span class="returning">↩ กลับมาซ้ำ</span>':''}<br><small>${when(a.lastSeenAt)}</small></td><td class="num">${n(a.sessions)}</td><td class="num">${n(a.pageViews)}</td><td class="num">${n(a.messages)}</td><td class="num">${n(a.commits)}</td></tr>`);
    const anonymous=(data.anonymousVisitors||[]).map(a=>`<tr><td><b>Visitor · ${esc(String(a.visitorId||'').slice(-8))}</b>${a.returning?'<br><span class="returning">↩ กลับมาซ้ำ</span>':''}<br><span class="anon">anonymous · ${esc(a.lastPath||'')}</span><br><small>${when(a.lastSeenAt)}</small></td><td class="num">${n(a.sessions)}</td><td class="num">${n(a.pageViews)}</td><td class="num">—</td><td class="num">—</td></tr>`);
    return [...identified,...anonymous];
  }

  function cohortCard(name, css, value) {
    return `<article class="cohort-card ${css}"><h4>${esc(name)}</h4><div class="cohort-stats"><div><span>BOOKS TOTAL</span><b>${n(value.booksTotal)}</b></div><div><span>NEW BOOKS 7D</span><b>${n(value.newBooks7d)}</b></div><div><span>INVITED MEMBERS 7D</span><b>${n(value.newMembers7d)}</b></div><div><span>INVITE PEOPLE 7D</span><b>${n(value.invitePeople7d)}</b></div></div></article>`;
  }

  function renderGrowth(data) {
    growthSection();
    const growth=data.growth||{}, white=growth.whiteCat||{}, cohorts=growth.cohorts||{}, x=cohorts.xircle||{}, normal=cohorts.normal||{}, daily=data.daily||{};
    document.getElementById('whiteCatMetrics').innerHTML=[
      ['WHITE CAT BOOKS',white.booksTotal,'สมุดที่ใช้แมวขาว'],
      ['NEW BOOKS 7D',white.newBooks7d,'เปิดใหม่ใน 7 วัน'],
      ['BOOK OPEN PEOPLE',white.bookOpenPeople7d,'คนเปิดสมุดแมวขาว / 7d'],
      ['INVITE PEOPLE',white.invitePeople7d,`${n(white.inviteOpens7d)} invite opens / 7d`],
    ].map(([label,value,note])=>`<div class="special-metric"><span>${esc(label)}</span><strong>${n(value)}</strong><small>${esc(note)}</small></div>`).join('');
    dualChart('whiteCatChart', daily.labels||[], daily.whiteCatBookPeople||[], daily.whiteCatInvitePeople||[], 'whitecat', 'commits');
    document.getElementById('growthVs').innerHTML=cohortCard('Xircle', 'xircle', x)+cohortCard('Normal', 'normal', normal);
    const win=growth.winner||{};
    document.getElementById('growthWinner').innerHTML=`<b>${esc(win.label||'ยังเทียบไม่ได้')}</b><p>${esc(win.reason||'รอข้อมูลจริงก่อนสรุป')}</p>`;
    dualChart('growthChart', daily.labels||[], daily.xircleMembers||[], daily.normalMembers||[], 'views', 'blue');
  }

  function render(data) {
    section();
    const s=data.summary||{};
    document.getElementById('behaviorUpdated').textContent=`อัปเดต ${when(data.generatedAt)}`;
    document.getElementById('behaviorMetrics').innerHTML=[
      ['ACTIVE NOW',s.active15m,`${n(s.active24h)} active / 24h`],
      ['VISITORS 7D',s.visitors7d,`${n(s.sessions7d)} sessions`],
      ['RETURNING',`${s.returningRate7d||0}%`,`${n(s.returningVisitors7d)} returning visitors`],
      ['PAGE VIEWS',s.pageViews7d,'จำนวนหน้าที่เปิด'],
      ['ACTIVE / SESSION',mins(s.avgActiveSecondsPerSession),'เวลาที่หน้าอยู่ active'],
      ['COMMITS 7D',s.commits7d,`${n(s.messages7d)} messages · ${n(s.committers7d)} คนลงชื่อ`],
    ].map(([label,value,note])=>`<div class="behavior-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
    renderChart(data);
    renderGrowth(data);
    document.getElementById('behaviorLast').textContent=data.lastSignal?`ล่าสุด ${data.lastSignal.type} · ${data.lastSignal.path} · ${when(data.lastSignal.at)}`:'Telemetry พร้อมแล้ว · ยังไม่มีผู้ใช้จริงส่ง signal';
    document.getElementById('behaviorAttention').innerHTML=(data.attention||[]).map(a=>`<div class="behavior-alert ${esc(a.level||'')}"><b>${esc(a.title)}</b><p>${esc(a.detail)}</p></div>`).join('');
    const pages=data.pages||[];
    document.getElementById('behaviorPages').innerHTML=pages.length?`<table class="behavior-table"><thead><tr><th>PAGE</th><th class="num">VIEWS</th><th class="num">PEOPLE</th><th class="num">ACTIVE</th><th class="num">SCROLL</th></tr></thead><tbody>${pages.map(p=>`<tr><td><b>${esc(p.path)}</b><br><small>${when(p.lastViewAt)}</small></td><td class="num">${n(p.views)}</td><td class="num">${n(p.visitors)}</td><td class="num">${mins(Math.round(p.avgActiveSeconds))}</td><td class="num">${Math.round(p.avgScroll||0)}%</td></tr>`).join('')}</tbody></table>`:'<p class="behavior-note">ยังไม่มี page view · ตารางนี้จะเริ่มเติมทันทีที่มีคนเปิด TeamBook</p>';
    const rows=actorRows(data);
    document.getElementById('behaviorActors').innerHTML=rows.length?`<table class="behavior-table"><thead><tr><th>PERSON</th><th class="num">VISITS</th><th class="num">PAGES</th><th class="num">MSG</th><th class="num">SIGN</th></tr></thead><tbody>${rows.join('')}</tbody></table>`:'<p class="behavior-note">ยังไม่มีคนใช้ · เมื่อมี signal จะเห็นทั้ง anonymous visitor และคนที่ผูกกับ TeamBook profile/account</p>';
  }

  async function load() {
    try {
      const response=await fetch(API,{cache:'no-store',credentials:'same-origin'});
      if (response.status===401) return false;
      const data=await response.json().catch(()=>({}));
      if (!response.ok||!data.ok) throw new Error(data.error||`HTTP_${response.status}`);
      render(data); return true;
    } catch (error) {
      section();
      growthSection();
      document.getElementById('behaviorUpdated').textContent=`Behavior telemetry: ${error.message}`;
      return false;
    }
  }

  installStyle();
  section();
  growthSection();
  let tries=0;
  const timer=setInterval(async()=>{tries+=1;if(await load()||tries>=40){clearInterval(timer);if(tries<40)setInterval(load,60000)}},1500);
  load();
})();
