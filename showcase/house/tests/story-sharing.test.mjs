import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WORK_TITLE,SHARE_TITLE,PAGE_TITLE,PAGE_DESCRIPTION,HERO_SUBTITLE,ABOUT_HTML} from '../app/story.js';
const canonical='https://www.myclover.com/showcase/house/';
const imageName='assets/og-our-house-lucky-source-20260926.jpg';

test('share metadata uses the owner copy and one absolute canonical URL',async()=>{
 const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
 const metadata=new Map([...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].map(match=>[match[1],match[2]]));
 assert.equal(html.match(/<title>(.*?)<\/title>/s)?.[1],PAGE_TITLE);
 assert.equal(metadata.get('description'),PAGE_DESCRIPTION);
 assert.equal(metadata.get('og:title'),SHARE_TITLE);
 assert.equal(metadata.get('og:description'),PAGE_DESCRIPTION);
 assert.equal(metadata.get('og:url'),canonical);
 assert.equal(metadata.get('og:type'),'website');
 assert.equal(metadata.get('og:locale'),'th_TH');
 assert.equal(metadata.get('og:site_name'),'myClover');
 assert.equal(metadata.get('og:image'),canonical+imageName);
 assert.equal(metadata.get('og:image:width'),'1200');
 assert.equal(metadata.get('og:image:height'),'630');
 assert.equal(metadata.get('twitter:card'),'summary_large_image');
 assert.equal(metadata.get('twitter:title'),SHARE_TITLE);
 assert.equal(metadata.get('twitter:description'),PAGE_DESCRIPTION);
 assert.equal(metadata.get('twitter:image'),canonical+imageName);
 assert.equal(metadata.get('twitter:image:alt'),metadata.get('og:image:alt'));
 assert.ok(metadata.get('og:image:alt')?.includes(SHARE_TITLE));
 assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
 assert.ok(html.includes(HERO_SUBTITLE));
 assert.doesNotMatch(html,/บ้านตัวอย่าง|id="wall-mode"|\/Users\/|file:\/\//);
});

test('share card is a real 1200 by 630 JPEG without original-image metadata',async()=>{
 const buffer=await readFile(new URL('../'+imageName,import.meta.url));
 assert.equal(buffer.readUInt16BE(0),0xffd8);
 let dimensions=null;
 for(let offset=2;offset<buffer.length;){
  assert.equal(buffer[offset],0xff);
  const marker=buffer[offset+1];
  if(marker===0xda||marker===0xd9)break;
  const length=buffer.readUInt16BE(offset+2);
  assert.ok(length>=2);
  assert.notEqual(marker,0xe1,'no EXIF/XMP block');
  if([0xc0,0xc1,0xc2].includes(marker))dimensions={height:buffer.readUInt16BE(offset+5),width:buffer.readUInt16BE(offset+7)};
  offset+=length+2;
 }
 assert.deepEqual(dimensions,{width:1200,height:630});
 assert.ok(buffer.length<600_000,'social preview stays below 600KB');
});

test('story keeps first-day context, honest limitations and a low-priority learner route',()=>{
 assert.match(ABOUT_HTML,/บ้านของคุณก็ทำแบบนี้ได้/);
 assert.match(ABOUT_HTML,/ซอสสำเร็จรูป/);
 assert.match(ABOUT_HTML,/data-action="lucky-source"/);
 assert.equal(WORK_TITLE,'บ้านของเรา');
 assert.match(ABOUT_HTML,/ภาพจากวันแรกที่เราเข้าอยู่/);
 assert.match(ABOUT_HTML,/ขอบคุณที่แวะมาเยี่ยมบ้านของเรานะครับ/);
 assert.match(ABOUT_HTML,/<details class="story-sources">/);
 assert.match(ABOUT_HTML,/ไม่ใช่แบบก่อสร้างหรือผลสำรวจหน้างาน/);
 assert.match(ABOUT_HTML,/ไม่ใช่การยืนยันว่าสภาพบ้านเป็นปัจจุบัน/);
 assert.match(ABOUT_HTML,/ไม่อ้างว่าเจ้าของเว็บไซต์เป็นผู้ออกแบบสถาปัตยกรรมหรือผู้ถ่ายภาพทั้งหมด/);
 assert.match(ABOUT_HTML,/data-action="learn"/);
 assert.doesNotMatch(ABOUT_HTML,/\/Users\/|file:\/\/|href=["'][^"']*downloads\/|\bdownload(?:\s|>)/i);
});
