# -*- coding: utf-8 -*-
"""
modules/script_factory/schemas.py — Pydantic v2 models ของบทและผลตัดสิน
ใช้ตรวจโครงสร้าง JSON ที่ AI ส่งกลับก่อนบันทึกลง DB
"""
from typing import Optional

from pydantic import BaseModel, Field


class DialogueLine(BaseModel):
    speaker: str = Field(description="'CLOVER' หรือ 'XIRCLE'")
    line_th: str
    line_zh: str
    line_en: str
    action: Optional[str] = None
    emotion: str = ""


class ScriptBeat(BaseModel):
    beat_name: str
    beat_description: str = ""
    lines: list[DialogueLine]


class NarrationBlock(BaseModel):
    opening_hook_th: str = ""
    opening_hook_zh: str = ""
    opening_hook_en: str = ""
    closing_cta_th: str = ""
    closing_cta_zh: str = ""
    closing_cta_en: str = ""


class ProductionMetadata(BaseModel):
    location_id: str = ""
    location_th: str = ""
    location_zh: str = ""
    location_en: str = ""
    theme_id: str = ""
    theme_th: str = ""
    theme_zh: str = ""
    theme_en: str = ""
    comedy_beat: str = ""
    emotional_arc: str = ""
    estimated_duration_sec: int = 90
    energy_level: str = "medium"
    best_time_to_shoot: Optional[str] = None
    special_props: list[str] = Field(default_factory=list)
    broll_suggestions: list[str] = Field(default_factory=list)


class ViralTags(BaseModel):
    tiktok_hashtags: list[str] = Field(default_factory=list)
    douyin_hashtags: list[str] = Field(default_factory=list)
    ig_hashtags: list[str] = Field(default_factory=list)
    tiktok_caption_th: str = ""
    douyin_caption_zh: str = ""
    ig_caption_en: str = ""
    viral_hook_type: str = ""


class EpisodeScript(BaseModel):
    """บท 1 ตอน — หน่วยข้อมูลหลักของ Script Factory"""
    id: int
    title_th: str
    title_zh: str
    title_en: str
    logline_th: str = ""
    logline_zh: str = ""
    logline_en: str = ""
    beats: list[ScriptBeat]
    narration: NarrationBlock = Field(default_factory=NarrationBlock)
    metadata: ProductionMetadata = Field(default_factory=ProductionMetadata)
    viral_tags: ViralTags = Field(default_factory=ViralTags)
    generation_notes: str = ""


class JudgeResult(BaseModel):
    """ผลตัดสินบท 1 ตอนจาก AI Judge"""
    script_id: int
    scores: dict[str, float]
    weighted_score: float = 0.0
    analysis: str = ""
    money_shot: str = ""
    weakness: str = ""
    best_platform: str = ""
    improvement_suggestion: str = ""
