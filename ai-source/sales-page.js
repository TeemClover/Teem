(function () {
  'use strict';
  var get = function (id) { return document.getElementById(id); }, config;
  try { config = JSON.parse(get('offer-config').textContent); } catch (_) { return; }
  var storage; try { storage = window.localStorage; } catch (_) { storage = null; }
  var campaignKeys=['utm_source','utm_medium','utm_campaign'],campaignStorageKey='ai_sauce_campaign_v1';
  function campaignAttribution(){
    var query=new URLSearchParams(location.search),values={},saved={},fromUrl=campaignKeys.some(function(key){return query.has(key);});
    if(!fromUrl){try{saved=JSON.parse(sessionStorage.getItem(campaignStorageKey))||{};}catch(_){}}
    campaignKeys.forEach(function(key){var raw=fromUrl?query.get(key):saved[key];values[key]=typeof raw==='string'?raw.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160):'';});
    if(fromUrl){try{sessionStorage.setItem(campaignStorageKey,JSON.stringify(values));}catch(_){}}
    return values;
  }
  campaignAttribution();
  var live = config.sales_enabled === true && window.location.protocol === 'https:';
  var tracker = SauceOffer.createVisitTracker(Object.assign({}, config, {storage_key:config.storage_key+':preview', offer_id:config.offer_id+':preview'}), storage);
  var serverVisit=null, serverReady=false, offerFailed=false, refreshing=null, serverAnchor=0, monotonicAnchor=0, schoolState=null, currentCheckout=null, checkoutOwnerEmail=null, checkoutRestoring=false,checkoutRestoreFailed=false,checkoutStarting=false,checkoutRequest=0;
  var money=new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0});
  var day=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'});
  var fullDate=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'});
  var previousPrice=null, amountEdited=false, uploading=false, selectedFile=null, previewUrl=null, requestKey=null, requestFingerprint=null, copiedVersion=0, received=false,purchaseNotice='',payerNameOwnerEmail=null;
  function monotonic(){return window.performance ? window.performance.now() : Date.now();}
  function clock(){return live&&serverVisit ? Math.floor(serverAnchor+Math.max(0,monotonic()-monotonicAnchor)) : Date.now();}
  var introDialog=get('cohort-dialog'),introStart=monotonic(),introDone=false,introDue=false,introTimer=null,introSuppressed=false;
  var introKey='ai_sauce_cohort_intro_v1:'+(live?'live':'preview');
  function closeIntro(){if(introDialog&&introDialog.open)introDialog.close();}
  function introIdentity(offer){return String(offer.firstSeen)+':'+String(offer.endsAt);}
  function introSeen(offer){try{return storage&&storage.getItem(introKey)===introIdentity(offer);}catch(_){return false;}}
  function introPresentation(offer){
    // Presentation alone is delayed. Eligibility and expiry remain server-authoritative.
    if(!offer.showLaunchOffer||(live&&!serverReady)||(schoolState&&schoolState.blocked)||(schoolState&&schoolState.recovery&&schoolState.recovery.active)){
      if(introTimer!==null){window.clearTimeout(introTimer);introTimer=null;}
      closeIntro();return offer;
    }
    if(introDone||!introDialog||typeof introDialog.showModal!=='function')return offer;
    var active=document.activeElement,form=get('receipt-form'),sampleVideo=get('sample-video');
    var busy=introSuppressed||checkoutRestoring||checkoutRestoreFailed||currentCheckout||uploading||received||(sampleVideo&&sampleVideo.paused===false)||(active&&form.contains&&form.contains(active));
    if(introSeen(offer)||busy){introDone=true;return offer;}
    if(introDue&&!document.hidden){
      introDone=true;
      try{introDialog.showModal();if(document.body&&document.body.classList)document.body.classList.add('cohort-modal-open');
        try{if(storage)storage.setItem(introKey,introIdentity(offer));}catch(_){}
      }catch(_){} // Unsupported/blocked dialogs never block the existing checkout.
      return offer;
    }
    if(!introDue&&introTimer===null)introTimer=window.setTimeout(function(){introTimer=null;introDue=true;render();},Math.max(0,1800-(monotonic()-introStart)));
    return Object.assign({},offer,{state:'intro',currentPrice:config.regular_price,showLaunchOffer:false,showCountdown:false,canPurchase:false,introPending:true});
  }
  function renderIntro(offer){
    if(!introDialog||!introDialog.open)return;
    if(!offer.showLaunchOffer||(live&&!serverReady)||(schoolState&&schoolState.blocked)||(schoolState&&schoolState.recovery&&schoolState.recovery.active)){closeIntro();return;}
    get('cohort-regular-price').textContent=money.format(config.regular_price);
    get('cohort-price').textContent=money.format(offer.currentPrice);
    get('cohort-saving').textContent='ประหยัด '+money.format(config.regular_price-offer.currentPrice);
    get('cohort-deadline').textContent=deadline(offer.endsAt);
    var p=SauceOffer.countdownParts(offer.remainingMs);
    get('cohort-time-left').textContent=(p.days?p.days+' วัน ':'')+[p.hours,p.minutes,p.seconds].map(function(n){return String(n).padStart(2,'0');}).join(':');
  }
  if(introDialog){
    get('cohort-close').addEventListener('click',closeIntro);
    get('cohort-later').addEventListener('click',closeIntro);
    introDialog.addEventListener('click',function(event){if(event.target===introDialog)closeIntro();});
    introDialog.addEventListener('close',function(){if(document.body&&document.body.classList)document.body.classList.remove('cohort-modal-open');});
    get('cohort-apply').addEventListener('click',async function(){
      closeIntro();var offer=await refreshOffer();
      if(offer.canPurchase&&offer.showLaunchOffer&&offer.currentPrice===config.launch_price)await beginCheckout();
      else{if(offer.state==='expired'){purchaseNotice='สิทธิ์รุ่นแรกสิ้นสุดแล้ว ราคาปัจจุบัน '+money.format(offer.currentPrice)+' โปรดตรวจราคาก่อนชำระ';render();}get('offer').scrollIntoView({behavior:'auto',block:'start'});}
    });
  }
  function deadline(end){return (end+7*3600000)%86400000===0?'ราคาพิเศษถึง '+day.format(new Date(end-1))+' เวลา 23:59 น.':'ราคาพิเศษถึง '+fullDate.format(new Date(end))+' น.';}
  function render(){
    var now=clock(), effective=Object.assign({},config,{sales_enabled:live&&serverReady});
    var actualOffer=SauceOffer.evaluateOffer(effective,now,live?serverVisit:tracker.read(now));
    var offer=introPresentation(actualOffer);renderIntro(actualOffer);
    if(serverReady&&schoolState&&!schoolState.blocked&&schoolState.recovery&&schoolState.recovery.active&&now<Date.parse(schoolState.recovery.expiresAt)){offer=Object.assign({},actualOffer,{currentPrice:790,canPurchase:true,showLaunchOffer:true,showCountdown:true,endsAt:Date.parse(schoolState.recovery.expiresAt),remainingMs:Date.parse(schoolState.recovery.expiresAt)-now});}
    var recoveryNode=get('recovery-offer');if(recoveryNode)recoveryNode.hidden=!(serverReady&&schoolState&&schoolState.recoveryAvailable&&!schoolState.blocked);if(recoveryNode&&!recoveryNode.hidden)get('claim-recovery').textContent='รับสิทธิ์เรียน '+money.format(790)+' · ตัดสินใจใน 2 ชั่วโมง';
    var recoverySelected=offer.currentPrice===790,bonusIncluded=!recoverySelected;
    var bonusSummary=get('bonus-package-summary'),offerBonus=get('offer-bonus-summary'),checkoutBonus=get('checkout-bonus-summary');
    if(bonusSummary)bonusSummary.textContent=bonusIncluded?'รับทั้ง 2 ไฟล์พร้อมคอร์ส ฿990 และราคาปกติ ฿1,690':'ชุดคู่มือ PDF + AI ผู้ช่วยงาน .md ไม่รวมในสิทธิ์ ฿790 ที่คุณเลือก';
    if(offerBonus)offerBonus.textContent=bonusIncluded?'รวมวิดีโอ แบบฝึกบนเว็บ ไฟล์ฝึก E-book และผู้ช่วย .md':'รวมวิดีโอ แบบฝึกบนเว็บและไฟล์ฝึก ไม่รวม E-book และผู้ช่วย .md';
    if(checkoutBonus)checkoutBonus.textContent=currentCheckout?(currentCheckout.priceTHB===790?'รายการนี้: คอร์สและไฟล์ฝึกครบ ไม่รวมคู่มือ PDF + AI ผู้ช่วยงาน .md':'รายการนี้รวมคู่มือ PDF และผู้ช่วยงาน .md'):'';
    var bonusValues=config.bonus_values_thb||{},addedValue=Number(config.learning_tools_value_thb)||0;
    if(bonusIncluded)addedValue+=(Number(bonusValues.ebook_pdf)||0)+(Number(bonusValues.work_coach_md)||0);
    var addedValueNode=get('offer-added-value'),addedNote=get('offer-added-note');
    if(addedValueNode)addedValueNode.textContent=money.format(addedValue);
    if(addedNote)addedNote.textContent=bonusIncluded?'รวมให้ในแพ็ก ไม่มีค่าใช้จ่ายส่วนนี้เพิ่ม':'สิทธิ์นี้รวมเครื่องมือฝึกบนเว็บ ไม่รวม E-book และผู้ช่วย .md';
    ['stack-bonus-ebook','stack-bonus-assistant'].forEach(function(id){var row=get(id);if(row)row.hidden=!bonusIncluded;});
    var launchActive=serverReady&&offer.showLaunchOffer&&offer.currentPrice===config.launch_price;
    var cohortNote=get('offer-cohort-note'),urgencyCopy=get('offer-urgency-copy');
    if(cohortNote){cohortNote.hidden=!launchActive;cohortNote.textContent='สิทธิ์ราคาเปิดเรียนเฉพาะรุ่นนี้';}
    if(urgencyCopy){urgencyCopy.hidden=!launchActive;urgencyCopy.textContent='ใช้สิทธิ์ก่อนเวลาที่แสดง แล้วราคาแพ็กจะกลับเป็น '+money.format(config.regular_price);}
    var enrolledLink=get('my-course-link');if(enrolledLink)enrolledLink.hidden=!(schoolState&&schoolState.user);
    var price=offer.currentPrice===null?'กำลังตรวจราคา':money.format(offer.currentPrice);
    document.documentElement.dataset.offerState=offer.state;
    get('launch-offer').hidden=!offer.showLaunchOffer; get('hero-offer').hidden=offer.currentPrice===null;
    get('countdown').hidden=get('sticky-countdown').hidden=!offer.showCountdown;
    get('sticky-offer-status').hidden=offer.showCountdown;
    get('sticky-offer-status').textContent=offer.introPending?'กำลังเตรียมสิทธิ์รุ่นแรก':live&&!serverReady?'กำลังตรวจสิทธิ์':offer.state==='expired'?'โปรสิ้นสุดแล้ว':'ราคาปกติ';
    ['current-price','hero-launch-price','bank-amount'].forEach(function(id){get(id).textContent=price;});
    get('hero-price-label').textContent=recoverySelected?'สิทธิ์เฉพาะบัญชีของคุณ':offer.showLaunchOffer?'รุ่นแรก · ปกติ '+money.format(config.regular_price):'ราคาปกติ';
    get('price-label').textContent=recoverySelected?'สิทธิ์เฉพาะบัญชีของคุณ':offer.showLaunchOffer?'สิทธิ์ myClover รุ่นแรก':'ราคาปกติ';
    get('regular-price').hidden=!offer.showLaunchOffer; get('regular-price').textContent=offer.showLaunchOffer?'ปกติ '+money.format(config.regular_price):'';
    get('hero-offer-end').textContent=get('offer-end').textContent=offer.showLaunchOffer?deadline(offer.endsAt):offer.state==='expired'?'สิ้นสุดราคาพิเศษแล้ว':'';
    get('time-left').textContent=get('sticky-time-left').textContent='';
    if(offer.showCountdown){var p=SauceOffer.countdownParts(offer.remainingMs);get('time-left').textContent=get('sticky-time-left').textContent=(p.days?p.days+' วัน ':'')+[p.hours,p.minutes,p.seconds].map(function(n){return String(n).padStart(2,'0');}).join(':');}
    get('purchase-button').disabled=uploading||checkoutRestoring||checkoutStarting||!serverReady||(!offer.canPurchase&&!(schoolState&&schoolState.blocked)); get('purchase-button').textContent=checkoutRestoring?'กำลังเปิดรายการเดิม…':checkoutStarting?'กำลังเปิดรายการชำระ…':schoolState&&schoolState.blocked?'ดูสถานะและเข้าเรียน':checkoutRestoreFailed?'ลองเปิดรายการเดิมอีกครั้ง':'ลงทะเบียนเรียนและดู QR · '+price;
    var checkoutLoading=get('checkout-loading');if(checkoutLoading){checkoutLoading.hidden=!(checkoutRestoring||checkoutStarting);checkoutLoading.textContent=checkoutRestoring?'กำลังเปิดรายการชำระเดิมและ QR ของคุณ…':'กำลังเตรียมรายการชำระและ QR ของคุณ กรุณารอสักครู่…';}
    var retryOffer=get('retry-offer');if(retryOffer){retryOffer.hidden=!live||!offerFailed;retryOffer.disabled=!!refreshing||checkoutRestoring||checkoutStarting||uploading;}
    get('bank-details').hidden=!currentCheckout||!serverReady||!schoolState||!schoolState.user;
    if(currentCheckout){var activeCart=clock()<Date.parse(currentCheckout.expiresAt);get('bank-amount').textContent=activeCart?money.format(currentCheckout.priceTHB):'รายการนี้หมดเวลาแล้ว';}
    get('customer-email').readOnly=true;get('customer-email').value=schoolState&&schoolState.user?schoolState.user.email:'';
    var b=config.bank||{}; get('bank-name').textContent=b.name||'';get('bank-account').textContent=String(b.account_number||'').replace(/^(\d{3})(\d)(\d{5})(\d)$/,'$1-$2-$3-$4');get('bank-owner').textContent=b.account_name||'';
    get('copy-account').disabled=get('copy-payment').disabled=!serverReady||!currentCheckout||currentCheckout.status!=='open'||clock()>=Date.parse(currentCheckout.expiresAt);
    get('payment-qr').hidden=!serverReady||!currentCheckout||currentCheckout.status!=='open'||received||clock()>=Date.parse(currentCheckout.expiresAt);
    // The actual transferred amount is entered from the slip, never derived from the current quote.
    get('upload-button').disabled=uploading||received||!live||!serverReady||!currentCheckout||currentCheckout.status!=='open';
    get('upload-button').textContent=uploading?'กำลังส่ง…':received?'ส่งหลักฐานแล้ว':'ส่งหลักฐานการชำระเงิน';
    ['customer-name','customer-email','customer-contact','paid-amount','transferred-at','receipt-file','registration-consent'].forEach(function(id){get(id).disabled=uploading||received;});
    get('purchase-status').textContent=purchaseNotice||(live?serverReady?'เปิดสิทธิ์เข้าเรียนภายใน 1 วันหลังชำระเงิน':offerFailed?'เชื่อมต่อระบบไม่สำเร็จ กดเชื่อมต่อใหม่เพื่อเปิด QR':'กำลังเชื่อมระบบลงทะเบียน หากรอนาน ติดต่อ LINE myclover ได้':'ตัวอย่างหน้าเว็บ · ลงทะเบียนได้บนเว็บจริง');
    get('payment-notice').textContent=currentCheckout&&clock()>=Date.parse(currentCheckout.expiresAt)?'รายการนี้หมดเวลาแล้ว หากโอนทันกำหนดไว้แล้ว แนบสลิปเดิมได้ เจ้าหน้าที่จะตรวจจากเวลาโอนจริง โปรดอย่าโอนซ้ำ':currentCheckout&&currentCheckout.status!=='open'?'รับสลิปแล้ว เปิดดูสถานะได้ในห้องเรียนของคุณ':'โอนตามยอด แล้วแนบสลิปด้านล่าง เปิดสิทธิ์เข้า myClover ภายใน 1 วันหลังชำระเงิน';
    if(previousPrice!==null&&previousPrice!==offer.currentPrice){copiedVersion++;if(serverReady&&offer.currentPrice>previousPrice)get('copy-status').textContent='ราคาเปลี่ยนแล้ว โปรดตรวจยอดก่อนโอน';}previousPrice=offer.currentPrice;
    var hasTerms=false;['access_terms','delivery_terms','bonus_terms','support_terms','refund_terms','tool_cost_terms','payment_deadline_policy'].forEach(function(key){var item=get('term-'+key);item.textContent=typeof config[key]==='string'?config[key]:'';if(key==='payment_deadline_policy'&&schoolState&&schoolState.recovery&&schoolState.recovery.active)item.textContent='ใช้สิทธิ์ตามยอดและเวลาสิ้นสุดที่แสดง โดยยึดเวลาโอนที่ตรวจสอบจริง';if(key==='bonus_terms'&&currentCheckout&&currentCheckout.priceTHB===790)item.textContent='แพ็ก 790 บาทมีบทเรียนและไฟล์ฝึกครบ แต่ไม่รวมคู่มือ PDF และ AI ผู้ช่วยงาน .md';item.parentElement.hidden=!item.textContent;hasTerms=hasTerms||!!item.textContent;});get('offer-terms').hidden=!hasTerms;
    return offer;
  }
  async function refreshOffer(){
    if(!live)return render();if(refreshing)return refreshing;
    refreshing=(async function(){
      try{
        var result=await checkoutJSON('/api/ai-source?action=offer',null,12000),response=result.response,data=result.data,raw=data&&data.offer;
        if(!response.ok||data.ok!==true||!raw||typeof raw.promoActive!=='boolean'||raw.timeZone!=='Asia/Bangkok'||raw.priceTHB!==(raw.promoActive?config.launch_price:config.regular_price))throw new Error('offer unavailable');
        var normalized=SauceOffer.normalizeServerVisit(config,{status:raw.promoActive?'valid':'expired',firstSeen:Date.parse(raw.firstSeenAt),endsAt:Date.parse(raw.expiresAt),serverNow:Date.parse(raw.serverNow)});
        if(normalized.status==='unavailable'||raw.promoPriceTHB!==config.launch_price||raw.regularPriceTHB!==config.regular_price)throw new Error('invalid offer');
        var priorOwner=schoolState&&schoolState.user&&schoolState.user.email;serverVisit=normalized;serverAnchor=Date.parse(raw.serverNow);monotonicAnchor=monotonic();serverReady=data.ready===true;offerFailed=!serverReady;schoolState=data.school||null;var nextOwner=schoolState&&schoolState.user&&schoolState.user.email;if((priorOwner&&priorOwner!==nextOwner)||(checkoutOwnerEmail&&checkoutOwnerEmail!==nextOwner))clearCheckout();
        // The payer can differ from the account owner. Preserve only what the user enters.
        if(payerNameOwnerEmail&&payerNameOwnerEmail!==nextOwner)get('customer-name').value='';
        payerNameOwnerEmail=nextOwner||null;
      }catch(_){serverVisit=null;serverReady=false;offerFailed=true;schoolState=null;checkoutRequest++;checkoutRestoring=false;checkoutStarting=false;}finally{refreshing=null;}
      return render();
    })();return refreshing;
  }
  var CHECKOUT_TIMEOUT_MS=20000;
  function clearCheckout(){
    checkoutRequest++;currentCheckout=null;checkoutOwnerEmail=null;checkoutRestoring=false;checkoutStarting=false;checkoutRestoreFailed=false;received=false;
    get('upload-status').textContent='กรอกข้อมูลตามสลิป แล้วกดส่งเพื่อลงทะเบียน';
  }
  function checkoutIsCurrent(request,email){return request===checkoutRequest&&serverReady&&schoolState&&schoolState.user&&schoolState.user.email===email;}
  async function checkoutJSON(url,options,timeoutMs){
    var abort=new window.AbortController(),timer;
    var timeout=new Promise(function(_,reject){timer=window.setTimeout(function(){abort.abort();var error=new Error('ระบบเปิดรายการชำระตอบช้า');error.name='CheckoutTimeoutError';reject(error);},timeoutMs||CHECKOUT_TIMEOUT_MS);});
    try{return await Promise.race([(async function(){var response=await fetch(url,Object.assign({},options,{credentials:'same-origin',cache:'no-store',signal:abort.signal}));return {response:response,data:await response.json()};})(),timeout]);}
    finally{window.clearTimeout(timer);}
  }
  function acceptCheckout(cart){
    if(!cart||!/^[-a-f0-9]{36}$/i.test(cart.id)||![790,990,1690].includes(cart.priceTHB)||!Number.isFinite(Date.parse(cart.expiresAt))||!['open','submitted','paid'].includes(cart.status))throw new Error('ข้อมูลรายการชำระไม่ครบ กรุณาลองใหม่');
    currentCheckout=cart;checkoutOwnerEmail=schoolState.user.email;received=cart.status!=='open';checkoutRestoreFailed=false;purchaseNotice='';
    try{sessionStorage.setItem('ai_sauce_checkout_v2',cart.id);}catch(_){}
    if(received)get('upload-status').textContent='รับสลิปแล้ว'+(cart.reference?' · '+cart.reference:'')+' เปิดดูสถานะและสิทธิ์ได้ที่ห้องเรียนของคุณ';
  }
  async function restoreCheckout(){
    if(!serverReady||!schoolState||!schoolState.user)return false;
    var id=schoolState.checkoutId;try{if(!id)id=sessionStorage.getItem('ai_sauce_checkout_v2');}catch(_){}if(!id)return false;
    var ownerEmail=schoolState.user.email,request=++checkoutRequest;checkoutRestoring=true;checkoutRestoreFailed=false;render();
    try{var result=await checkoutJSON('/api/ai-source?action=checkout&checkoutId='+encodeURIComponent(id)),response=result.response,data=result.data;
      if(!checkoutIsCurrent(request,ownerEmail))return null;
      if(!response.ok){if(response.status===404){try{sessionStorage.removeItem('ai_sauce_checkout_v2');}catch(_){}return false;}throw new Error('checkout restore unavailable');}
      acceptCheckout(data.checkout);render();return true;
    }catch(_){if(checkoutIsCurrent(request,ownerEmail)){checkoutRestoreFailed=true;purchaseNotice='ยังเปิดรายการชำระเดิมไม่ได้ กดลองอีกครั้งเพื่อตรวจรายการเดิมก่อนชำระ หากโอนแล้วอย่าโอนซ้ำ';}return null;}finally{if(request===checkoutRequest){checkoutRestoring=false;render();}}
  }
  async function beginCheckout(){
    if(uploading||checkoutRestoring||checkoutStarting)return;
    introSuppressed=true;closeIntro();
    // Revealing an already-authorized open cart does not create a payment or need
    // another offer lookup. Expiry still uses the server-anchored clock.
    var visibleOffer=render();
    if(live&&serverReady&&schoolState&&schoolState.user&&!schoolState.blocked&&!received&&!checkoutRestoreFailed&&currentCheckout&&checkoutOwnerEmail===schoolState.user.email&&currentCheckout.status==='open'&&clock()<Date.parse(currentCheckout.expiresAt)&&currentCheckout.priceTHB===visibleOffer.currentPrice){purchaseNotice='';render();get('bank-details').scrollIntoView({block:'start'});return;}
    var request=++checkoutRequest;checkoutStarting=true;render();
    try{
    await refreshOffer();
    if(request!==checkoutRequest)return;
    if(!serverReady){purchaseNotice='ยังตรวจสิทธิ์ไม่ได้ กรุณาลองใหม่ก่อนชำระเงิน';render();return;}
    if(!schoolState||!schoolState.user){var attribution=campaignAttribution(),returnQuery=new URLSearchParams();campaignKeys.forEach(function(key){if(attribution[key])returnQuery.set(key,attribution[key]);});window.location.assign('/learn/?enroll=ai-sauce&return='+encodeURIComponent('/ai-source/'+(returnQuery.size?'?'+returnQuery:'')+'#bank-details'));return;}
    if(schoolState.blocked){window.location.assign('/learn/?course=ai-sauce');return;}
    if(checkoutRestoreFailed){checkoutStarting=false;var restored=await restoreCheckout();if(restored!==false){if(restored===true)get('bank-details').scrollIntoView({block:'start'});return;}checkoutRestoreFailed=false;request=++checkoutRequest;checkoutStarting=true;render();}
    try{var ownerEmail=schoolState.user.email,body=campaignAttribution();
      var result=await checkoutJSON('/api/ai-source?action=checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),response=result.response,data=result.data;
      if(!checkoutIsCurrent(request,ownerEmail))return;
      if(!response.ok||!data.checkout){var checkoutError=new Error(data.message||'ยังเปิดรายการชำระไม่ได้');checkoutError.status=response.status;throw checkoutError;}acceptCheckout(data.checkout);
      try{sessionStorage.setItem('ai_sauce_checkout_v2',currentCheckout.id);}catch(_){}render();get('bank-details').scrollIntoView({block:'start'});
    }catch(error){if(checkoutIsCurrent(request,ownerEmail)){checkoutRestoreFailed=!error.status||error.status>=500;purchaseNotice=checkoutRestoreFailed?'ยังยืนยันการเปิดรายการไม่ได้ กดลองอีกครั้งเพื่อตรวจรายการเดิม หากโอนแล้วอย่าโอนซ้ำ':error.message;render();}}
    }finally{if(request===checkoutRequest){checkoutStarting=false;render();}}
  }
  get('purchase-button').addEventListener('click',beginCheckout);
  var retryOfferButton=get('retry-offer');if(retryOfferButton)retryOfferButton.addEventListener('click',async function(){
    if(refreshing||uploading||checkoutRestoring||checkoutStarting)return;
    retryOfferButton.disabled=true;await refreshOffer();
    if(!serverReady)return;
    var restored=await restoreCheckout();
    if(restored===true)get('bank-details').scrollIntoView({block:'start'});
    else if(restored===false&&location.hash==='#bank-details'&&schoolState&&schoolState.user&&!schoolState.blocked)await beginCheckout();
  });
  var recoveryButton=get('claim-recovery');if(recoveryButton)recoveryButton.addEventListener('click',async function(){
    if(uploading||received||checkoutRestoring||checkoutStarting)return;recoveryButton.disabled=true;try{var r=await fetch('/api/ai-source?action=recovery',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'}),d=await r.json();if(!r.ok)throw new Error(d.message||'ยังเปิดสิทธิ์ไม่ได้');await refreshOffer();await beginCheckout();}catch(error){purchaseNotice=error.message;render();}finally{recoveryButton.disabled=false;}
  });
  function copyPayment(accountOnly){
    var offer=render();if(!serverReady||!currentCheckout||currentCheckout.status!=='open'||!schoolState||!schoolState.user||schoolState.user.email!==checkoutOwnerEmail||clock()>=Date.parse(currentCheckout.expiresAt))return;var b=config.bank,version=++copiedVersion,price=currentCheckout.priceTHB;
    var text=accountOnly?b.account_number:[b.name,b.account_number,b.account_name,money.format(price),offer.showLaunchOffer?deadline(offer.endsAt):'ราคาปกติ','ลงทะเบียนและแนบสลิป: https://www.myclover.com/ai-source/'].join('\n');
    try{window.navigator.clipboard.writeText(text).then(function(){if(version===copiedVersion&&render().currentPrice===price)get('copy-status').textContent='คัดลอกแล้ว';}).catch(function(){get('copy-status').textContent='เลือกคัดลอกข้อมูลบัญชีด้านบนได้';});}catch(_){get('copy-status').textContent='เลือกคัดลอกข้อมูลบัญชีด้านบนได้';}
  }
  get('copy-account').addEventListener('click',function(){copyPayment(true);});get('copy-payment').addEventListener('click',function(){copyPayment(false);});
  get('paid-amount').addEventListener('input',function(){amountEdited=true;});
  get('receipt-file').addEventListener('change',function(){
    if(previewUrl)window.URL.revokeObjectURL(previewUrl);previewUrl=null;get('receipt-preview').hidden=true;get('receipt-preview').removeAttribute('src');
    selectedFile=get('receipt-file').files&&get('receipt-file').files[0];var error=SauceOffer.validateReceipt(selectedFile);
    if(error){selectedFile=null;get('file-status').textContent=error;return;}get('file-status').textContent=selectedFile.name+' · '+(selectedFile.size/1048576).toFixed(2)+' MB';
    if(selectedFile.type!=='application/pdf'){previewUrl=window.URL.createObjectURL(selectedFile);get('receipt-preview').src=previewUrl;get('receipt-preview').hidden=false;}
  });
  function fileBase64(file){return new Promise(function(resolve,reject){var reader=new window.FileReader();reader.onload=function(){resolve(String(reader.result).split(',')[1]);};reader.onerror=function(){reject(new Error('อ่านสลิปไม่ได้ กรุณาเลือกไฟล์อีกครั้ง'));};reader.readAsDataURL(file);});}
  async function retryIdentity(canonical){
    var bytes=await window.crypto.subtle.digest('SHA-256',new window.TextEncoder().encode(canonical));
    var hash=Array.from(new Uint8Array(bytes)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');
    if(requestKey&&requestFingerprint===hash)return requestKey;
    try{var saved=JSON.parse(window.sessionStorage.getItem('ai_sauce_receipt_retry_v1'));if(saved&&saved.fingerprint===hash&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.key)){requestKey=saved.key;requestFingerprint=hash;return requestKey;}}catch(_){}
    requestKey=window.crypto.randomUUID();requestFingerprint=hash;
    try{window.sessionStorage.setItem('ai_sauce_receipt_retry_v1',JSON.stringify({key:requestKey,fingerprint:hash}));}catch(_){}
    return requestKey;
  }
  get('receipt-form').addEventListener('submit',async function(event){
    event.preventDefault();if(uploading||received)return;
    var snapshot={name:get('customer-name').value.trim(),email:get('customer-email').value.trim(),contact:get('customer-contact').value.trim(),amount:get('paid-amount').value.trim(),transfer:get('transferred-at').value,file:selectedFile,consent:get('registration-consent').checked,website:get('website').value};
    uploading=true;render();var timeout;
    try{
      var offer=await refreshOffer();if(!live||!serverReady||!SauceOffer.canUpload(config,offer,window.location.protocol))throw new Error('ระบบยังไม่พร้อม กรุณาติดต่อ LINE myclover');
      var name=snapshot.name,email=snapshot.email,contact=snapshot.contact,amount=snapshot.amount,transfer=snapshot.transfer;
      var file=snapshot.file,error=SauceOffer.validateReceipt(file);
      if(!name||name.length>120)error='กรอกชื่อผู้ชำระ';else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))error='ตรวจอีเมลสำหรับรับสิทธิ์เรียน';else if(!contact)error='กรอกเบอร์โทรหรือ LINE สำหรับติดต่อ';else if(!/^\d+(?:\.\d{1,2})?$/.test(amount)||Number(amount)<=0)error='กรอกยอดโอนจริงตามสลิป';else if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(transfer))error='เลือกวันและเวลาโอนตามสลิป (เวลาไทย)';else if(!snapshot.consent)error='ยืนยันสิทธิ์เรียนและเงื่อนไขก่อนลงทะเบียน';if(error)throw new Error(error);
      var base64=await fileBase64(file);
      var clean=function(s){return s.replace(/[\u0000-\u001f\u007f]/g,'').trim();};
      var fingerprint=JSON.stringify({name:clean(name),email:clean(email).toLowerCase(),contact:clean(contact),amount:Number(amount),transfer:new Date(transfer+':00+07:00').toISOString(),mime:file.type,base64:base64,consent:true,checkoutId:currentCheckout&&currentCheckout.id});
      await retryIdentity(fingerprint);
      if(!currentCheckout)throw new Error('เปิดรายการชำระก่อนส่งสลิป');
      var payload={checkoutId:currentCheckout.id,idempotencyKey:requestKey,name:name,email:email,contact:contact,amountTHB:Number(amount),transferredAt:transfer+':00+07:00',receipt:{name:file.name,mime:file.type,base64:base64},consent:true,website:snapshot.website};
      get('upload-status').textContent='กำลังส่งสลิปและข้อมูลลงทะเบียน…';var abort=new window.AbortController();timeout=window.setTimeout(function(){abort.abort();},30000);
      var response=await window.fetch('/api/ai-source',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',signal:abort.signal}),data=await response.json();
      var accepted=response.status===201&&data.status==='pending_verification'||response.status===200&&data.replayed===true&&['pending_verification','payment_verified','admitted'].includes(data.status);
      var admissionTime=Date.parse(data.admissionDueAt);
      if(!accepted||data.ok!==true||!/^SAUCE-[0-9A-F]{32}$/.test(data.reference||'')||!Number.isFinite(admissionTime)||admissionTime<Date.UTC(2020,0,1)||admissionTime>clock()+86400000+360000)throw new Error(data.message||'ยังยืนยันการรับข้อมูลไม่ได้ ติดต่อ LINE พร้อมสลิป และอย่าโอนซ้ำ');
      var dueText=fullDate.format(new Date(data.admissionDueAt));
      received=true;currentCheckout.status=['payment_verified','admitted'].includes(data.status)?'paid':'submitted';currentCheckout.reference=data.reference;if(schoolState)schoolState.blocked=true;get('upload-status').textContent='รับลงทะเบียนแล้ว · '+data.reference+(data.status==='admitted'?' · เปิดสิทธิ์เข้าเรียนให้แล้ว เปิดห้องเรียนที่ /learn ได้เลย':' รอตรวจยอดและเปิดสิทธิ์ในบัญชีภายใน '+dueText+' น. หากเลยเวลา ติดต่อ LINE myclover พร้อมเลขอ้างอิงนี้');
    }catch(error){get('upload-status').textContent=error.name==='AbortError'||error instanceof TypeError?'ยังยืนยันการรับข้อมูลไม่ได้ ส่งซ้ำได้โดยไม่โอนซ้ำ หรือติดต่อ LINE myclover พร้อมสลิป':error.message;}
    finally{if(timeout)window.clearTimeout(timeout);uploading=false;render();}
  });
  // Introductory lesson opens only after email verification in /learn.
  render();refreshOffer().then(async function(){var restored=await restoreCheckout();if(restored===false&&location.hash==='#bank-details'&&serverReady&&schoolState&&schoolState.user&&!schoolState.blocked)beginCheckout();});window.setInterval(render,1000);window.setInterval(function(){if(!document.hidden)refreshOffer();},60000);
  window.addEventListener('focus',refreshOffer);window.addEventListener('storage',function(){if(!live)render();});document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshOffer();});
})();
