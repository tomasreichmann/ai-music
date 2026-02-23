from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from ai_music.config import AppConfig
from ai_music.io.files import read_json, stable_hash, write_json, write_jsonl, write_text
from ai_music.io.markdown import iter_doc_chunks
from ai_music.llm.ollama_client import OllamaClient
from ai_music.llm.openrouter_client import OpenRouterClient
from ai_music.models.schemas import PromptBrief, SunoFragments
from ai_music.models.types import GuideChunk
from ai_music.prompting.briefs import (
    build_fallback_brief_from_chunks,
    build_suno_fragments_from_brief,
    coerce_prompt_brief,
)
from ai_music.prompting.render_fal import render_fal_payload
from ai_music.prompting.render_openrouter import render_openrouter_templates
from ai_music.prompting.render_suno import render_suno_prompt


DOCS_CHUNKS_JSONL = Path("data/analysis/doc_chunks.jsonl")
DOCS_CHUNKS_INDEX = Path("data/analysis/doc_chunks_index.json")


def index_docs(cfg: AppConfig) -> dict[str, Any]:
    doc_paths = sorted(cfg.docs_dir.glob("*.md"))
    chunks = iter_doc_chunks(doc_paths)
    rows = [asdict(c) for c in chunks]
    write_jsonl(cfg.root_dir / DOCS_CHUNKS_JSONL, rows)
    index = {
        "doc_count": len(doc_paths),
        "chunk_count": len(chunks),
        "docs": [p.name for p in doc_paths],
        "tags": sorted({t for c in chunks for t in c.tags}),
    }
    write_json(cfg.root_dir / DOCS_CHUNKS_INDEX, index)
    report_lines = [
        "# Docs Ingest Report",
        "",
        f"- Documents: {index['doc_count']}",
        f"- Chunks: {index['chunk_count']}",
        f"- Tags: {', '.join(index['tags'])}",
        "",
        "## Files",
        "",
        *[f"- `{name}`" for name in index["docs"]],
    ]
    write_text(cfg.outputs_dir / "reports/docs_ingest_report.md", "\n".join(report_lines))
    return index


def _load_chunks(cfg: AppConfig) -> list[GuideChunk]:
    path = cfg.root_dir / DOCS_CHUNKS_JSONL
    if not path.exists():
        index_docs(cfg)
    chunks: list[GuideChunk] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            chunks.append(GuideChunk(**json.loads(line)))
    return chunks


def _select_llm(cfg: AppConfig, prefer: str = "openrouter") -> tuple[Any | None, str]:
    if prefer == "openrouter" and cfg.providers.openrouter_api_key:
        return OpenRouterClient(cfg.providers.openrouter_api_key), "openrouter"
    if cfg.providers.openrouter_api_key:
        return OpenRouterClient(cfg.providers.openrouter_api_key), "openrouter"
    return OllamaClient(cfg.providers.ollama_base_url), "ollama"


def _groups_by_source(chunks: list[GuideChunk]) -> list[list[GuideChunk]]:
    grouped: dict[str, list[GuideChunk]] = {}
    for chunk in chunks:
        grouped.setdefault(chunk.source_file, []).append(chunk)
    return [grouped[k] for k in sorted(grouped)]


def _generate_suno_fragments_with_llm(
    llm: Any,
    llm_provider: str,
    brief: PromptBrief,
    group: list[GuideChunk],
    model: str | None = None,
    max_attempts: int = 2,
) -> tuple[SunoFragments | None, str | None]:
    try:
        schema = SunoFragments.model_json_schema()
        raw = llm.generate_structured(
            task_name="suno_style_lyrics_fragments",
            inputs={
                "brief": brief.model_dump(mode="json"),
                "requirements": {
                    "style_prompt_max_chars": 1000,
                    "suno_fields": [
                        "lyrics",
                        "style_prompt",
                        "exclude_styles",
                        "vocal_gender",
                        "weirdness",
                        "style_influence",
                        "song_title",
                    ],
                    "focus": "high-quality Suno style prompt and lyrics suitable for manual form entry",
                    "lyrics_parentheses_rule": (
                        "Round parentheses may only contain sung/spoken ad-libs (e.g., yeah, oh, rewind). "
                        "Do not put nonverbal production or instrument cues in parentheses "
                        "(e.g., drums, bass, percussion, synth, fx, fade out). "
                        "Use square-bracket section headers for structure or omit the cue."
                    ),
                },
                "source_chunks": [
                    {
                        "chunk_id": c.chunk_id,
                        "tags": c.tags,
                        "heading_path": c.heading_path,
                        "text": c.text[:1000],
                    }
                    for c in group[:24]
                ],
            },
            schema=schema,
            model=model,
            max_attempts=max_attempts,
        )
        fragments = SunoFragments.model_validate(raw)
        return fragments, None
    except Exception as exc:  # noqa: BLE001
        _ = llm_provider
        return None, str(exc)


