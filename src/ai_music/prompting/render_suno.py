from __future__ import annotations

from ai_music.models.schemas import PromptBrief, RenderedPrompt
from ai_music.prompting.briefs import ensure_suno_fragments


def render_suno_prompt(brief: PromptBrief) -> RenderedPrompt:
    brief = ensure_suno_fragments(brief)
    suno = brief.suno_fragments
    assert suno is not None
    style_len = len(suno.style_prompt)
    exclude_str = ", ".join(suno.exclude_styles) if suno.exclude_styles else "(none)"
    lyrics_block = suno.lyrics.strip() or "(leave blank / instrumental)"
    md = (
        f"# Suno Prompt: {brief.brief_id}\n\n"
        "## Suno Fragments\n\n"
        f"- Song Title: `{suno.song_title}`\n"
        f"- Vocal Gender: `{suno.vocal_gender}`\n"
        f"- Weirdness: `{suno.weirdness}%`\n"
        f"- Style Influence: `{suno.style_influence}%`\n"
        f"- Style Prompt Length: `{style_len}/1000`\n\n"
        "## Style Prompt (<1000 chars)\n\n"
        f"{suno.style_prompt}\n\n"
        "## Exclude Styles\n\n"
        f"{exclude_str}\n\n"
        "## Lyrics\n\n"
        f"{lyrics_block}\n\n"
        "## Notes\n\n"
        "- This artifact is form-aligned for Suno manual entry.\n"
        "- Generation job submission is intentionally not performed in this MVP.\n"
    )
    return RenderedPrompt(
        brief_id=brief.brief_id,
        provider="suno",
        format="markdown",
        payload=md,
        metadata={
            "song_title": suno.song_title,
            "vocal_gender": suno.vocal_gender,
            "weirdness": suno.weirdness,
            "style_influence": suno.style_influence,
            "style_prompt_length": style_len,
            "bpm_range": list(brief.tempo_bpm_range),
        },
    )
