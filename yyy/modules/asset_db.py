# -*- coding: utf-8 -*-
"""
modules/asset_db.py — MODULE 2 (ส่วน UI คลังฟุต)
คลังฟุต Evergreen: เพิ่มฟุต / นำเข้าชุดตัวอย่าง / ค้นหา-กรอง / แดชบอร์ดการใช้งาน
Badge [HIGH VALUE ASSET] คำนวณอัตโนมัติจาก duo_in_frame — ผู้ใช้แก้ตรงๆ ไม่ได้
"""
import pandas as pd
import streamlit as st

from core import db
from core.canon import CHARACTER_TAGS, EMOTIONS, SHOT_TYPES

GOLD = "#C9A227"


def _high_value_badge() -> str:
    """ป้ายทองของฟุตคู่ (duo_in_frame=1)"""
    return (
        f"<span style='background:{GOLD};color:#111;padding:2px 8px;"
        "border-radius:6px;font-weight:700;font-size:0.8em'>[HIGH VALUE ASSET]</span>"
    )


def _all_locations() -> list:
    """รวมโลเคชันจาก seed + ที่มีอยู่จริงในคลัง"""
    seed = [l["name_th"] for l in db.load_json("seed_locations.json")]
    used = [r["location"] for r in db.query(
        "SELECT DISTINCT location FROM footage WHERE location IS NOT NULL")]
    return sorted(set(seed) | set(used))


