(()=>{
  const form=document.getElementById('reviewForm');
  const intro=document.getElementById('intro');
  const result=document.getElementById('result');
  const quests=[...document.querySelectorAll('.quest')];
  const nodes=[...document.querySelectorAll('.node')];
  const xp=document.getElementById('xp');
  const scoreScale=document.getElementById('scoreScale');
  let step=0;
  let submitted=false;

  for(let i=1;i<=10;i++){
    scoreScale.insertAdjacentHTML('beforeend',`<label class="choice"><input type="radio" name="score" value="${i}"><span>${i}</span></label>`);
  }

  const val=name=>form.querySelector(`[name="${name}"]:checked`)?.value||'';
  const text=name=>(form.elements[name]?.value||'').trim();
  const checks=name=>[...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value);
  const escapeHtml=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

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

  document.getElementById('startButton').addEventListener('click',()=>{
    intro.hidden=true;
    show(0);
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
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.message||`บันทึกไม่สำเร็จ (${response.status})`);

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
      xp.textContent='500 XP';
      result.classList.add('active');
      const saving=document.getElementById('saving');
      saving.textContent=`บันทึกแล้ว · ${data.reviewReference||'AFTER TASTE'}`;
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
})();
