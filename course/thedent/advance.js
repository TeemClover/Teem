/* Prepared examples from the course Source; changing a branch does not call an AI service. */
(() => {
  'use strict';
  const branches = [
    { id:'ratchayothin', name:'รัชโยธิน', landmark:'BTS รัชโยธิน ทางออก 4', phone:'02-512-4595' },
    { id:'rangsit', name:'รังสิต', landmark:'คลองหนึ่ง ถนนพหลโยธินขาเข้า ก่อนโรงกษาปณ์ 300 เมตร', phone:'02-147-2244' },
    { id:'ratchaphruek', name:'ราชพฤกษ์', landmark:'โครงการแลนด์มาร์ค ราชพฤกษ์ ต.อ้อมเกร็ด อ.ปากเกร็ด จ.นนทบุรี', phone:'02-591-6868' }
  ];
  const choice = document.querySelector('#branch-choice');
  if(!choice)return;
  function renderBranch() {
    const branch=branches.find(item=>item.id===choice.value)||branches[0];
    const values={
      'example-branch':branch.name,
      'example-landmark':branch.landmark,
      'example-phone':branch.phone,
      'example-reply':`สาขา${branch.name}อยู่ที่ ${branch.landmark} ค่ะ สอบถามที่ ${branch.phone} หรือ LINE @thedent ได้เลยค่ะ`,
      'example-brief':`หัวข้อ: ติดต่อ TheDent สาขา${branch.name} · จุดสังเกต: ${branch.landmark} · ช่องทางติดต่อ: ${branch.phone} และ LINE @thedent`
    };
    for(const [id,text] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=text;}
  }
  choice.addEventListener('change',renderBranch);
  renderBranch();
})();
