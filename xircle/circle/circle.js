(function(){
  'use strict';

  var days=[
    {day:'0',title:'เลือก 1 อย่าง',body:'เริ่มจากสิ่งที่ทำได้จริงในชีวิตประจำวัน ให้ทุกคนในตี้เข้าใจตรงกันก่อนว่าจะลองทำอะไรในรอบนี้',points:['เลือกให้เล็กพอที่จะเริ่มได้','ตกลงกันว่าอะไรนับว่า “ทำแล้ว”','ยังไม่ต้องทำให้สมบูรณ์แบบ']},
    {day:'3',title:'เช็กว่าไหวไหม',body:'ยังไม่รีบสรุปผล แค่กลับมาดูว่าตรงไหนเริ่มยาก และมีอะไรช่วยให้ทำต่อได้ง่ายขึ้นบ้าง',points:['ถามว่าอะไรเริ่มติด','ดูว่าอะไรช่วยได้จริง','ยังไม่ต้องเปลี่ยนหลายอย่าง']},
    {day:'7',title:'เปิด Xircle ดูด้วยกัน',body:'ใช้ข้อมูลช่วยให้คุยกันง่ายขึ้น ไม่ได้ใช้จับผิดใคร ดูสิ่งที่เกิดขึ้นจริงแล้วเลือกว่าจะทำอะไรต่อ',points:['มองย้อนหลังให้เห็นง่าย','คุยจากสิ่งที่เกิดขึ้นจริง','เลือกเรื่องเดียวที่ควรทำต่อ']},
    {day:'14',title:'ปรับ 1 อย่าง',body:'ถ้ายังฝืด ไม่ต้องรื้อทั้งหมด ลองปรับแค่เวลา สภาพแวดล้อม หรือวิธีช่วยกันทีละอย่าง',points:['ไม่แก้ทุกอย่างพร้อมกัน','ปรับตรงจุดที่ขวาง','ทำให้ของเดิมเบาขึ้น']},
    {day:'21',title:'รักษาจังหวะ',body:'ช่วงนี้ไม่จำเป็นต้องเพิ่มเรื่องใหม่ เป้าหมายคือทำให้สิ่งที่เริ่มได้แล้วอยู่ในชีวิตจริงได้นานขึ้น',points:['รักษาสิ่งที่เริ่มทำได้','ลดแรงเสียดทานอีกนิด','ไม่เพิ่มภาระโดยไม่จำเป็น']},
    {day:'28',title:'ทบทวนแล้วเลือกต่อ',body:'กลับมาดูว่ารอบนี้อะไรอยู่กับเราได้จริง แล้วเลือกว่าจะทำต่อ ปรับ หรือเริ่มรอบใหม่แบบที่เหมาะกับชีวิตตอนนี้',points:['ทบทวนโดยไม่ตัดสิน','ดูว่าอะไรอยู่ได้จริง','เลือกก้าวถัดไปเพียง 1 อย่าง']}
  ];

  function qs(s,c){return (c||document).querySelector(s)}
  function qsa(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}

  function renderDay(index){
    var panel=qs('[data-circle-day-panel]');
    var item=days[index];
    if(!panel||!item)return;
    qsa('[data-circle-day]').forEach(function(btn,i){btn.setAttribute('aria-selected',i===index?'true':'false')});
    var num=qs('[data-circle-day-number]',panel),title=qs('[data-circle-day-title]',panel),body=qs('[data-circle-day-body]',panel),points=qs('[data-circle-day-points]',panel);
    if(num)num.textContent=item.day;
    if(title)title.textContent=item.title;
    if(body)body.textContent=item.body;
    if(points)points.innerHTML=item.points.map(function(p,i){return '<div><b>'+(i+1)+'</b> '+p+'</div>'}).join('');
  }

  function initDays(){
    qsa('[data-circle-day]').forEach(function(btn,index){btn.addEventListener('click',function(){renderDay(index)})});
    renderDay(0);
  }

  function initPulseDemo(){
    var button=qs('[data-circle-showup]');
    if(!button)return;
    button.addEventListener('click',function(){
      var quiet=qs('[data-circle-quiet-member]');
      var count=qs('[data-circle-count]');
      if(quiet){
        var status=qs('.circle-status',quiet);
        if(status){status.textContent='มาแล้ว';status.classList.remove('quiet')}
        quiet.removeAttribute('data-circle-quiet-member');
      }
      if(count)count.textContent='5 จาก 5 คนกลับมาแล้ววันนี้';
      button.textContent='ทุกคนกลับมาแล้ว ✓';
      button.disabled=true;
      var today=qs('.circle-week-day.today');if(today)today.classList.add('on');
    });
  }

  try{initDays();initPulseDemo()}catch(err){try{console.error('[Circle demo]',err)}catch(e){}}
})();
