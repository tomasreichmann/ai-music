from __future__ import annotations

from ai_music.models.schemas import PromptBrief, RenderedPrompt


def render_fal_payload(brief: PromptBrief) -> RenderedPrompt:
    payload = {
        "prompt": {
            "genre": brief.genre,
            "subgenre": brief.subgenre,
            "mood_tags": brief.mood_tags,
            "energy": brief.energy,
            "tempo_bpm_range": list(brief.tempo_bpm_range),
            "instrumentation": brief.instrumentation,
            "arrangement_plan": brief.arrangement_plan,
            "vocal_spec": brief.vocal_spec,
            "lyrics_spec": brief.lyrics_spec,
            "negative_constraints": brief.negative_constraints,
            "references": brief.references,
        },
        "metadata": {
            "brief_id": brief.brief_id,
            "provenance": brief.provenance,
        },
    }
    return RenderedPrompt(
        brief_id=brief.brief_id,
        provider="fal",
        format="json",
        payload=payload,
        metadata={"request_type": "prompt_artifact_only"},
    )
