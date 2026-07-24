/* ═══════════════════════════════════════════════════════════════
   ประตูกิลด์ — ตัดสินว่าจะโชว์ปุ่มเข้ากิลด์ให้ใคร เมื่อไหร่

   กติกา (ห้ามลัด):
   1. ต้องเลยเวลาเปิดบ้าน 8/8 ก่อน — ก่อนหน้านั้นล็อกทุกกรณี
   2. และคนคนนั้นต้องเดินมากับบ้านแล้วอย่างน้อยหนึ่งอย่าง คือ
      เลือกสายของตัวเองแล้ว และ (เคยหยิบของฟรีไปใช้ หรือ เพิ่มเพื่อน LINE แล้ว)

   เหตุผล: ที่ LINE เราประกาศ ที่ Discord เราคุยกัน — คนที่ยังไม่รู้จักบ้าน
   ไม่ควรถูกโยนเข้าห้องคุยตั้งแต่วินาทีแรก

   วิธีทดสอบเวลา: เติม ?now=2026-08-09 ท้าย URL เพื่อสมมติว่าวันนั้นมาถึงแล้ว
   ═══════════════════════════════════════════════════════════════ */
(function(){
"use strict";

var CFG = window.MC_CONFIG || {};

function ls(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }

/* เวลาปัจจุบัน — รองรับ ?now=... ไว้ทดสอบ */
function now(){
  try{
    var q=new URLSearchParams(location.search).get('now');
    if(q){ var t=new Date(q).getTime(); if(!isNaN(t)) return t; }
  }catch(e){}
  return Date.now();
}

function isUnlocked(){
  var open=new Date(CFG.OPEN_AT||'2026-08-08T00:00:00+07:00').getTime();
  return now() >= open;
}

/* เดินมากับบ้านแล้วหรือยัง */
function isEligible(){
  var hasClass = !!ls('mc_class','');
  var opened   = ls('mc_opened','')==='1';   /* เคยหยิบของฟรีไปใช้ */
  var lineOk   = ls('mc_line_ok','')==='1';  /* เพิ่มเพื่อน LINE แล้ว */
  return hasClass && (opened || lineOk);
}

/* เรียกตอนที่ผู้ใช้ได้ของฟรีไปจริง ๆ เช่น โหลดการ์ด หรือเปิดบทเรียน */
function markOpened(){ try{ localStorage.setItem('mc_opened','1'); }catch(e){} }

/* กลับมาจาก LINE พร้อม ?line=1 → จำไว้ว่าเพิ่มเพื่อนแล้ว */
(function(){
  try{
    if(new URLSearchParams(location.search).get('line')==='1'){
      localStorage.setItem('mc_line_ok','1');
    }
  }catch(e){}
})();

/* ต่อปุ่มทุกอันที่ติด data-guildx */
function wire(){
  var els=document.querySelectorAll('[data-guildx]');
  if(!els.length) return;
  var unlocked=isUnlocked(), eligible=isEligible(), invite=CFG.GUILDX_INVITE||'';

  Array.prototype.forEach.call(els,function(el){
    var isLink = el.tagName==='A';

    if(!unlocked){
      el.textContent='🔒 ประตูเปิด 8 สิงหา';
      el.setAttribute('aria-disabled','true');
      if(isLink) el.removeAttribute('href');
      return;
    }

    if(!eligible || !invite){
      /* เปิดแล้ว แต่คนนี้ยังไม่ได้เดินมากับบ้าน — ชวนให้เริ่มจากของฟรีก่อน */
      el.textContent='⚔️ ประตูกิลด์ — เริ่มจากเลือกสายก่อน';
      el.setAttribute('aria-disabled','false');
      if(isLink) el.setAttribute('href', el.getAttribute('data-guildx-start')||'card/');
      return;
    }

    el.textContent='⚔️ เข้าประตูกิลด์';
    el.classList.remove('lock');
    el.setAttribute('aria-disabled','false');
    if(isLink){
      el.setAttribute('href',invite);
      el.setAttribute('target','_blank');
      el.setAttribute('rel','noopener');
    } else {
      el.style.cursor='pointer';
      el.addEventListener('click',function(){ window.open(invite,'_blank','noopener'); });
    }

    /* คำชวนที่ตกลงกันไว้ — บอกให้ชัดว่าสองที่นี้ใช้ต่างกัน */
    var note=el.parentNode && el.parentNode.querySelector('[data-guildx-note]');
    if(note) note.textContent='ที่ LINE ผมประกาศ ที่ Discord เราคุยกัน';
  });
}

window.MC_GUILD={ isUnlocked:isUnlocked, isEligible:isEligible, markOpened:markOpened, wire:wire };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
else wire();

})();
