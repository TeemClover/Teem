# -*- coding: utf-8 -*-
"""
modules/smart_shoot.py — MODULE 1: Smart Shoot
สร้างแผนถ่ายจากโลเคชัน: HOOK ตลกสถานการณ์ + MICRO-SCRIPT 3 ภาษา 8-12 บรรทัด + B-ROLL CHECKLIST
ตรรกะ rule-based ล้วน (สุ่มผสมจากคลัง template ใน data/seed_hooks.json) — ไม่มี API ภายนอก
ทุก hook มาจากสูตร: เหยาเหยาอยากเผ็ด × ยูริอยากหวาน × ยูต้องจ่าย/แก้ปัญหา
UI แสดง 2 ภาษา (ไทย + จีน) ทุกจุด — บทสามภาษา (ไทย/จีน/ญี่ปุ่น) ของตัวคอนเทนต์ไม่แตะ
"""
import random

import streamlit as st

from core import db
from core.canon import CHARACTERS, SPEAKER_LANG, UNIVERSE_RULES

# ป้ายจังหวะบท: key ภาษาไทยใช้เทียบภายในเหมือนเดิม ค่านี้ใช้แสดงผลบนจอ (ไทย + จีน)
BEAT_LABEL_ZH = {
    "เปิดฮุค 3 วิ (มองกล้องเรียกยู)": "开场钩子 3秒（看镜头喊小尤）",
    "ความขัดแย้งเผ็ด-หวาน": "辣甜冲突",
    "จุดพีค": "高潮",
    "ปิด + เรียกยู": "结尾 + 喊小尤",
}


def _fill(text: str, loc: dict) -> str:
    """เติมชื่อโลเคชัน 3 ภาษาลงใน template"""
    return (text.replace("{loc_th}", loc["name_th"])
                .replace("{loc_zh}", loc["name_zh"])
                .replace("{loc_ja}", loc["name_ja"]))


def _fill_line(line: dict, loc: dict) -> dict:
    """เติมโลเคชันลงไลน์ 3 ภาษา 1 บรรทัด"""
    out = {"sp": line["sp"], "act": line.get("act")}
    for k in ("th", "zh", "ja"):
        out[k] = _fill(line[k], loc)
    return out


def generate_plan(loc: dict, seed: int | None = None) -> dict:
    """ประกอบแผนถ่าย 1 ชุดจากคลัง template (สุ่มผสมไม่ให้ซ้ำเดิมทุกครั้งที่กด)"""
    rng = random.Random(seed)
    bank = db.load_json("seed_hooks.json")
    arch = bank["archetypes"][loc["archetype"]]
    shared = bank["shared"]

    hook = _fill(rng.choice(arch["hooks"]), loc)

    # โครง 4 จังหวะ: เปิดฮุค 3 วิ → ขัดแย้งเผ็ด-หวาน → จุดพีค → ปิด+เรียกยู
    script = []
    for beat_name, beat_set in (
        ("เปิดฮุค 3 วิ (มองกล้องเรียกยู)", rng.choice(arch["opens"])),
        ("ความขัดแย้งเผ็ด-หวาน", rng.choice(shared["conflict"])),
        ("จุดพีค", rng.choice(shared["peak"])),
        ("ปิด + เรียกยู", rng.choice(shared["close"])),
    ):
        for line in beat_set:
            item = _fill_line(line, loc)
            item["beat"] = beat_name
            script.append(item)

    broll = [_fill(b, loc) for b in arch["broll"]]
    return {
        "location": loc["name_th"], "archetype": loc["archetype"],
        "best_time": loc["best_time"], "permit_note": loc["permit_note"],
        "noise_level": loc["noise_level"],
        "hook": hook, "script": script, "broll": broll,
    }


def _speaker_label(sp: str) -> str:
    c = CHARACTERS[sp]
    return f"{c['name_th']} ({sp})"


