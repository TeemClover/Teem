# -*- coding: utf-8 -*-
"""
app.py — YYY Studio OS
แอปจัดการโปรดักชันช่องวิดีโอสั้น 3 ภาษา (ไทย/จีน/ญี่ปุ่น) — ออฟไลน์ 100%
UI ทุกจุดแสดง 2 ภาษา: ไทยก่อน ตามด้วยคำแปลจีน (中文翻译)
รัน: pip install -r requirements.txt && streamlit run app.py
"""
import streamlit as st

from core import db
from core.canon import CHARACTERS, HASHTAG_CORE, UNIVERSE_RULES
from modules import asset_db, omnichannel, script_factory, script_matcher, smart_shoot

st.set_page_config(page_title="YYY Studio OS", layout="wide")

# ปรับหน้าตาให้สวยขึ้นบนจอมือถือ (iPhone) — ปุ่มใหญ่ ระยะห่างพอดีนิ้ว
st.markdown("""
<style>
@media (max-width: 640px){
  .block-container{padding:2.6rem 0.9rem 3rem !important}
  .stButton button, .stDownloadButton button{width:100%; min-height:46px; font-size:1rem}
  [data-testid="stMetric"]{padding:6px 2px}
  [data-testid="stMetricValue"]{font-size:1.35rem}
  h1{font-size:1.5rem !important} h2{font-size:1.25rem !important} h3{font-size:1.1rem !important}
  [data-testid="stHorizontalBlock"]{gap:.5rem}
  .stTabs [data-baseweb="tab"]{padding:8px 10px; font-size:.85rem}
}
.stApp{background:radial-gradient(ellipse at 15% -10%, rgba(192,57,43,.10), transparent 50%),
        radial-gradient(ellipse at 110% 110%, rgba(46,117,182,.10), transparent 50%)}
.zh-sub{color:#9d97a8; font-size:0.86em; margin-top:-8px}
</style>
""", unsafe_allow_html=True)

# เตรียมฐานข้อมูลอัตโนมัติทุกครั้งที่เปิดแอป (idempotent)
db.init_db()


def zh(text: str):
    """แสดงคำแปลจีนสีจางๆ ต่อท้ายหัวข้อไทย (ไทยก่อนเสมอ ตามด้วยจีน)"""
    st.markdown(f"<div class='zh-sub'>{text}</div>", unsafe_allow_html=True)


PAGES = {
    "🏠 แดชบอร์ด / 仪表盘": None,
    "🎬 วางแผนถ่าย / 拍摄计划 (Smart Shoot)": smart_shoot,
    "🏭 ปั่นบท / 剧本工厂 (Script Factory)": script_factory,
    "🗄️ คลังฟุต / 素材库 (Evergreen)": asset_db,
    "🔍 จับคู่บท / 剧本匹配 (Matcher)": script_matcher,
    "🚀 ส่งออก / 导出 (Omnichannel)": omnichannel,
}

with st.sidebar:
    st.markdown("## 🎥 YYY Studio OS")
    st.caption(f"เผ็ด 10 × หวาน 0 × คนจ่ายคือยู | 辣10 × 甜0 × 买单的是小尤 | {HASHTAG_CORE}")
    page = st.radio("เมนู / 菜单", list(PAGES.keys()))
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
    zh("YYY Studio OS 仪表盘")
    stats = db.dashboard_stats()
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("ตอนทั้งหมด / 总集数", stats["episodes"])
    c2.metric("ฟุตในคลัง / 素材总数", stats["footage"])
    c3.metric("HIGH VALUE assets / 高价值素材", stats["high_value"])
    c4.metric("ฟุตใช้ซ้ำสะสม / 累计复用次数", stats["reuse_total"])

    if st.button("📥 โหลดข้อมูลตัวอย่าง / 导入示例数据 (ฟุต Reaction Bank 30 รายการ)", type="primary"):
        n = db.seed_footage_if_empty()
        if n:
            st.success(f"โหลดข้อมูลตัวอย่างแล้ว {n} รายการ / 已导入 {n} 条示例数据")
            st.rerun()
        st.info("คลังมีข้อมูลอยู่แล้ว — ไม่โหลดซ้ำ / 素材库已有数据，不重复导入")

    st.divider()
    left, right = st.columns(2)
    with left:
        st.subheader("📕 กฎจักรวาล YYY")
        zh("YYY 世界观铁律")
        for r in UNIVERSE_RULES:
            st.markdown(f"- {r}")
    with right:
        st.subheader("🧭 เริ่มงานยังไง")
        zh("如何开始")
        st.markdown(
            "1. **วางแผนถ่าย / 拍摄计划** — เลือกโลเคชัน กด 'สร้างแผนถ่าย' แล้วบันทึกเป็นตอน "
            "(选地点，点「生成拍摄计划」，保存为一集)\n"
            "2. **คลังฟุต / 素材库** — เพิ่มฟุตที่ถ่ายเสร็จเข้าคลัง (ฟุตคู่ได้ป้ายทองอัตโนมัติ) "
            "(把拍好的素材加入库中，双人同框自动获得金标)\n"
            "3. **จับคู่บท / 剧本匹配** — ให้ระบบแนะนำฟุตเก่าที่ตัดใส่ตอนใหม่ได้ ประหยัดคิวถ่าย "
            "(系统推荐可复用的旧素材，节省拍摄工作量)\n"
            "4. **ส่งออก / 导出** — สร้างโฟลเดอร์ + metadata 4 แพลตฟอร์มในคลิกเดียว "
            "(一键生成文件夹和四平台的发布文案)"
        )


module = PAGES[page]
if module is None:
    render_dashboard()
else:
    module.render()
