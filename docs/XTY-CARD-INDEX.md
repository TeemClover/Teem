# XTY — ดัชนีการ์ดทั้งหมด

> ไฟล์นี้ถูก **generate** จาก `xty/_shared/cards.js` โดยตรง
> อย่าแก้ด้วยมือ — เพิ่มการ์ดแล้วรัน `node scripts/xty-card-index.mjs` ใหม่

รวม **96 ใบ** · common: 64 · rare: 12 · epic: 12 · legendary: 8

## Card ID

```
SPECIES_COLOR_RARITY_NNN
```

- `NNN` คือเลขลำดับ **ภายในกลุ่ม species+color+rarity** ไม่ใช่เลขรันทั้งชุด
  เช่น แมวส้มสีแดง Common มีสองภาพ = `_001` และ `_002`
- ID เป็น **storage key** ที่บันทึกในโปรไฟล์ผู้ใช้จริง เปลี่ยนแล้วการ์ดที่คนถืออยู่จะหาย
  จึงห้ามเรียงเลขใหม่ย้อนหลัง เพิ่มได้อย่างเดียว
- คอลัมน์ `#` ในตารางคือ**ลำดับปัจจุบันในแคตตาล็อก** ใช้อ่านง่าย แต่จะขยับเมื่อมีการ์ดใหม่
  ถ้าจะทำ data หลังบ้าน ให้ยึด `CARD_ID` เป็นคีย์เสมอ
- ผู้ใช้ไม่เห็นทั้งเลขและ ID — บนการ์ดมีแต่ภาพ

## ลำดับการจัดเรียง

1. **Rarity** ตามบันได: common → rare → epic → legendary
2. **Species** ตามลำดับที่ประกาศไว้ใน `PRINTED` ของแต่ละ rarity
3. **Color** ตามลำดับคงที่: red → green → blue → silver
4. **Variant** ภาพ a → b (`_001` → `_002`)

## อัตราการออก (สุ่มทีละใบ โอกาสเท่าเดิมทุกครั้ง ไม่มี pity)

| Rarity | โอกาส |
| :--- | ---: |
| COMMON | 70% |
| RARE | 22% |
| EPIC | 7% |
| LEGENDARY | 1% |

## Starter (ฟรี ไม่ใช่การ์ด ไม่มีสี)

แมว `orange_cat` · หมา `white_pom` · แมวขาว `white_cat` · หมู `pig` · ควาย `buffalo` · กา `crow` · เต่า `turtle` · ไก่ `chicken` · กระต่าย `rabbit` · จิ้งจอก `fox` · นกฮูก `owl` · ยูนิคอร์น `unicorn`

## ตารางการ์ด

