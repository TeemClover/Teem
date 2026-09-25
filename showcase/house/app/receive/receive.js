const button=document.querySelector('#copy'),prompt=document.querySelector('#start-prompt'),details=document.querySelector('#prompt-details'),status=document.querySelector('#copy-status');
button.addEventListener('click',async()=>{
 let copied=false;
 try{await navigator.clipboard.writeText(prompt.value);copied=true;}catch{
  details.open=true;prompt.focus();prompt.select();prompt.setSelectionRange(0,prompt.value.length);
  try{copied=document.execCommand('copy');}catch{}
 }
 if(copied){button.textContent='คัดลอกแล้ว ✓';status.textContent='กลับไปที่ Work แล้ววางคำสั่งได้เลย';}
 else{button.textContent='ลองคัดลอกอีกครั้ง';status.textContent='เลือกข้อความไว้ให้แล้ว กดคัดลอกหรือ Ctrl/Cmd+C แล้ววางใน Work';}
});
