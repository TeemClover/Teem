# -*- coding: utf-8 -*-
"""
modules/script_factory/export.py — ส่งออกผลลัพธ์: JSON (ดิบครบ) / Markdown (Top 10) / XLSX (4 ชีต)
ไฟล์ทั้งหมดลง data/generated_batches/<batch_code>/
"""
import json
from pathlib import Path

import pandas as pd

from core import db

from .world_bible import CRITERIA_TH, SCORE_COLS


def _batch_dir(batch_id: int) -> Path:
    row = db.query("SELECT batch_code FROM script_batches WHERE id = ?", (batch_id,))
    code = row[0]["batch_code"] if row else f"BATCH_{batch_id}"
    d = db.DATA_DIR / "generated_batches" / code
    d.mkdir(parents=True, exist_ok=True)
    return d


def _rows(batch_id: int) -> list:
    return db.query(
        "SELECT * FROM generated_scripts WHERE batch_id = ? ORDER BY COALESCE(rank, 9999), script_index",
        (batch_id,))


def export_json(batch_id: int) -> Path:
    rows = _rows(batch_id)
    payload = []
    for r in rows:
        item = json.loads(r["full_script_json"])
        item["_judge"] = json.loads(r["judge_json"]) if r["judge_json"] else None
        item["_rank"] = r["rank"]
        item["_weighted_score"] = r["weighted_score"]
        payload.append(item)
    path = _batch_dir(batch_id) / "all_scripts.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def export_markdown(batch_id: int) -> Path:
    rows = [r for r in _rows(batch_id) if r["is_top10"]]
    lines = ["# 🏆 Top 10 Scripts — The YYY Diary\n"]
    for r in rows:
        sc = json.loads(r["full_script_json"])
        jd = json.loads(r["judge_json"]) if r["judge_json"] else {}
        lines.append(f"\n## #{r['rank']} — {r['title_en']}  ({r['weighted_score']}/10)")
        lines.append(f"**{r['title_th']}** | **{r['title_zh']}**")
        lines.append(f"\n> {sc.get('logline_th','')}\n")
        lines.append(f"- 📍 {r['location_id']} · 🎭 {r['theme_id']} · 😂 {r['comedy_beat']} · 💫 {r['emotional_arc']}")
        if jd:
            lines.append(f"- 💎 Money shot: {jd.get('money_shot','')}")
            lines.append(f"- ⚠️ Weakness: {jd.get('weakness','')}")
            lines.append(f"- 📱 Best platform: {jd.get('best_platform','')}")
        lines.append("\n### บทเต็ม")
        for beat in sc.get("beats", []):
            lines.append(f"\n**— {beat.get('beat_name','').upper()} —**")
            for ln in beat.get("lines", []):
                act = f" *({ln.get('action')})*" if ln.get("action") else ""
                lines.append(f"- **{ln.get('speaker')}**{act}")
                lines.append(f"  - TH: {ln.get('line_th')}")
                lines.append(f"  - ZH: {ln.get('line_zh')}")
                lines.append(f"  - EN: {ln.get('line_en')}")
    # แนบ pattern analysis ต่อท้ายถ้ามี
    pa = db.query("SELECT analysis_json FROM pattern_analysis WHERE batch_id = ? ORDER BY id DESC LIMIT 1",
                  (batch_id,))
    if pa:
        lines.append("\n\n---\n\n# 🔍 Pattern Analysis\n")
        lines.append(json.loads(pa[0]["analysis_json"]).get("markdown", ""))
    path = _batch_dir(batch_id) / "top10_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def export_xlsx(batch_id: int) -> Path:
    rows = _rows(batch_id)
    base_cols = {
        "rank": "อันดับ", "script_index": "#", "title_th": "ชื่อไทย", "title_zh": "ชื่อจีน",
        "title_en": "ชื่ออังกฤษ", "location_id": "โลเคชัน", "theme_id": "ธีม",
        "comedy_beat": "มุกหลัก", "emotional_arc": "อาร์ค", "weighted_score": "คะแนนรวม",
    }
    df = pd.DataFrame(rows)
    rank_df = df[list(base_cols) + list(SCORE_COLS.values())].rename(
        columns={**base_cols, **{v: CRITERIA_TH[k] for k, v in SCORE_COLS.items()}})

    top10_df = rank_df[df["is_top10"] == 1] if len(df) else rank_df
    dist = df["weighted_score"].dropna() if len(df) else pd.Series(dtype=float)
    dist_df = pd.DataFrame({
        "ช่วงคะแนน": ["<4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10"],
        "จำนวนบท": [((dist >= lo) & (dist < hi)).sum() for lo, hi in
                    [(0, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10.01)]],
    })
    pa = db.query("SELECT analysis_json FROM pattern_analysis WHERE batch_id = ? ORDER BY id DESC LIMIT 1",
                  (batch_id,))
    pattern_md = json.loads(pa[0]["analysis_json"]).get("markdown", "") if pa else "(ยังไม่มี)"
    pattern_df = pd.DataFrame({"Pattern Analysis": pattern_md.splitlines() or ["(ว่าง)"]})

    path = _batch_dir(batch_id) / "rankings.xlsx"
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        rank_df.to_excel(xw, sheet_name="Rankings", index=False)
        top10_df.to_excel(xw, sheet_name="Top10", index=False)
        pattern_df.to_excel(xw, sheet_name="Patterns", index=False)
        dist_df.to_excel(xw, sheet_name="Distribution", index=False)
    return path
