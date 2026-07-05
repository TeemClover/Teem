# -*- coding: utf-8 -*-
"""
modules/script_factory/world_bible.py — World Bible ของ Script Factory
ตัวละครดึงจาก core/canon.py (แหล่งความจริงเดียว) — ไม่นิยามซ้ำ เพื่อกันข้อมูลขัดกัน
บทที่ปั่นออกมาใช้ตัวละครชุดเดียวกับทั้งระบบ: 瑶瑶(จีน เผ็ด) / ยูริ(ญี่ปุ่น หวาน) / ยู(ไทย ตากล้อง)
ภาษาบทพูด = ไทย / จีน / ญี่ปุ่น (ตามภาษาแม่ของตัวละครแต่ละคน) — ห้ามมี Pinyin เด็ดขาด
"""
from core.canon import CHARACTERS as _CANON

# ตัวละคร 2 สาวหน้ากล้อง (YY, YR) + ยู (YOU) เป็นตากล้อง POV — ทุกตัวมาจาก canon
CHARACTERS_SF = {tag: _CANON[tag] for tag in ("YY", "YR", "YOU")}

# ตัวละครหลักที่ใช้ในบท (2 สาวที่พูดหน้ากล้อง)
ONSCREEN = ("YY", "YR")

LOCATIONS_SF = [
    {"id": "night_market",  "th": "ตลาดนัดกลางคืน", "zh": "夜市",       "en": "Night Market",        "archetype": "market"},
    {"id": "yaowarat",      "th": "เยาวราช",         "zh": "唐人街",     "en": "Chinatown",           "archetype": "market"},
    {"id": "cafe",          "th": "คาเฟ่",           "zh": "咖啡店",     "en": "Cafe",                "archetype": "cafe"},
    {"id": "supermarket",   "th": "ซูเปอร์มาร์เก็ต", "zh": "超市",       "en": "Supermarket",         "archetype": "store"},
    {"id": "bts",           "th": "รถไฟฟ้า BTS",     "zh": "轻轨",       "en": "BTS Skytrain",        "archetype": "transit"},
    {"id": "tuktuk",        "th": "ตุ๊กตุ๊ก",        "zh": "嘟嘟车",     "en": "Tuk-Tuk Ride",        "archetype": "transit"},
    {"id": "park",          "th": "สวนลุมพินี",      "zh": "伦披尼公园", "en": "Lumpini Park",        "archetype": "park"},
    {"id": "muaythai",      "th": "ยิมมวยไทย",       "zh": "泰拳馆",     "en": "Muay Thai Gym",       "archetype": "activity"},
    {"id": "massage",       "th": "ร้านนวดไทย",      "zh": "泰式按摩店", "en": "Thai Massage Parlor", "archetype": "activity"},
    {"id": "chatuchak",     "th": "จตุจักร",         "zh": "乍都乍市场", "en": "Chatuchak Market",    "archetype": "market"},
    {"id": "convenience",   "th": "เซเว่น",          "zh": "便利店",     "en": "7-Eleven",            "archetype": "store"},
    {"id": "condo_kitchen", "th": "คอนโด/ครัว",      "zh": "公寓厨房",   "en": "Home Kitchen",        "archetype": "home"},
]

THEMES = [
    {"id": "food_adventure", "th": "ผจญภัยอาหาร",   "zh": "美食冒险", "en": "Food Adventure"},
    {"id": "culture_clash",  "th": "วัฒนธรรมปะทะ",   "zh": "文化碰撞", "en": "Culture Clash"},
    {"id": "challenge",      "th": "ชาเลนจ์",        "zh": "挑战赛",   "en": "Challenge"},
    {"id": "shopping_haul",  "th": "ช้อปปิ้ง",       "zh": "购物",     "en": "Shopping Haul"},
    {"id": "cooking_battle", "th": "ศึกครัว",        "zh": "厨房大战", "en": "Cooking Battle"},
    {"id": "travel_explore", "th": "ท่องเที่ยว",     "zh": "探索旅行", "en": "Travel & Explore"},
    {"id": "daily_life",     "th": "ชีวิตประจำวัน",  "zh": "日常生活", "en": "Daily Life"},
    {"id": "special_event",  "th": "เทศกาล/อีเวนต์", "zh": "节日活动", "en": "Festival / Event"},
    {"id": "mukbang_react",  "th": "กินโชว์/รีแอค",  "zh": "吃播反应", "en": "Mukbang & React"},
    {"id": "friendship",     "th": "มิตรภาพ",        "zh": "友情时刻", "en": "Friendship Moment"},
]

COMEDY_BEATS = [
    "taste_clash", "role_reversal", "escalation", "secret_reveal", "teamwork_fail",
    "outsider_judge", "budget_crisis", "lost_adventure", "competition", "heartfelt_twist",
]

