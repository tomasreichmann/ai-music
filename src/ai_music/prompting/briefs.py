from __future__ import annotations

from typing import Any

from ai_music.io.files import stable_hash
from ai_music.models.schemas import PromptBrief, SunoFragments
from ai_music.models.types import GuideChunk


def _default_song_title(brief: PromptBrief) -> str:
    base = brief.subgenre or brief.genre or "Electronic Track"
    words = [w for w in str(base).replace("/", " ").replace("-", " ").split() if w]
    title = " ".join(w.capitalize() for w in words[:4]) or "Untitled"
    if brief.references:
        ref = brief.references[0].split("(")[0].strip()
        if ref and len(ref) < 40:
            title = f"{title}: {ref[:32]}"
    return title[:80]


def build_suno_fragments_from_brief(brief: PromptBrief) -> SunoFragments:
    style_parts: list[str] = []
    if brief.subgenre:
        style_parts.append(f"{brief.genre} / {brief.subgenre}")
    else:
        style_parts.append(brief.genre)
    if brief.mood_tags:
        style_parts.append(f"mood: {', '.join(brief.mood_tags[:6])}")
    style_parts.append(f"tempo: {brief.tempo_bpm_range[0]}-{brief.tempo_bpm_range[1]} BPM")
    if brief.instrumentation:
        style_parts.append(f"instrumentation: {', '.join(brief.instrumentation[:8])}")
    if brief.arrangement_plan:
        style_parts.append(f"arrangement: {', '.join(brief.arrangement_plan[:8])}")
    if brief.vocal_spec and isinstance(brief.vocal_spec, dict):
        vocal_notes = brief.vocal_spec.get("style") or brief.vocal_spec.get("notes")
        if isinstance(vocal_notes, list):
            vocal_notes = ", ".join(str(x) for x in vocal_notes[:4])
        if vocal_notes:
            style_parts.append(f"vocals: {vocal_notes}")
    style_prompt = ". ".join(part.strip().rstrip(".") for part in style_parts if part).strip() + "."
    style_prompt = style_prompt[:1000].rstrip()

    lyrics_enabled = bool(brief.lyrics_spec and brief.lyrics_spec.get("enabled"))
    lyrics = ""
    if lyrics_enabled:
        lyrics = (
            "[Verse]\n"
            "Late lights flicker through the smoke and sound\n"
            "Hearts in motion when the bass rolls down\n\n"
            "[Chorus]\n"
            "Hold the night, let the rhythm take control\n"
            "Raise the fire, feel the pressure in your soul\n"
        )

    exclude_styles = [x for x in brief.negative_constraints if x]
    exclude_styles.extend(["low fidelity artifacts", "muddy low end"])
    vocal_gender = "Unset"
    if brief.vocal_spec and isinstance(brief.vocal_spec, dict):
        raw = str(brief.vocal_spec.get("gender", "")).strip().lower()
        if raw in {"male", "female"}:
            vocal_gender = raw.capitalize()

    return SunoFragments(
        lyrics=lyrics,
        style_prompt=style_prompt,
        exclude_styles=exclude_styles,
        vocal_gender=vocal_gender,  # type: ignore[arg-type]
        weirdness=20 if (brief.subgenre or "").lower().startswith("dancefloor") else 30,
        style_influence=75,
        song_title=_default_song_title(brief),
    )


def ensure_suno_fragments(brief: PromptBrief) -> PromptBrief:
    if brief.suno_fragments is None:
        brief.suno_fragments = build_suno_fragments_from_brief(brief)
    return brief


def build_fallback_brief_from_chunks(chunks: list[GuideChunk], intent: str = "prompt-pack") -> PromptBrief:
    all_text = "\n".join(chunk.text for chunk in chunks)
    lower = all_text.lower()
    genre = "electronic"
    subgenre = None
    bpm = (120, 128)
    if "drum and bass" in lower or "dnb" in lower:
        genre = "drum and bass"
        subgenre = "dancefloor"
        bpm = (170, 175)
    elif "progressive" in lower or "melodic house" in lower:
        genre = "electronic"
        subgenre = "progressive melodic house"
        bpm = (118, 126)
    mood_tags: list[str] = []
    for tag in ["high-energy", "cinematic", "uplifting", "dark", "melancholic", "club-ready"]:
        if tag.replace("-", " ") in lower or tag in lower:
            mood_tags.append(tag)
    if not mood_tags:
        mood_tags = ["dynamic", "emotive"]
    instrumentation = [kw for kw in ["drums", "bass", "synth", "pads", "piano", "strings"] if kw in lower]
    if not instrumentation:
        instrumentation = ["drums", "bass", "synth"]
    arrangement_plan = ["intro", "build", "drop", "breakdown", "drop 2", "outro"]
    refs = sorted({chunk.heading_path[-1] for chunk in chunks if chunk.heading_path})
    brief_id = f"pb_{stable_hash(intent, genre, subgenre or '', ''.join(chunk.chunk_id for chunk in chunks))}"
    brief = PromptBrief(
        brief_id=brief_id,
        intent=intent,
        genre=genre,
        subgenre=subgenre,
        mood_tags=mood_tags,
        energy=8 if genre == "drum and bass" else 6,
        tempo_bpm_range=bpm,
        instrumentation=instrumentation,
        arrangement_plan=arrangement_plan,
        vocal_spec={"style": "optional", "notes": ["fit genre and emotion"]},
        lyrics_spec={"enabled": True, "format": "verse/chorus"} if "lyric" in lower else {"enabled": False},
        negative_constraints=["muddy mix", "generic phrasing", "overcrowded arrangement"],
        references=refs[:20],
        provenance={
            "source": "fallback-deterministic",
            "chunk_ids": [chunk.chunk_id for chunk in chunks],
            "source_files": sorted({chunk.source_file for chunk in chunks}),
        },
    )
    return ensure_suno_fragments(brief)


def coerce_prompt_brief(data: dict[str, Any]) -> PromptBrief:
    payload = dict(data)
    payload.setdefault("intent", "prompt-pack")
    payload.setdefault("genre", "electronic")
    if "brief_id" not in payload:
        payload["brief_id"] = f"pb_{stable_hash(str(payload.get('intent')), str(payload.get('genre')))}"
    if isinstance(payload.get("tempo_bpm_range"), list):
        payload["tempo_bpm_range"] = tuple(payload["tempo_bpm_range"])
    for key in ["mood_tags", "instrumentation", "arrangement_plan", "negative_constraints", "references"]:
        value = payload.get(key)
        if isinstance(value, str):
            payload[key] = [x.strip() for x in value.split(",") if x.strip()]
    brief = PromptBrief.model_validate(payload)
    return ensure_suno_fragments(brief)
