/** All brands, prices, products and availability are fictional design fixtures. */
export const VERSION = 'SYD-MARKET-DEMO-1.0';
export const CATEGORIES = [
 {id:'supplements',name:'วิตามินและอาหารเสริม',short:'วิตามิน',icon:'capsule',color:'#e9edcf'},
 {id:'nutrition',name:'โปรตีนและโภชนาการ',short:'โปรตีน',icon:'scoop',color:'#eee2d4'},
 {id:'pantry',name:'อาหารและเครื่องดื่ม',short:'อาหารและชา',icon:'cup',color:'#f5e8c6'},
 {id:'skin',name:'สกินแคร์',short:'สกินแคร์',icon:'drop',color:'#f3dfd7'},
 {id:'care',name:'ดูแลร่างกาย',short:'ดูแลร่างกาย',icon:'leaf',color:'#e0e8db'},
 {id:'living',name:'ของใช้และไลฟ์สไตล์',short:'ไลฟ์สไตล์',icon:'sun',color:'#e5e1f0'}
];
export const BRANDS = [
 {id:'vellora',name:'VELLORA',line:'THE DAILY EDIT',color:'#315e43',paper:'#ecedda'},
 {id:'fernaday',name:'fernaday',line:'LITTLE DAILY THINGS',color:'#796698',paper:'#e9e3f0'},
 {id:'oat',name:'oat & orbit',line:'GOOD FOOD, SLOW DAYS',color:'#aa5734',paper:'#f2e1bf'},
 {id:'root',name:'ROOTKIND',line:'FROM THE GROUND UP',color:'#406f66',paper:'#e2e9da'},
 {id:'dew',name:'dewfolk',line:'A MOMENT FOR SKIN',color:'#b67565',paper:'#f4e4dc'},
 {id:'mellow',name:'mellowkin',line:'THE EVERYDAY RITUAL',color:'#5b7963',paper:'#e4eadb'},
 {id:'still',name:'stillmori',line:'ROOM TO SLOW DOWN',color:'#837c9a',paper:'#e9e3ed'},
 {id:'solumi',name:'SOLUMI',line:'TAKE THE DAY WITH YOU',color:'#a17843',paper:'#eae2d0'}
];
// id, brand, category, Thai title, pack label, size, price, reference price, shape, colour, collection
const rows = [
 ['p01','vellora','supplements','วิตามินซี เดลี่ ซี','DAILY C','60 แคปซูล',390,450,'bottle','#d8ae45','morning'],
 ['p02','root','nutrition','โปรตีนจากพืช กลิ่นวานิลลา','PLANT / PROTEIN','500 กรัม',890,990,'tub','#567552','move'],
 ['p03','oat','pantry','มัทฉะ ชากรีนเบลนด์','MATCHA / MOMENT','80 กรัม',420,490,'tin','#8a9d50','morning'],
 ['p04','dew','skin','เซรั่ม ไฮยาลูรอน ดิวดรอป','DEW / DROPS','30 มล.',650,790,'dropper','#b78268','evening'],
 ['p05','mellow','care','บอดี้วอช กลิ่นซีดาร์และใบชา','BODY / WASH','300 มล.',350,390,'pump','#667d54','evening'],
 ['p06','still','living','แก้วเซรามิก สโลว์มอร์นิง','SLOW / MORNING','1 ใบ',390,0,'mug','#b8a190','morning'],
 ['p07','fernaday','supplements','แมกนีเซียม เดลี่ มินเนอรัล','MAGNESIUM','60 แคปซูล',590,690,'bottle','#887da6','evening'],
 ['p08','oat','pantry','กราโนลา โอ๊ตและอัลมอนด์','OAT / GRANOLA','350 กรัม',285,320,'pouch','#c4944a','morning'],
 ['p09','vellora','supplements','วิตามินดี เดลี่ ซัน','DAILY D','60 แคปซูล',320,390,'bottle','#d8993f','morning'],
 ['p10','fernaday','supplements','โพรไบโอติก เดลี่ คัลเจอร์','DAILY / CULTURE','30 แคปซูล',790,0,'box','#797aaf','morning'],
 ['p11','vellora','supplements','โอเมกา 3 บลูซี','BLUE SEA / OMEGA','60 ซอฟต์เจล',690,790,'bottle','#668b9b','morning'],
 ['p12','fernaday','supplements','มัลติวิตามิน เดลี่ เบลนด์','DAILY / BLEND','60 แคปซูล',490,0,'bottle','#b18196','morning'],
 ['p13','vellora','nutrition','เวย์โปรตีน กลิ่นโกโก้','WHEY / CACAO','500 กรัม',990,1190,'tub','#7d5c49','move'],
 ['p14','root','nutrition','ไฟเบอร์ เบลนด์ จากพืช','FIBER / BLEND','250 กรัม',450,520,'pouch','#a4aa65','morning'],
 ['p15','root','nutrition','โปรตีนจากพืช กลิ่นโกโก้','PLANT / CACAO','500 กรัม',890,990,'tub','#8d6c53','move'],
 ['p16','oat','nutrition','บาร์ข้าวโอ๊ตและโกโก้','OAT / BAR','6 ชิ้น',240,0,'box','#935637','move'],
 ['p17','oat','pantry','เนยอัลมอนด์ คลาสสิก','ALMOND / BUTTER','200 กรัม',320,370,'jar','#b38346','morning'],
 ['p18','oat','pantry','ชาคาโมมายล์ ดอกไม้ยามเย็น','CHAMOMILE','20 ซอง',260,0,'box','#c7a24c','evening'],
 ['p19','root','pantry','เมล็ดเจีย แพลนต์ แพนทรี','CHIA / SEEDS','250 กรัม',220,260,'pouch','#576861','morning'],
 ['p20','root','pantry','ผงโกโก้ เพียว คาเคา','PURE / CACAO','200 กรัม',290,0,'pouch','#7e6152','evening'],
 ['p21','dew','skin','มอยส์เจอไรเซอร์ เดลี่ คลาวด์','DAILY / CLOUD','50 กรัม',550,650,'jar','#9bafa4','evening'],
 ['p22','dew','skin','เจลล้างหน้า ซอฟต์ คลีนส์','SOFT / CLEANSE','150 มล.',390,450,'tube','#c7b295','evening'],
 ['p23','dew','skin','เซรั่ม ไนอาซินาไมด์','NIACINAMIDE','30 มล.',590,0,'dropper','#baa4b0','morning'],
 ['p24','dew','skin','แฮนด์ครีม กลิ่นโรสและโอ๊ต','ROSE / HAND','50 มล.',240,290,'tube','#c99687','evening'],
 ['p25','mellow','care','แชมพู กลิ่นกรีนที','GREEN TEA / SHAMPOO','300 มล.',390,0,'pump','#81946d','morning'],
 ['p26','mellow','care','สบู่ก้อน โอ๊ตและเชียบัตเตอร์','OAT / SOAP','100 กรัม',159,190,'soap','#c9b283','evening'],
 ['p27','mellow','care','บอดี้โลชั่น กลิ่นไวต์ที','WHITE TEA / LOTION','250 มล.',420,490,'pump','#adba9c','evening'],
 ['p28','still','living','เทียนหอม กลิ่นซอฟต์วูด','SOFT / WOODS','180 กรัม',590,690,'candle','#bcb0c2','evening'],
 ['p29','solumi','living','ขวดน้ำสเตนเลส สีเซจ','EVERYDAY / BOTTLE','600 มล.',650,790,'flask','#99a990','move'],
 ['p30','solumi','living','เสื่อโยคะ สีเอิร์ธ','EARTH / MAT','1 ผืน',1290,1490,'mat','#b08061','move']
];
export const PRODUCTS = rows.map((r,i) => {
 const [id,brand,category,name,label,size,price,was,shape,accent,collection]=r;
 return {id,brand,category,name,label,size,price,was,shape,accent,collection,order:i,available:id!=='p12',isNew:['p04','p06','p10','p23','p28'].includes(id),
  variants:[{id:'standard',name:size,price,was},...(['p01','p02','p03','p08'].includes(id)?[{id:'duo',name:'แพ็กคู่ 2 ชิ้น',price:price*2-50,was:was?was*2:0}]:[])],
  description:`${name} จากแบรนด์สมมุติ ${BRANDS.find(b=>b.id===brand).name} ออกแบบเป็นตัวอย่างเพื่อให้ลองสำรวจสินค้า ขนาดบรรจุ และขั้นตอนเลือกซื้อในร้านของซิด`,
  tags:[...(name.includes('โปรตีน')?['protein']:[]),BRANDS.find(b=>b.id===brand).name,label.replaceAll(' / ',' '),CATEGORIES.find(c=>c.id===category).name,category,collection]
 };
});
export const COLLECTIONS = [
 {id:'morning',name:'เช้าที่ค่อย ๆ เริ่ม',subtitle:'ของเล็ก ๆ สำหรับวันใหม่'},
 {id:'move',name:'วันที่อยากขยับ',subtitle:'โปรตีนและของใช้ในวันแอคทีฟ'},
 {id:'evening',name:'เย็นนี้ให้ตัวเอง',subtitle:'สกินแคร์ ชา และบรรยากาศสบาย ๆ'}
];
export const getProduct=id=>PRODUCTS.find(p=>p.id===id);
export const getBrand=id=>BRANDS.find(b=>b.id===id);
export const money=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);
export const discount=p=>p.was>p.price?Math.round((1-p.price/p.was)*100):0;
export const emptyFilter=()=>({query:'',categories:[],brands:[],range:'all',collection:'all',sort:'featured',savedOnly:false});
export function filterProducts(input={},saved=[]) {
 const f={...emptyFilter(),...input};
 const terms=String(f.query).trim().toLocaleLowerCase('th').split(/\s+/).filter(Boolean);
 return PRODUCTS.filter(p=>{
  const hay=[p.name,p.size,...p.tags].join(' ').toLocaleLowerCase('th');
  return terms.every(t=>hay.includes(t)) && (!f.categories.length||f.categories.includes(p.category)) && (!f.brands.length||f.brands.includes(p.brand)) && (f.collection==='all'||p.collection===f.collection) && (!f.savedOnly||saved.includes(p.id)) && (f.range==='all'||f.range==='under300'&&p.price<300||f.range==='300to600'&&p.price>=300&&p.price<=600||f.range==='over600'&&p.price>600);
 }).sort((a,b)=>f.sort==='low'?a.price-b.price:f.sort==='high'?b.price-a.price:f.sort==='name'?a.name.localeCompare(b.name,'th'):f.sort==='new'?Number(b.isNew)-Number(a.isNew)||a.order-b.order:a.order-b.order);
}
export function cleanCart(lines=[]) {
 const map=new Map();
 for(const l of Array.isArray(lines)?lines:[]){
  if(!l||typeof l!=='object')continue;
  const p=getProduct(l.id);const v=p?.variants.find(v=>v.id===l.variant);
  if(!p?.available||!v)continue;
  const qty=Number(l.qty);if(!Number.isInteger(qty)||qty<=0)continue;
  const key=p.id+':'+v.id;
  map.set(key,{id:p.id,variant:v.id,qty:Math.min(9,qty+(map.get(key)?.qty||0))});
 }
 return [...map.values()];
}
export function cartTotals(lines,code='') {
 const cart=cleanCart(lines);
 const subtotal=cart.reduce((n,l)=>n+getProduct(l.id).variants.find(v=>v.id===l.variant).price*l.qty*100,0);
 const valid=String(code).trim().toUpperCase()==='SYD10';
 const saving=valid?Math.round(subtotal*.10):0;
 const shipping=subtotal===0||subtotal-saving>=79900?0:5000;
 return {cart,count:cart.reduce((n,l)=>n+l.qty,0),subtotal:subtotal/100,saving:saving/100,shipping:shipping/100,total:(subtotal-saving+shipping)/100,valid,remaining:Math.max(0,(79900-(subtotal-saving))/100)};
}