EMOTIONAL_ARCS = [
    "chaotic_to_sweet", "confident_to_humbled", "rivals_to_allies", "calm_to_chaos", "sweet_to_spicy",
]

# น้ำหนักคะแนน 12 เกณฑ์ (รวม 1.0)
WEIGHTS = {
    "viral_potential": 0.12, "comedy_quality": 0.12, "visual_appeal": 0.08,
    "character_chemistry": 0.10, "cultural_relevance_th": 0.08, "cultural_relevance_zh": 0.08,
    "cultural_relevance_intl": 0.08, "hook_strength": 0.10, "rewatch_value": 0.06,
    "brand_alignment": 0.06, "location_utilization": 0.06, "language_naturalness": 0.06,
}

# ป้ายชื่อเกณฑ์ 2 ภาษา ไทย + จีน (ใช้ใน UI)
CRITERIA_TH = {
    "viral_potential": "โอกาสไวรัล/爆款潜力", "comedy_quality": "ความตลก/喜剧质量",
    "visual_appeal": "ความสวยของภาพ/画面吸引力",
    "character_chemistry": "เคมีตัวละคร/角色化学反应", "cultural_relevance_th": "โดนใจคนไทย/泰国文化共鸣",
    "cultural_relevance_zh": "โดนใจคนจีน/中国文化共鸣", "cultural_relevance_intl": "โดนใจอินเตอร์/国际文化共鸣",
    "hook_strength": "พลังฮุค 3 วิ/开场钩子力度", "rewatch_value": "ดูซ้ำได้/可重复观看",
    "brand_alignment": "ตรงแบรนด์/品牌契合度",
    "location_utilization": "ใช้โลเคชันคุ้ม/地点利用率", "language_naturalness": "ภาษาเนทีฟ/语言自然度",
}

# แมปชื่อเกณฑ์ → คอลัมน์ DB
SCORE_COLS = {
    "viral_potential": "score_viral", "comedy_quality": "score_comedy", "visual_appeal": "score_visual",
    "character_chemistry": "score_chemistry", "cultural_relevance_th": "score_cultural_th",
    "cultural_relevance_zh": "score_cultural_zh", "cultural_relevance_intl": "score_cultural_intl",
    "hook_strength": "score_hook", "rewatch_value": "score_rewatch", "brand_alignment": "score_brand",
    "location_utilization": "score_location", "language_naturalness": "score_language",
}

COMPACT_WORLD_BIBLE = """
# THE YYY DIARY — WORLD BIBLE (COMPACT)

## CHARACTERS (two on-camera leads + one POV cameraman)
YY — 瑶瑶 / เหยาเหยา (English stage name: Ruby): CHINESE woman. Fierce, glamorous, luxurious, sharp-tongued CEO energy. Spice level 10 — obsessed with spicy food, fearless, never admits defeat even with tears streaming. Signature: modern red qipao. She speaks CHINESE natively. Comedy role: the elegant one who is secretly a spice demon.

YR — 尤莉 / ยูริ (English stage name: Yuri): JAPANESE woman. Soft, gentle, delicate artist. Spice level 0 — cannot handle even half a chili. Sweet-tooth. Signature: earth-tone artist outfit. She speaks JAPANESE natively. Comedy role: the calm sweet one whose composure shatters the instant she tastes spice.

YOU — 尤 / ยู (English stage name: Yu): THAI man. The POV cameraman — NEVER appears on camera, exists only through sarcastic voice-over (added later) and the hand that reaches into frame to pay. He speaks THAI. Comedy role: cameraman + human wallet.

## CORE JOKE
Spice 10 (Ruby) vs Spice 0 (Yuri) — the fierce glamorous Chinese woman loves brutal spice, the gentle Japanese artist can't handle any. Their clash IS the show. Yu films it all and pays for everything.

## LANGUAGE (each character speaks their mother tongue; the other languages are subtitles)
- Ruby (YY) speaks Chinese (line_zh is her real spoken line)
- Yuri (YR) speaks Japanese (line_ja is her real spoken line)
- Yu (YOU) speaks Thai (line_th is his real spoken line) — VO only
Everyone understands everyone 100%. No lost-in-translation gags.

## 12 BANGKOK LOCATIONS
Night Market, Chinatown (Yaowarat), Cafe, Supermarket, BTS, Tuk-Tuk, Lumpini Park, Muay Thai Gym, Thai Massage, Chatuchak Market, 7-Eleven, Home Kitchen

## RULES
- Each language version must feel NATIVE (not translated)
- No Pinyin/romanization ever — Chinese in simplified characters only
- Signature outfits only (footage reuse)
- Hook in first 3 seconds (camera look + bold statement, ideally calling "Yu")
- Sweet vs Spicy clash in every episode
- Warm bickering, never mean — they're best friends
- #YYY on every platform
"""
