# -*- coding: utf-8 -*-
"""
modules/script_factory/dashboard.py — หน้า UI ของ Script Factory ใน Studio OS
4 แท็บ: สร้างชุดบท / คลังบท(เซฟ+คัดกรอง) / ผลตัดสิน / นำเข้า-ส่งออก
ออกแบบให้ใช้ได้ทั้งมี API key (AI เต็มระบบ) และไม่มี (เซฟบท + คัดกรอง manual)
UI แสดง 2 ภาษา (ไทย + จีน) ทุกจุด
"""
import json

import pandas as pd
import streamlit as st

from core import db

from . import batch_runner, export
from .utils import get_api_key, validate_script
from .world_bible import CHARACTERS_SF, CRITERIA_TH, SCORE_COLS, WEIGHTS


# ---------- ชิ้นส่วน UI ----------

def _speaker_color(sp: str) -> str:
    return CHARACTERS_SF.get(sp, {}).get("color", "#999")


def render_script_card(row: dict, key_prefix: str = ""):
    """การ์ดบท 1 ตอน: หัวเรื่อง + คะแนน + บทเต็ม 3 ภาษา + ปุ่มจัดการ"""
    sc = json.loads(row["full_script_json"])
    jd = json.loads(row["judge_json"]) if row.get("judge_json") else None
    rank = f"#{row['rank']} " if row.get("rank") else ""

    with st.container(border=True):
        st.markdown(f"### {rank}{row['title_en']}")
        st.markdown(f"**{row['title_th']}** | **{row['title_zh']}**")
        st.caption(f"📍 {row.get('location_id','')} · 🎭 {row.get('theme_id','')} · "
                   f"😂 {row.get('comedy_beat','')} · 💫 {row.get('emotional_arc','')} · "
                   f"⏱ ~{row.get('estimated_duration_sec','?')}s")
        if row.get("weighted_score") is not None:
            st.metric("คะแนนถ่วงน้ำหนัก / 加权得分", f"{row['weighted_score']:.2f}/10")
        if jd:
            if jd.get("money_shot"):
                st.info(f"💎 **Money Shot / 高光时刻:** {jd['money_shot']}")
            if jd.get("weakness"):
                st.warning(f"⚠️ **จุดอ่อน / 弱点:** {jd['weakness']}")
            if jd.get("best_platform"):
                st.success(f"📱 **แพลตฟอร์มที่ใช่ / 最适合的平台:** {jd['best_platform']}")

        with st.expander("📜 บทเต็ม 3 ภาษา / 完整三语剧本"):
            st.caption(sc.get("logline_th", ""))
            for beat in sc.get("beats", []):
                st.markdown(f"**— {beat.get('beat_name','').upper()} —** *{beat.get('beat_description','')}*")
                for ln in beat.get("lines", []):
                    color = _speaker_color(ln.get("speaker", ""))
                    act = f" <i>({ln.get('action')})</i>" if ln.get("action") else ""
                    st.markdown(
                        f"<div style='border-left:4px solid {color};padding:2px 10px;margin:4px 0'>"
                        f"<b style='color:{color}'>{ln.get('speaker')}</b>{act}<br>"
                        f"TH: {ln.get('line_th')}<br>ZH: {ln.get('line_zh')}<br>JA: {ln.get('line_ja')}</div>",
                        unsafe_allow_html=True)
            nar = sc.get("narration", {})
            if nar.get("closing_cta_th"):
                st.caption(f"CTA: {nar['closing_cta_th']} / {nar.get('closing_cta_zh','')} / {nar.get('closing_cta_en','')}")

        with st.expander("🏷️ Metadata + แฮชแท็ก / 元数据与标签"):
            st.json(sc.get("metadata", {}))
            st.json(sc.get("viral_tags", {}))

        if jd and row.get("weighted_score") is not None:
            with st.expander("🧮 คะแนนราย 12 เกณฑ์ / 12项评分明细"):
                sdf = pd.DataFrame([
                    {"เกณฑ์/标准": CRITERIA_TH[k], "คะแนน/得分": jd["scores"].get(k), "น้ำหนัก/权重": WEIGHTS[k]}
                    for k in WEIGHTS])
                st.dataframe(sdf, hide_index=True, width="stretch")

        c1, c2 = st.columns(2)
        with c1:
            if st.button("🎬 ส่งเข้าคิวถ่าย (สร้างตอน) / 送入拍摄队列", key=f"{key_prefix}promote_{row['id']}"):
                code = db.next_episode_code()
                db.execute(
                    "INSERT INTO episodes (code, title_th, title_zh, title_ja, tier, location, status, script_json)"
                    " VALUES (?,?,?,?,?,?,'script_approved',?)",
                    (code, row["title_th"], row["title_zh"], None, "B",
                     sc.get("metadata", {}).get("location_th"), row["full_script_json"]))
                st.success(f"ส่งเข้าคิวถ่ายแล้วเป็นตอน {code} / 已送入拍摄队列，编号 {code}")
        with c2:
            with st.popover("✍️ คัดกรองเอง (ให้คะแนน manual) / 手动筛选打分"):
                st.caption("ไม่ต้องใช้ API — ทีมให้คะแนน 1-10 เองทั้ง 12 เกณฑ์ / "
                           "无需API —— 团队手动为12项标准打1-10分")
                manual = {}
                for k in WEIGHTS:
                    manual[k] = st.slider(CRITERIA_TH[k], 1, 10, 5, key=f"{key_prefix}m_{row['id']}_{k}")
                note = st.text_input("โน้ตการคัด / 筛选备注", key=f"{key_prefix}note_{row['id']}")
                if st.button("บันทึกคะแนน / 保存评分", key=f"{key_prefix}save_{row['id']}", type="primary"):
                    batch_runner.apply_manual_scores(row["id"], manual, note)
                    st.success("บันทึกแล้ว — อันดับในชุดถูกคำนวณใหม่ / 已保存 —— 排名已重新计算")
                    st.rerun()


