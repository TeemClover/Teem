(()=>{
  const form=document.getElementById('reviewForm');
  const intro=document.getElementById('intro');
  const result=document.getElementById('result');
  const quests=[...document.querySelectorAll('.quest')];
  const nodes=[...document.querySelectorAll('.node')];
  const xp=document.getElementById('xp');
  const scoreScale=document.getElementById('scoreScale');
  const startButton=document.getElementById('startButton');
  const XTY_REWARD_KEY='mc_first_class_after_xty_reward_v1';
  const DONE_KEY='mc_first_class_after_done_v1';
  const XTY_REWARD_QUEST='first-class:after-taste:2026-08-18';
  let step=0;
  let submitted=false;

  startButton.insertAdjacentHTML('beforebegin',`
    <div id="playerGate" style="width:min(100%,440px);margin:18px auto 10px;text-align:left">
      <label for="gateEmail" style="display:block;margin-bottom:6px;font-weight:700;font-size:12px;color:#c9ddd2">PLAYER CHECK · Email ที่ใช้สมัคร First Class</label>
      <input id="gateEmail" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" style="width:100%;min-height:48px;border:1px solid rgba(255,255,255,.18);border-radius:13px;background:rgba(255,255,255,.08);color:#fff;padding:0 14px;font:600 15px 'IBM Plex Sans Thai',sans-serif;outline:none">
      <div id="gateMessage" style="min-height:18px;margin-top:6px;color:#f2cc7d;font-size:11px;line-height:1.5"></div>
    </div>`);
  const gateEmail=document.getElementById('gateEmail');
  const gateMessage=document.getElementById('gateMessage');

  for(let i=1;i<=10;i++){
    scoreScale.insertAdjacentHTML('beforeend',`<label class="choice"><input type="radio" name="score" value="${i}"><span>${i}</span></label>`);
  }

  const val=name=>form.querySelector(`[name="${name}"]:checked`)?.value||'';
  const text=name=>(form.elements[name]?.value||'').trim();
  const checks=name=>[...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value);
  const escapeHtml=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const validEmail=value=>/^\S+@\S+\.\S+$/.test(String(value||'').trim());

  function readJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value))}catch{}
  }
  function readRewardState(){return readJson(XTY_REWARD_KEY)}
  function writeRewardState(value){writeJson(XTY_REWARD_KEY,value)}
  function readDoneState(){return readJson(DONE_KEY)}
  function writeDoneState(value){writeJson(DONE_KEY,value)}

  async function cloudState(key){
    try{
      const response=await fetch('/api/progress',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return null;
      const data=await response.json();
      const raw=data?.progress?.[key];
      if(!raw)return null;
      return typeof raw==='string'?JSON.parse(raw):raw;
    }catch{return null}
  }
  async function pushProgressMarker(key,state){
    try{
      const response=await fetch('/api/progress',{
        method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},
        body:JSON.stringify({progress:{[key]:JSON.stringify(state)}})
      });
      return response.ok;
    }catch{return false}
  }

  async function existingCompletion(){
    const localDone=readDoneState();
    if(localDone?.completed)return localDone;
    const localReward=readRewardState();
    if(localReward?.claimed)return {...localReward,completed:true};

    const [cloudDone,cloudReward]=await Promise.all([cloudState(DONE_KEY),cloudState(XTY_REWARD_KEY)]);
    if(cloudDone?.completed){writeDoneState(cloudDone);return cloudDone}
    if(cloudReward?.claimed){writeRewardState(cloudReward);return {...cloudReward,completed:true}}

    try{
      const store=await import('/xty/_shared/store.js');
      try{
        const account=await import('/xty/_shared/account.js');
        await account.syncXtyProfile({recoverParties:false});
      }catch{}
      const reward=store.cardRewardForQuest?.(XTY_REWARD_QUEST);
      if(reward?.rewardId){
        const state={completed:true,claimed:true,rewardId:reward.rewardId,cardId:reward.cardId||null,earnedAt:reward.earnedAt||'',source:'xty-profile'};
        writeDoneState(state);writeRewardState(state);
        return state;
      }
    }catch{}
    return null;
  }

  function showAlreadyCleared(state={}){
    submitted=true;
    form.hidden=true;
    result.classList.remove('active');
    quests.forEach(item=>item.classList.remove('active'));
    nodes.forEach(node=>{node.classList.remove('now');node.classList.add('done')});
    xp.textContent=state?.rewardId?'500 XP · +1 CARD':'500 XP';
    const rewardLink=state?.rewardId
      ?`<a href="/xty/reveal/?r=${encodeURIComponent(state.rewardId)}" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin:16px 6px 0;padding:0 18px;border-radius:13px;background:#f2cc7d;color:#13291f;text-decoration:none;font-weight:900">ดูการ์ดที่ได้รับ →</a>`
      :`<a href="/collection/" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin:16px 6px 0;padding:0 18px;border-radius:13px;background:#f2cc7d;color:#13291f;text-decoration:none;font-weight:900">เปิด Collection →</a>`;
    intro.hidden=false;
    intro.innerHTML=`
      <span class="eyebrow">QUEST ALREADY CLEAR</span>
      <h1>ด่านนี้<em>เคลียร์แล้ว ✓</em></h1>
      <p>คุณกรอกแบบสอบถามและรับรางวัล AFTER TASTE ไปแล้ว ด่านนี้รับรางวัลได้ 1 ครั้งต่อผู้เรียน จึงไม่ต้องกรอกซ้ำครับ</p>
      ${rewardLink}
      <a href="/first-class/" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin:16px 6px 0;padding:0 18px;border-radius:13px;border:1px solid rgba(255,255,255,.22);color:#fff;text-decoration:none;font-weight:800">กลับ First Class</a>
      <small class="fine">รีวิวเดิมยังถูกเก็บไว้ตามสิทธิ์การเผยแพร่ที่คุณเลือก</small>`;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function checkServerReviewed(email){
    const response=await fetch('/api/first-class-review',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'check_status',email})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(data.message||'ตรวจสถานะไม่สำเร็จ');
    return data;
  }

  async function grantXtyCard(payload,reviewReference){
    const store=await import('/xty/_shared/store.js');
    let account=null;
    try{
      account=await import('/xty/_shared/account.js');
      await account.syncXtyProfile({recoverParties:false});
    }catch{}

    let state=readRewardState()||await cloudState(XTY_REWARD_KEY);
    if(state?.claimed&&state.rewardId){
      writeRewardState(state);
      return state;
    }

    let profile=store.getProfile();
    if(!profile){
      profile=store.createProfile({
        alias:(payload.displayName||'First Class').slice(0,24),
        avatarId:'orange_cat',
        avatarFrame:'green'
      });
    }

    const reward=store.prepareCardReward({questId:XTY_REWARD_QUEST});
    if(!reward?.rewardId||!reward?.cardId)return null;

    state={
      claimed:true,
      completed:true,
      rewardId:reward.rewardId,
      cardId:reward.cardId,
      reviewReference:reviewReference||'',
      earnedAt:reward.earnedAt||new Date().toISOString(),
      source:'first-class-after-taste'
    };
    writeRewardState(state);

    let cloudSaved=false;
    try{
      if(account){
        const saved=await account.saveCloudProgress(store.getProfile());
        cloudSaved=!saved?.error;
      }
    }catch{}
    const markerSaved=await pushProgressMarker(XTY_REWARD_KEY,state);
    return {...state,cloudSaved:cloudSaved||markerSaved};
  }

  function showXtyReward(reward){
    if(!reward?.rewardId||document.getElementById('xtyRewardLoot'))return;
    const reviewCard=result.querySelector('.review-card');
    if(!reviewCard)return;
    const cloudLine=reward.cloudSaved
      ?'บันทึกลง myClover Progress แล้ว'
      :'เก็บในเครื่องนี้แล้ว · ถ้า Login myClover ภายหลัง XTY จะ Sync การ์ดขึ้นบัญชีให้';
    reviewCard.insertAdjacentHTML('beforebegin',`
      <div id="xtyRewardLoot" style="max-width:540px;margin:18px auto 0;padding:20px;border:1px solid rgba(242,204,125,.55);border-radius:20px;background:linear-gradient(145deg,rgba(16,67,49,.96),rgba(7,30,22,.96));box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center">
        <div style="font-size:42px;line-height:1">🎴</div>
        <div style="margin-top:8px;font:800 10px Manrope,sans-serif;letter-spacing:.12em;color:#9af0be">QUEST LOOT</div>
        <strong style="display:block;margin:5px 0 4px;font-size:24px;color:#fff">XTY CARD ×1</strong>
        <span style="display:block;color:#bdd0c6;font-size:12px;line-height:1.6">${cloudLine}</span>
        <a href="/xty/reveal/?r=${encodeURIComponent(reward.rewardId)}" style="display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:14px;padding:0 18px;border-radius:12px;background:#f2cc7d;color:#13291f;text-decoration:none;font-weight:900">เปิดการ์ด →</a>
      </div>`);
  }

  function show(n){
    step=n;
    quests.forEach((q,i)=>q.classList.toggle('active',i===n));
    nodes.forEach((node,i)=>{
      node.classList.toggle('done',i<n);
      node.classList.toggle('now',i===n);
    });
    xp.textContent=`${n*100} XP`;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function toast(q,msg,hold=false){
    const t=q.querySelector('.toast');
    t.textContent=msg;
    t.classList.add('show');
    if(!hold)setTimeout(()=>t.classList.remove('show'),2600);
    return t;
  }

  function validate(n){
    if(n===0&&!val('aiBefore'))return'เลือกจุดเริ่มต้นก่อนเข้าเรียนหน่อยครับ';
    if(n===0&&!val('understanding'))return'ให้คะแนนความเข้าใจซอส 1–5 ก่อนครับ';
    if(n===1&&!checks('takeaways').length)return'เก็บ Loot อย่างน้อย 1 ชิ้นก่อนผ่านห้องนี้';
    if(n===2&&text('aha').length<8)return'เล่า Aha moment สั้น ๆ อีกนิดครับ';
    if(n===2&&text('firstUse').length<5)return'บอกงานแรกที่อยากเอาไปลองหน่อยครับ';
    if(n===3&&text('recommend').length<8)return'ลองตอบเหมือนมีเพื่อนถามจริง ๆ อีกนิดครับ';
    if(n===3&&!val('score'))return'ให้คะแนน 1–10 ก่อนครับ';
    if(n===4&&!text('displayName'))return'ใส่ชื่อที่อยากให้เรียกก่อนครับ';
    if(n===4&&!/^\S+@\S+\.\S+$/.test(text('email')))return'ตรวจ Email อีกครั้งครับ';
    if(n===4&&!val('consentMode'))return'เลือกสิทธิ์การใช้คำรีวิวก่อนเปิดหีบครับ';
    return'';
  }

  startButton.addEventListener('click',async()=>{
    const email=String(gateEmail.value||'').trim().toLowerCase();
    gateMessage.textContent='';
    if(!validEmail(email)){
      gateMessage.textContent='ใส่ Email ที่ใช้สมัคร First Class ก่อนครับ';
      gateEmail.focus();
      return;
    }
    startButton.disabled=true;
    const original=startButton.textContent;
    startButton.textContent='กำลังตรวจสิทธิ์…';
    try{
      const local=await existingCompletion();
      if(local)return showAlreadyCleared(local);
      const status=await checkServerReviewed(email);
      if(status.reviewed){
        const done={completed:true,reviewReference:status.reviewReference||'',source:'review-database'};
        writeDoneState(done);
        pushProgressMarker(DONE_KEY,done).catch(()=>{});
        return showAlreadyCleared(done);
      }
      form.elements.email.value=email;
      form.elements.email.readOnly=true;
      intro.hidden=true;
      show(0);
    }catch(error){
      gateMessage.textContent=error.message||'ตรวจสิทธิ์สะดุด ลองอีกครั้งครับ';
    }finally{
      if(!submitted){startButton.disabled=false;startButton.textContent=original}
    }
  });

  quests.forEach((q,i)=>{
    q.querySelector('.back')?.addEventListener('click',()=>show(Math.max(0,i-1)));
    q.querySelector('.next')?.addEventListener('click',async event=>{
      const error=validate(i);
      if(error)return toast(q,error);
      if(i<quests.length-1)return show(i+1);
      await finish(q,event.currentTarget);
    });
  });

  document.querySelectorAll('textarea').forEach(el=>el.addEventListener('input',()=>{
    const out=document.querySelector(`[data-count="${el.id}"]`);
    if(out)out.textContent=el.value.length;
  }));

  async function finish(q,button){
    if(submitted)return;
    submitted=true;
    button.disabled=true;
    const original=button.textContent;
    button.textContent='กำลังบันทึก…';
    const status=toast(q,'กำลังบันทึกคำตอบก่อนเปิดหีบ…',true);

    const payload={
      displayName:text('displayName'),
      email:text('email'),
      roleCompany:text('roleCompany'),
      aiBefore:val('aiBefore'),
      understanding:Number(val('understanding')),
      takeaways:checks('takeaways'),
      aha:text('aha'),
      firstUse:text('firstUse'),
      recommend:text('recommend'),
      score:Number(val('score')),
      improve:text('improve'),
      extra:text('extra'),
      consentMode:val('consentMode'),
      website:text('website')
    };

    try{
      const response=await fetch('/api/first-class-review',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
      });
      const data=await response.json().catch(()=>({}));
      if(response.status===409&&data.code==='ALREADY_REVIEWED'){
        const done={completed:true,reviewReference:data.reviewReference||'',source:'review-database'};
        writeDoneState(done);pushProgressMarker(DONE_KEY,done).catch(()=>{});
        return showAlreadyCleared(done);
      }
      if(!response.ok||!data.ok)throw new Error(data.message||`บันทึกไม่สำเร็จ (${response.status})`);

      const done={completed:true,reviewReference:data.reviewReference||'',completedAt:new Date().toISOString(),source:'first-class-after-taste'};
      writeDoneState(done);
      pushProgressMarker(DONE_KEY,done).catch(()=>{});

      const xtyReward=await grantXtyCard(payload,data.reviewReference).catch(error=>{
        console.error('XTY reward failed',error);
        return null;
      });
      if(xtyReward){
        writeDoneState({...done,...xtyReward,completed:true});
        pushProgressMarker(DONE_KEY,{...done,...xtyReward,completed:true}).catch(()=>{});
      }

      const mode=payload.consentMode;
      document.getElementById('cardScore').textContent=`★ ${payload.score}/10`;
      document.getElementById('cardQuote').textContent=`“${payload.recommend||payload.aha}”`;
      document.getElementById('cardWho').innerHTML=mode==='named'
        ?`<strong>${escapeHtml(payload.displayName)}</strong>${payload.roleCompany?` · ${escapeHtml(payload.roleCompany)}`:''}`
        :'<strong>ผู้เรียน AI ใส่ซอส · First Class รุ่นแรก</strong>';
      document.getElementById('cardNote').textContent=mode==='private'
        ?'PRIVATE REVIEW · ใช้ภายในเพื่อปรับปรุงคอร์สเท่านั้น'
        :mode==='anonymous'
          ?'ANONYMOUS REVIEW · อนุญาตให้เผยแพร่โดยไม่ระบุตัวตน'
          :'SHARE-SAFE REVIEW · อนุญาตให้เผยแพร่พร้อมชื่อ';

      status.classList.remove('show');
      quests.forEach(item=>item.classList.remove('active'));
      nodes.forEach(node=>{node.classList.remove('now');node.classList.add('done')});
      xp.textContent=xtyReward?'500 XP · +1 CARD':'500 XP';
      result.classList.add('active');
      if(xtyReward)showXtyReward(xtyReward);
      const saving=document.getElementById('saving');
      saving.textContent=`บันทึกแล้ว · ${data.reviewReference||'AFTER TASTE'}${xtyReward?' · XTY CARD +1':''}`;
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(error){
      submitted=false;
      button.disabled=false;
      button.textContent=original;
      status.textContent=`ยังเปิดหีบไม่ได้ — ${error.message||'ระบบบันทึกสะดุด'} · คำตอบยังอยู่ครบ ลองอีกครั้งได้`;
      status.classList.add('show');
      console.error('After Taste save failed',error);
    }
  }

  (async()=>{
    startButton.disabled=true;
    const original=startButton.textContent;
    startButton.textContent='กำลังตรวจสถานะ…';
    const existing=await existingCompletion();
    if(existing)return showAlreadyCleared(existing);
    startButton.disabled=false;
    startButton.textContent=original;
  })();
})();