| # | CARD_ID | สัตว์ | สี | Rarity | ปกตี้ | ไฟล์ภาพ |
| ---: | :--- | :--- | :--- | :--- | :---: | :--- |
| 001 | `ORANGE_CAT_RED_COMMON_001` | แมว | red | common | — | `common/orange-cat-red-a.webp` |
| 002 | `ORANGE_CAT_RED_COMMON_002` | แมว | red | common | — | `common/orange-cat-red-b.webp` |
| 003 | `ORANGE_CAT_GREEN_COMMON_001` | แมว | green | common | — | `common/orange-cat-green-a.webp` |
| 004 | `ORANGE_CAT_GREEN_COMMON_002` | แมว | green | common | — | `common/orange-cat-green-b.webp` |
| 005 | `ORANGE_CAT_BLUE_COMMON_001` | แมว | blue | common | — | `common/orange-cat-blue-a.webp` |
| 006 | `ORANGE_CAT_BLUE_COMMON_002` | แมว | blue | common | — | `common/orange-cat-blue-b.webp` |
| 007 | `ORANGE_CAT_SILVER_COMMON_001` | แมว | silver | common | — | `common/orange-cat-silver-a.webp` |
| 008 | `ORANGE_CAT_SILVER_COMMON_002` | แมว | silver | common | — | `common/orange-cat-silver-b.webp` |
| 009 | `WHITE_CAT_RED_COMMON_001` | แมวขาว | red | common | — | `common/white-cat-red-a.webp` |
| 010 | `WHITE_CAT_RED_COMMON_002` | แมวขาว | red | common | — | `common/white-cat-red-b.webp` |
| 011 | `WHITE_CAT_GREEN_COMMON_001` | แมวขาว | green | common | — | `common/white-cat-green-a.webp` |
| 012 | `WHITE_CAT_GREEN_COMMON_002` | แมวขาว | green | common | — | `common/white-cat-green-b.webp` |
| 013 | `WHITE_CAT_BLUE_COMMON_001` | แมวขาว | blue | common | — | `common/white-cat-blue-a.webp` |
| 014 | `WHITE_CAT_BLUE_COMMON_002` | แมวขาว | blue | common | — | `common/white-cat-blue-b.webp` |
| 015 | `WHITE_CAT_SILVER_COMMON_001` | แมวขาว | silver | common | — | `common/white-cat-silver-a.webp` |
| 016 | `WHITE_CAT_SILVER_COMMON_002` | แมวขาว | silver | common | — | `common/white-cat-silver-b.webp` |
| 017 | `WHITE_POM_RED_COMMON_001` | หมา | red | common | — | `common/white-pom-red-a.webp` |
| 018 | `WHITE_POM_RED_COMMON_002` | หมา | red | common | — | `common/white-pom-red-b.webp` |
| 019 | `WHITE_POM_GREEN_COMMON_001` | หมา | green | common | — | `common/white-pom-green-a.webp` |
| 020 | `WHITE_POM_GREEN_COMMON_002` | หมา | green | common | — | `common/white-pom-green-b.webp` |
| 021 | `WHITE_POM_BLUE_COMMON_001` | หมา | blue | common | — | `common/white-pom-blue-a.webp` |
| 022 | `WHITE_POM_BLUE_COMMON_002` | หมา | blue | common | — | `common/white-pom-blue-b.webp` |
| 023 | `WHITE_POM_SILVER_COMMON_001` | หมา | silver | common | — | `common/white-pom-silver-a.webp` |
| 024 | `WHITE_POM_SILVER_COMMON_002` | หมา | silver | common | — | `common/white-pom-silver-b.webp` |
| 025 | `PIG_RED_COMMON_001` | หมู | red | common | — | `common/pig-red-a.webp` |
| 026 | `PIG_RED_COMMON_002` | หมู | red | common | — | `common/pig-red-b.webp` |
| 027 | `PIG_GREEN_COMMON_001` | หมู | green | common | — | `common/pig-green-a.webp` |
| 028 | `PIG_GREEN_COMMON_002` | หมู | green | common | — | `common/pig-green-b.webp` |
| 029 | `PIG_BLUE_COMMON_001` | หมู | blue | common | — | `common/pig-blue-a.webp` |
| 030 | `PIG_BLUE_COMMON_002` | หมู | blue | common | — | `common/pig-blue-b.webp` |
| 031 | `PIG_SILVER_COMMON_001` | หมู | silver | common | — | `common/pig-silver-a.webp` |
| 032 | `PIG_SILVER_COMMON_002` | หมู | silver | common | — | `common/pig-silver-b.webp` |
| 033 | `BUFFALO_RED_COMMON_001` | ควาย | red | common | — | `common/buffalo-red-a.webp` |
| 034 | `BUFFALO_RED_COMMON_002` | ควาย | red | common | — | `common/buffalo-red-b.webp` |
| 035 | `BUFFALO_GREEN_COMMON_001` | ควาย | green | common | — | `common/buffalo-green-a.webp` |
| 036 | `BUFFALO_GREEN_COMMON_002` | ควาย | green | common | — | `common/buffalo-green-b.webp` |
| 037 | `BUFFALO_BLUE_COMMON_001` | ควาย | blue | common | — | `common/buffalo-blue-a.webp` |
| 038 | `BUFFALO_BLUE_COMMON_002` | ควาย | blue | common | — | `common/buffalo-blue-b.webp` |
| 039 | `BUFFALO_SILVER_COMMON_001` | ควาย | silver | common | — | `common/buffalo-silver-a.webp` |
| 040 | `BUFFALO_SILVER_COMMON_002` | ควาย | silver | common | — | `common/buffalo-silver-b.webp` |
| 041 | `CHICKEN_RED_COMMON_001` | ไก่ | red | common | — | `common/chicken-red-a.webp` |
| 042 | `CHICKEN_RED_COMMON_002` | ไก่ | red | common | — | `common/chicken-red-b.webp` |
| 043 | `CHICKEN_GREEN_COMMON_001` | ไก่ | green | common | — | `common/chicken-green-a.webp` |
| 044 | `CHICKEN_GREEN_COMMON_002` | ไก่ | green | common | — | `common/chicken-green-b.webp` |
| 045 | `CHICKEN_BLUE_COMMON_001` | ไก่ | blue | common | — | `common/chicken-blue-a.webp` |
| 046 | `CHICKEN_BLUE_COMMON_002` | ไก่ | blue | common | — | `common/chicken-blue-b.webp` |
| 047 | `CHICKEN_SILVER_COMMON_001` | ไก่ | silver | common | — | `common/chicken-silver-a.webp` |
| 048 | `CHICKEN_SILVER_COMMON_002` | ไก่ | silver | common | — | `common/chicken-silver-b.webp` |
| 049 | `CROW_RED_COMMON_001` | กา | red | common | — | `common/crow-red-a.webp` |
| 050 | `CROW_RED_COMMON_002` | กา | red | common | — | `common/crow-red-b.webp` |
| 051 | `CROW_GREEN_COMMON_001` | กา | green | common | — | `common/crow-green-a.webp` |
| 052 | `CROW_GREEN_COMMON_002` | กา | green | common | — | `common/crow-green-b.webp` |
| 053 | `CROW_BLUE_COMMON_001` | กา | blue | common | — | `common/crow-blue-a.webp` |
| 054 | `CROW_BLUE_COMMON_002` | กา | blue | common | — | `common/crow-blue-b.webp` |
| 055 | `CROW_SILVER_COMMON_001` | กา | silver | common | — | `common/crow-silver-a.webp` |
| 056 | `CROW_SILVER_COMMON_002` | กา | silver | common | — | `common/crow-silver-b.webp` |
| 057 | `TURTLE_RED_COMMON_001` | เต่า | red | common | — | `common/turtle-red-a.webp` |
| 058 | `TURTLE_RED_COMMON_002` | เต่า | red | common | — | `common/turtle-red-b.webp` |
| 059 | `TURTLE_GREEN_COMMON_001` | เต่า | green | common | — | `common/turtle-green-a.webp` |
| 060 | `TURTLE_GREEN_COMMON_002` | เต่า | green | common | — | `common/turtle-green-b.webp` |
| 061 | `TURTLE_BLUE_COMMON_001` | เต่า | blue | common | — | `common/turtle-blue-a.webp` |
| 062 | `TURTLE_BLUE_COMMON_002` | เต่า | blue | common | — | `common/turtle-blue-b.webp` |
| 063 | `TURTLE_SILVER_COMMON_001` | เต่า | silver | common | — | `common/turtle-silver-a.webp` |
| 064 | `TURTLE_SILVER_COMMON_002` | เต่า | silver | common | — | `common/turtle-silver-b.webp` |
| 065 | `ORANGE_CAT_RED_RARE_001` | แมว | red | rare | ✓ | `rare/orange-cat-red-rare-001.webp` |
| 066 | `ORANGE_CAT_GREEN_RARE_001` | แมว | green | rare | ✓ | `rare/orange-cat-green-rare-001.webp` |
| 067 | `ORANGE_CAT_BLUE_RARE_001` | แมว | blue | rare | ✓ | `rare/orange-cat-blue-rare-001.webp` |
| 068 | `ORANGE_CAT_SILVER_RARE_001` | แมว | silver | rare | ✓ | `rare/orange-cat-silver-rare-001.webp` |
| 069 | `WHITE_POM_RED_RARE_001` | หมา | red | rare | ✓ | `rare/white-pom-red-rare-001.webp` |
| 070 | `WHITE_POM_GREEN_RARE_001` | หมา | green | rare | ✓ | `rare/white-pom-green-rare-001.webp` |
| 071 | `WHITE_POM_BLUE_RARE_001` | หมา | blue | rare | ✓ | `rare/white-pom-blue-rare-001.webp` |
| 072 | `WHITE_POM_SILVER_RARE_001` | หมา | silver | rare | ✓ | `rare/white-pom-silver-rare-001.webp` |
| 073 | `WHITE_CAT_RED_RARE_001` | แมวขาว | red | rare | ✓ | `rare/white-cat-red-rare-001.webp` |
| 074 | `WHITE_CAT_GREEN_RARE_001` | แมวขาว | green | rare | ✓ | `rare/white-cat-green-rare-001.webp` |
| 075 | `WHITE_CAT_BLUE_RARE_001` | แมวขาว | blue | rare | ✓ | `rare/white-cat-blue-rare-001.webp` |
| 076 | `WHITE_CAT_SILVER_RARE_001` | แมวขาว | silver | rare | ✓ | `rare/white-cat-silver-rare-001.webp` |
| 077 | `ORANGE_CAT_RED_EPIC_001` | แมว | red | epic | ✓ | `epic/orange-cat-red.webp` |
| 078 | `ORANGE_CAT_GREEN_EPIC_001` | แมว | green | epic | ✓ | `epic/orange-cat-green.webp` |
| 079 | `ORANGE_CAT_BLUE_EPIC_001` | แมว | blue | epic | ✓ | `epic/orange-cat-blue.webp` |
| 080 | `ORANGE_CAT_SILVER_EPIC_001` | แมว | silver | epic | ✓ | `epic/orange-cat-silver.webp` |
| 081 | `WHITE_CAT_RED_EPIC_001` | แมวขาว | red | epic | ✓ | `epic/white-cat-red.webp` |
| 082 | `WHITE_CAT_GREEN_EPIC_001` | แมวขาว | green | epic | ✓ | `epic/white-cat-green.webp` |
| 083 | `WHITE_CAT_BLUE_EPIC_001` | แมวขาว | blue | epic | ✓ | `epic/white-cat-blue.webp` |
| 084 | `WHITE_CAT_SILVER_EPIC_001` | แมวขาว | silver | epic | ✓ | `epic/white-cat-silver.webp` |
| 085 | `WHITE_POM_RED_EPIC_001` | หมา | red | epic | ✓ | `epic/white-pom-red.webp` |
| 086 | `WHITE_POM_GREEN_EPIC_001` | หมา | green | epic | ✓ | `epic/white-pom-green.webp` |
| 087 | `WHITE_POM_BLUE_EPIC_001` | หมา | blue | epic | ✓ | `epic/white-pom-blue.webp` |
| 088 | `WHITE_POM_SILVER_EPIC_001` | หมา | silver | epic | ✓ | `epic/white-pom-silver.webp` |
| 089 | `ORANGE_CAT_BLUE_LEGENDARY_001` | แมว | blue | legendary | ✓ | `legendary/orange-cat-blue.webp` |
| 090 | `WHITE_CAT_SILVER_LEGENDARY_001` | แมวขาว | silver | legendary | ✓ | `legendary/white-cat-silver.webp` |
| 091 | `WHITE_POM_GREEN_LEGENDARY_001` | หมา | green | legendary | ✓ | `legendary/white-pom-green.webp` |
| 092 | `BUFFALO_SILVER_LEGENDARY_001` | ควาย | silver | legendary | ✓ | `legendary/buffalo-silver.webp` |
| 093 | `CHICKEN_RED_LEGENDARY_001` | ไก่ | red | legendary | ✓ | `legendary/chicken-red.webp` |
| 094 | `CROW_BLUE_LEGENDARY_001` | กา | blue | legendary | ✓ | `legendary/crow-blue.webp` |
| 095 | `PIG_RED_LEGENDARY_001` | หมู | red | legendary | ✓ | `legendary/pig-red.webp` |
| 096 | `UNICORN_GREEN_LEGENDARY_001` | ยูนิคอร์น | green | legendary | ✓ | `legendary/unicorn-green.webp` |