# ---------- แท็บ 1: สร้างชุดบท ----------

def tab_generate():
    st.subheader("🚀 สร้างชุดบทใหม่ (AI Generate + Judge) / 生成新一批剧本（AI生成+评分）")
    api_key = get_api_key()
    if not api_key:
        st.warning(
            "ยังไม่พบ **ANTHROPIC_API_KEY** — โหมด AI ปิดอยู่ / 尚未找到 **ANTHROPIC_API_KEY** —— AI模式已关闭\n\n"
            "วิธีตั้งค่า: สร้างไฟล์ `.env` ในโฟลเดอร์ yyy แล้วใส่บรรทัด / "
            "设置方法：在 yyy 文件夹里创建 `.env` 文件，写入以下内容\n"
            "```\nANTHROPIC_API_KEY=sk-ant-…\n```\n"
            "แล้วรีสตาร์ทแอป (ระหว่างนี้ยังใช้ 'คลังบท' และ 'นำเข้า' ได้ตามปกติ) / "
            "然后重启应用（此期间仍可正常使用「剧本库」和「导入」功能）")
    c1, c2, c3 = st.columns(3)
    with c1:
        total = st.number_input("จำนวนบท / 剧本数量", 5, 200, 100, step=5)
        dry = st.checkbox("Dry run (5 บท ทดสอบก่อน) / 试运行（先测试5集）", value=True)
    with c2:
        gen_model = st.text_input("โมเดลปั่นบท / 生成模型", batch_runner.BatchConfig.gen_model)
        judge_model = st.text_input("โมเดลตัดสิน / 评分模型", batch_runner.BatchConfig.judge_model)
    with c3:
        max_cost = st.number_input("เพดานต้นทุน (USD) / 成本上限（美元）", 1.0, 100.0, 25.0)

    cfg = batch_runner.BatchConfig(total_scripts=int(total), gen_model=gen_model,
                                   judge_model=judge_model, max_cost_usd=float(max_cost), dry_run=dry)
    est = batch_runner.estimate_cost(cfg)
    st.caption(f"ประมาณการ / 预估: ~{est['calls']} API calls · ~{est['est_minutes']} นาที/分钟 · "
               f"~${est['est_cost_usd']} USD")

    # resume batch ที่ค้าง
    stuck = db.query("SELECT * FROM script_batches WHERE status IN ('generating','judging','failed') ORDER BY id DESC")
    resume_id = None
    if stuck:
        labels = ["(เริ่มชุดใหม่ / 开始新一批)"] + [f"ทำต่อ/继续 {b['batch_code']} ({b['status']})" for b in stuck]
        pick = st.selectbox("ทำต่อจากชุดที่ค้าง? / 是否从未完成的批次继续？", labels)
        if pick != labels[0]:
            resume_id = stuck[labels.index(pick) - 1]["id"]

    if st.button("🏭 เริ่มปั่นบท + คัดบท / 开始生成并评分", type="primary", disabled=not api_key):
        bar = st.progress(0.0, text="เตรียมสายพาน… / 准备流水线…")
        phase_th = {"generating": "กำลังปั่นบท / 生成中", "judging": "กำลังตัดสิน / 评分中",
                    "analyzing": "วิเคราะห์แพทเทิร์น / 分析模式中"}

        def cb(phase, done, tot):
            bar.progress(min(done / max(tot, 1), 1.0), text=f"{phase_th.get(phase, phase)}… {done}/{tot}")

        try:
            bid = batch_runner.run_pipeline(cfg, api_key, cb, batch_id=resume_id)
            st.success(f"เสร็จสมบูรณ์! ดูผลที่แท็บ 'ผลตัดสิน' (batch id {bid}) / "
                       f"已完成！请到「ผลตัดสิน/评分结果」标签页查看（批次编号 {bid}）")
            st.balloons()
        except Exception as e:
            st.error(f"สายพานหยุด: {e} — กดรันใหม่แล้วเลือก 'ทำต่อ' ได้เลย ระบบเซฟไว้ทุกขั้น / "
                     f"流水线中断：{e} —— 重新点击运行并选择「继续」即可，每一步都已自动保存")


