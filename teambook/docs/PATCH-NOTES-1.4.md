# TeamBook 1.4 — Runtime Cleanup / Repair Notes

วันที่: 2026-08-23

## Product canon locked in 1.4

- TeamBook ใช้ภาษาไทยเท่านั้นในรุ่นนี้
- ไม่มี Language Module, runtime translation, language switcher, `?lang=`, DOM text replacement หรือ language state ใน localStorage
- สมุดเริ่มได้ตั้งแต่ **1 คน** และรับได้สูงสุด **5 คน**
- เจ้าของสมุดคนเดียวถือว่าเป็นสมุดที่เปิดใช้งานได้สมบูรณ์แล้ว ไม่ต้องรอสมาชิกคนที่ 2
- Public discovery เป็นส่วนหนึ่งของ Home และต้องเปิดให้คนใหม่เห็นได้โดยค่าเริ่มต้น
- ตัวละครของสมาชิกในแต่ละสมุดใช้ identity ของสมุดเล่มนั้น ไม่ใช่ profile Starter กลาง
- ถ้าใช้ Collection card สีของตัวละครมากับการ์ดและห้ามเลือกสีแยก

## Runtime architecture

### Single bootstrap

TeamBook 1.4 ต้องมี product bootstrap เพียงตัวเดียวต่อ document

ไฟล์ `/_shared/language.js` ยังเป็น URL ที่ HTML เดิมอ้างอยู่ แต่เป็น **historical filename only** และทำหน้าที่เป็น single bootstrap เท่านั้น ไม่ใช่ระบบภาษา

ห้ามสร้าง chain แบบ:

`HTML -> bootstrap A -> runtime B -> compatibility patch C -> final patch D`

และห้ามให้ utility module เช่น `card-ui.js` แอบ boot route features

### Route ownership

Bootstrap เป็นผู้เลือก module ตาม route เท่านั้น

- `/` — Home / onboarding / Public / owned-book presentation
- `/p/` — notebook gameplay / log / cards / character editor
- `/public/p/` — public detail / member identity / public Seen
- `/new/` — create book
- `/collection/` — Collection + finished-book memory

Feature module ที่ไม่เกี่ยวกับ route ห้ามโหลด

### Canonical module URL

Active ES modules ใช้ URL เดียวโดยไม่มี query version หลายชุด เช่นห้ามโหลดไฟล์เดียวกันพร้อมกันเป็น:

- `foo.js?v=1`
- `foo.js?v=3`
- `foo.js?v=final`

เพราะ browser จะมองเป็นคนละ module และ execute ซ้ำได้

## Retired compatibility layers

ไฟล์ compatibility ที่ถูกเลิกใช้แล้วต้องไม่ถูก import กลับมา

Retired/deleted ในรอบ cleanup นี้:

- `ui-copy-fit-v13.js`
- `public-home-access-v13.js`
- `v13-public-status.js`
- `docs/LANGUAGE-ROUTES.md`

`runtime.js` รุ่นเก่ามีไว้เฉพาะ cache compatibility และห้ามอยู่ใน normal dependency graph

## Public Home 1.4

Visible Public lane ใช้ owner เดียวคือ `home-public-v14.js`

กติกา:

- คนใหม่เห็น Public โดย default
- ผู้ใช้กดซ่อนได้
- ถ้าซ่อน ต้องไม่ยิง Public-list request
- legacy inline Public loader ใน `index.html` ห้ามออก network และห้ามเป็น visible renderer
- ห้ามใช้ MutationObserver เพื่อคอยเขียนทับ Public renderer เก่า
- open books มาก่อน full books แต่ full books ยังแสดงเป็น social proof ได้

## Card / image rendering

อาการที่ถือว่าเป็น bug:

- การ์ดทุกใบกระพริบพร้อมกัน
- รูปหายหนึ่ง frame แล้วกลับมา
- layout เปลี่ยนหลัง scroll
- card ถูก render ใหม่ทั้งชุดเพราะ text/status เปลี่ยนเล็กน้อย

กติกา:

- card renderer ต้อง deterministic และไม่มี route side effects
- ห้าม preload รูปเดียวกันทั้ง `<img>` และ CSS `background-image` พร้อมกันเพื่อแก้ flicker
- ห้าม force `eager + high priority` ให้รูปทุกใบ
- ใช้ eager เฉพาะภาพเหนือ fold ที่จำเป็นจริง
- ห้าม observer เฝ้า `document.body` เพื่อซ่อม card UI

## MutationObserver rules

Observer ต้องมี owner ชัดและ scope แคบที่สุด

ห้าม:

