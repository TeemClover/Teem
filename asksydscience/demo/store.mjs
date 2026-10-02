import {CATEGORIES,BRANDS,PRODUCTS,COLLECTIONS,getProduct,getBrand,money,discount,emptyFilter,filterProducts,cleanCart,cartTotals} from './catalog.mjs';
import {pack,icon} from './art.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let filter=emptyFilter(),saved=[],cart=[],code='',limit=12,activeProduct=null,toastTimer;
const drawers=['product-dialog','cart-dialog','filters-dialog','info-dialog','order-dialog'];
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function openDialog(id){drawers.forEach(d=>{if(d!==id&&$(d).open)$(d).close();});$(id).showModal();document.body.classList.add('modal-open');}
function closeDialog(id){$(id).close();}
function productCard(p){const d=discount(p),fav=saved.includes(p.id);return `<article class="product-card" data-card="${p.id}"><div class="product-image"><button type="button" class="product-visual" data-product="${p.id}" aria-label="ดู ${esc(p.name)}">${pack(p)}</button><button type="button" class="save-button ${fav?'is-saved':''}" data-save="${p.id}" aria-pressed="${fav}" aria-label="${fav?'เลิกบันทึก':'บันทึก'} ${esc(p.name)}">${icon('heart')}</button>${!p.available?'<span class="product-badge neutral">เร็ว ๆ นี้ · เดโม</span>':d?`<span class="product-badge">−${d}% <small>ตัวอย่าง</small></span>`:p.isNew?'<span class="product-badge new">ใหม่ในเดโม</span>':''}</div><div class="product-copy"><button type="button" class="brand-label" data-brand="${p.brand}">${esc(getBrand(p.brand).name)}</button><h3><button type="button" data-product="${p.id}">${esc(p.name)}</button></h3><p class="product-size">${esc(p.size)}${p.variants.length>1?' · มีแพ็กคู่':''}</p><div class="product-price"><strong>฿${money(p.price)}</strong>${p.was?`<del>฿${money(p.was)}</del>`:''}</div><button type="button" class="add-button" data-add="${p.id}" ${!p.available?'disabled':''}>${p.available?icon('bag')+'เพิ่มในตะกร้า':'ยังไม่เปิดในเดโม'}</button></div></article>`;}
function buildHome(){
 document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
 $('nav-categories').innerHTML=CATEGORIES.map(c=>`<button type="button" data-shop="${c.id}">${c.short}</button>`).join('');
 const catProducts=['p01','p02','p03','p04','p05','p06'];
 $('category-tiles').innerHTML=CATEGORIES.map((c,i)=>`<button type="button" data-shop="${c.id}" class="category-tile"><span style="background:${c.color}">${pack(getProduct(catProducts[i]))}</span><strong>${c.name}</strong><small>${PRODUCTS.filter(p=>p.category===c.id).length} รายการตัวอย่าง</small></button>`).join('');
 $('hero-products').innerHTML=['p02','p01','p03','p04'].map((id,i)=>`<span class="hero-pack hero-pack-${i}">${pack(getProduct(id))}</span>`).join('');
 $('morning-art').innerHTML=pack(getProduct('p08'));$('evening-art').innerHTML=pack(getProduct('p28'));
 $('featured-grid').innerHTML=PRODUCTS.slice(0,6).map(productCard).join('');
 $('brand-grid').innerHTML=BRANDS.map(b=>`<button type="button" data-brand="${b.id}" style="--brand-color:${b.color};--brand-paper:${b.paper}" class="brand-tile brand-${b.id}"><strong>${esc(b.name)}</strong><small>${esc(b.line)}</small></button>`).join('');
 $('category-filters').innerHTML=CATEGORIES.map(c=>`<label><input type="checkbox" name="category" value="${c.id}"><span>${c.name}</span><small>${PRODUCTS.filter(p=>p.category===c.id).length}</small></label>`).join('');
 $('brand-filters').innerHTML=BRANDS.map(b=>`<label><input type="checkbox" name="brand" value="${b.id}"><span>${esc(b.name)}</span><small>${PRODUCTS.filter(p=>p.brand===b.id).length}</small></label>`).join('');
}
function chips(){
 const list=[];
 if(filter.query)list.push(['query',filter.query,'ค้นหา: '+filter.query]);
 filter.categories.forEach(v=>list.push(['category',v,CATEGORIES.find(c=>c.id===v).name]));
 filter.brands.forEach(v=>list.push(['brand',v,getBrand(v).name]));
 if(filter.collection!=='all')list.push(['collection',filter.collection,COLLECTIONS.find(c=>c.id===filter.collection).name]);
 if(filter.range!=='all')list.push(['range',filter.range,{under300:'ต่ำกว่า 300 บาท','300to600':'300–600 บาท',over600:'มากกว่า 600 บาท'}[filter.range]]);
 if(filter.savedOnly)list.push(['saved','saved','รายการโปรด']);
 $('active-filters').innerHTML=list.map(([key,value,name])=>`<button type="button" data-clear-key="${key}" data-clear-value="${esc(value)}">${esc(name)} <span aria-hidden="true">×</span><span class="sr-only">ลบตัวกรอง</span></button>`).join('');
 $('filter-count').textContent=list.length||'';
}
function syncFilters(){
 document.querySelectorAll('input[name="category"]').forEach(el=>el.checked=filter.categories.includes(el.value));
 document.querySelectorAll('input[name="brand"]').forEach(el=>el.checked=filter.brands.includes(el.value));
 document.querySelectorAll('input[name="range"]').forEach(el=>el.checked=filter.range===el.value);
 $('search').value=filter.query;$('sort').value=filter.sort;$('saved-btn').setAttribute('aria-pressed',String(filter.savedOnly));
 document.querySelectorAll('[data-shop]').forEach(el=>el.classList.toggle('active',filter.categories.length===1&&filter.categories[0]===el.dataset.shop));
}
function renderProducts(){
 const results=filterProducts(filter,saved);$('product-grid').innerHTML=results.slice(0,limit).map(productCard).join('');
 $('empty-results').hidden=results.length>0;$('load-more').hidden=results.length<=limit;
 $('result-count').textContent=`พบ ${results.length} รายการ${filter.savedOnly?'ที่บันทึกไว้':'ตัวอย่าง'}`;
 $('showing-count').textContent=results.length?`แสดง ${Math.min(limit,results.length)} จาก ${results.length} รายการ` : '';
 chips();syncFilters();
}
function goShop(){limit=12;renderProducts();$('catalogue').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function resetFilters(){filter=emptyFilter();goShop();}
function toggleSaved(id){
 if(!getProduct(id))return;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];
 $('saved-count').textContent=saved.length;$('saved-count').hidden=!saved.length;
 document.querySelectorAll(`[data-save="${id}"]`).forEach(btn=>{const yes=saved.includes(id);btn.classList.toggle('is-saved',yes);btn.setAttribute('aria-pressed',String(yes));btn.setAttribute('aria-label',(yes?'เลิกบันทึก ':'บันทึก ')+getProduct(id).name);});
 if(filter.savedOnly)renderProducts();
 toast(saved.includes(id)?'เก็บไว้ในรายการโปรดของเดโมแล้ว':'นำออกจากรายการโปรดแล้ว');
}
function addCart(id,variant='standard',qty=1){
 const p=getProduct(id);if(!p?.available||!p.variants.some(v=>v.id===variant))return;
 const line=cart.find(l=>l.id===id&&l.variant===variant),current=line?.qty||0;
 if(current>=9){toast('เดโมจำกัดไม่เกิน 9 ชิ้นต่อขนาดสินค้า');return;}
 const n=Math.max(1,Math.min(9,Math.trunc(Number(qty))||1));
 if(line)line.qty=Math.min(9,current+n);else cart.push({id,variant,qty:n});
 cart=cleanCart(cart);renderCart();toast('เพิ่ม '+p.name+' ในตะกร้าทดลองแล้ว');
}
function renderCart(){
 const q=cartTotals(cart,code);cart=q.cart;
 $('cart-count').textContent=q.count;$('drawer-count').textContent=`(${q.count})`;
 $('cart-empty').hidden=!!q.count;$('cart-filled').hidden=!q.count;
 $('cart-lines').innerHTML=cart.map(l=>{const p=getProduct(l.id),v=p.variants.find(v=>v.id===l.variant),key=l.id+':'+l.variant;return `<article class="cart-line"><div class="cart-art">${pack(p)}</div><div class="cart-line-content"><small>${esc(getBrand(p.brand).name)}</small><h3>${esc(p.name)}</h3><p>${esc(v.name)}</p><div class="cart-line-bottom"><div class="stepper"><button type="button" data-qty="-1" data-key="${key}" aria-label="ลด ${esc(p.name)}">−</button><span aria-label="จำนวน ${l.qty} ชิ้น">${l.qty}</span><button type="button" data-qty="1" data-key="${key}" aria-label="เพิ่ม ${esc(p.name)}" ${l.qty===9?'disabled':''}>+</button></div><b>฿${money(v.price*l.qty)}</b></div></div><button type="button" class="line-remove" data-remove="${key}" aria-label="ลบ ${esc(p.name)}">×</button></article>`;}).join('');
 $('shipping-message').textContent=q.remaining?'เพิ่มอีก ฿'+money(q.remaining)+' เพื่อดูสถานะส่งฟรีในเดโม':'ตะกร้านี้ถึงเกณฑ์ส่งฟรีตัวอย่างแล้ว';
 $('cart-subtotal').textContent='฿'+money(q.subtotal);$('discount-row').hidden=!q.saving;$('cart-discount').textContent='−฿'+money(q.saving);$('cart-shipping').textContent=q.shipping?'฿'+money(q.shipping):'ฟรี (ตัวอย่าง)';$('cart-total').textContent='฿'+money(q.total);
 if(code){$('coupon-status').textContent='ใช้โค้ด SYD10 แล้ว · ส่วนลดสมมุติ 10%';$('coupon-status').className='success';}
}
function productDetail(id){
 const p=getProduct(id);if(!p){toast('ไม่พบสินค้านี้ในเดโม');return;}activeProduct=p;
 const category=CATEGORIES.find(c=>c.id===p.category),b=getBrand(p.brand),d=discount(p);
 $('product-detail').innerHTML=`<div class="detail-grid"><div class="detail-art" style="background:${b.paper}">${pack(p)}<span>MOCK PRODUCT · NOT FOR SALE</span></div><div class="detail-copy"><p class="eyebrow">${esc(category.name)} / ${esc(b.name)}</p><h2 id="detail-title">${esc(p.name)}</h2><p class="detail-intro">${esc(p.description)}</p><div class="detail-price"><strong id="detail-price">฿${money(p.price)}</strong><del id="detail-was" ${!p.was?'hidden':''}>฿${money(p.was)}</del></div><p class="detail-demo-price">ราคาสมมุติสำหรับทดลองหน้าร้าน</p><fieldset class="variant-field"><legend>เลือกขนาด</legend>${p.variants.map((v,i)=>`<label><input type="radio" name="variant" value="${v.id}" ${!i?'checked':''}><span>${esc(v.name)}</span></label>`).join('')}</fieldset><div class="detail-buy"><div class="stepper"><button type="button" data-detail-qty="-1" aria-label="ลดจำนวน">−</button><output id="detail-qty">1</output><button type="button" data-detail-qty="1" aria-label="เพิ่มจำนวน">+</button></div><button type="button" id="detail-add" class="button dark" ${p.available?'':'disabled'}>${icon('bag')}${p.available?'เพิ่มในตะกร้าทดลอง':'ยังไม่เปิดในเดโม'}</button></div><div class="detail-secondary"><button type="button" data-save="${p.id}" aria-pressed="${saved.includes(p.id)}" class="detail-save ${saved.includes(p.id)?'is-saved':''}">${icon('heart')} เก็บไว้ดูภายหลัง</button><button type="button" id="share-product">${icon('share')} แชร์รายการ</button></div><div class="detail-facts"><div><span>แบรนด์</span><b>${esc(b.name)} (สมมุติ)</b></div><div><span>ประเภท</span><b>${esc(category.name)}</b></div><div><span>รูปแบบ</span><b>${esc(p.size)}</b></div><div><span>สถานะ</span><b>${p.available?'เพิ่มลงตะกร้าทดลองได้':'รอตัวอย่างสินค้า'}</b></div></div><details class="detail-note" open><summary>อ่านก่อนทดลองเลือก</summary><p>ภาพ ฉลาก ขนาด และราคาเป็นข้อมูลจำลอง ยังไม่มีสูตร ส่วนผสม งานวิจัย หรือรีวิวจริง จึงไม่ใช่คำแนะนำให้รับประทานหรือใช้สินค้า และไม่แสดงคุณประโยชน์ทางการแพทย์</p></details></div></div>`;
 openDialog('product-dialog');
 try{const u=new URL(location.href);u.searchParams.set('product',id);history.replaceState(null,'',u);}catch{/* File preview may not support history. */}
}
function changeLine(key,delta,remove=false){
 const l=cart.find(x=>x.id+':'+x.variant===key);if(!l)return;
 if(remove)cart=cart.filter(x=>x!==l);else l.qty=Math.max(0,Math.min(9,l.qty+delta));
 renderCart();
 // Preserve a useful keyboard position after replacing cart rows.
 const target=[...document.querySelectorAll('[data-key]')].find(el=>el.dataset.key===key&&Number(el.dataset.qty)===delta&&!el.disabled);
 (target||$('cart-dialog').querySelector('[data-close]')).focus({preventScroll:true});
}
function previewOrder(){
 const q=cartTotals(cart,code);if(!q.count)return;
 $('order-summary').innerHTML=`<div class="order-list">${cart.map(l=>{const p=getProduct(l.id),v=p.variants.find(v=>v.id===l.variant);return `<div><span>${esc(p.name)}<small>${esc(v.name)} × ${l.qty}</small></span><b>฿${money(v.price*l.qty)}</b></div>`;}).join('')}<div><span>ยอดสินค้า</span><b>฿${money(q.subtotal)}</b></div><div><span>ส่วนลดตัวอย่าง</span><b>−฿${money(q.saving)}</b></div><div><span>ค่าจัดส่งสมมุติ</span><b>฿${money(q.shipping)}</b></div><div class="order-total"><span>รวมยอดทดลอง</span><b>฿${money(q.total)}</b></div></div>`;
 openDialog('order-dialog');
}
async function shareProduct(){
 if(!activeProduct)return;const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('product',activeProduct.id);
 try{await navigator.clipboard.writeText(u.href);toast('คัดลอกลิงก์สินค้าตัวอย่างแล้ว');}catch{toast('คัดลอกลิงก์จากแถบที่อยู่ของเบราว์เซอร์ได้เลย');}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button,a');if(!b)return;
 if(b.dataset.close){closeDialog(b.dataset.close);return;}
 if(b.hasAttribute('data-info')){openDialog('info-dialog');return;}
 if(b.dataset.product){productDetail(b.dataset.product);return;}
 if(b.dataset.save){toggleSaved(b.dataset.save);return;}
 if(b.dataset.add&&!b.disabled){addCart(b.dataset.add);return;}
 if(b.dataset.shop){filter=emptyFilter();if(b.dataset.shop!=='all')filter.categories=[b.dataset.shop];goShop();return;}
 if(b.dataset.brand){filter=emptyFilter();filter.brands=[b.dataset.brand];goShop();return;}
 if(b.dataset.collection){filter=emptyFilter();filter.collection=b.dataset.collection;goShop();return;}
 if(b.dataset.clearKey){const k=b.dataset.clearKey,v=b.dataset.clearValue;if(k==='category')filter.categories=filter.categories.filter(x=>x!==v);else if(k==='brand')filter.brands=filter.brands.filter(x=>x!==v);else if(k==='saved')filter.savedOnly=false;else filter[k]=k==='query'?'':'all';limit=12;renderProducts();return;}
 if(b.dataset.remove){changeLine(b.dataset.remove,0,true);return;}
 if(b.dataset.qty){changeLine(b.dataset.key,Number(b.dataset.qty));return;}
 if(b.dataset.detailQty){const n=Math.max(1,Math.min(9,Number($('detail-qty').value)+Number(b.dataset.detailQty)));$('detail-qty').value=n;return;}
 if(b.id==='detail-add'&&activeProduct){const variant=document.querySelector('input[name="variant"]:checked')?.value||'standard';addCart(activeProduct.id,variant,Number($('detail-qty').value));return;}
 if(b.id==='share-product')shareProduct();
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.name==='variant'&&activeProduct){const v=activeProduct.variants.find(v=>v.id===el.value);$('detail-price').textContent='฿'+money(v.price);$('detail-was').textContent=v.was?'฿'+money(v.was):'';$('detail-was').hidden=!v.was;}
 if(el.name==='category'||el.name==='brand'){const key=el.name==='category'?'categories':'brands';filter[key]=el.checked?[...filter[key],el.value]:filter[key].filter(v=>v!==el.value);limit=12;renderProducts();}
 if(el.name==='range'){filter.range=el.value;limit=12;renderProducts();}
});
$('search-form').addEventListener('submit',event=>{event.preventDefault();filter=emptyFilter();filter.query=$('search').value.trim();goShop();});
$('search').addEventListener('search',()=>{if(!$('search').value&&filter.query){filter.query='';limit=12;renderProducts();}});
$('sort').addEventListener('change',event=>{filter.sort=event.target.value;renderProducts();});
['clear-filters','clear-top','empty-reset'].forEach(id=>$(id).addEventListener('click',resetFilters));
$('load-more').addEventListener('click',()=>{const before=limit;limit+=12;renderProducts();const btn=$('product-grid').children[before]?.querySelector('[data-product]');if(btn)btn.focus({preventScroll:true});});
$('saved-btn').addEventListener('click',()=>{const was=filter.savedOnly;filter=emptyFilter();filter.savedOnly=!was;goShop();});
$('cart-btn').addEventListener('click',()=>{renderCart();openDialog('cart-dialog');});
$('filter-open').addEventListener('click',()=>openDialog('filters-dialog'));
$('rail-prev').addEventListener('click',()=>$('featured-grid').scrollBy({left:-380,behavior:'smooth'}));
$('rail-next').addEventListener('click',()=>$('featured-grid').scrollBy({left:380,behavior:'smooth'}));
$('coupon-intro').addEventListener('click',()=>{toast('โค้ดตัวอย่าง SYD10 ลด 10% · เพิ่มสินค้าแล้วลองใช้ในตะกร้า');});
$('coupon-form').addEventListener('submit',event=>{event.preventDefault();const value=$('coupon').value.trim().toUpperCase();if(value==='SYD10'){code=value;renderCart();}else{$('coupon-status').textContent='โค้ดตัวอย่างที่ใช้ได้คือ SYD10'+(code?' · โค้ดเดิมยังคงใช้อยู่':'');$('coupon-status').className='error';}});
$('remove-coupon').addEventListener('click',()=>{code='';$('coupon').value='';$('coupon-status').textContent='นำโค้ดส่วนลดออกแล้ว';$('coupon-status').className='';renderCart();});
$('checkout-demo').addEventListener('click',previewOrder);
$('back-cart').addEventListener('click',()=>openDialog('cart-dialog'));
for(const id of drawers){
 $(id).addEventListener('close',()=>{if(!drawers.some(d=>$(d).open))document.body.classList.remove('modal-open');if(id==='product-dialog'){activeProduct=null;try{const u=new URL(location.href);u.searchParams.delete('product');history.replaceState(null,'',u);}catch{}}});
 $(id).addEventListener('click',event=>{if(event.target!==$(id))return;const r=$(id).getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$(id).close();});
}
const mobile=matchMedia('(max-width: 900px)');
function placeFilters(){if(!mobile.matches&&$('filters-dialog').open)$('filters-dialog').close();(mobile.matches?$('filter-mobile-home'):$('filter-home')).append($('filter-content'));}
mobile.addEventListener('change',placeFilters);
buildHome();placeFilters();renderProducts();renderCart();
const initial=new URLSearchParams(location.search).get('product');if(initial){if(getProduct(initial))productDetail(initial);else toast('ลิงก์นี้ไม่มีสินค้าในเดโม ลองเลือกจากรายการด้านล่าง');}