def render_add_form():
    """ฟอร์มเพิ่มฟุตใหม่ — ครบทุกฟิลด์ตาม schema (ยกเว้น high_value ที่คำนวณเอง)"""
    st.subheader("➕ เพิ่มฟุตใหม่")
    with st.form("add_footage", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        with c1:
            filename = st.text_input("ชื่อไฟล์ *", placeholder="D16_duo_laugh_cafe.mp4")
            filepath = st.text_input("พาธไฟล์", placeholder="reaction_bank/…")
            characters = st.selectbox("ตัวละครในเฟรม *", CHARACTER_TAGS)
            duo_in_frame = st.checkbox("สองสาวอยู่ในเฟรมพร้อมกัน (duo)")
            st.caption("ป้าย [HIGH VALUE ASSET] จะติดให้อัตโนมัติเมื่อเป็นฟุตคู่ — แก้เองไม่ได้")
        with c2:
            location = st.selectbox("โลเคชัน", _all_locations())
            emotion = st.selectbox("อารมณ์", EMOTIONS)
            shot_type = st.selectbox("ประเภทช็อต", SHOT_TYPES)
            outfit_ok = st.checkbox("ชุด Signature ถูกต้อง", value=True)
            takes = st.number_input("จำนวนเทค", min_value=1, value=1)
            duration_sec = st.number_input("ความยาว (วินาที)", min_value=0.0, value=3.0, step=0.5)
        with c3:
            spoken_line = st.text_input("ประโยคที่พูด (ภาษาแม่ผู้พูด)")
            sub_th = st.text_input("ซับไทย")
            sub_zh = st.text_input("ซับจีน")
            sub_ja = st.text_input("ซับญี่ปุ่น")
            notes = st.text_area("โน้ต", height=68)
        if st.form_submit_button("บันทึกเข้าคลัง", type="primary"):
            if not filename.strip():
                st.error("ต้องใส่ชื่อไฟล์")
            else:
                db.insert_footage({
                    "filename": filename.strip(), "filepath": filepath.strip() or None,
                    "characters": characters, "duo_in_frame": int(duo_in_frame),
                    "location": location, "outfit_ok": int(outfit_ok),
                    "emotion": emotion, "shot_type": shot_type,
                    "takes": int(takes), "duration_sec": float(duration_sec),
                    "spoken_line": spoken_line or None, "sub_th": sub_th or None,
                    "sub_zh": sub_zh or None, "sub_ja": sub_ja or None,
                    "notes": notes or None,
                })
                if duo_in_frame:
                    st.success("บันทึกแล้ว — ฟุตนี้ได้ป้ายทองอัตโนมัติ")
                    st.markdown(_high_value_badge(), unsafe_allow_html=True)
                else:
                    st.success("บันทึกเข้าคลังแล้ว")


def render_table():
    """ตารางค้นหา/กรองคลังฟุต"""
    st.subheader("🔎 ค้นหา / กรองคลังฟุต")
    f1, f2, f3, f4 = st.columns(4)
    with f1:
        f_char = st.multiselect("ตัวละคร", CHARACTER_TAGS)
    with f2:
        f_emo = st.multiselect("อารมณ์", EMOTIONS)
    with f3:
        f_loc = st.multiselect("โลเคชัน", _all_locations())
    with f4:
        f_hv = st.checkbox("เฉพาะ HIGH VALUE (ฟุตคู่)")

    sql, params = "SELECT * FROM footage WHERE 1=1", []
    if f_char:
        sql += f" AND characters IN ({','.join('?' * len(f_char))})"
        params += f_char
    if f_emo:
        sql += f" AND emotion IN ({','.join('?' * len(f_emo))})"
        params += f_emo
    if f_loc:
        sql += f" AND location IN ({','.join('?' * len(f_loc))})"
        params += f_loc
    if f_hv:
        sql += " AND high_value = 1"
    sql += " ORDER BY high_value DESC, use_count DESC, id"
    rows = db.query(sql, tuple(params))
    if not rows:
        st.info("ไม่พบฟุตตามเงื่อนไข — ลองล้างตัวกรอง หรือกด 'โหลดข้อมูลตัวอย่าง' ที่หน้าแดชบอร์ด")
        return

    df = pd.DataFrame(rows)
    # แสดงป้ายทองเป็นคอลัมน์อ่านอย่างเดียว (คำนวณจาก DB ไม่ให้แก้)
    df["ป้าย"] = df["high_value"].map(lambda v: "🏅 [HIGH VALUE ASSET]" if v == 1 else "")
    show = df[["id", "filename", "ป้าย", "characters", "emotion", "location",
               "shot_type", "takes", "duration_sec", "use_count", "last_used_at", "notes"]]
    show = show.rename(columns={
        "filename": "ไฟล์", "characters": "ตัวละคร", "emotion": "อารมณ์",
        "location": "โลเคชัน", "shot_type": "ช็อต", "takes": "เทค",
        "duration_sec": "วินาที", "use_count": "ใช้ไปแล้ว(ครั้ง)",
        "last_used_at": "ใช้ล่าสุด", "notes": "โน้ต",
    })
    st.dataframe(show, width="stretch", hide_index=True)
    st.caption(f"พบ {len(rows)} รายการ — ฟุตคู่ (duo) ได้ป้ายทองอัตโนมัติและถูกจัดให้อยู่บนสุดเสมอ")


def render_stats():
    """แดชบอร์ดคลังฟุต: จำนวนต่อหมวด / ใช้บ่อยสุด / ไม่เคยใช้"""
    st.subheader("📊 สถิติคลังฟุต")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown("**จำนวนฟุตต่อหมวด**")
        rows = db.query(
            "SELECT characters AS หมวด, COUNT(*) AS จำนวน FROM footage GROUP BY characters ORDER BY จำนวน DESC")
        st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    with c2:
        st.markdown("**ฟุตที่ใช้บ่อยสุด (Top 5)**")
        rows = db.query(
            "SELECT filename AS ไฟล์, use_count AS ครั้ง FROM footage WHERE use_count>0 "
            "ORDER BY use_count DESC, last_used_at DESC LIMIT 5")
        if rows:
            st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
        else:
            st.caption("ยังไม่มีฟุตถูกใช้ซ้ำ — ไปที่หน้า 'จับคู่บท' เพื่อเริ่มใช้คลัง")
    with c3:
        st.markdown("**ฟุตที่ยังไม่เคยใช้**")
        rows = db.query(
            "SELECT filename AS ไฟล์, emotion AS อารมณ์ FROM footage WHERE use_count=0 ORDER BY id")
        st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch", height=220)


def render():
    """หน้า 'คลังฟุต (Evergreen)'"""
    st.title("🗄️ คลังฟุต (Evergreen)")
    st.caption("ฟุตทุกชิ้นถ่ายด้วยชุด Signature — ตัดข้ามตอนได้ตลอดกาล | ฟุตคู่ = สินทรัพย์มูลค่าสูงสุดของช่อง")

    if st.button("📥 นำเข้าฟุตตัวอย่าง 30 รายการ (Reaction Bank)"):
        n = db.seed_footage_if_empty()
        if n:
            st.success(f"นำเข้าแล้ว {n} รายการ")
        else:
            st.info("คลังมีข้อมูลอยู่แล้ว — ข้ามการนำเข้าเพื่อกันข้อมูลซ้ำ")

    tab1, tab2, tab3 = st.tabs(["ค้นหา/กรอง", "เพิ่มฟุตใหม่", "สถิติ"])
    with tab1:
        render_table()
    with tab2:
        render_add_form()
    with tab3:
        render_stats()
