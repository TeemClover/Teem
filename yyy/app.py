# -*- coding: utf-8 -*-
"""
app.py — YYY Studio OS
แอปจัดการโปรดักชันช่องวิดีโอสั้น 3 ภาษา (ไทย/จีน/ญี่ปุ่น) — ออฟไลน์ 100%
รัน: pip install -r requirements.txt && streamlit run app.py
"""
import streamlit as st

from core import db
from core.canon import CHARACTERS, HASHTAG_CORE, UNIVERSE_RULES
from modules import asset_db, omnichannel, script_matcher, smart_shoot

st.set_page_config(page_title="YYY Studio OS", layout="wide")

# เตรียมฐานข้อมูลอัตโนมัติทุกครั้งที่เปิดแอป (idempotent)
db.init_db()

PAGES = {
    "🏠 แดชบอร์ด": None,
    "🎬 วางแผนถ่าย (Smart Shoot)": smart_shoot,
    "🗄️ คลังฟุต (Evergreen)": asset_db,
    "🔍 จับคู่บท (Matcher)": script_matcher,
    "🚀 ส่งออก (Omnichannel)": omnichannel,
}

with st.sidebar:
    st.markdown("## 🎥 YYY Studio OS")
    st.caption(f"เผ็ด 10 × หวาน 0 × คนจ่ายคือยู | {HASHTAG_CORE}")
    page = st.radio("เมนู", list(PAGES.keys()))
    st.divider()
    for tag, c in CHARACTERS.items():
        st.markdown(
            f"<span style='color:{c['color']};font-weight:700'>●</span> "
            f"{c['name_th']} ({tag}) — {c['name_zh']} / {c['name_ja']}",
            unsafe_allow_html=True,
        )


def render_dashboard():
    """หน้าแรก: ตัวเลขรวมของสตูดิโอ + ปุ่มโหลดข้อมูลตัวอย่าง"""
    st.title("🏠 แดชบอร์ด YYY Studio OS")
    stats = db.dashboard_stats()
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("ตอนทั้งหมด", stats["episodes"])
    c2.metric("ฟุตในคลัง", stats["footage"])
    c3.metric("HIGH VALUE assets", stats["high_value"])
    c4.metric("ฟุตใช้ซ้ำสะสม (ครั้ง)", stats["reuse_total"])

    if st.button("📥 โหลดข้อมูลตัวอย่าง (ฟุต Reaction Bank 30 รายการ)", type="primary"):
        n = db.seed_footage_if_empty()
        if n:
            st.success(f"โหลดข้อมูลตัวอย่างแล้ว {n} รายการ")
            st.rerun()
        st.info("คลังมีข้อมูลอยู่แล้ว — ไม่โหลดซ้ำ")

    st.divider()
    left, right = st.columns(2)
    with left:
        st.subheader("📕 กฎจักรวาล YYY")
        for r in UNIVERSE_RULES:
            st.markdown(f"- {r}")
    with right:
        st.subheader("🧭 เริ่มงานยังไง")
        st.markdown(
            "1. **วางแผนถ่าย** — เลือกโลเคชัน กด 'สร้างแผนถ่าย' แล้วบันทึกเป็นตอน\n"
            "2. **คลังฟุต** — เพิ่มฟุตที่ถ่ายเสร็จเข้าคลัง (ฟุตคู่ได้ป้ายทองอัตโนมัติ)\n"
            "3. **จับคู่บท** — ให้ระบบแนะนำฟุตเก่าที่ตัดใส่ตอนใหม่ได้ ประหยัดคิวถ่าย\n"
            "4. **ส่งออก** — สร้างโฟลเดอร์ + metadata 4 แพลตฟอร์มในคลิกเดียว"
        )


module = PAGES[page]
if module is None:
    render_dashboard()
else:
    module.render()
