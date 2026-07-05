# -*- coding: utf-8 -*-
"""
modules/script_factory/judge.py — AI Judge (Stage 2)
ให้คะแนน 12 เกณฑ์ต่อบท คำนวณ weighted score ในเครื่อง + วิเคราะห์แพทเทิร์นทั้งชุด
"""
import json

from .prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT_TEMPLATE, PATTERN_ANALYSIS_PROMPT
from .utils import calculate_weighted_score, extract_json
from .world_bible import WEIGHTS

DEFAULT_JUDGE_MODEL = "claude-opus-4-8"


def _call_api(client, model: str, system: str, user: str, max_tokens: int = 8192) -> str:
    resp = client.messages.create(
        model=model, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def _slim_script(sc: dict) -> dict:
    """ตัดข้อมูลที่ Judge ไม่ต้องใช้เพื่อประหยัด token"""
    return {
        "id": sc.get("id"),
        "title_th": sc.get("title_th"), "title_zh": sc.get("title_zh"), "title_en": sc.get("title_en"),
        "logline_en": sc.get("logline_en"),
        "beats": sc.get("beats"),
        "narration": sc.get("narration"),
        "metadata": {k: sc.get("metadata", {}).get(k) for k in
                     ("location_id", "theme_id", "comedy_beat", "emotional_arc",
                      "estimated_duration_sec", "energy_level")},
        "viral_hook_type": sc.get("viral_tags", {}).get("viral_hook_type"),
    }


def judge_batch(client, scripts: list, model: str = DEFAULT_JUDGE_MODEL,
                rate_limiter=None) -> list:
    """ตัดสินบท 1 ชุด (สูงสุด ~10 ตอน/ครั้ง) — คืน list ของ JudgeResult dict"""
    payload = json.dumps([_slim_script(s) for s in scripts], ensure_ascii=False)
    user = JUDGE_USER_PROMPT_TEMPLATE.format(batch_size=len(scripts), scripts_json=payload)

    if rate_limiter:
        rate_limiter.wait_if_needed(8000)
    raw = _call_api(client, model, JUDGE_SYSTEM_PROMPT, user)
    results = extract_json(raw)
    if isinstance(results, dict):
        results = [results]

    out = []
    for r in results:
        scores = {k: max(1.0, min(10.0, float(r.get("scores", {}).get(k, 5)))) for k in WEIGHTS}
        out.append({
            "script_id": r.get("script_id"),
            "scores": scores,
            "weighted_score": calculate_weighted_score(scores),
            "analysis": r.get("analysis", ""),
            "money_shot": r.get("money_shot", ""),
            "weakness": r.get("weakness", ""),
            "best_platform": r.get("best_platform", ""),
            "improvement_suggestion": r.get("improvement_suggestion", ""),
        })
    return out


def analyze_patterns(client, top10_rows: list, all_rows: list,
                     model: str = DEFAULT_JUDGE_MODEL, rate_limiter=None) -> str:
    """วิเคราะห์แพทเทิร์นทั้งชุดหลังตัดสินครบ — คืนรายงาน Markdown"""
    top10_details = json.dumps([
        {"rank": r["rank"], "title_en": r["title_en"], "location": r["location_id"],
         "theme": r["theme_id"], "comedy_beat": r["comedy_beat"], "arc": r["emotional_arc"],
         "weighted_score": r["weighted_score"], "analysis": r["judge_analysis"]}
        for r in top10_rows], ensure_ascii=False)
    summary = json.dumps([
        {"id": r["script_index"], "title": r["title_en"], "loc": r["location_id"],
         "theme": r["theme_id"], "beat": r["comedy_beat"], "arc": r["emotional_arc"],
         "score": r["weighted_score"]}
        for r in all_rows], ensure_ascii=False)

    user = PATTERN_ANALYSIS_PROMPT.format(
        n=len(all_rows), top10_details=top10_details, all_scores_summary=summary)
    if rate_limiter:
        rate_limiter.wait_if_needed(6000)
    return _call_api(client, model, JUDGE_SYSTEM_PROMPT, user, max_tokens=6000)
