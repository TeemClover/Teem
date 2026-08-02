(function(){
  'use strict';

  function addUpgradeStyles(){
    if(document.querySelector('link[data-resume-upgrade]')) return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./resume-upgrade.css?v=20260802-sanchuan-mobile-dock';
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
          <span class="eyebrow">三川 · CROSS-BORDER LEGAL WORK</span>\
          <h2 class="title"><span class="lang-th">ทำให้ข้อตกลงเดินทางข้ามภาษา<br>และใช้งานได้จริง</span><span class="lang-en">Make an agreement travel across languages<br>and remain usable in practice</span></h2>\
          <p class="legal-lead lang-th"><b>三川 Sanchuan Holdings</b> ก่อตั้งและดำเนินงานในฐานะบริษัท 3 สัญชาติ ไทย–จีน–ญี่ปุ่น เพื่อรองรับสัญญาและโครงการข้ามประเทศ พร้อมวางแผนขยายสู่งานด้านกฎหมายและงานสัญญาระหว่างประเทศ งานชิ้นนี้คือสัญญามอบสิทธิจัดจำหน่ายภาพยนตร์ ซีรีส์ และสื่อบันเทิง ภาษาไทย–จีน ซึ่งถูกนำไปใช้จริงระหว่างคู่สัญญาข้ามประเทศ</p>\
          <p class="legal-lead lang-en"><b>三川 Sanchuan Holdings</b> was established and operated as a Thai–Chinese–Japanese company for cross-border agreements and projects, with plans to expand into international legal and contract work. This example is a Thai–Chinese agreement granting overseas distribution rights for films, series, and entertainment content, used in practice by parties across countries.</p>\
          <div class="legal-facts">\
            <div><b>THAI × CHINESE × JAPANESE</b><span class="lang-th">บริษัทก่อตั้งและดำเนินงานจริงด้วยโครงสร้าง 3 สัญชาติ</span><span class="lang-en">A company genuinely established and operated with three nationalities.</span></div>\
            <div><b>BILINGUAL CONTRACT</b><span class="lang-th">ร่างภาษาไทย–จีนให้คู่สัญญาตรวจสอบความหมายชุดเดียวกัน</span><span class="lang-en">A Thai–Chinese draft that lets both parties verify the same meaning.</span></div>\
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

  function syncCompanyCopy(){
    var en=document.documentElement.lang==='en';
    var jobTitle=[].slice.call(document.querySelectorAll('#careerWorld .job h3')).find(function(el){
      return el.textContent.indexOf('Sanchuan Holdings')!==-1;
    });
    if(jobTitle) jobTitle.textContent='CEO — 三川 Sanchuan Holdings';

    var jobCopy=document.querySelector('[data-i18n="job2"]');
    if(jobCopy){
      jobCopy.textContent=en
        ?'Founded and operated a Thai–Chinese–Japanese company built for cross-border agreements and projects, with plans to expand into legal and contract work connecting international business.'
        :'ก่อตั้งและดำเนินงานบริษัท 3 สัญชาติ ไทย–จีน–ญี่ปุ่น เพื่อรองรับสัญญาและโครงการข้ามประเทศ พร้อมวางแผนขยายสู่งานด้านกฎหมายและงานสัญญาระหว่างประเทศ';
    }

    var currentCopy=document.querySelector('[data-i18n="currentCopy"]');
    if(currentCopy){
      currentCopy.textContent=en
        ?'I am not employed full-time by another organization. My main work is building myClover and leading 三川 Sanchuan Holdings, while taking on selected work in learning systems, games, communication, cross-border contracts, and idea amplification.'
        :'ผมไม่ได้ทำงานประจำกับองค์กรอื่นแล้ว งานหลักคือการสร้าง myClover และดู 三川 Sanchuan Holdings พร้อมรับโจทย์ที่ตรงกับสิ่งที่ทำได้ดีที่สุด: ระบบการเรียนรู้ เกม การสื่อสาร สัญญาข้ามประเทศ และการขยายผลความคิด';
    }
  }

  function addMobileModeDock(){
    if(document.querySelector('.mobile-mode-dock')) return;
    var dock=document.createElement('div');
    dock.className='mobile-mode-dock';
    dock.setAttribute('role','group');
    dock.setAttribute('aria-label','Career or Lifestyle');
    dock.innerHTML='\
      <span class="mobile-mode-indicator" aria-hidden="true"></span>\
      <button type="button" data-mobile-mode="career">CAREER</button>\
      <button type="button" data-mobile-mode="lifestyle">LIFESTYLE</button>';
    document.body.appendChild(dock);

    function syncDock(){
      var life=document.body.classList.contains('lifestyle-mode');
      dock.classList.toggle('is-lifestyle',life);
      dock.querySelectorAll('[data-mobile-mode]').forEach(function(btn){
        btn.setAttribute('aria-pressed',btn.dataset.mobileMode===(life?'lifestyle':'career')?'true':'false');
      });
    }

    dock.querySelectorAll('[data-mobile-mode]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var original=document.querySelector('.mode-switch .switch-btn[data-mode="'+btn.dataset.mobileMode+'"]');
        if(original) original.click();
      });
    });
    new MutationObserver(syncDock).observe(document.body,{attributes:true,attributeFilter:['class']});
    syncDock();
  }

  function bindLanguageRefresh(){
    document.querySelectorAll('[data-lang]').forEach(function(btn){
      btn.addEventListener('click',function(){setTimeout(syncCompanyCopy,0)});
    });
  }

  function runUpgrade(){
    addUpgradeStyles();
    refreshResumeImages();
    addLegalProof();
    addMobileModeDock();
    bindLanguageRefresh();
    syncCompanyCopy();
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
