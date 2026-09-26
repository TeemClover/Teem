# Homechew v1.5 — ผลตรวจ 2026-09-26

**สถานะ:** แก้ใน working tree ของ `feat/adaptive-front-door-v1` ยังไม่ commit, push หรือ deploy; ไม่ได้ตรวจเว็บ production รอบนี้

ตรวจด้วย Chrome headless บน Mac ผ่าน local preview โดยอนุญาต Google Fonts ตัวเลขด้านล่างเป็นผล lab ในเครื่องเดียว ไม่ใช่ความเร็วบนมือถือจริง ไม่ใช่ Lighthouse และไม่ใช่คะแนนรีวิวอิสระ

## เกณฑ์และผลที่ตรวจได้

| หัวข้อ | เกณฑ์ตรวจ | ผล |
|---|---|---|
| เปิดหน้า | เห็นสินค้าทันที มีภาพสำรองที่ตรงฉาก ข้อความไทยและ CTA อ่านได้ | ผ่าน desktop/phone/tablet; ภาพเปิด 3 สัดส่วน |
| ปริมาตรซอส | ปริมาตรขวด + สายซอส + ถ้วยคงที่ ย้อน scroll ได้ | ผ่านการ integrate อิสระ; เท 8.58% เหลือ 91.42% |
| ฉากเท | ซอสถึงถ้วยก่อนถ้วยเติม ไม่หายหรือเติมกลับขวด และวัตถุอยู่ครบเฟรม | ผ่าน numerical framing guard 6 จอ และภาพช่วง .60/.69/.75/.80/.95 |
| มือถือ | ญี่ปุ่นไม่ทับปุ่ม/ภาษาไทย ไม่เลื่อนแนวนอน | ผ่าน 360/390/430/768 px |
| อาหารและชุดซอส | ภาพใหม่แสดงการจิ้มและอาหารสุก ชุดซอสแสดงขวดจริง 3 ใบ ฉลากเดิม | ตรวจภาพด้วยสายตาแล้ว; ระบุว่าเป็น concept |
| สั่งซื้อ | ช่วงเริ่ม/กลาง/ปุ่มของชุดซอสมี LINE ที่กดได้ใน viewport | ผ่าน 12 ตำแหน่ง; ปุ่มที่ซ่อนไม่รับ keyboard focus |
| ใช้คีย์บอร์ด | เข้าถึง skip link และ LINE พร้อม focus ที่เห็น | ผ่าน |
| Fallback | ไม่มี JS / WebGL / reduced motion ยังมีภาพ เนื้อหา และ CTA ไม่เหลือ pin เปล่า | ผ่าน 390×844 และ 1440×900 ทุกโหมด |
| เสถียรภาพ | ไม่มี page error, ภาพเสีย หรือ horizontal overflow ในการตรวจ | ผ่าน |

เกณฑ์นี้ใช้ยกระดับงานตามเป้ารีวิวมากกว่า 9/10 แต่ไม่เปลี่ยนผลตรวจเป็นคะแนนที่ผู้รีวิวภายนอกยังไม่ได้ให้

## ทดสอบเชิงตัวเลข

`node --test tests/homechew/` → **15/15 ผ่าน**

ครอบคลุมลำดับลอกซีล/หมุนฝา/เท, ข้อความไม่ทับวัตถุ, กล้องไม่กระโดด, ขวด/ฝา/ถ้วยไม่หลุดเฟรม, ปริมาตรจากช่องขวดจริง, ปริมาตรถ้วยที่สัมพันธ์กับรูปทรง, การย้อนเรื่อง, LINE URL และข้อเท็จจริงสินค้าที่ยังไม่ทราบ

## Browser lab

ผลฉบับเต็ม: [QA_v1.5.browser.json](QA_v1.5.browser.json)

| Viewport | LCP (ms) | CLS | Frame median / p90 (ms) |
|---|---:|---:|---:|
| 360×800 | 1192 | 0 | 16.7 / 17.4 |
| 390×844 | 1140 | 0 | 16.7 / 17.4 |
| 430×932 | 2144 | 0 | 16.7 / 17.4 |
| 768×1024 | 472 | .002 | 16.7 / 17.4 |
| 1440×900 | 444 | .002 | 16.6 / 17.4 |
| 1920×1080 | 456 | .002 | 16.7 / 17.2 |

