(function(){
  document.body.classList.add("js");

  var currentLang="th";
  try{currentLang=localStorage.getItem("mc_lang")||"th"}catch(e){}
  if(currentLang!=="en")currentLang="th";

  var COPY=window.HALL_COPY;

  function c(key){return COPY[currentLang][key]||COPY.th[key]||key}
  function fmt(key,vars){
    var value=c(key);
    Object.keys(vars||{}).forEach(function(k){value=value.replace(new RegExp("\\{"+k+"\\}","g"),vars[k])});
    return value;
  }
  function one(selector){return document.querySelector(selector)}
  function text(selector,value){var el=one(selector);if(el)el.textContent=value}
  function html(selector,value){var el=one(selector);if(el)el.innerHTML=value}
  function attr(selector,name,value){var el=one(selector);if(el)el.setAttribute(name,value)}

  function applyStaticLanguage(){
    document.documentElement.lang=currentLang;
    document.title=c("metaTitle");
    var meta=one('meta[name="description"]');if(meta)meta.content=c("metaDescription");
    text(".hero .kicker",c("heroKicker"));
    text(".hero h1",c("heroTitle"));
    html(".hero .lead",c("heroLead"));
    html(".glhf h2",c("glhfTitle"));
    text(".glhf p",c("glhfDesc"));
    text("#secretBanner span span",c("secretBanner"));
    text(".highlights .eyebrow",c("highlightsEyebrow"));
    text(".highlights h2",c("highlightsTitle"));
    text(".highlights .sub",c("highlightsSub"));
    text(".story-card.forge .story-tag",c("whyTag"));
    text(".story-card.forge h3",c("whyTitle"));
    text(".story-card.forge .story-body p",c("whyDesc"));
    text(".story-card.forge .story-go",c("whyCta"));
    text(".story-card.classroom .story-tag",c("classTag"));
    text(".story-card.classroom h3",c("classTitle"));
    text(".story-card.classroom .story-body p",c("classDesc"));
    text(".story-card.classroom .story-go",c("classCta"));
    text(".story-card.core7 .story-tag",c("coreTag"));
    text(".story-card.core7 h3",c("coreTitle"));
    html(".story-card.core7 .story-body p",c("coreDesc"));
    text(".story-card.core7 .story-go",c("coreCta"));
    text(".energy h2",c("energyTitle"));
    text(".energy .sub",c("energyDesc"));
    document.querySelectorAll(".path-selected").forEach(function(el){el.textContent=c("selected")});
    text('[data-class="TASTER"] h3',c("tasterName")); text('[data-class="TASTER"] .path-copy>p',c("tasterDesc"));
    text('[data-class="KEEPER"] h3',c("keeperName")); text('[data-class="KEEPER"] .path-copy>p',c("keeperDesc"));
    text('[data-class="THINKER"] h3',c("thinkerName")); text('[data-class="THINKER"] .path-copy>p',c("thinkerDesc"));
    text('[data-class="MAKER"] h3',c("makerName")); text('[data-class="MAKER"] .path-copy>p',c("makerDesc"));
    var metaMap={TASTER:["fire","drive","strTip"],KEEPER:["nature","consistency","dexTip"],THINKER:["water","understanding","intTip"],MAKER:["tools",null,"constructTip"]};
    Object.keys(metaMap).forEach(function(key){
      var card=one('[data-class="'+key+'"]');if(!card)return;
      var spans=card.querySelectorAll(".path-meta>span");
      spans[0].setAttribute("data-tip",c(metaMap[key][2]));
      if(spans[1])spans[1].textContent=c(metaMap[key][0]);
      if(spans[2]&&metaMap[key][1])spans[2].textContent=c(metaMap[key][1]);
    });
    text(".path-result-label",c("chosenLabel"));
    text("#pathEnter",c("enterPath"));
    html(".paths-quiet",c("pathsQuiet"));
    text(".rooms .eyebrow",c("roomsEyebrow"));
    text(".rooms h2",c("roomsTitle"));
    html(".rooms .open-world-copy",c("roomsDesc"));
    text('.room[href="collection/"]>span',c("invDesc"));
    text('.room[href="resume/"]>span',c("resumeDesc"));
    text('.room[href="club/"]>span',c("clubDesc"));
    attr('.room[href="guild/"] .room-term',"data-tip",c("guildTip"));
    html('.room[href="guild/"]>span',c("guildRoom"));
    text(".first .eyebrow",c("firstEyebrow"));
    html(".first h2",c("firstTitle"));
    text(".first p",c("firstDesc"));
    text(".first-go",c("firstCta"));
    text('.footlinks a[href="/"]',c("home"));
    text('.footlinks a[href="privacy/"]',c("privacy"));
    document.querySelectorAll("[data-lang]").forEach(function(btn){
      var active=btn.dataset.lang===currentLang;
      btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",active?"true":"false");
    });
  }

  var bump=document.getElementById("bump");
  var bumpText=document.getElementById("bumpText");
  var seen=false;
  try{seen=localStorage.getItem("mc_glhf_seen")==="1"}catch(e){}
  function paintBump(){bumpText.textContent=seen?"GOOD LUCK, HAVE FUN ✓":c("bump")}
  function openHouse(auto){
    seen=true;bump.classList.add("hit");document.body.classList.add("glhf-open");paintBump();
    try{localStorage.setItem("mc_glhf_seen","1")}catch(e){}
    /* ชนหมัดแล้วขั้นเปลี่ยนจาก door เป็น intro ทันที — ต้องวาดใหม่ทั้งเข็มทิศ
       และประตูห้องต่าง ๆ ไม่งั้นเข็มทิศที่เพิ่งโผล่มาจะยังบอกให้ไปชนหมัดอยู่ */
    if(window.MC_STAGE)window.MC_STAGE.paint();
    paintQuest();
    if(!auto)setTimeout(function(){document.getElementById("quest").scrollIntoView({behavior:"smooth",block:"start"})},650);
  }
  if(seen)openHouse(true);
  bump.addEventListener("click",function(){openHouse(false)});

  var READ=[
    "ep1-everyone-gets-to-play","ep2-the-first-item","ep3-the-item-that-came-back",
    "ep4-what-traveled-without-us","ep5-from-answers-to-a-system",
    "ep6-the-starter-kit","ep7-a-voice-that-went-further"
  ];
  var READ_URLS=[
    "forge/ep1-everyone-gets-to-play/","forge/ep2-the-first-item/","forge/ep3-the-item-that-came-back/",
    "forge/ep4-what-traveled-without-us/","forge/ep5-from-answers-to-a-system/",
    "forge/ep6-the-starter-kit/","forge/ep7-a-voice-that-went-further/"
  ];
  var LEARN=["free-ai","image-ai","clip-ai","notebooklm","prompts","first-web"];
  var LEARN_URLS=["classroom/free-ai.html","classroom/image-ai.html","classroom/clip-ai.html","classroom/notebooklm.html","classroom/prompts.html","classroom/first-web.html"];
  function ls(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
  function values(k){return ls(k,"").split(",").filter(Boolean)}
  function countDone(k,items){var raw=values(k);return items.filter(function(item){return raw.indexOf(item)>=0}).length}
  function firstMissing(k,items){var raw=values(k);for(var i=0;i<items.length;i++){if(raw.indexOf(items[i])<0)return i}return-1}
  function titles(){try{var list=JSON.parse(ls("mc_titles","[]"));return Array.isArray(list)?list:[]}catch(e){return[]}}
  function setActive(icon,label,title,desc,url,cta){document.getElementById("activeIcon").textContent=icon;document.getElementById("activeLabel").textContent=label;document.getElementById("activeTitle").textContent=title;document.getElementById("activeDesc").textContent=desc;var link=document.getElementById("activeCta");link.href=url;link.textContent=cta}
  function paintRewards(secretComplete){
    var rewards=document.getElementById("questRewards");
    if(!rewards)return;
    var trophy=rewards.querySelector(".platinum-reward");
    if(secretComplete&&!trophy){
      trophy=document.createElement("span");
      trophy.className="reward-chip platinum-reward";
      trophy.textContent="🏆 PLATINUM TROPHY";
      trophy.style.borderColor="rgba(190,148,66,.55)";
      trophy.style.background="rgba(234,208,140,.14)";
      trophy.style.color="var(--gold2)";
      rewards.insertBefore(trophy,rewards.firstChild);
    }else if(!secretComplete&&trophy){
      trophy.remove();
    }
  }

  function hideCompletionBanner(){
    var banner=document.getElementById("secretBanner");
    if(banner)banner.style.display="none";
  }
  function renderCompletionBanner(secretComplete,th){
    var banner=document.getElementById("secretBanner");
    if(!banner)return;
    var alt=th?"CORE7 เกมการ์ดที่สร้างจากบทเรียนทั้ง 6 บท":"CORE7 card game built from all 6 lessons";
    var label=th?"เปิดเกม CORE7":"Open CORE7";
    var copy=th
      ?"คอลกันไว้ แล้วเล่นไปคุยกันไป เพราะความสนุกของ CORE7 ไม่ได้มีแค่ใครชนะ แต่อยู่ที่ได้เห็นว่าเพื่อนคิดยังไง"
      :"Stay on a call and talk while you play. CORE7 is not only about who wins—it is about discovering how your friend thinks.";
    banner.style.display="flex";
    banner.style.borderTop=secretComplete?"1px solid rgba(255,255,255,.13)":"1px solid rgba(18,40,28,.1)";
    banner.innerHTML='<a href="core7/" aria-label="'+label+'" style="display:block;width:124px;flex:none;padding:6px;border-radius:18px;background:'+(secretComplete?'rgba(255,255,255,.08)':'rgba(255,255,255,.92)')+';border:1px solid '+(secretComplete?'rgba(234,208,140,.28)':'rgba(18,40,28,.12)')+';box-shadow:0 14px 30px -20px rgba(0,0,0,.72)">'
      +'<img src="img/hall-core7.jpg" alt="'+alt+'" style="display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:12px">'
      +'</a><span><b>'+(th?'ชวนเพื่อนมาดวล':'CHALLENGE A FRIEND')+'</b><span style="color:'+(secretComplete?'rgba(255,255,255,.66)':'var(--muted)')+'">'+copy+'</span></span>';
  }

  /* ── เข็มทิศ ──
     ตำแหน่งบนเส้นทางคำนวณที่ assets/stage.js ที่เดียว หน้านี้แค่วาดตาม
     เข็มทิศอันแรกตั้งใจให้ว่างมาก: ไม่มีแถบความคืบหน้า ไม่มีราง ไม่มีเปอร์เซ็นต์
     เพราะคนที่เพิ่งชนหมัดเสร็จยังไม่มีความคืบหน้าให้ดู มีแต่ก้าวถัดไปก้าวเดียว */
  function paintQuest(){
    var th=currentLang==="th";
    var S=window.MC_STAGE;
    if(!S) return;
    var here=S.get(), first=here.id==="intro";
    var hud=document.getElementById("questHud"),
        title=document.getElementById("questTitle"),
        lead=document.getElementById("questLead"),
        eyebrow=document.getElementById("questEyebrow");

    var restored=ls("mc_nb_restored","")==="1",secretEnd=ls("mc_secret_end","")==="1",
        hasGLHF=titles().indexOf("GLHF")>=0,
        secretComplete=restored&&secretEnd&&hasGLHF;

    hud.dataset.state=here.done?(secretComplete?"secret":"complete"):"active";
    eyebrow.textContent=th?"🧭 เข็มทิศนำทาง":"🧭 COMPASS";
    hideCompletionBanner();
    paintRewards(here.done&&secretComplete);

    /* เครื่องประดับทั้งหมดของเข็มทิศอันแรกถูกซ่อน ไม่ใช่แค่ว่าง */
    show("questTrack",!first);
    show("questRail",!first);
    show("questOverall",!first);
    show("questRewards",!first&&here.done);

    if(first){
      title.textContent=th?"เข็มทิศชี้ไปที่ห้องแรกแล้ว":"The compass points to the first room";
      lead.textContent=th
        ?"จากนี้ไม่ต้องเลือกเองว่าจะไปไหนต่อ เดินตามที่มันชี้ก็พอ"
        :"You do not have to choose where to go. Just follow where it points.";
    }else{
      var steps=S.rail(), doneCount=steps.filter(function(x){return x.done}).length;
      var pct=Math.round(doneCount/steps.length*100);
      document.getElementById("questFill").style.width=pct+"%";
      document.getElementById("overallPct").textContent=pct+"%";
      document.getElementById("overallText").textContent=th
        ?"เดินมาแล้ว "+doneCount+"/"+steps.length+" ขั้น"
        :doneCount+"/"+steps.length+" steps";
      paintRail(steps);
      title.textContent=here.done
        ?(th?"เดินครบเส้นทางของบ้านแล้ว":"You walked the whole path")
        :(th?"เข็มทิศชี้ไปที่นี่":"The compass points here");
      lead.textContent=here.done
        ?(th?"จากนี้เลือกห้องไหนก่อนก็ได้ ไม่มีทางที่ผิดแล้ว":"From here, any room is a fine place to go.")
        :(th?"จุดล่าสุดที่คุณเดินถึง — กดเดินต่อได้เลย":"The last point you reached. Pick it up from here.");
    }

    /* ใช้ path เต็มจากรากเสมอ ไม่ใช่ path สัมพัทธ์ — เข็มทิศอันเดียวกันนี้
       จะถูกเอาไปวางในหน้าที่อยู่ลึกกว่านี้ได้โดยไม่ต้องแก้อะไร */
    var n=here.next;
    setActive(n.icon,n.label,n.title,n.desc,S.href(n.href),n.cta);
    if(here.done) renderCompletionBanner(secretComplete,th);
  }

  function show(id,on){var el=document.getElementById(id);if(el)el.hidden=!on}

  /* วาดรางทีเดียวจบ ไม่แก้ทีละโหนด — จำนวนขั้นเปลี่ยนได้จาก stage.js */
  function paintRail(steps){
    var rail=document.getElementById("questRail");
    if(!rail) return;
    rail.innerHTML=steps.map(function(x){
      var cls=x.done?"done":(x.current?"current":"locked");
      var mark=x.done?"✓":(x.current?"→":"");
      return '<li class="'+cls+'"><span class="ic" aria-hidden="true">'+x.icon+'</span>'
        +'<b>'+x.th+'</b><span class="mk" aria-hidden="true">'+mark+'</span></li>';
    }).join("");
  }

  var tip=document.createElement("div");tip.className="tip-box";document.body.appendChild(tip);var active=null;
  function placeTip(target){var r=target.getBoundingClientRect();tip.textContent=target.getAttribute("data-tip")||"";tip.classList.add("show");requestAnimationFrame(function(){var pad=12,tw=tip.offsetWidth,th=tip.offsetHeight,left=Math.min(window.innerWidth-tw-pad,Math.max(pad,r.left+r.width/2-tw/2)),top=r.top-th-12;if(top<10)top=r.bottom+12;tip.style.left=left+"px";tip.style.top=top+"px"})}
  function hideTip(){tip.classList.remove("show");active=null}
  document.addEventListener("mouseover",function(e){var el=e.target.closest&&e.target.closest(".term");if(el){active=el;placeTip(el)}});
  document.addEventListener("mouseout",function(e){var el=e.target.closest&&e.target.closest(".term");if(el&&(!e.relatedTarget||!el.contains(e.relatedTarget)))hideTip()});
  document.addEventListener("focusin",function(e){var el=e.target.closest&&e.target.closest(".term");if(el){active=el;placeTip(el)}});
  document.addEventListener("focusout",function(e){var el=e.target.closest&&e.target.closest(".term");if(el)hideTip()});
  document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest(".term");if(el){e.preventDefault();e.stopPropagation();if(active===el&&tip.classList.contains("show")){hideTip()}else{active=el;placeTip(el)}}else hideTip()});
  document.addEventListener("keydown",function(e){var el=e.target.closest&&e.target.closest(".term");if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();el.click()}});
  window.addEventListener("scroll",function(){if(active)placeTip(active)},{passive:true});window.addEventListener("resize",function(){if(active)placeTip(active)});

  var PATHS={
    TASTER:{url:"paths/taster/",th:"สายกิน",en:"Taster"},KEEPER:{url:"paths/keeper/",th:"สายคลีน",en:"Keeper"},
    THINKER:{url:"paths/thinker/",th:"สายคิด",en:"Thinker"},MAKER:{url:"paths/maker/",th:"สายประดิษฐ์",en:"Maker"}
  };
  var pathBtns=Array.prototype.slice.call(document.querySelectorAll(".path-choice")),pathTitle=document.getElementById("pathResultTitle"),pathEnter=document.getElementById("pathEnter");
  function paintPath(key,scroll){var data=PATHS[key];pathBtns.forEach(function(b){b.setAttribute("aria-pressed",b.dataset.class===key?"true":"false")});if(!data){pathTitle.textContent=c("notChosen");pathEnter.href="paths/";pathEnter.setAttribute("aria-disabled","true");return}saved=key;try{localStorage.setItem("mc_class",key)}catch(e){}pathTitle.textContent=data[currentLang];pathEnter.href=data.url;pathEnter.removeAttribute("aria-disabled");if(scroll)document.getElementById("pathResult").scrollIntoView({behavior:"smooth",block:"nearest"})}
  pathBtns.forEach(function(b){b.addEventListener("click",function(e){if(e.target.closest(".term"))return;paintPath(b.dataset.class,true)})});
  var saved="";try{saved=localStorage.getItem("mc_class")||""}catch(e){}

  var seekerBtn=document.getElementById("seekerBtn"),seekerTitle=document.getElementById("seekerTitle"),seekerCopy=document.getElementById("seekerCopy"),seekerOut=document.getElementById("seekerCount");
  var n=parseInt(ls("mc_seek_n","0"),10)||0,hit=ls("mc_seek_hit","")==="1";
  function grant(){try{var a=JSON.parse(localStorage.getItem("mc_titles")||"[]");if(!Array.isArray(a))a=[];if(a.indexOf("SEEKER")<0){a.push("SEEKER");localStorage.setItem("mc_titles",JSON.stringify(a))}}catch(e){}}
  function paintSeeker(){if(hit){seekerBtn.textContent="🍀";seekerBtn.disabled=true;seekerTitle.textContent=c("seekerFound");seekerCopy.textContent=c("seekerSaved");seekerOut.textContent="";grant()}else{seekerBtn.textContent="☘️";seekerBtn.disabled=false;seekerTitle.textContent=c("seekerTitle");seekerCopy.textContent=c("seekerCopy")}}
  seekerBtn.addEventListener("click",function(){if(hit)return;n+=1;try{localStorage.setItem("mc_seek_n",String(n))}catch(e){}if(Math.random()<.1){hit=true;try{localStorage.setItem("mc_seek_hit","1")}catch(e){}paintSeeker()}else{seekerOut.textContent=fmt("seekerTry",{n:n});seekerBtn.animate([{transform:"rotate(0)"},{transform:"rotate(-9deg)"},{transform:"rotate(9deg)"},{transform:"rotate(0)"}],{duration:320})}});

  function setLanguage(lang){currentLang=lang==="en"?"en":"th";try{localStorage.setItem("mc_lang",currentLang)}catch(e){}hideTip();applyStaticLanguage();paintBump();paintQuest();try{saved=localStorage.getItem("mc_class")||saved||""}catch(e){}paintPath(PATHS[saved]?saved:"",false);paintSeeker()}
  document.querySelectorAll("[data-lang]").forEach(function(btn){btn.addEventListener("click",function(){setLanguage(btn.dataset.lang)})});
  window.addEventListener("storage",function(e){if(e.key==="mc_lang")setLanguage(e.newValue||"th");else{paintQuest();paintSeeker()}});
  document.addEventListener("visibilitychange",function(){if(!document.hidden){paintQuest();paintSeeker()}});

  var prog=document.getElementById("scrollProg"),ticking=false;
  function paintScroll(){if(ticking)return;ticking=true;requestAnimationFrame(function(){ticking=false;var h=document.documentElement.scrollHeight-innerHeight,p=h>0?scrollY/h*100:0;prog.style.width=Math.min(100,Math.max(0,p))+"%"})}
  addEventListener("scroll",paintScroll,{passive:true});paintScroll();

  setLanguage(currentLang);
})();