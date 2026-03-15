from __future__ import annotations

from ai_music.models.schemas import PromptBrief, RenderedPrompt
from ai_music.prompting.briefs import ensure_suno_fragments


def render_suno_prompt(brief: PromptBrief) -> RenderedPrompt:
    brief = ensure_suno_fragments(brief)
    suno = brief.suno_fragments
    assert suno is not None
    style_len = len(suno.style_prompt)
    exclude_str = ", ".join(suno.exclude_styles) if suno.exclude_styles else "(none)"
    sample_prompt_block = suno.sample_prompt.strip() or "(leave blank unless using Sounds/Audio Uploads)"
    lyrics_block = suno.lyrics.strip() or "(leave blank / instrumental)"
    audio_influence_section = (
        f"### Audio Influence\n\n`{suno.audio_influence}%`\n\n" if suno.audio_influence is not None else ""
    )
    md = (
        f"# Suno Prompt: {brief.brief_id}\n\n"
        "## Suno Fragments (UI Order)\n\n"
        "### Sample Prompt\n\n"
        f"{sample_prompt_block}\n\n"
        "### Lyrics\n\n"
        f"{lyrics_block}\n\n"
        "### Styles\n\n"
        f"_Length: `{style_len}/1000`_\n\n"
        f"{suno.style_prompt}\n\n"
        "### Exclude Styles\n\n"
        f"{exclude_str}\n\n"
        "### Vocal Gender\n\n"
        f"`{suno.vocal_gender}`\n\n"
        "### Weirdness\n\n"
        f"`{suno.weirdness}%`\n\n"
        "### Style Influence\n\n"
        f"`{suno.style_influence}%`\n\n"
        f"{audio_influence_section}"
        "### Title\n\n"
        f"`{suno.song_title}`\n\n"
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
            "sample_prompt": suno.sample_prompt,
            "song_title": suno.song_title,
            "vocal_gender": suno.vocal_gender,
            "weirdness": suno.weirdness,
            "style_influence": suno.style_influence,
            "audio_influence": suno.audio_influence,
            "style_prompt_length": style_len,
            "bpm_range": list(brief.tempo_bpm_range),
        },
    )
