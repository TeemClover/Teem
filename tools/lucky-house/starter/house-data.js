// DERIVED: fictional demonstration only. Replace with the recipient's evidence.
export const house={
 title:'บ้านที่ฉันอยากสร้าง',subtitle:'บ้านสมมติสำหรับเริ่มทดลอง · ยังไม่ใช่แปลนของคุณ',
 width:7,depth:7,floorHeight:3.2,
 floors:[{id:'f1',name:'ชั้น 1',elevation:0},{id:'f2',name:'ชั้น 2',elevation:3.2}],
 rooms:[
  {id:'living',floor:'f1',name:'นั่งเล่น',x:0,z:0,w:4,d:4,color:'#c6cebb',furniture:'sofa'},
  {id:'dining',floor:'f1',name:'ทานอาหาร',x:4,z:0,w:3,d:4,color:'#ddd2c1',furniture:'table'},
  {id:'kitchen',floor:'f1',name:'ครัว',x:0,z:4,w:4,d:3,color:'#bdcecd',builtIn:true},
  {id:'stairs',floor:'f1',name:'บันได',x:4,z:4,w:3,d:3,color:'#cec7b9',stairs:true},
  {id:'bedroom',floor:'f2',name:'ห้องนอน',x:0,z:0,w:4,d:4,color:'#d7c9bd',furniture:'bed'},
  {id:'lounge',floor:'f2',name:'พักผ่อน',x:4,z:0,w:3,d:4,color:'#c4ced3',furniture:'sofa'},
  {id:'bath',floor:'f2',name:'ห้องน้ำ',x:0,z:4,w:3,d:3,color:'#bdcfc7',furniture:'bath'},
  {id:'hall',floor:'f2',name:'โถงชั้นบน',x:3,z:4,w:4,d:3,color:'#cec7b9',void:{x:5,z:4.2,w:1.2,d:2.4}}
 ],
 // One wall record per boundary. Opening offsets run along a -> b in metres.
 walls:[
  ...['f1','f2'].flatMap(floor=>[
   {floor,a:[0,0],b:[7,0],openings:[{at:.6,w:2.8,bottom:floor==='f1'?0:.4,h:2.4,door:floor==='f1'},{at:4.5,w:1.9,bottom:.4,h:2.3}]},
   {floor,a:[7,0],b:[7,7],openings:[{at:1,w:1.8,bottom:.7,h:1.8}]},
   {floor,a:[0,7],b:[7,7],openings:[{at:.6,w:1.4,bottom:1.3,h:1.1},{at:4.4,w:1.8,bottom:.7,h:1.9}]},
   {floor,a:[0,0],b:[0,7],openings:[{at:1,w:1.8,bottom:.7,h:1.8}]}]),
  {floor:'f1',a:[0,4],b:[7,4],openings:[{at:1.2,w:1.2,bottom:0,h:2.4,door:true},{at:4.4,w:1.8,bottom:0,h:2.4,passage:true}]},
  {floor:'f1',a:[4,4],b:[4,7],openings:[]},
  {floor:'f2',a:[0,4],b:[7,4],openings:[{at:3,w:.85,bottom:0,h:2.4,door:true},{at:4.4,w:1.4,bottom:0,h:2.4,passage:true}]},
  {floor:'f2',a:[4,0],b:[4,4],openings:[]},
  {floor:'f2',a:[3,4],b:[3,7],openings:[{at:.3,w:.85,bottom:0,h:2.4,door:true}]}
 ],
 photos:[] // e.g. {src:'media/living.webp',roomId:'living',binding:'confirmed',alt:'...'}
};
