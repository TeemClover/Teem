(function(){
  'use strict';

  function addUpgradeStyles(){
    if(document.querySelector('link[data-resume-upgrade]')) return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./resume-upgrade.css?v=20260802-legal-hd';
    link.dataset.resumeUpgrade='true';
    document.head.appendChild(link);
  }

  function refreshResumeImages(){
    document.querySelectorAll('img[src*="resume-career-"],img[src*="resume-life-"]').forEach(function(img){
      var clean=img.getAttribute('src').split('?')[0];
      img.src=clean+'?v=20260802-hd';
      img.decoding='async';
    });
  }

  function addLegalProof(){
    var career=document.getElementById('careerWorld');
    if(!career||career.querySelector('.legal-proof-section')) return;
    var currentNote=career.querySelector('.current-note');
    var careerSection=currentNote&&currentNote.closest('section');
    if(!careerSection) return;

    var section=document.createElement('section');
    section.className='section legal-proof-section';
    section.innerHTML='\
      <div class="wrap legal-proof-grid">\
        <a class="legal-document reveal show" href="../img/resume-career-legal.webp?v=20260802-hd" target="_blank" rel="noopener noreferrer" aria-label="Open the first page of the bilingual agreement">\
          <img src="../img/resume-career-legal.webp?v=20260802-hd" alt="หน้าแรกของสัญญาภาษาไทยและภาษาจีนสำหรับสิทธิจัดจำหน่ายสื่อในต่างประเทศ">\
          <span class="legal-zoom"><span class="lang-th">กดดูภาพเต็ม ↗</span><span class="lang-en">Open full image ↗</span></span>\
        </a>\
        <div class="legal-story reveal show">\
          <span class="eyebrow">CROSS-BORDER LEGAL WORK</span>\
          <h2 class="title"><span class="lang-th">ทำให้ข้อตกลงเดินทางข้ามภาษา<br>และใช้งานได้จริง</span><span class="lang-en">Make an agreement travel across languages<br>and remain usable in practice</span></h2>\
          <p class="legal-lead lang-th">ผมไม่ได้วางตัวเองเป็นคนที่รู้กฎหมายทุกเรื่อง แต่เลือกเรียนกฎหมายเพราะอยากให้สิ่งที่ออกแบบเดินทางได้อย่างรับผิดชอบ งานชิ้นนี้คือสัญญามอบสิทธิจัดจำหน่ายภาพยนตร์ ซีรีส์ และสื่อบันเทิงในต่างประเทศ ภาษาไทย–จีน ซึ่งถูกนำไปใช้จริงระหว่างคู่สัญญาข้ามประเทศ</p>\
          <p class="legal-lead lang-en">I do not present myself as knowing every area of law. I study law because I want the systems I build to travel responsibly. This work is a Thai–Chinese agreement granting overseas distribution rights for films, series, and entertainment content, used by parties working across countries.</p>\
          <div class="legal-facts">\
            <div><b>THAI × CHINESE</b><span class="lang-th">ร่างสองภาษาให้คู่สัญญาตรวจสอบความหมายชุดเดียวกัน</span><span class="lang-en">A bilingual draft that lets both parties verify the same meaning.</span></div>\
            <div><b>CROSS-BORDER</b><span class="lang-th">เชื่อมโจทย์ธุรกิจ สิทธิ และพื้นที่จัดจำหน่ายระหว่างประเทศ</span><span class="lang-en">Connecting business terms, rights, and international territories.</span></div>\
            <div><b>USED IN PRACTICE</b><span class="lang-th">ไม่ใช่แบบฝึกหัด แต่เป็นเอกสารที่ลงนามและใช้งานจริง</span><span class="lang-en">Not a classroom exercise, but a document signed and used in practice.</span></div>\
          </div>\
          <p class="legal-note"><span class="lang-th">เผยแพร่เฉพาะหน้าแรกโดยได้รับอนุญาต รายละเอียดส่วนอื่นของสัญญายังคงเป็นความลับ</span><span class="lang-en">Only the first page is shown with permission. The remaining contractual details remain confidential.</span></p>\
        </div>\
      </div>';
    careerSection.insertAdjacentElement('afterend',section);

    var stats=career.querySelectorAll('.stats .stat');
    if(stats[2]) stats[2].querySelector('strong').textContent='6';
  }

  function runUpgrade(){
    addUpgradeStyles();
    refreshResumeImages();
    addLegalProof();
  }

  var base=document.createElement('script');
  base.src='./resume-base.js?v=20260802-switch-i18n';
  base.async=false;
  base.onload=runUpgrade;
  base.onerror=function(){
    console.error('Unable to load Resume base script.');
    runUpgrade();
  };
  document.head.appendChild(base);
})();
