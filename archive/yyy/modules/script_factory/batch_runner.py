# -*- coding: utf-8 -*-
"""
modules/script_factory/batch_runner.py — ตัวคุมสายพาน: generate → judge → rank → analyze
เซฟทุกขั้นลง SQLite ทันที (resume ได้เสมอ) + progress callback สำหรับ Streamlit
"""
import json
from dataclasses import dataclass, field
from datetime import datetime

from core import db

from . import generator, judge
from .utils import RateLimiter, calculate_weighted_score
from .world_bible import SCORE_COLS, WEIGHTS


@dataclass
class BatchConfig:
    total_scripts: int = 100
    gen_batch_size: int = 5
    judge_batch_size: int = 10
    gen_model: str = generator.DEFAULT_GEN_MODEL
    judge_model: str = judge.DEFAULT_JUDGE_MODEL
    max_retries: int = 3
    max_cost_usd: float = 25.0
    dry_run: bool = False  # True = สร้างแค่ 5 บท (ทดสอบ)

    def effective_total(self) -> int:
        return 5 if self.dry_run else self.total_scripts


def estimate_cost(cfg: BatchConfig) -> dict:
    """ประมาณการต้นทุน (คร่าวๆ ระดับ order-of-magnitude ไว้แสดงก่อนกดรัน)"""
    n = cfg.effective_total()
    gen_calls = -(-n // cfg.gen_batch_size)
    judge_calls = -(-n // cfg.judge_batch_size)
    gen_out_tokens = n * 1600
    judge_out_tokens = n * 450 + 4000
    # ราคาโดยประมาณต่อ 1M output token (gen รุ่นกลาง ~$15, judge รุ่นใหญ่ ~$75) + input เหมา ~30%
    cost = (gen_out_tokens / 1e6 * 15 + judge_out_tokens / 1e6 * 75) * 1.3
    return {
        "calls": gen_calls + judge_calls + 1,
        "est_minutes": round((gen_calls * 35 + judge_calls * 30 + 60) / 60),
        "est_cost_usd": round(cost, 2),
    }


def create_batch(cfg: BatchConfig) -> int:
    code = "BATCH_" + datetime.now().strftime("%Y%m%d_%H%M%S")
    return db.execute(
        "INSERT INTO script_batches (batch_code, total_scripts, generation_model, judge_model, status, config_json)"
        " VALUES (?,?,?,?, 'generating', ?)",
        (code, cfg.effective_total(), cfg.gen_model, cfg.judge_model,
         json.dumps(cfg.__dict__, ensure_ascii=False)),
    )


def store_script(batch_id: int, sc: dict) -> int:
    m = sc.get("metadata", {})
    return db.execute(
        """INSERT INTO generated_scripts
           (batch_id, script_index, title_th, title_zh, title_en, logline_th, logline_zh, logline_en,
            full_script_json, location_id, theme_id, comedy_beat, emotional_arc, estimated_duration_sec)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (batch_id, sc.get("id"), sc.get("title_th", ""), sc.get("title_zh", ""), sc.get("title_en", ""),
         sc.get("logline_th"), sc.get("logline_zh"), sc.get("logline_en"),
         json.dumps(sc, ensure_ascii=False), m.get("location_id"), m.get("theme_id"),
         m.get("comedy_beat"), m.get("emotional_arc"), m.get("estimated_duration_sec")),
    )


def store_judge_result(batch_id: int, r: dict):
    sets = ", ".join(f"{col} = ?" for col in SCORE_COLS.values())
    vals = [r["scores"][k] for k in SCORE_COLS]
    total = round(sum(r["scores"].values()), 1)
    db.execute(
        f"""UPDATE generated_scripts SET {sets}, total_score = ?, weighted_score = ?,
            judge_analysis = ?, judge_json = ? WHERE batch_id = ? AND script_index = ?""",
        (*vals, total, r["weighted_score"], r.get("analysis", ""),
         json.dumps(r, ensure_ascii=False), batch_id, r["script_id"]),
    )


def compute_rankings(batch_id: int):
    rows = db.query(
        "SELECT id, weighted_score FROM generated_scripts WHERE batch_id = ? AND weighted_score IS NOT NULL"
        " ORDER BY weighted_score DESC, id", (batch_id,))
    for rank, row in enumerate(rows, 1):
        db.execute("UPDATE generated_scripts SET rank = ?, is_top10 = ? WHERE id = ?",
                   (rank, 1 if rank <= 10 else 0, row["id"]))


def apply_manual_scores(script_row_id: int, scores: dict, note: str = ""):
    """คัดกรองแบบ manual (ไม่ใช้ API) — ทีมให้คะแนนเอง 12 เกณฑ์"""
    full = {k: max(1.0, min(10.0, float(scores.get(k, 5)))) for k in WEIGHTS}
    r = {"script_id": None, "scores": full, "weighted_score": calculate_weighted_score(full),
         "analysis": note or "ให้คะแนนโดยทีม (manual)", "money_shot": "", "weakness": "",
         "best_platform": "", "improvement_suggestion": ""}
    sets = ", ".join(f"{col} = ?" for col in SCORE_COLS.values())
    vals = [full[k] for k in SCORE_COLS]
    db.execute(
        f"""UPDATE generated_scripts SET {sets}, total_score = ?, weighted_score = ?,
            judge_analysis = ?, judge_json = ? WHERE id = ?""",
        (*vals, round(sum(full.values()), 1), r["weighted_score"], r["analysis"],
         json.dumps(r, ensure_ascii=False), script_row_id),
    )
    row = db.query("SELECT batch_id FROM generated_scripts WHERE id = ?", (script_row_id,))
    if row:
        compute_rankings(row[0]["batch_id"])


def run_pipeline(cfg: BatchConfig, api_key: str, progress_cb=None, batch_id: int = None) -> int:
    """รันทั้งสายพาน (หรือ resume จาก batch เดิม) — คืน batch_id"""
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    limiter = RateLimiter()

    est = estimate_cost(cfg)
    if est["est_cost_usd"] > cfg.max_cost_usd:
        raise RuntimeError(
            f"ประมาณการต้นทุน ${est['est_cost_usd']} เกินเพดาน ${cfg.max_cost_usd} — ปรับ config ก่อน")

    if batch_id is None:
        batch_id = create_batch(cfg)
    n = cfg.effective_total()

    def report(phase, done, total):
        if progress_cb:
            progress_cb(phase, done, total)

    try:
        # ---- Phase 1: Generate (resume ได้จาก script_index ที่มีแล้ว) ----
        matrix = generator.build_diversity_matrix(n, seed=batch_id)
        existing = {r["script_index"] for r in db.query(
            "SELECT script_index FROM generated_scripts WHERE batch_id = ?", (batch_id,))}
        done_scripts = [json.loads(r["full_script_json"]) for r in db.query(
            "SELECT full_script_json FROM generated_scripts WHERE batch_id = ?", (batch_id,))]
        report("generating", len(existing), n)

        pending = [m for m in matrix if m["index"] not in existing]
        for i in range(0, len(pending), cfg.gen_batch_size):
            slots = pending[i:i + cfg.gen_batch_size]
            ok, failed = generator.generate_batch(
                client, slots, done_scripts, cfg.gen_model, cfg.max_retries, limiter)
            for sc in ok:
                store_script(batch_id, sc)
                done_scripts.append(sc)
            report("generating", len(done_scripts), n)

        # ---- Phase 2: Judge (resume: เฉพาะที่ยังไม่มีคะแนน) ----
        db.execute("UPDATE script_batches SET status = 'judging' WHERE id = ?", (batch_id,))
        unjudged = db.query(
            "SELECT full_script_json FROM generated_scripts WHERE batch_id = ? AND weighted_score IS NULL"
            " ORDER BY script_index", (batch_id,))
        total_j = db.query("SELECT COUNT(*) c FROM generated_scripts WHERE batch_id = ?", (batch_id,))[0]["c"]
        judged_so_far = total_j - len(unjudged)
        report("judging", judged_so_far, total_j)

        scripts = [json.loads(r["full_script_json"]) for r in unjudged]
        for i in range(0, len(scripts), cfg.judge_batch_size):
            chunk = scripts[i:i + cfg.judge_batch_size]
            results = judge.judge_batch(client, chunk, cfg.judge_model, limiter)
            for r in results:
                store_judge_result(batch_id, r)
            judged_so_far += len(chunk)
            report("judging", judged_so_far, total_j)

        # ---- Phase 3: Rank + Top 10 ----
        compute_rankings(batch_id)

        # ---- Phase 4: Pattern Analysis ----
        report("analyzing", 0, 1)
        all_rows = db.query("SELECT * FROM generated_scripts WHERE batch_id = ? ORDER BY rank", (batch_id,))
        top10 = [r for r in all_rows if r["is_top10"]]
        analysis_md = judge.analyze_patterns(client, top10, all_rows, cfg.judge_model, limiter)
        db.execute(
            "INSERT INTO pattern_analysis (batch_id, analysis_json, summary_th) VALUES (?,?,?)",
            (batch_id, json.dumps({"markdown": analysis_md}, ensure_ascii=False), analysis_md[:500]),
        )
        report("analyzing", 1, 1)

        db.execute(
            "UPDATE script_batches SET status = 'complete', completed_at = datetime('now') WHERE id = ?",
            (batch_id,))
        return batch_id

    except Exception as e:
        db.execute("UPDATE script_batches SET status = 'failed', notes = ? WHERE id = ?",
                   (str(e)[:500], batch_id))
        raise