def _enforce_suno_lyrics_phrase_structure_with_llm(
    llm: Any,
    llm_provider: str,
    brief: PromptBrief,
    fragments: SunoFragments,
    group: list[GuideChunk],
    model: str | None = None,
    max_attempts: int = 2,
) -> tuple[SunoFragments | None, str | None]:
    try:
        schema: dict[str, Any] = {
            "type": "object",
            "properties": {
                "lyrics": {"type": "string"},
                "song_title": {"type": "string"},
                "weirdness": {"type": "integer", "minimum": 0, "maximum": 100},
                "style_influence": {"type": "integer", "minimum": 0, "maximum": 100},
                "vocal_gender": {"type": "string", "enum": ["Male", "Female", "Unset"]},
                "style_prompt": {"type": "string"},
                "exclude_styles": {"type": "array", "items": {"type": "string"}},
            },
            "required": [
                "lyrics",
                "song_title",
                "weirdness",
                "style_influence",
                "vocal_gender",
                "style_prompt",
                "exclude_styles",
            ],
            "additionalProperties": False,
        }
        raw = llm.generate_structured(
            task_name="suno_lyrics_phrase_structure_enforcement",
            inputs={
                "brief": brief.model_dump(mode="json"),
                "current_suno_fragments": fragments.model_dump(mode="json"),
                "requirements": {
                    "goal": "Rewrite/adjust lyrics so section lengths and phrasing fit standard phrase structure for the target genre/subgenre.",
                    "preserve": [
                        "theme",
                        "core hook idea",
                        "song title (unless a better title is clearly needed)",
                        "style prompt unless it conflicts with structure",
                        "vocal gender",
                    ],
                    "structure_enforcement": (
                        "Infer standard phrase structure from genre/subgenre and enforce it in the lyrics. "
                        "For DnB / Dancefloor DnB / Dancehall DnB, use block-based phrasing (typically 8/16/32-bar sections), "
                        "with verse and pre-chorus sections typically 8 bars each and chorus/drop-aligned hook sections typically ~16 bars. "
                        "Drops should be mostly instrumental or contain only short hype/ad-lib phrases, not full dense verses."
                    ),
                    "short_section_padding_rule": (
                        "Suno may merge very short sections into the next section. "
                        "If a short instrumental/hype section such as [Drop] or [Drop 2] has only 1-2 short ad-lib lines, "
                        "pad the section with standalone `...` lines so the section visibly spans more lines and the ad-libs sit "
                        "inside the section (example pattern: ad-lib, `...`, `...`, `...`, ad-lib). "
                        "Use this only where needed to preserve section boundaries."
                    ),
                    "intro_outro_guidance": (
                        "Intro sections should establish groove and theme clearly. Avoid ad-lib-only intros with too many short parenthetical hype lines. "
                        "Prefer 1-2 concise thematic lyric lines and, if used, only a small number of ad-libs. "
                        "Outro sections should feel intentional; if a melodic callback/hook works, extend it with repeated or slightly varied callback lines "
                        "instead of switching to a weak generic slogan."
                    ),
                    "section_format": (
                        "Use square-bracket section headers such as [Verse 1], [Pre-Chorus], [Chorus], [Drop], [Bridge], [Outro]. "
                        "Do not add bar counts in parentheses."
                    ),
                    "lyrics_parentheses_rule": (
                        "Round parentheses may only contain sung/spoken ad-libs. "
                        "Do not put instrument/production/nonverbal cues in round parentheses."
                    ),
                },
                "guide_context": [
                    {
                        "heading_path": c.heading_path,
                        "text": c.text[:900],
                    }
                    for c in group
                    if any(tag in c.tags for tag in ["arrangement", "lyrics"])
                ][:12],
            },
            schema=schema,
            model=model,
            max_attempts=max_attempts,
        )
        adjusted = SunoFragments.model_validate(raw)
        return adjusted, None
    except Exception as exc:  # noqa: BLE001
        _ = llm_provider
        return None, str(exc)