# ---------- แท็บ 2: คลังบท ----------

def tab_library():
    st.subheader("📚 คลังบททั้งหมด (เซฟถาวรใน DB) / 全部剧本库（永久保存于数据库）")
    rows = db.query("SELECT * FROM generated_scripts ORDER BY COALESCE(weighted_score, -1) DESC, id DESC")
    if not rows:
        st.info("คลังยังว่าง — สร้างชุดบทที่แท็บแรก หรือ 'นำเข้า' บทจาก JSON / "
                "剧本库还是空的 —— 请在第一个标签页生成，或从JSON「导入」剧本")
        return
    f1, f2, f3 = st.columns(3)
    with f1:
        loc = st.multiselect("โลเคชัน / 地点", sorted({r["location_id"] for r in rows if r["location_id"]}))
    with f2:
        theme = st.multiselect("ธีม / 主题", sorted({r["theme_id"] for r in rows if r["theme_id"]}))
    with f3:
        min_score = st.slider("คะแนนขั้นต่ำ / 最低分数", 0.0, 10.0, 0.0, 0.5)

    shown = [r for r in rows
             if (not loc or r["location_id"] in loc)
             and (not theme or r["theme_id"] in theme)
             and ((r["weighted_score"] or 0) >= min_score)]
    st.caption(f"พบ {len(shown)} จาก {len(rows)} บท / 找到 {len(shown)} 篇，共 {len(rows)} 篇")
    for r in shown[:30]:
        render_script_card(r, key_prefix="lib_")
    if len(shown) > 30:
        st.caption("แสดง 30 บทแรก — ใช้ตัวกรองเพื่อแคบลง / 仅显示前30篇 —— 请用筛选条件缩小范围")


# ---------- แท็บ 3: ผลตัดสิน ----------

def tab_results():
    st.subheader("📊 ผลตัดสินรายชุด / 各批次评分结果")
    batches = db.query("SELECT * FROM script_batches ORDER BY id DESC")
    if not batches:
        st.info("ยังไม่มีชุดบท / 还没有任何批次")
        return
    labels = [f"{b['batch_code']} — {b['status']} ({b['total_scripts']} บท/篇)" for b in batches]
    b = batches[labels.index(st.selectbox("เลือกชุด / 选择批次", labels))]
    rows = db.query("SELECT * FROM generated_scripts WHERE batch_id = ? ORDER BY COALESCE(rank,9999)", (b["id"],))
    scored = [r for r in rows if r["weighted_score"] is not None]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("บทในชุด / 本批剧本数", len(rows))
    c2.metric("คะแนนเฉลี่ย / 平均分", f"{(sum(r['weighted_score'] for r in scored)/len(scored)):.2f}" if scored else "—")
    c3.metric("คะแนนสูงสุด / 最高分", f"{max((r['weighted_score'] for r in scored), default=0):.2f}" if scored else "—")
    c4.metric("บท ≥ 7.0 / ≥7分的篇数", sum(1 for r in scored if r["weighted_score"] >= 7))

    if scored:
        st.markdown("**การกระจายคะแนน / 分数分布**")
        dist = pd.Series([r["weighted_score"] for r in scored])
        hist = dist.round(0).value_counts().sort_index()
        st.bar_chart(hist)

        st.markdown("**ตารางจัดอันดับ / 排名表**")
        df = pd.DataFrame(scored)[["rank", "script_index", "title_th", "title_en",
                                   "location_id", "theme_id", "weighted_score"]]
        df = df.rename(columns={"rank": "อันดับ/排名", "script_index": "#", "title_th": "ชื่อไทย/泰语标题",
                                "title_en": "ชื่ออังกฤษ/英文标题", "location_id": "โลเคชัน/地点",
                                "theme_id": "ธีม/主题", "weighted_score": "คะแนน/得分"})
        st.dataframe(df, hide_index=True, width="stretch")

        st.markdown("### 🏆 Top 10")
        for r in [x for x in scored if x["is_top10"]]:
            render_script_card(r, key_prefix="res_")

    pa = db.query("SELECT analysis_json FROM pattern_analysis WHERE batch_id = ? ORDER BY id DESC LIMIT 1", (b["id"],))
    if pa:
        st.markdown("### 🔍 Pattern Analysis / 模式分析")
        st.markdown(json.loads(pa[0]["analysis_json"]).get("markdown", ""))