def render_plan(plan: dict):
    """แสดงแผนถ่ายบนหน้าจอ"""
    st.markdown(f"### 📍 {plan['location']}")
    i1, i2, i3 = st.columns(3)
    i1.markdown(f"**เวลาที่เหมาะ / 拍摄时间:** {plan['best_time']}")
    i2.markdown(f"**เรื่องขออนุญาต / 许可须知:** {plan['permit_note']}")
    i3.markdown(f"**ระดับเสียงรบกวน / 噪音水平:** {plan['noise_level']}")

    st.markdown("#### 🎣 HOOK ตลกสถานการณ์ / 情景笑点钩子")
    st.info(plan["hook"])

    st.markdown(f"#### 📜 MICRO-SCRIPT ({len(plan['script'])} บรรทัด / 行 — 3 ภาษา / 三语)")
    st.caption("ผู้พูดพูดภาษาแม่ตัวเอง (ตัวหนา) อีกสองภาษาใช้เป็นซับ | ทุกคนเข้าใจกัน 100% "
               "（说话人用母语，粗体；另两种语言当字幕，彼此百分百听得懂）")
    beat_now = None
    for i, line in enumerate(plan["script"], 1):
        if line["beat"] != beat_now:
            beat_now = line["beat"]
            st.markdown(f"**— {beat_now} / {BEAT_LABEL_ZH.get(beat_now, '')} —**")
        c = CHARACTERS[line["sp"]]
        native = SPEAKER_LANG[line["sp"]]
        act = f" *({line['act']})*" if line.get("act") else ""
        parts = []
        for lang in ("th", "zh", "ja"):
            txt = line[lang]
            parts.append(f"**{txt}**" if lang == native else f"<span style='opacity:.65'>{txt}</span>")
        st.markdown(
            f"<div style='border-left:4px solid {c['color']};padding:2px 10px;margin:4px 0'>"
            f"{i}. <b style='color:{c['color']}'>{_speaker_label(line['sp'])}</b>{act}<br>"
            f"{parts[0]}<br>{parts[1]}<br>{parts[2]}</div>",
            unsafe_allow_html=True,
        )

    st.markdown(f"#### 🎥 B-ROLL CHECKLIST ({len(plan['broll'])} ช็อต / 个镜头)")
    for shot in plan["broll"]:
        st.checkbox(shot, key=f"broll_{plan['location']}_{shot}")


def _titles_from_plan(plan: dict) -> tuple:
    """ตั้งชื่อตอน 3 ภาษาแบบ rule-based จากโลเคชัน"""
    loc = next(l for l in db.load_json("seed_locations.json") if l["name_th"] == plan["location"])
    title_th = f"ศึกเผ็ดปะทะหวานที่{loc['name_th']}"
    title_zh = f"{loc['name_zh']}的辣与甜之战"
    title_ja = f"{loc['name_ja']}で辛い派と甘い派の対決"
    return title_th, title_zh, title_ja


def save_as_episode(plan: dict, tier: str) -> tuple:
    """บันทึกแผนเป็นตอนใหม่ + สร้างโครงโฟลเดอร์ผ่าน Module 3 — คืน (code, path)"""
    from modules import omnichannel  # import ตอนใช้งาน เลี่ยง circular import

    code = db.next_episode_code()
    title_th, title_zh, title_ja = _titles_from_plan(plan)
    db.insert_episode(code, title_th, title_zh, title_ja, tier, plan["location"], plan)
    folder = omnichannel.create_episode_folders(code, title_th)
    return code, folder


def render():
    """หน้า 'วางแผนถ่าย (Smart Shoot)'"""
    st.title("🎬 วางแผนถ่าย (Smart Shoot)")
    st.caption("拍摄计划工厂")
    st.caption("เลือกโลเคชัน → ได้ HOOK + บท 3 ภาษา + B-roll checklist ครบใน 1 คลิก | "
               "选地点 → 一键获得钩子、三语剧本、B-roll清单")

    with st.expander("📕 กฎจักรวาล YYY (อ่านก่อนถ่ายทุกครั้ง) / YYY 世界观铁律（每次拍摄前必读）"):
        for r in UNIVERSE_RULES:
            st.markdown(f"- {r}")

    locations = db.load_json("seed_locations.json")
    names = [l["name_th"] for l in locations]
    c1, c2, c3 = st.columns([3, 1, 1])
    with c1:
        chosen = st.selectbox("เลือกโลเคชัน / 选择地点", names)
    with c2:
        tier = st.selectbox("Tier ตอน / 剧集等级", ["A", "B", "C", "D"], index=1)
    with c3:
        st.write("")
        gen = st.button("🎲 สร้างแผนถ่าย / 生成计划", type="primary")

    if gen:
        loc = next(l for l in locations if l["name_th"] == chosen)
        st.session_state["shoot_plan"] = generate_plan(loc)

    plan = st.session_state.get("shoot_plan")
    if not plan:
        st.info("เลือกโลเคชันแล้วกด 'สร้างแผนถ่าย' — กดซ้ำได้เพื่อสุ่มชุดใหม่ / "
                 "选好地点后点「生成计划」，可重复点击获得新版本")
        return

    render_plan(plan)

    st.divider()
    if st.button("💾 บันทึกเป็นตอน (สร้างโฟลเดอร์อัตโนมัติ) / 保存为一集（自动建文件夹）"):
        code, folder = save_as_episode(plan, tier)
        st.success(f"บันทึกตอน {code} แล้ว — โฟลเดอร์: `{folder}` / 已保存第 {code} 集")
        st.session_state["last_episode_code"] = code
