# -*- coding: utf-8 -*-
"""
modules/script_matcher.py — MODULE 2 (ส่วนตรรกะจับคู่บทกับคลังฟุต)
parse บทหา (ตัวละคร, อารมณ์, โลเคชัน) ด้วย keyword dict 3 ภาษา
แล้วจัดอันดับฟุตในคลัง: HIGH VALUE (duo) มาก่อนเสมอ คะแนนลดตามการใช้งานซ้ำ
สูตรคะแนน: +50 duo_in_frame, +20 อารมณ์ตรง, +10 โลเคชันตรง, -5×use_count, -10 ถ้าใช้ใน 7 วันล่าสุด
UI แสดง 2 ภาษา (ไทย + จีน) ทุกจุด
"""
import json

import streamlit as st

from core import db
from core.canon import CHARACTERS, EMOTION_KEYWORDS

# คำที่ชี้ตัวละครในบท (3 ภาษา อักษรแม่เท่านั้น)
CHARACTER_NAME_KEYWORDS = {
    "YY": ["เหยาเหยา", "瑶瑶", "ヤオヤオ", "เจ๊"],
    "YR": ["ยูริ", "尤莉", "ユリ"],
}

MODE_SAVED = "เลือกจากตอนที่บันทึกไว้ / 从已保存的集数选择"
MODE_RAW = "วางบทดิบเอง / 手动粘贴剧本"


def parse_scene(text: str, default_location: str | None = None) -> dict:
    """วิเคราะห์ข้อความ 1 ซีน → {characters, emotions, location}"""
    found_chars = [tag for tag, kws in CHARACTER_NAME_KEYWORDS.items()
                   if any(k in text for k in kws)]
    emotions = [emo for emo, kws in EMOTION_KEYWORDS.items()
                if any(k in text for k in kws)]
    location = default_location
    for loc in db.load_json("seed_locations.json"):
        if loc["name_th"] in text:
            location = loc["name_th"]
            break
    return {"characters": found_chars, "emotions": emotions, "location": location}


def score_footage(row: dict, parsed: dict) -> tuple:
    """คำนวณคะแนนฟุต 1 ชิ้นกับซีนที่ parse แล้ว — คืน (คะแนน, [เหตุผล])"""
    score, reasons = 0, []
    if row["duo_in_frame"] == 1:
        score += 50
        reasons.append("+50 HIGH VALUE (duo) / 双人同框")
    if row["emotion"] and row["emotion"] in parsed["emotions"]:
        score += 20
        reasons.append(f"+20 อารมณ์ตรง/情绪匹配 ({row['emotion']})")
    if parsed["location"] and row["location"] == parsed["location"]:
        score += 10
        reasons.append(f"+10 โลเคชันตรง/地点匹配 ({row['location']})")
    if row["use_count"]:
        score -= 5 * row["use_count"]
        reasons.append(f"-{5 * row['use_count']} ใช้ไปแล้ว {row['use_count']} ครั้ง / 已用{row['use_count']}次")
    if row["recently_used"]:
        score -= 10
        reasons.append("-10 เพิ่งใช้ใน 7 วันล่าสุด / 最近7天用过")
    return score, reasons


def _character_conflict(row: dict, parsed: dict) -> bool:
    """ตัดฟุตเดี่ยวของอีกคน ถ้าซีนพูดถึงตัวละครเดียวชัดเจน"""
    chars = parsed["characters"]
    if len(chars) == 1 and row["characters"] in ("YY", "YR"):
        return row["characters"] != chars[0]
    return False


def match_scene(text: str, default_location: str | None = None, top_n: int = 3) -> dict:
    """จับคู่ 1 ซีนกับคลังฟุต — คืน {parsed, suggestions[]}"""
    parsed = parse_scene(text, default_location)
    rows = db.query(
        "SELECT *, (last_used_at IS NOT NULL AND last_used_at >= datetime('now','-7 day')) "
        "AS recently_used FROM footage")
    scored = []
    for r in rows:
        if _character_conflict(r, parsed):
            continue
        s, reasons = score_footage(r, parsed)
        # เสนอเฉพาะฟุตที่เข้าเงื่อนไขจริง (เป็น HIGH VALUE หรืออารมณ์/โลเคชันตรง)
        if s >= 10:
            scored.append({"footage": r, "score": s, "reasons": reasons})
    scored.sort(key=lambda x: (-x["footage"]["duo_in_frame"], -x["score"], x["footage"]["use_count"]))
    return {"parsed": parsed, "suggestions": scored[:top_n]}


def match_script(lines: list, default_location: str | None = None) -> list:
    """จับคู่บททั้งชุด (list ของข้อความซีน)"""
    return [{"text": t, **match_scene(t, default_location)} for t in lines if t.strip()]