def build_prompt_briefs_from_docs(
    cfg: AppConfig,
    use_llm: bool = True,
    model: str | None = None,
    suno_model: str | None = None,
    max_attempts: int = 2,
) -> dict[str, Any]:
    chunks = _load_chunks(cfg)
    llm, llm_provider = _select_llm(cfg)
    resolved_suno_model = suno_model
    if use_llm and resolved_suno_model is None and llm_provider == "openrouter":
        resolved_suno_model = "google/gemini-3-flash-preview"
    brief_paths: list[str] = []
    details: list[dict[str, Any]] = []
    for group in _groups_by_source(chunks):
        source_file = group[0].source_file
        intent = f"prompt-pack:{source_file}"
        used_fallback = False
        llm_error: str | None = None
        if use_llm and llm is not None:
            try:
                schema = PromptBrief.model_json_schema()
                raw = llm.generate_structured(
                    task_name="docs_to_prompt_brief",
                    inputs={
                        "intent": intent,
                        "source_file": source_file,
                        "chunk_ids": [c.chunk_id for c in group],
                        "guide_sections": [
                            {
                                "heading_path": c.heading_path,
                                "tags": c.tags,
                                "text": c.text[:1400],
                            }
                            for c in group
                        ],
                    },
                    schema=schema,
                    model=model,
                    max_attempts=max_attempts,
                )
                raw.setdefault("provenance", {})
                raw["provenance"].update(
                    {
                        "source": "llm",
                        "llm_provider": llm_provider,
                        "source_file": source_file,
                        "chunk_ids": [c.chunk_id for c in group],
                        "prompt_version_hash": stable_hash(intent, llm_provider, json.dumps(schema, sort_keys=True)),
                    }
                )
                brief = coerce_prompt_brief(raw)
                # Dedicated Suno style/lyrics pass can use a different model (e.g., Gemini via OpenRouter).
                fragments, suno_frag_err = _generate_suno_fragments_with_llm(
                    llm=llm,
                    llm_provider=llm_provider,
                    brief=brief,
                    group=group,
                    model=resolved_suno_model or model,
                    max_attempts=max_attempts,
                )
                if fragments is not None:
                    adjusted_fragments, structure_err = _enforce_suno_lyrics_phrase_structure_with_llm(
                        llm=llm,
                        llm_provider=llm_provider,
                        brief=brief,
                        fragments=fragments,
                        group=group,
                        model=resolved_suno_model or model,
                        max_attempts=max_attempts,
                    )
                    brief.suno_fragments = adjusted_fragments or fragments
                    brief.provenance["suno_fragments"] = {
                        "source": "llm",
                        "llm_provider": llm_provider,
                        "model": resolved_suno_model or model,
                        "lyrics_structure_enforced_by_llm": adjusted_fragments is not None,
                        "lyrics_structure_enforcement_error": structure_err,
                    }
                else:
                    brief.suno_fragments = build_suno_fragments_from_brief(brief)
                    brief.provenance["suno_fragments"] = {
                        "source": "fallback-deterministic",
                        "llm_provider": llm_provider,
                        "model": resolved_suno_model or model,
                        "error": suno_frag_err,
                    }
            except Exception as exc:  # noqa: BLE001
                used_fallback = True
                llm_error = str(exc)
                brief = build_fallback_brief_from_chunks(group, intent=intent)
                brief.provenance["fallback_reason"] = llm_error
        else:
            used_fallback = True
            brief = build_fallback_brief_from_chunks(group, intent=intent)
            brief.provenance["fallback_reason"] = "llm_disabled"
        brief_json = cfg.outputs_dir / "prompts" / "briefs" / f"{brief.brief_id}.json"
        brief_md = cfg.outputs_dir / "prompts" / "briefs" / f"{brief.brief_id}.md"
        write_json(brief_json, brief.model_dump(mode="json"))
        write_text(
            brief_md,
            "\n".join(
                [
                    f"# Prompt Brief `{brief.brief_id}`",
                    "",
                    f"- Intent: `{brief.intent}`",
                    f"- Genre: `{brief.genre}`",
                    f"- Subgenre: `{brief.subgenre}`",
                    f"- Energy: `{brief.energy}`",
                    f"- Tempo: `{brief.tempo_bpm_range[0]}-{brief.tempo_bpm_range[1]} BPM`",
                    f"- Moods: {', '.join(brief.mood_tags)}",
                    f"- References: {', '.join(brief.references[:10])}",
                    "",
                    "## Provenance",
                    "",
                    "```json",
                    json.dumps(brief.provenance, indent=2, ensure_ascii=False),
                    "```",
                ]
            ),
        )
        brief_paths.append(str(brief_json.relative_to(cfg.root_dir)))
        details.append(
            {
                "brief_id": brief.brief_id,
                "source_file": source_file,
                "llm_provider": brief.provenance.get("llm_provider", "fallback"),
                "used_fallback": used_fallback,
                "chunk_count": len(group),
                "llm_error": llm_error,
                "suno_fragments_source": ((brief.provenance.get("suno_fragments") or {}).get("source")),
            }
        )
    summary = {"brief_count": len(brief_paths), "brief_paths": brief_paths, "details": details}
    write_json(cfg.outputs_dir / "reports/prompt_generation_report.json", summary)
    report_md = ["# Prompt Generation Report", "", f"- Brief count: {summary['brief_count']}", "", "## Details", ""]
    for row in details:
        report_md.append(
            f"- `{row['brief_id']}` from `{row['source_file']}` "
            f"(provider={row['llm_provider']}, fallback={row['used_fallback']}, chunks={row['chunk_count']})"
        )
        if row.get("suno_fragments_source"):
            report_md.append(f"  - Suno fragments: `{row['suno_fragments_source']}`")
        if row["llm_error"]:
            report_md.append(f"  - LLM error: `{row['llm_error']}`")
    write_text(cfg.outputs_dir / "reports/prompt_generation_report.md", "\n".join(report_md))
    return summary


