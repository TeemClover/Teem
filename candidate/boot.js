// Keep feedback visible even while the module or private API is loading.
(function(){
 var panel=document.getElementById('app-loading');
 var message=document.getElementById('loading-message');
 var retry=document.getElementById('retry-load');
 var done=false;
 function show(text){if(done)return;if(message)message.textContent=text;if(retry)retry.hidden=false;}
 var timer=setTimeout(function(){show('การเชื่อมต่อใช้เวลานานกว่าปกติ กดลองโหลดอีกครั้งได้');},12000);
 window.addEventListener('candidate:ready',function(){done=true;clearTimeout(timer);if(panel)panel.hidden=true;});
 if(retry)retry.addEventListener('click',function(){location.reload();});
 import('/candidate/candidate.js?v=20261102-score2').catch(function(){clearTimeout(timer);show('เปิดระบบไม่สำเร็จ กรุณากดลองโหลดอีกครั้ง');});
})();
