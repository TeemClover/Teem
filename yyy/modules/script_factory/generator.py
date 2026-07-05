# -*- coding: utf-8 -*-
"""
modules/script_factory/generator.py — เครื่องปั่นบท (Stage 1)
สร้าง diversity matrix แล้วเรียก Claude API ทีละชุด (5 บท/ครั้ง) พร้อม validate + regen
"""
import json
import random

from .prompts import GENERATOR_SYSTEM_PROMPT, GENERATOR_USER_PROMPT_TEMPLATE, REGEN_PROMPT
from .utils import check_similarity, extract_json, validate_script
from .world_bible import COMEDY_BEATS, EMOTIONAL_ARCS, LOCATIONS_SF, THEMES

DEFAULT_GEN_MODEL = "claude-sonnet-5"


def build_diversity_matrix(n: int = 100, seed=None) -> list:
    """กระจาย โลเคชัน x ธีม x มุกตลก x อาร์คอารมณ์ ให้ครบทุกช่องแบบไม่ซ้ำรูปแบบ"""
    rng = random.Random(seed)
    locations = (LOCATIONS_SF * ((n // len(LOCATIONS_SF)) + 1))[:n]
    rng.shuffle(locations)

    matrix = []
    for i in range(n):
        matrix.append({
            "index": i + 1,
            "location": locations[i],
            "theme": THEMES[i % len(THEMES)],
            "comedy_beat": COMEDY_BEATS[i % len(COMEDY_BEATS)],
            "emotional_arc": EMOTIONAL_ARCS[i % len(EMOTIONAL_ARCS)],
        })
    rng.shuffle(matrix)
    for i, item in enumerate(matrix):
        item["index"] = i + 1
    return matrix


def _format_assignments(slots: list) -> str:
    lines = []
    for s in slots:
        lines.append(
            f"- Script #{s['index']}: location={s['location']['id']} ({s['location']['en']}), "
            f"theme={s['theme']['id']}, comedy_beat={s['comedy_beat']}, arc={s['emotional_arc']}"
        )
    return "\n".join(lines)


def _call_api(client, model: str, system: str, user: str, max_tokens: int = 8192) -> str:
    resp = client.messages.create(
        model=model, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def generate_batch(client, slots: list, previous_scripts: list,
                   model: str = DEFAULT_GEN_MODEL, max_retries: int = 3,
                   rate_limiter=None) -> tuple:
    """สร้างบท 1 ชุด (ตาม slots) — คืน (บทที่ผ่าน validate, รายการ error ที่แก้ไม่สำเร็จ)"""
    prev_summary = "\n".join(
        f"- #{s.get('id')}: {s.get('title_en','')} — {s.get('logline_en','')}"
        for s in previous_scripts[-30:]
    ) or "(none yet)"

    user = GENERATOR_USER_PROMPT_TEMPLATE.format(
        batch_size=len(slots),
        diversity_assignments=_format_assignments(slots),
        previous_titles_summary=prev_summary,
    )

    if rate_limiter:
        rate_limiter.wait_if_needed(6000)
    raw = _call_api(client, model, GENERATOR_SYSTEM_PROMPT, user)
    scripts = extract_json(raw)
    if isinstance(scripts, dict):
        scripts = [scripts]

    ok, failed = [], []
    slot_by_index = {s["index"]: s for s in slots}
    for sc in scripts:
        errors = validate_script(sc)
        if check_similarity(sc, previous_scripts + ok) > 0.6:
            errors.append("เนื้อเรื่องซ้ำกับบทก่อนหน้า (>60% overlap)")

        # ลอง regen รายตอนถ้าไม่ผ่าน
        retries = 0
        while errors and retries < max_retries:
            slot = slot_by_index.get(sc.get("id"), slots[0])
            regen_user = REGEN_PROMPT.format(
                script_id=sc.get("id"), validation_errors="\n".join(errors),
                location=slot["location"]["id"], theme=slot["theme"]["id"],
                comedy_beat=slot["comedy_beat"], arc=slot["emotional_arc"],
            )
            if rate_limiter:
                rate_limiter.wait_if_needed(3000)
            try:
                raw2 = _call_api(client, model, GENERATOR_SYSTEM_PROMPT, user + "\n\n" + regen_user, 4096)
                sc = extract_json(raw2)
                if isinstance(sc, list):
                    sc = sc[0]
                errors = validate_script(sc)
            except Exception as e:
                errors = [f"regen ล้มเหลว: {e}"]
            retries += 1

        if errors:
            failed.append({"script": sc, "errors": errors})
        else:
            ok.append(sc)
    return ok, failed