def render_prompt_artifacts(cfg: AppConfig, provider: str | None = None) -> dict[str, Any]:
    targets = [provider] if provider else ["suno", "fal", "openrouter"]
    rendered_paths: list[str] = []
    for brief_file in sorted((cfg.outputs_dir / "prompts" / "briefs").glob("*.json")):
        brief = PromptBrief.model_validate(read_json(brief_file))
        for target in targets:
            if target == "suno":
                rendered = render_suno_prompt(brief)
                ext = "md"
            elif target == "fal":
                rendered = render_fal_payload(brief)
                ext = "json"
            elif target == "openrouter":
                rendered = render_openrouter_templates(brief)
                ext = "json"
            else:
                raise ValueError(f"Unsupported provider: {target}")
            out_path = cfg.outputs_dir / "prompts" / "providers" / target / f"{brief.brief_id}.{ext}"
            if isinstance(rendered.payload, str):
                write_text(out_path, rendered.payload)
            else:
                write_json(out_path, rendered.payload)
            rendered_paths.append(str(out_path.relative_to(cfg.root_dir)))
            if target == "suno" and brief.suno_fragments is not None:
                suno_json_path = cfg.outputs_dir / "prompts" / "providers" / target / f"{brief.brief_id}.json"
                write_json(suno_json_path, brief.suno_fragments.model_dump(mode="json"))
                rendered_paths.append(str(suno_json_path.relative_to(cfg.root_dir)))
    return {"providers": targets, "rendered_count": len(rendered_paths), "rendered_paths": rendered_paths}