def _episode_scene_texts(ep: dict) -> list:
    """แปลง script_json ของตอนเป็นรายการซีน (รวม 3 ภาษาเพื่อให้ keyword จับได้ครบ)"""
    script = json.loads(ep["script_json"] or "{}")
    out = []
    for line in script.get("script", []):
        name = CHARACTERS[line["sp"]]["name_th"]
        out.append(f"{name}: {line['th']} / {line['zh']} / {line['ja']}")
    return out


def accept_suggestion(episode_id: int | None, footage_id: int) -> None:
    """กดรับข้อเสนอ → บันทึก reuse_log + อัปเดต use_count/last_used_at"""
    db.execute(
        "INSERT INTO reuse_log (episode_id, footage_id, accepted) VALUES (?,?,1)",
        (episode_id, footage_id),
    )
    db.mark_footage_used(footage_id)


def render():
    """หน้า 'จับคู่บท (Matcher)'"""
    st.title("🔍 จับคู่บท (Matcher)")
    st.caption("剧本匹配")
    st.caption("วิเคราะห์บท → แนะนำฟุตเก่าที่ใช้ซ้ำได้ | ฟุตคู่ (HIGH VALUE) ถูกเสนอก่อนเสมอ / "
               "分析剧本 → 推荐可复用的旧素材 | 双人同框（高价值）永远优先推荐")

    episodes = db.query("SELECT * FROM episodes ORDER BY id DESC")
    mode = st.radio("แหล่งบท / 剧本来源", [MODE_SAVED, MODE_RAW], horizontal=True)

    scenes, episode_id, default_loc = [], None, None
    if mode == MODE_SAVED:
        if not episodes:
            st.warning("ยังไม่มีตอนในระบบ — ไปสร้างที่หน้า 'วางแผนถ่าย' ก่อน หรือสลับไปวางบทดิบ / "
                       "系统里还没有集数 —— 先去「拍摄计划」页创建，或切换到手动粘贴剧本")
            return
        labels = [f"{e['code']} — {e['title_th']}" for e in episodes]
        pick = st.selectbox("เลือกตอน / 选择集数", labels)
        ep = episodes[labels.index(pick)]
        episode_id, default_loc = ep["id"], ep["location"]
        scenes = _episode_scene_texts(ep)
    else:
        raw = st.text_area(
            "วางบทดิบ (1 บรรทัด = 1 ซีน) / 粘贴剧本（1行 = 1个场景）", height=160,
            placeholder="เหยาเหยาหัวเราะใส่กล้องที่ตลาดนัดกลางคืน\nยูริตกใจราคา แพงมาก\nสองคนฟินอาหารพร้อมกัน",
        )
        scenes = raw.splitlines()

    if st.button("🧠 วิเคราะห์และจับคู่ / 分析并匹配", type="primary"):
        st.session_state["match_results"] = match_script(scenes, default_loc)
        st.session_state["match_episode_id"] = episode_id
        st.session_state["accepted_ids"] = set()

    results = st.session_state.get("match_results")
    if not results:
        return
    episode_id = st.session_state.get("match_episode_id")
    accepted = st.session_state.setdefault("accepted_ids", set())

    saved_scenes = 0
    for i, res in enumerate(results, 1):
        with st.container(border=True):
            st.markdown(f"**ซีน/场景 {i}:** {res['text']}")
            p = res["parsed"]
            st.caption(
                f"ตรวจพบ/检测到 — ตัวละคร/角色: {', '.join(p['characters']) or 'ไม่ระบุ/未指定'} | "
                f"อารมณ์/情绪: {', '.join(p['emotions']) or 'ไม่พบ/未找到'} | "
                f"โลเคชัน/地点: {p['location'] or 'ไม่ระบุ/未指定'}"
            )
            if not res["suggestions"]:
                st.markdown("🎥 *ไม่มีฟุตเก่าที่เข้าเค้า — ต้องถ่ายใหม่ / 没有合适的旧素材 —— 需要重新拍摄*")
                continue
            saved_scenes += 1
            for sug in res["suggestions"]:
                f = sug["footage"]
                hv = " 🏅" if f["high_value"] else ""
                col1, col2 = st.columns([5, 1])
                with col1:
                    st.markdown(
                        f"`REUSE: {f['filename']}` (คะแนน/得分 {sug['score']}, {', '.join(sug['reasons'])}){hv}"
                    )
                with col2:
                    key = f"acc_{i}_{f['id']}"
                    if f["id"] in accepted:
                        st.markdown("✅ รับแล้ว/已采用")
                    elif st.button("รับ/采用", key=key):
                        accept_suggestion(episode_id, f["id"])
                        accepted.add(f["id"])
                        st.rerun()

    st.divider()
    total = len(results)
    st.success(f"📉 ประหยัดการถ่ายไป {saved_scenes} ช็อต จากทั้งหมด {total} ซีน "
               f"(กดรับไปแล้ว {len(accepted)} ไฟล์) / "
               f"节省了 {saved_scenes} 个镜头（共 {total} 个场景，已采用 {len(accepted)} 个文件）")