# ---------- แท็บ 4: นำเข้า / ส่งออก ----------

def tab_io():
    st.subheader("📥 นำเข้าบท (ไม่ต้องใช้ API) / 导入剧本（无需API）")
    st.caption("รองรับ JSON รูปแบบ EpisodeScript ตามสเปก — วางเป็น object เดียวหรือ array ก็ได้ / "
               "支持规范中的 EpisodeScript JSON 格式 —— 单个对象或数组均可")
    raw = st.text_area("วาง JSON ที่นี่ / 在此粘贴JSON", height=180,
                       placeholder='[{"id":1,"title_th":"…","beats":[…], …}]')
    up = st.file_uploader("หรืออัปโหลดไฟล์ .json / 或上传.json文件", type=["json"])
    if st.button("นำเข้าเข้าคลัง / 导入到剧本库", type="primary"):
        try:
            data = json.loads(up.read().decode("utf-8")) if up else json.loads(raw)
            scripts = data if isinstance(data, list) else [data]
            bid = db.execute(
                "INSERT INTO script_batches (batch_code, total_scripts, status, notes)"
                " VALUES (?,?,'complete','นำเข้าแบบ manual / 手动导入')",
                (f"IMPORT_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}", len(scripts)))
            warned = 0
            for i, sc in enumerate(scripts, 1):
                sc.setdefault("id", i)
                errs = validate_script(sc)
                if errs:
                    warned += 1
                batch_runner.store_script(bid, sc)
            msg = f"นำเข้าแล้ว {len(scripts)} บท / 已导入 {len(scripts)} 篇"
            if warned:
                msg += f" (มี {warned} บทที่ไม่ผ่านกฎครบ — เก็บไว้ให้แก้ทีหลัง / 其中{warned}篇未完全通过规则检查，已保留待修改)"
            st.success(msg)
        except Exception as e:
            st.error(f"นำเข้าไม่สำเร็จ / 导入失败: {e}")

    st.divider()
    st.subheader("📤 ส่งออก / 导出")
    batches = db.query("SELECT * FROM script_batches ORDER BY id DESC")
    if not batches:
        st.info("ยังไม่มีชุดให้ส่งออก / 还没有可导出的批次")
        return
    labels = [b["batch_code"] for b in batches]
    b = batches[labels.index(st.selectbox("เลือกชุดที่จะส่งออก / 选择要导出的批次", labels))]
    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("JSON ทั้งชุด / 全部JSON"):
            p = export.export_json(b["id"])
            st.success(f"เซฟแล้ว / 已保存: `{p}`")
            st.download_button("⬇️ ดาวน์โหลด JSON / 下载JSON", p.read_bytes(), p.name, "application/json")
    with c2:
        if st.button("Markdown Top 10"):
            p = export.export_markdown(b["id"])
            st.success(f"เซฟแล้ว / 已保存: `{p}`")
            st.download_button("⬇️ ดาวน์โหลด MD / 下载MD", p.read_bytes(), p.name, "text/markdown")
    with c3:
        if st.button("Excel 4 ชีต / 4个工作表"):
            p = export.export_xlsx(b["id"])
            st.success(f"เซฟแล้ว / 已保存: `{p}`")
            st.download_button("⬇️ ดาวน์โหลด XLSX / 下载XLSX", p.read_bytes(), p.name,
                               "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ---------- entry ----------

def render():
    st.title("🏭 ปั่นบท (Script Factory)")
    st.caption("剧本工厂")
    st.caption("ปั่นบท 100 ตอน 3 ภาษา → AI คัดเกรด 12 เกณฑ์ → Top 10 พร้อมถ่าย | เซฟทุกบทถาวร คัดกรองเองได้แม้ไม่มี API / "
               "一次生成100集三语剧本 → AI按12项标准打分 → Top 10随时可拍 | 所有剧本永久保存，无API也能手动筛选")
    t1, t2, t3, t4 = st.tabs(["🚀 สร้างชุดบท 生成新批次", "📚 คลังบท 剧本库",
                              "📊 ผลตัดสิน 评分结果", "📥 นำเข้า/ส่งออก 导入导出"])
    with t1:
        tab_generate()
    with t2:
        tab_library()
    with t3:
        tab_results()
    with t4:
        tab_io()
