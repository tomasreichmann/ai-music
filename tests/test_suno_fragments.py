import pytest
from pydantic import ValidationError

from ai_music.models.schemas import PromptBrief, SunoFragments
from ai_music.prompting.render_suno import render_suno_prompt


def test_suno_style_prompt_is_capped_and_renderer_outputs_fields() -> None:
    brief = PromptBrief(
        brief_id="pb_test",
        intent="prompt-pack:test",
        genre="electronic",
        mood_tags=["uplifting"],
        energy=6,
        tempo_bpm_range=(120, 128),
        instrumentation=["drums", "bass", "synth"],
        arrangement_plan=["intro", "drop"],
        suno_fragments=SunoFragments(
            sample_prompt="Use the uploaded sound as the main hook and build a full dance track.",
            song_title="Test Song",
            style_prompt="x" * 1200,
            exclude_styles=["muddy mix"],
            lyrics="[Verse]\nhello",
            vocal_gender="Unset",
            weirdness=10,
            style_influence=90,
            audio_influence=65,
        ),
    )
    rendered = render_suno_prompt(brief)
    assert rendered.provider == "suno"
    assert rendered.metadata["style_prompt_length"] == 1000
    assert rendered.metadata["audio_influence"] == 65
    payload = str(rendered.payload)
    assert "Sample Prompt" in payload
    assert "Audio Influence" in payload
    assert "Exclude Styles" in payload
    assert "Lyrics" in payload
    assert "### Title" in payload

    ordered_sections = [
        "### Sample Prompt",
        "### Lyrics",
        "### Styles",
        "### Exclude Styles",
        "### Vocal Gender",
        "### Weirdness",
        "### Style Influence",
        "### Audio Influence",
        "### Title",
    ]
    positions = [payload.index(section) for section in ordered_sections]
    assert positions == sorted(positions)


def test_suno_renderer_omits_audio_influence_when_unset() -> None:
    brief = PromptBrief(
        brief_id="pb_test_no_audio",
        intent="prompt-pack:test",
        genre="electronic",
        suno_fragments=SunoFragments(
            sample_prompt="",
            song_title="No Audio",
            style_prompt="liquid dnb, bright pads, rolling drums",
            lyrics="",
            audio_influence=None,
        ),
    )
    rendered = render_suno_prompt(brief)
    payload = str(rendered.payload)
    assert "### Audio Influence" not in payload
    assert rendered.metadata["audio_influence"] is None


def test_suno_audio_influence_accepts_none_and_rejects_out_of_range() -> None:
    fr = SunoFragments(audio_influence=None)
    assert fr.audio_influence is None

    with pytest.raises(ValidationError):
        SunoFragments(audio_influence=-1)

    with pytest.raises(ValidationError):
        SunoFragments(audio_influence=101)


def test_suno_lyrics_strip_nonverbal_parenthetical_cues_but_keep_adlibs() -> None:
    fr = SunoFragments(
        lyrics=(
            "[Drop]\n"
            "(Rolling dnb drums)\n"
            "(Dancehall percussion stabs)\n"
            "(Heavy sub bass)\n"
            "(Rewind! Selecta!)\n"
            "Wrapped in gloss tonight\n"
            "(Fade out with rolling drums)\n"
        ),
        style_prompt="dnb",
        song_title="x",
    )
    assert "(Rolling dnb drums)" not in fr.lyrics
    assert "(Dancehall percussion stabs)" not in fr.lyrics
    assert "(Heavy sub bass)" not in fr.lyrics
    assert "(Fade out with rolling drums)" not in fr.lyrics
    assert "(Rewind! Selecta!)" in fr.lyrics
