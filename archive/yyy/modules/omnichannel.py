# -*- coding: utf-8 -*-
"""
modules/omnichannel.py — MODULE 3: Omnichannel
a) สร้างโครงโฟลเดอร์ตอน (idempotent)
b) สร้าง metadata ต่อแพลตฟอร์ม (TikTok/Douyin/IG Reels/FB Reels) แบบ rule-based
c) Export เป็น .txt ลง 04_Exports อัตโนมัติ
กติกา: ทุกโพสต์ต้องมี #YYY | Douyin ห้ามอักษรละตินยกเว้น YYY | บรรทัดแรก caption ต้องมี hook คำถามหรือตัวเลข
"""
import json
import re
from pathlib import Path

import streamlit as st

from core import db
from core.canon import HASHTAG_CORE

PLATFORM_DIRS = ["TikTok", "Douyin", "IG_Reels", "FB_Reels"]


# ---------- a) Folder generator ----------

def _safe_name(text: str) -> str:
    """ทำชื่อโฟลเดอร์ให้ปลอดภัย (คงอักษรไทย/จีน/ญี่ปุ่นไว้)"""
    return re.sub(r'[\\/:*?"<>|\s]+', "_", text).strip("_")


def create_episode_folders(code: str, title_th: str) -> Path:
    """สร้าง projects/EP###_ชื่อ/{01_Raw,02_Audio_VO,03_Subtitles,04_Exports/{4 แพลตฟอร์ม}} — รันซ้ำได้"""
    base = db.PROJECTS_DIR / f"{code}_{_safe_name(title_th)}"
    for sub in ["01_Raw", "02_Audio_VO", "03_Subtitles"]:
        (base / sub).mkdir(parents=True, exist_ok=True)
    for p in PLATFORM_DIRS:
        (base / "04_Exports" / p).mkdir(parents=True, exist_ok=True)
    return base


def episode_folder(ep: dict) -> Path:
    """คืนพาธโฟลเดอร์ของตอน (สร้างใหม่ถ้ายังไม่มี)"""
    return create_episode_folders(ep["code"], ep["title_th"] or "ไม่มีชื่อ")


# ---------- b) Metadata generator ----------

def _location_info(ep: dict) -> dict:
    """หา archetype + ชื่อโลเคชัน 3 ภาษาของตอน (fallback = โฮมเบส)"""
    for loc in db.load_json("seed_locations.json"):
        if loc["name_th"] == ep["location"]:
            return loc
    return {"name_th": ep["location"] or "โฮมเบส", "name_zh": "曼谷", "name_ja": "バンコク",
            "archetype": "home"}


def _tags(archetype: str) -> dict:
    return db.load_json("seed_hooks.json")["archetypes"][archetype]["tags"]


def generate_metadata(ep: dict) -> dict:
    """สร้าง metadata 4 แพลตฟอร์มของตอน — บรรทัดแรกทุก caption มี hook คำถาม/ตัวเลข"""
    loc = _location_info(ep)
    tags = _tags(loc["archetype"])
    title_th = ep["title_th"] or f"ตอนใหม่ที่{loc['name_th']}"
    title_zh = ep["title_zh"] or f"{loc['name_zh']}新的一集"

    tiktok = {
        "title": f"เผ็ด 10 ปะทะ หวาน 0 ที่{loc['name_th']} ใครจะรอด?",
        "caption": (
            f"เผ็ดระดับ 10 กับหวานระดับ 0 มาเจอกันที่{loc['name_th']} ใครจะยอมก่อน?\n"
            f"{title_th} — เหยาเหยาขอเผ็ดสุด ยูริขอหวานสุด แล้วคนจ่ายคือพี่ยูเหมือนเดิม\n"
            "ดูจบแล้วบอกที ทีมเผ็ดหรือทีมหวาน?"
        ),
        "hashtags": [HASHTAG_CORE, "#TheYYYDiary", "#พี่ยูพาเที่ยว"] + tags["tiktok"],
    }
    douyin = {
        "title": f"辣度10对甜度0！在{loc['name_zh']}谁能撑住？",
        "caption": (
            f"辣度10碰上甜度0，在{loc['name_zh']}谁先投降？\n"
            f"{title_zh}——瑶瑶要最辣，尤莉要最甜，买单的永远是摄影师。\n"
            "看完告诉我：你站辣队还是甜队？"
        ),
        "hashtags": [HASHTAG_CORE, "#曼谷YYY", "#曼谷生活"] + tags["douyin"],
    }
    ig = {
        "title": f"Spice level 10 vs 0 at {loc['name_th']}",
        "caption": (
            f"Spice level 10 meets spice level 0 — who survives?\n"
            f"เผ็ดสุดปะทะหวานสุดที่{loc['name_th']} 🌶️🍰\n"
            "Team spicy or team sweet? Tell us below."
        ),
        "hashtags": [HASHTAG_CORE, "#BangkokLife", "#YuriYaoYao"] + tags["ig"],
    }
    fb = {
        "title": title_th,
        "caption": (
            f"วันนี้พาสองสาวไป{loc['name_th']} แล้วทุกอย่างก็วุ่นวายภายใน 3 นาทีแรก จะรอดไหม? "
            "เหยาเหยาประกาศสงครามความเผ็ดตั้งแต่ยังไม่ทันนั่ง ส่วนยูริก็หอบของหวานมาเต็มสองมือ "
            "และคนที่ต้องจ่ายทุกบาทก็คือผมเองครับ"
        ),
        "hashtags": [HASHTAG_CORE] + tags["fb"][:2],
    }
    return {"TikTok": tiktok, "Douyin": douyin, "IG_Reels": ig, "FB_Reels": fb}


