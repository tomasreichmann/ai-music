from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


_PAREN_SEGMENT_RE = re.compile(r"\(([^()]*)\)")
_FULL_PAREN_LINE_RE = re.compile(r"^\s*\(([^()]*)\)\s*$")
_NONVERBAL_CUE_RE = re.compile(
    r"\b("
    r"drum|drums|snare|kick|hihat|hi-hat|percussion|beat|bass|sub\s*bass|bassline|"
    r"synth|stabs?|pad|pads|fx|sfx|riser|risers|drop|build(?:-?up)?|instrumental|"
    r"fade\s*out|roll(?:ing)?"
    r")\b",
    re.IGNORECASE,
)
_ADLIB_ONLY_RE = re.compile(
    r"^[\s\W]*(?:yeah|uh|oh|ah|hey|woah|whoa|la|na|rewind|selecta|come on|let's go|"
    r"one time|again|all right|alright)(?:[\s\W]+(?:yeah|uh|oh|ah|hey|woah|whoa|la|na|"
    r"rewind|selecta|come on|let's go|one time|again|all right|alright))*[\s\W]*$",
    re.IGNORECASE,
)


def _is_nonverbal_parenthetical(text: str) -> bool:
    content = text.strip()
    if not content:
        return False
    if _ADLIB_ONLY_RE.match(content):
        return False
    return bool(_NONVERBAL_CUE_RE.search(content))


def _sanitize_suno_lyrics_parentheses(lyrics: str) -> str:
    if not lyrics:
        return lyrics
    out_lines: list[str] = []
    for raw_line in lyrics.splitlines():
        line = raw_line.rstrip()
        full = _FULL_PAREN_LINE_RE.match(line)
        if full and _is_nonverbal_parenthetical(full.group(1)):
            # Drop standalone nonverbal production cues to avoid Suno singing them.
            continue

        def repl(match: re.Match[str]) -> str:
            inner = match.group(1)
            if _is_nonverbal_parenthetical(inner):
                return ""
            return match.group(0)

        cleaned = _PAREN_SEGMENT_RE.sub(repl, line)
        cleaned = re.sub(r"\s{2,}", " ", cleaned).rstrip()
        out_lines.append(cleaned)

    # Collapse repeated blank lines but preserve section spacing.
    collapsed: list[str] = []
    blank_run = 0
    for line in out_lines:
        if line.strip():
            blank_run = 0
            collapsed.append(line)
        else:
            blank_run += 1
            if blank_run <= 1:
                collapsed.append("")
    return "\n".join(collapsed).strip()


class SunoFragments(BaseModel):
    lyrics: str = ""
    style_prompt: str = ""
    exclude_styles: list[str] = Field(default_factory=list)
    vocal_gender: Literal["Male", "Female", "Unset"] = "Unset"
    weirdness: int = Field(default=20, ge=0, le=100)
    style_influence: int = Field(default=70, ge=0, le=100)
    song_title: str = "Untitled"

    @field_validator("style_prompt")
    @classmethod
    def cap_style_prompt_length(cls, value: str) -> str:
        value = (value or "").strip()
        if len(value) <= 1000:
            return value
        return value[:1000].rstrip()

    @field_validator("lyrics")
    @classmethod
    def sanitize_lyrics_parentheses(cls, value: str) -> str:
        return _sanitize_suno_lyrics_parentheses((value or "").strip())

    @field_validator("exclude_styles")
    @classmethod
    def dedupe_excludes(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for v in values:
            k = v.strip().lower()
            if not k or k in seen:
                continue
            seen.add(k)
            out.append(v.strip())
        return out


class PromptBrief(BaseModel):
    brief_id: str
    intent: str
    genre: str
    subgenre: str | None = None
    mood_tags: list[str] = Field(default_factory=list)
    energy: int = Field(default=5, ge=1, le=10)
    tempo_bpm_range: tuple[int, int] = (120, 128)
    instrumentation: list[str] = Field(default_factory=list)
    arrangement_plan: list[str] = Field(default_factory=list)
    vocal_spec: dict[str, Any] | None = None
    lyrics_spec: dict[str, Any] | None = None
    negative_constraints: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    suno_fragments: SunoFragments | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)

    @field_validator("mood_tags", "instrumentation", "arrangement_plan", "negative_constraints", "references")
    @classmethod
    def dedupe_preserve_order(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for v in values:
            k = v.strip().lower()
            if not k or k in seen:
                continue
            seen.add(k)
            out.append(v.strip())
        return out

    @field_validator("tempo_bpm_range")
    @classmethod
    def validate_bpm_range(cls, values: tuple[int, int]) -> tuple[int, int]:
        lo, hi = values
        if lo > hi:
            return hi, lo
        return lo, hi


class RenderedPrompt(BaseModel):
    brief_id: str
    provider: Literal["suno", "fal", "openrouter"]
    format: Literal["json", "text", "markdown"]
    payload: dict[str, Any] | str
    metadata: dict[str, Any] = Field(default_factory=dict)
