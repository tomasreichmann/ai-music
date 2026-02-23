from __future__ import annotations

from ai_music.models.schemas import PromptBrief, RenderedPrompt


def render_openrouter_templates(brief: PromptBrief) -> RenderedPrompt:
    system = (
        "You are an expert AI music prompt and lyric refiner. Improve the supplied brief while preserving genre, "
        "tempo, and arrangement intent. Return concise output."
    )
    user = {
        "task": "Refine and expand prompt brief",
        "brief": brief.model_dump(mode="json"),
        "deliverables": [
            "refined_generation_prompt",
            "alt_prompt_variants",
            "lyric_hook_options",
            "mix_notes",
        ],
    }
    return RenderedPrompt(
        brief_id=brief.brief_id,
        provider="openrouter",
        format="json",
        payload={"system": system, "user": user},
        metadata={"template": "prompt_refine_v1"},
    )
