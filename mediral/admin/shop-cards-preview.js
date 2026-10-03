// Content/layout preview, not an official LINE renderer. Never sends messages.
const sizes={xxl:'28px',xl:'22px',lg:'20px',md:'16px',sm:'14px',xs:'12px'};
const gaps={sm:'8px',md:'12px',lg:'18px'};
export function renderComponent(n){
 const e=document.createElement(n.type==='image'?'img':n.type==='text'?'p':n.type==='button'?'a':'div');
 if(n.type==='text'){e.textContent=n.text;e.style.fontSize=sizes[n.size]||'14px';e.style.fontWeight=n.weight==='bold'?'700':'400';e.style.whiteSpace='pre-line';e.style.margin='0';e.style.lineHeight='1.55';}
 if(n.type==='image'){e.src=location.hostname==='127.0.0.1'?new URL(n.url).pathname:n.url;e.alt='ภาพประกอบสินค้า Mediral';e.style.width='100%';e.style.aspectRatio=n.aspectRatio?.replace(':','/')||'1';e.style.objectFit=n.aspectMode==='fill'?'cover':'contain';}
 if(n.type==='button'){e.textContent=n.action.label;e.className='shop-card-action '+(n.style==='primary'?'primary':'');if(n.action.type==='uri'){e.href=n.action.uri;e.target='_blank';e.rel='noopener';}else{e.href='#';e.title='ใน LINE จะส่ง: '+n.action.text;e.onclick=event=>{event.preventDefault();document.querySelector('#cards-status').textContent='ปุ่มนี้ใน LINE จะส่ง “'+n.action.text+'” (พรีวิวไม่ส่งข้อความ)';};}}
 if(n.type==='box'){e.style.display='flex';e.style.flexDirection=n.layout==='horizontal'?'row':'column';e.style.gap=gaps[n.spacing]||'0';e.style.padding=n.paddingAll||'0';for(const c of n.contents||[])e.append(renderComponent(c));}
 if(n.color)e.style.color=n.color;if(n.backgroundColor)e.style.background=n.backgroundColor;
 return e;
}
export function renderCards(message,target){
 target.replaceChildren();for(const b of message.contents.contents){const card=document.createElement('article');card.className='shop-card';if(b.hero)card.append(renderComponent(b.hero));card.append(renderComponent(b.body));const footer=renderComponent(b.footer);footer.style.marginTop='auto';card.append(footer);target.append(card);}target.hidden=false;
}
export function mountCards(api){
 document.querySelector('#cards-preview').onclick=async()=>{try{const r=await api('cards-preview');renderCards(r.messages[0],document.querySelector('#cards'));document.querySelector('#cards-status').textContent='7 การ์ด · ราคาตามเวลาปัจจุบัน · ไม่มีการส่งเข้าแชท';}catch(e){document.querySelector('#cards-status').textContent=e.message;}};
 document.querySelector('#cards-validate').onclick=async event=>{event.target.disabled=true;try{const r=await api('cards-validate',{});document.querySelector('#cards-status').textContent=r.valid?'LINE ตรวจรูปแบบผ่านแล้ว · ไม่ได้ส่งข้อความให้ลูกค้า':'ยังตรวจไม่ผ่าน';}catch(e){document.querySelector('#cards-status').textContent=e.message;}finally{event.target.disabled=false;}};
}
