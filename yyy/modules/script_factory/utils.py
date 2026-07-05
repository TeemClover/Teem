# -*- coding: utf-8 -*-
"""
modules/script_factory/utils.py — ตัวช่วยกลาง: validate บท, เช็คซ้ำ, rate limiter, parse JSON
"""
import json
import re
import time

from .world_bible import WEIGHTS


def extract_json(text: str):
    """ดึง JSON จากข้อความ AI (ตัด code fence / ข้อความห่อหุ้มออก)"""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    # หา array หรือ object ก้อนแรก
    start = min([i for i in (text.find("["), text.find("{")) if i >= 0], default=-1)
    if start > 0:
        text = text[start:]
    return json.loads(text)


def validate_script(script: dict) -> list:
    """ตรวจบท 1 ตอนตามกฎคุณภาพ — คืนรายการ error (ว่าง = ผ่าน)"""
    errors = []

    beats = script.get("beats", [])
    if len(beats) != 4:
        errors.append(f"ต้องมี 4 beats พอดี (พบ {len(beats)})")

    for beat in beats:
        n = len(beat.get("lines", []))
        if n < 2:
            errors.append(f"Beat '{beat.get('beat_name')}' ต้องมีอย่างน้อย 2 ไลน์")
        if n > 4:
            errors.append(f"Beat '{beat.get('beat_name')}' ไม่ควรเกิน 4 ไลน์")

    speakers = set()
    for beat in beats:
        for line in beat.get("lines", []):
            for key, label in (("line_th", "ไทย"), ("line_zh", "จีน"), ("line_en", "อังกฤษ")):
                if not line.get(key):
                    errors.append(f"ไลน์ขาดภาษา{label}")
            # ตรวจ Pinyin ในข้อความจีน: อักษรละตินติดกัน >= 2 ตัว (ยกเว้นตัวใหญ่ล้วนอย่าง BTS/YYY)
            zh = line.get("line_zh", "")
            for token in re.findall(r"[a-zA-Z]{2,}", zh):
                if not token.isupper():
                    errors.append(f"อาจมี Pinyin/อักษรละตินในข้อความจีน: {zh[:40]}")
                    break
            speakers.add(line.get("speaker"))

    if "CLOVER" not in speakers:
        errors.append("Clover ต้องปรากฏในบท")
    if "XIRCLE" not in speakers:
        errors.append("Xircle ต้องปรากฏในบท")

    if beats and beats[0].get("beat_name") != "hook":
        errors.append("Beat แรกต้องเป็น 'hook'")

    tags = script.get("viral_tags", {})
    for platform in ("tiktok_hashtags", "douyin_hashtags", "ig_hashtags"):
        hashtags = tags.get(platform, [])
        if not hashtags or hashtags[0] != "#YYY":
            errors.append(f"{platform} ต้องขึ้นต้นด้วย #YYY")

    duration = script.get("metadata", {}).get("estimated_duration_sec", 0)
    if not (30 <= duration <= 180):
        errors.append(f"ความยาว {duration}s อยู่นอกช่วง 30-180s")

    return errors


def check_similarity(new_script: dict, existing_scripts: list) -> float:
    """เช็คความซ้ำจาก logline อังกฤษ (keyword overlap) — คืนค่าซ้ำสูงสุด 0-1"""
    new_words = set((new_script.get("logline_en") or "").lower().split())
    max_overlap = 0.0
    for existing in existing_scripts:
        existing_words = set((existing.get("logline_en") or "").lower().split())
        if not new_words or not existing_words:
            continue
        overlap = len(new_words & existing_words) / max(len(new_words), len(existing_words))
        max_overlap = max(max_overlap, overlap)
    return max_overlap


def calculate_weighted_score(scores: dict) -> float:
    """คะแนนถ่วงน้ำหนักจาก 12 เกณฑ์ (เกณฑ์ที่ขาดคิดเป็น 0)"""
    return round(sum(float(scores.get(k, 0)) * w for k, w in WEIGHTS.items()), 2)


class RateLimiter:
    """คุมความเร็วเรียก API แบบ synchronous (เหมาะกับ Streamlit)"""

    def __init__(self, requests_per_minute: int = 20, tokens_per_minute: int = 60000):
        self.rpm = requests_per_minute
        self.tpm = tokens_per_minute
        self.request_times = []
        self.token_counts = []

    def wait_if_needed(self, estimated_tokens: int = 5000):
        now = time.time()
        self.request_times = [t for t in self.request_times if now - t < 60]
        self.token_counts = [(t, c) for t, c in self.token_counts if now - t < 60]

        if len(self.request_times) >= self.rpm:
            wait = 60 - (now - self.request_times[0])
            if wait > 0:
                time.sleep(wait)

        current = sum(c for _, c in self.token_counts)
        if self.token_counts and current + estimated_tokens > self.tpm:
            wait = 60 - (now - self.token_counts[0][0])
            if wait > 0:
                time.sleep(wait)

        self.request_times.append(time.time())
        self.token_counts.append((time.time(), estimated_tokens))


def get_api_key():
    """หา ANTHROPIC_API_KEY จาก env หรือไฟล์ .env — คืน None ถ้าไม่มี (ห้าม log ค่า)"""
    import os
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        try:
            from dotenv import load_dotenv
            from core.db import ROOT
            load_dotenv(ROOT / ".env")
            key = os.environ.get("ANTHROPIC_API_KEY")
        except Exception:
            pass
    return key or None
