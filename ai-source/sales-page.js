(function () {
  'use strict';
  var get = function (id) { return document.getElementById(id); }, config;
  try { config = JSON.parse(get('offer-config').textContent); } catch (_) { return; }
  var storage; try { storage = window.localStorage; } catch (_) { storage = null; }
  var live = config.sales_enabled === true && window.location.protocol === 'https:';
  var tracker = SauceOffer.createVisitTracker(Object.assign({}, config, {storage_key:config.storage_key+':preview', offer_id:config.offer_id+':preview'}), storage);
  var serverVisit=null, serverReady=false, refreshing=null, serverAnchor=0, monotonicAnchor=0;
  var money=new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0});
  var day=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'});
  var fullDate=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'});
  var previousPrice=null, amountEdited=false, uploading=false, selectedFile=null, previewUrl=null, requestKey=null, requestFingerprint=null, copiedVersion=0, received=false;
  function monotonic(){return window.performance ? window.performance.now() : Date.now();}
  function clock(){return live&&serverVisit ? Math.floor(serverAnchor+Math.max(0,monotonic()-monotonicAnchor)) : Date.now();}
  function deadline(end){return (end+7*3600000)%86400000===0?'ราคาพิเศษถึง '+day.format(new Date(end-1))+' เวลา 23:59 น.':'ราคาพิเศษถึง '+fullDate.format(new Date(end))+' น.';}
  function render(){
    var now=clock(), effective=Object.assign({},config,{sales_enabled:live&&serverReady});
    var offer=SauceOffer.evaluateOffer(effective,now,live?serverVisit:tracker.read(now));
    var price=offer.currentPrice===null?'กำลังตรวจราคา':money.format(offer.currentPrice);
    document.documentElement.dataset.offerState=offer.state;
    get('launch-offer').hidden=!offer.showLaunchOffer; get('hero-offer').hidden=offer.currentPrice===null;
    get('countdown').hidden=get('sticky-countdown').hidden=!offer.showCountdown;
    get('sticky-offer-status').hidden=offer.showCountdown;
    get('sticky-offer-status').textContent=live&&!serverReady?'กำลังตรวจสิทธิ์':offer.state==='expired'?'โปรสิ้นสุดแล้ว':'ราคาปกติ';
    ['current-price','hero-launch-price','bank-amount'].forEach(function(id){get(id).textContent=price;});
    get('hero-price-label').textContent=offer.showLaunchOffer?'ราคาพิเศษ · ปกติ '+money.format(config.regular_price):'ราคาปกติ';
    get('price-label').textContent=offer.showLaunchOffer?'ราคาพิเศษสำหรับคุณ':'ราคาปกติ';
    get('regular-price').hidden=!offer.showLaunchOffer; get('regular-price').textContent=offer.showLaunchOffer?'ปกติ '+money.format(config.regular_price):'';
    get('hero-offer-end').textContent=get('offer-end').textContent=offer.showLaunchOffer?deadline(offer.endsAt):offer.state==='expired'?'สิ้นสุดราคาพิเศษแล้ว':'';
    get('time-left').textContent=get('sticky-time-left').textContent='';
    if(offer.showCountdown){var p=SauceOffer.countdownParts(offer.remainingMs);get('time-left').textContent=get('sticky-time-left').textContent=(p.days?p.days+' วัน ':'')+[p.hours,p.minutes,p.seconds].map(function(n){return String(n).padStart(2,'0');}).join(':');}
    get('purchase-button').disabled=!offer.canPurchase; get('purchase-button').textContent='ลงทะเบียนเรียน · '+price;
    get('bank-details').hidden=!offer.canPurchase;
    var b=config.bank||{}; get('bank-name').textContent=b.name||'';get('bank-account').textContent=b.account_number||'';get('bank-owner').textContent=b.account_name||'';
    get('copy-account').disabled=get('copy-payment').disabled=get('receipt-button').disabled=!offer.canPurchase;
    get('receipt-button').textContent='ส่งสลิปทาง LINE';
    // The actual transferred amount is entered from the slip, never derived from the current quote.
    get('upload-button').disabled=uploading||received||!live||!serverReady||!SauceOffer.canUpload(config,offer,window.location.protocol);
    get('upload-button').textContent=uploading?'กำลังส่ง…':received?'รับลงทะเบียนแล้ว':'ส่งสลิปและลงทะเบียน';
    ['customer-name','customer-email','customer-contact','paid-amount','transferred-at','receipt-file','registration-consent'].forEach(function(id){get(id).disabled=uploading||received;});
    get('purchase-status').textContent=live?serverReady?'เปิดสิทธิ์เข้าเรียนภายใน 1 วันหลังชำระเงิน':'กำลังเชื่อมระบบลงทะเบียน หากรอนาน ติดต่อ LINE myclover ได้':'ตัวอย่างหน้าเว็บ · ลงทะเบียนได้บนเว็บจริง';
    get('payment-notice').textContent='โอนตามยอด แล้วแนบสลิปด้านล่าง เปิดสิทธิ์เข้า Skool ภายใน 1 วันหลังชำระเงิน';
    if(previousPrice!==null&&previousPrice!==offer.currentPrice){copiedVersion++;get('copy-status').textContent='ราคาเปลี่ยนแล้ว โปรดตรวจยอดก่อนโอน';}previousPrice=offer.currentPrice;
    var hasTerms=false;['access_terms','delivery_terms','support_terms','refund_terms','tool_cost_terms','payment_deadline_policy'].forEach(function(key){var item=get('term-'+key);item.textContent=typeof config[key]==='string'?config[key]:'';item.parentElement.hidden=!item.textContent;hasTerms=hasTerms||!!item.textContent;});get('offer-terms').hidden=!hasTerms;
    return offer;
  }
  async function refreshOffer(){
    if(!live)return render();if(refreshing)return refreshing;
    refreshing=(async function(){
      var abort=new window.AbortController(),timeout=window.setTimeout(function(){abort.abort();},12000);
      try{
        var response=await window.fetch('/api/ai-source?action=offer',{credentials:'same-origin',cache:'no-store',signal:abort.signal});
        var data=await response.json(),raw=data&&data.offer;
        if(!response.ok||data.ok!==true||!raw||typeof raw.promoActive!=='boolean'||raw.timeZone!=='Asia/Bangkok'||raw.priceTHB!==(raw.promoActive?config.launch_price:config.regular_price))throw new Error('offer unavailable');
        var normalized=SauceOffer.normalizeServerVisit(config,{status:raw.promoActive?'valid':'expired',firstSeen:Date.parse(raw.firstSeenAt),endsAt:Date.parse(raw.expiresAt),serverNow:Date.parse(raw.serverNow)});
        if(normalized.status==='unavailable'||raw.promoPriceTHB!==config.launch_price||raw.regularPriceTHB!==config.regular_price)throw new Error('invalid offer');
        serverVisit=normalized;serverAnchor=Date.parse(raw.serverNow);monotonicAnchor=monotonic();serverReady=data.ready===true;
      }catch(_){serverVisit=null;serverReady=false;}finally{window.clearTimeout(timeout);refreshing=null;}
      return render();
    })();return refreshing;
  }
  get('purchase-button').addEventListener('click',async function(){if((await refreshOffer()).canPurchase)get('bank-details').scrollIntoView({behavior:'auto',block:'start'});});
  get('receipt-button').addEventListener('click',function(){var offer=render();if(offer.canPurchase)window.location.assign(offer.purchaseUrl);});
  function copyPayment(accountOnly){
    var offer=render();if(!offer.canPurchase)return;var b=config.bank,version=++copiedVersion,price=offer.currentPrice;
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
      var fingerprint=JSON.stringify({name:clean(name),email:clean(email).toLowerCase(),contact:clean(contact),amount:Number(amount),transfer:new Date(transfer+':00+07:00').toISOString(),mime:file.type,base64:base64,consent:true});
      await retryIdentity(fingerprint);
      var payload={idempotencyKey:requestKey,name:name,email:email,contact:contact,amountTHB:Number(amount),transferredAt:transfer+':00+07:00',receipt:{name:file.name,mime:file.type,base64:base64},consent:true,website:snapshot.website};
      get('upload-status').textContent='กำลังส่งสลิปและข้อมูลลงทะเบียน…';var abort=new window.AbortController();timeout=window.setTimeout(function(){abort.abort();},30000);
      var response=await window.fetch('/api/ai-source',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',signal:abort.signal}),data=await response.json();
      var accepted=response.status===201&&data.status==='pending_verification'||response.status===200&&data.replayed===true&&['pending_verification','payment_verified','admitted'].includes(data.status);
      var admissionTime=Date.parse(data.admissionDueAt);
      if(!accepted||data.ok!==true||!/^SAUCE-[0-9A-F]{32}$/.test(data.reference||'')||!Number.isFinite(admissionTime)||admissionTime<Date.UTC(2020,0,1)||admissionTime>clock()+86400000+360000)throw new Error(data.message||'ยังยืนยันการรับข้อมูลไม่ได้ ติดต่อ LINE พร้อมสลิป และอย่าโอนซ้ำ');
      var dueText=fullDate.format(new Date(data.admissionDueAt));
      received=true;get('upload-status').textContent='รับลงทะเบียนแล้ว · '+data.reference+(data.status==='admitted'?' · เปิดสิทธิ์เข้าเรียนให้แล้ว ตรวจคำเชิญที่ช่องทางติดต่อของคุณ':' รอตรวจยอดและส่งคำเชิญเข้าเรียนภายใน '+dueText+' น. หากเลยเวลา ติดต่อ LINE myclover พร้อมเลขอ้างอิงนี้');
    }catch(error){get('upload-status').textContent=error.name==='AbortError'||error instanceof TypeError?'ยังยืนยันการรับข้อมูลไม่ได้ ส่งซ้ำได้โดยไม่โอนซ้ำ หรือติดต่อ LINE myclover พร้อมสลิป':error.message;}
    finally{if(timeout)window.clearTimeout(timeout);uploading=false;render();}
  });
  document.querySelectorAll('[data-play-sample]').forEach(function(link){link.addEventListener('click',function(){var p=get('sample-video').play();if(p&&p.catch)p.catch(function(){});});});
  render();refreshOffer();window.setInterval(render,1000);window.setInterval(function(){if(!document.hidden)refreshOffer();},60000);
  window.addEventListener('focus',refreshOffer);window.addEventListener('storage',function(){if(!live)render();});document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshOffer();});
})();
