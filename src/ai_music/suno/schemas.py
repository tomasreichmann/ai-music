from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class SunoSongRecord(BaseModel):
    song_id: str
    title: str
    created_at: str | None = None
    likes: int = 0
    is_cover: bool | None = None
    is_remaster: bool | None = None
    is_sample_derived: bool | None = None
    depends_on_existing: bool | None = None
    is_uploaded: bool | None = None
    style_prompt: str = ""
    exclude_styles: list[str] = Field(default_factory=list)
    weirdness: int | None = None
    style_influence: int | None = None
    lyrics: str = ""
    source_payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("likes", mode="before")
    @classmethod
    def coerce_likes(cls, value: Any) -> int:
        if value in (None, "", False):
            return 0
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    @field_validator("exclude_styles", mode="before")
    @classmethod
    def coerce_exclude_styles(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(x).strip() for x in value if str(x).strip()]
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            return [text]
        return []


class SunoAdaptedPrompt(BaseModel):
    song_title: str
    style_prompt: str
    exclude_styles: list[str] = Field(default_factory=list)
    lyrics: str = ""
    weirdness: int | None = None
    style_influence: int | None = None
    rationale: str = ""


class SunoApiConfig(BaseModel):
    base_url: str
    created_songs_endpoint: str
    http_method: str = "GET"
    headers: dict[str, str] = Field(default_factory=dict)
    page_size_param: str = "limit"
    cursor_param: str = "cursor"
    page_size_default: int = 50


class SunoResponseConfig(BaseModel):
    songs_path: str
    next_cursor_path: str
    fields: dict[str, str]


class SunoNormalizationConfig(BaseModel):
    truthy_values: list[str] = Field(default_factory=lambda: ["true", "1", "yes", "y", "on"])
    falsy_values: list[str] = Field(default_factory=lambda: ["false", "0", "no", "n", "off"])
    exclude_styles_delimiters: list[str] = Field(default_factory=lambda: [",", "|"])


class SunoMappingConfig(BaseModel):
    api: SunoApiConfig
    response: SunoResponseConfig
    normalization: SunoNormalizationConfig = Field(default_factory=SunoNormalizationConfig)