รอบนี้บันทึกภาพเปิดที่ `scrollY=0` จริง; ตรวจปุ่มที่กดได้ใน viewport ด้วย hit testing แทนการนับปุ่มที่แค่มีอยู่ในหน้า; เพิ่มโหมดปิด JavaScript ที่การตรวจเดิมยังไม่ครอบคลุม

ตรวจภาพฉากเท อาหาร และชุดซอสซ้ำเฉพาะจุดหลังแก้กล้อง: [QA_v1.5.scenes.json](QA_v1.5.scenes.json) ภาพหลักฐานอยู่ใน `/tmp/homechew-v15-proof/` บนเครื่องที่รัน โดยเก็บภาพนอก source tree ตามแนวทาง repo

## ตรวจเพิ่มเติมหลังอ่านโค้ดรอบสุดท้าย

`tests/homechew/resilience.e2e.mjs` → **ผ่าน** ดู [QA_v1.5.resilience.json](QA_v1.5.resilience.json)

- จำลอง WebGL context loss หลังเปิดการหมุนขวด: หน้ากลับเป็นภาพนิ่ง, เลิกโหมดหมุน, ไม่ pin, ภาพสำรองเดิมทั้ง 3 ยังโหลดได้ และไม่ถูกทับด้วยภาพว่างจาก renderer ที่เสีย
- เลื่อนต่อเนื่องแบบมือถือ 180 เฟรม: ระบบปรับคุณภาพเก็บเวลาเฟรมจริงได้แล้ว (`medianFrameMs ≈ 16.7`); แก้เดิมที่ล้าง timestamp ทุกเฟรมจนปรับคุณภาพตามความช้าขณะเลื่อนไม่ได้ ไม่ถือช่วงพักระหว่างเลื่อนเป็นเฟรมช้า
- เพิ่มระยะระหว่างภาพวงกลมกับหัวข้อไทยบนมือถือให้สระด้านบนไม่ชิดขอบภาพ ตรวจซ้ำแล้วมีช่องว่างเหนือหัวข้อประมาณ 15px หลัง transform: [QA_v1.5.spacing.json](QA_v1.5.spacing.json)

การตรวจชุดหลักและ supplemental แยกกันชัดเจน: main suite ผ่านก่อนแก้สองกรณีข้างต้น แล้วรันเฉพาะ regression ของ context loss/scroll sampling หลังแก้ ไม่อ้างว่าตัวเลข adaptive debug จาก main report เป็นผลหลังแก้ (ใน main report จึงยังมี `medianFrameMs: null`)

## ข้อจำกัดที่ยังเหลือ

- ยังไม่ได้ตรวจ Safari/iPhone/Android เครื่องจริงหรือเครือข่ายช้า; ไม่อ้าง 60fps ทุกเครื่อง
- โมเดลขวดและวัสดุยังเป็นตัวแทนตามภาพ concept; ยังไม่มีขนาดขวดจริง/GLB เพื่อเทียบสเกลการผลิต
- ภาพอาหารสร้างด้วย AI; รายละเอียดส่วนผสมจริงไม่อาจยืนยันจากภาพหรือคำบรรยายรส
- ราคา ปริมาตรบรรจุ การเก็บ และรอบส่งยังรอยืนยันกับร้าน การคลิก LINE เป็นทางสอบถาม/สั่งซื้อ ไม่มีระบบชำระเงินในหน้า
- ไม่มีการทดสอบอัตรา conversion กับลูกค้าจริงหรือรีวิวภายนอก

Changelog: [README.md](README.md) · ภาพและ prompts: [ASSETS_v1.5.md](ASSETS_v1.5.md) · วิธีดูแล scene/poster: [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)

## Follow-up: owner-confirmed orange chicken sauce

2026-09-26: Owner confirmed Hat Yai chicken sauce should be orange like the existing center 3D bottle. Edited both Hat Yai food photographs with built-in imagegen using the bottle as the color reference; replaced all six HTML image uses (including two static fallback images) and the main responsive srcset. Preserved the existing 3D sauce color.

Local Chrome checks at 390×900 and 1440×900: all four food image uses remaining after the static-stage upgrade decode successfully; no horizontal overflow. Visually inspected screenshots `/tmp/homechew-orange-390.png` and `/tmp/homechew-orange-1440.png`: orange sauce visible, city name separate from photo, coriander tip still assigned to Hat Yai. No production verification or deployment in this follow-up.
