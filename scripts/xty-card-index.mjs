#!/usr/bin/env node
/* Writes docs/XTY-CARD-INDEX.md from the catalog itself.

   The table is generated rather than typed so it cannot drift from what
   the game actually prints. After adding art and a line to PRINTED in
   xty/_shared/cards.js, run:

     node scripts/xty-card-index.mjs
*/
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { XTY_CARDS, XTY_DROP_ODDS, XTY_CARD_COLORS } = await import(join(root, 'xty/_shared/cards.js'));
const { XTY_SPECIES } = await import(join(root, 'xty/_shared/avatars.js'));

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const rows = XTY_CARDS.map((card, index) => {
  const file = card.art.replace('/xty/assets/cards/', '');
  return {
    seq: String(index + 1).padStart(3, '0'),
    cardId: card.cardId,
    species: card.species,
    nameTh: card.speciesNameTh,
    color: card.color,
    rarity: card.rarity,
    cover: card.eligibility.partyCover ? '✓' : '—',
    art: file,
    exists: existsSync(join(root, 'xty', card.art.replace('/xty/', ''))),
  };
});

const counts = RARITY_ORDER.map(rarity => `${rarity}: ${rows.filter(r => r.rarity === rarity).length}`);
const missing = rows.filter(r => !r.exists);

const lines = [
  '# XTY — ดัชนีการ์ดทั้งหมด',
  '',
  '> ไฟล์นี้ถูก **generate** จาก `xty/_shared/cards.js` โดยตรง',
  '> อย่าแก้ด้วยมือ — เพิ่มการ์ดแล้วรัน `node scripts/xty-card-index.mjs` ใหม่',
  '',
  `รวม **${rows.length} ใบ** · ${counts.join(' · ')}`,
  '',
  '## Card ID',
  '',
  '```',
  'SPECIES_COLOR_RARITY_NNN',
  '```',
  '',
  '- `NNN` คือเลขลำดับ **ภายในกลุ่ม species+color+rarity** ไม่ใช่เลขรันทั้งชุด',
  '  เช่น แมวส้มสีแดง Common มีสองภาพ = `_001` และ `_002`',
  '- ID เป็น **storage key** ที่บันทึกในโปรไฟล์ผู้ใช้จริง เปลี่ยนแล้วการ์ดที่คนถืออยู่จะหาย',
  '  จึงห้ามเรียงเลขใหม่ย้อนหลัง เพิ่มได้อย่างเดียว',
  '- คอลัมน์ `#` ในตารางคือ**ลำดับปัจจุบันในแคตตาล็อก** ใช้อ่านง่าย แต่จะขยับเมื่อมีการ์ดใหม่',
  '  ถ้าจะทำ data หลังบ้าน ให้ยึด `CARD_ID` เป็นคีย์เสมอ',
  '- ผู้ใช้ไม่เห็นทั้งเลขและ ID — บนการ์ดมีแต่ภาพ',
  '',
  '## ลำดับการจัดเรียง',
  '',
  '1. **Rarity** ตามบันได: ' + RARITY_ORDER.join(' → '),
  '2. **Species** ตามลำดับที่ประกาศไว้ใน `PRINTED` ของแต่ละ rarity',
  '3. **Color** ตามลำดับคงที่: ' + XTY_CARD_COLORS.join(' → '),
  '4. **Variant** ภาพ a → b (`_001` → `_002`)',
  '',
  '## อัตราการออก (สุ่มทีละใบ โอกาสเท่าเดิมทุกครั้ง ไม่มี pity)',
  '',
  '| Rarity | โอกาส |',
  '| :--- | ---: |',
  ...RARITY_ORDER.map(rarity => `| ${rarity.toUpperCase()} | ${XTY_DROP_ODDS[rarity]}% |`),
  '',
  '## Starter (ฟรี ไม่ใช่การ์ด ไม่มีสี)',
  '',
  XTY_SPECIES.filter(s => s.starter).map(s => `${s.nameTh} \`${s.id}\``).join(' · '),
  '',
  '## ตารางการ์ด',
  '',
  '| # | CARD_ID | สัตว์ | สี | Rarity | ปกตี้ | ไฟล์ภาพ |',
  '| ---: | :--- | :--- | :--- | :--- | :---: | :--- |',
  ...rows.map(r =>
    `| ${r.seq} | \`${r.cardId}\` | ${r.nameTh} | ${r.color} | ${r.rarity} | ${r.cover} | \`${r.art}\`${r.exists ? '' : ' ⚠️ ไม่พบไฟล์'} |`
  ),
  '',
];

if (missing.length) {
  lines.push('## ⚠️ ไฟล์ภาพที่หายไป', '', ...missing.map(r => `- \`${r.cardId}\` → \`${r.art}\``), '');
}

writeFileSync(join(root, 'docs/XTY-CARD-INDEX.md'), lines.join('\n'));
process.stdout.write(`docs/XTY-CARD-INDEX.md · ${rows.length} cards · ${counts.join(' · ')}\n`);
if (missing.length) process.stdout.write(`missing art: ${missing.length}\n`);