- observe `document.body` หรือ Home ทั้งก้อนเพียงเพื่อแก้ component เดียว
- observe `characterData` แล้วเขียน `textContent` กลับโดยไม่ตรวจว่าค่าเปลี่ยนจริงหรือไม่
- observer callback แก้ DOM ที่ตัว observer เองกำลัง observe จนเกิด feedback loop
- ใช้ observer หลายตัวแย่งกันเป็น owner ของ node เดียว

ถ้าจำเป็นต้อง observe:

1. observe container เฉพาะของ feature
2. queue งานได้สูงสุดหนึ่งรอบต่อ frame/microtask
3. เทียบ signature/state ก่อนเขียน DOM
4. disconnect เมื่อ setup เสร็จถ้าไม่ต้องติดตามต่อ

## `/p/` character editor

ส่วน “ตัวละครของฉันในสมุดนี้” ต้องปิดไว้ก่อน

ตอน `<details>` ยังไม่เปิด:

- ไม่สร้าง DOM ของ 3 การ์ดล่าสุด
- ไม่โหลดภาพ 3 ใบนั้น
- ไม่เปิด Collection picker

เมื่อผู้ใช้ขยายจึงค่อย render

ปุ่มบันทึกใช้ข้อความ:

`💾 SAVE`

ถ้าเลือก Collection card:

- `avatar` = card id ที่ใช้ในสมุดนี้
- Color dropdown แสดงสีของการ์ด
- Color dropdown เป็น read-only / disabled

ถ้ากลับไป Starter จึงเลือก frame color ได้อีกครั้ง

## Party size canon

**1–5 คน**

Server create flow สร้าง owner เป็นสมาชิกคนแรกทันที ดังนั้น solo book เป็น valid state ตั้งแต่สร้างสำเร็จ

ห้ามเขียน logic ใหม่ที่:

- บังคับต้องมี 2 คนก่อนเริ่ม
- ซ่อนสมุด 1/5
- เรียก 1/5 ว่า incomplete party
- ปิดการลงชื่อเพราะยังไม่มีเพื่อน

ถ้าเจอ constant/copy เก่าที่ระบุ min 2 หรือ `2–5` ให้ถือว่า stale และแก้เป็น 1–5 หรือ copy ที่ไม่กำหนดขั้นต่ำตามบริบท

## Thai-only canon

ข้อความผู้ใช้ทั้งหมดใช้ภาษาไทยเป็น canonical copy

คำอังกฤษที่เป็นชื่อ feature/visual เช่น `TeamBook`, `SAVE`, rarity หรือ code label ใช้ได้ตาม design แต่ไม่มีระบบเปลี่ยน human language ใน runtime

ถ้าจะเพิ่มภาษาอื่นในอนาคต ต้องเป็นงาน localization ใหม่ที่ออกแบบแยก ไม่ให้นำ MutationObserver translator หรือ language patch stack รุ่นเก่ากลับมา

## Repair checklist สำหรับ AI/นักพัฒนาคนถัดไป

ก่อนแก้ bug UI ให้เช็กตามลำดับ:

1. ดู bootstrap ว่า route นี้โหลด module อะไรจริง
2. search ชื่อ element/class ที่เสีย แล้วดูว่ามี module กี่ตัวเขียนมัน
3. ถ้ามี owner มากกว่า 1 ให้รวม owner ก่อนเพิ่ม patch ใหม่
4. เช็ก `MutationObserver`, timer, `pageshow`, `focus`, `visibilitychange` ว่ากระตุ้น render ซ้ำหรือไม่
5. เช็ก network ว่า endpoint เดียวถูกยิงซ้ำใน navigation เดียวหรือไม่
6. เช็ก image ว่าถูก request/render ซ้ำหรือถูกบังคับ eager โดย layer อื่นหรือไม่
7. แก้ที่ owner หลัก ไม่เพิ่ม “final/fix/final2” layer มาทับ
8. เมื่อเลิกใช้ patch ให้ถอด import หรือ delete ไฟล์ ไม่ปล่อยให้ execute แล้วใช้ CSS/DOM ใหม่ปิดทับ

## Definition of Done สำหรับ 1.4

- เปิด `/` แล้ว visible Home component แต่ละส่วนมี renderer owner เดียว
- คนใหม่เห็น Public discovery ทันทีถ้าไม่ได้กดซ่อน
- เปิด `/p/` แล้ว scroll ถึง log ได้โดยไม่ค้าง
- card ไม่กระพริบเป็นชุด
- collapsed character editor ไม่โหลด recent cards
- refresh ไม่สร้าง visual layer ซ้อนกันหลาย generation
- ไม่มี runtime language translation
- solo book 1/5 ใช้งานได้ตามปกติ