def metadata_text(platform: str, meta: dict) -> str:
    """แปลง metadata เป็นข้อความพร้อมก็อป/พร้อมเซฟ .txt"""
    return (
        f"[{platform}]\n"
        f"TITLE: {meta['title']}\n\n"
        f"CAPTION:\n{meta['caption']}\n\n"
        f"HASHTAGS:\n{' '.join(meta['hashtags'])}\n"
    )


# ---------- c) Export .txt ----------

def export_metadata(ep: dict, all_meta: dict) -> list:
    """เขียน metadata ทุกแพลตฟอร์มลง 04_Exports/<แพลตฟอร์ม>/ — คืนรายการไฟล์"""
    base = episode_folder(ep)
    written = []
    for platform, meta in all_meta.items():
        path = base / "04_Exports" / platform / f"{ep['code']}_{platform}_metadata.txt"
        path.write_text(metadata_text(platform, meta), encoding="utf-8")
        written.append(path)
    return written


# ---------- UI ----------

def render():
    """หน้า 'ส่งออก (Omnichannel)'"""
    st.title("🚀 ส่งออก (Omnichannel)")
    st.caption("全渠道导出")
    st.caption(f"1 ตอน → 4 แพลตฟอร์ม | ทุกโพสต์ต้องมี {HASHTAG_CORE} ไม่มีข้อยกเว้น / "
               f"1集 → 4个平台 | 每条帖子必须有 {HASHTAG_CORE}，无一例外")

    episodes = db.query("SELECT * FROM episodes ORDER BY id DESC")
    if not episodes:
        st.warning("ยังไม่มีตอนในระบบ — ไปที่หน้า 'วางแผนถ่าย' แล้วกด 'บันทึกเป็นตอน' ก่อน / "
                   "系统里还没有集数 —— 先去「拍摄计划」页点击「保存为一集」")
        return

    labels = [f"{e['code']} — {e['title_th']} ({e['location']})" for e in episodes]
    ep = episodes[labels.index(st.selectbox("เลือกตอน / 选择集数", labels))]

    c1, c2 = st.columns(2)
    with c1:
        if st.button("📁 สร้าง/ตรวจโครงโฟลเดอร์ / 生成或检查文件夹", width="stretch"):
            base = episode_folder(ep)
            st.success(f"โฟลเดอร์พร้อม / 文件夹已就绪: `{base}`")
            for sub in sorted(p.relative_to(base) for p in base.rglob("*") if p.is_dir()):
                st.markdown(f"- 📂 `{sub}`")
    with c2:
        gen = st.button("📝 สร้าง metadata + export .txt อัตโนมัติ / 生成文案并自动导出.txt",
                        type="primary", width="stretch")

    if gen:
        all_meta = generate_metadata(ep)
        files = export_metadata(ep, all_meta)
        st.session_state["omni_meta"] = (ep["id"], all_meta)
        st.success(f"สร้าง metadata และบันทึกเป็น .txt แล้ว {len(files)} ไฟล์ใน 04_Exports / "
                   f"已生成文案，{len(files)} 个.txt文件已保存到 04_Exports")

    cached = st.session_state.get("omni_meta")
    if cached and cached[0] == ep["id"]:
        all_meta = cached[1]
        t1, t2, t3, t4 = st.tabs(["TikTok (ไทย/泰语)", "Douyin (จีน/中文)", "IG Reels (EN)", "FB Reels (ไทย/泰语)"])
        for tab, platform in zip((t1, t2, t3, t4), PLATFORM_DIRS):
            with tab:
                st.code(metadata_text(platform, all_meta[platform]), language=None)
        st.caption("กดไอคอนมุมขวาบนของกล่องเพื่อคัดลอกทั้งชุด — ไฟล์ .txt ถูกเซฟใน 04_Exports แล้ว / "
                   "点击框右上角图标即可复制全部内容 —— .txt 文件已保存在 04_Exports 中")
