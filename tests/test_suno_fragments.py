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
            song_title="Test Song",
            style_prompt="x" * 1200,
            exclude_styles=["muddy mix"],
            lyrics="[Verse]\nhello",
            vocal_gender="Unset",
            weirdness=10,
            style_influence=90,
        ),
    )
    rendered = render_suno_prompt(brief)
    assert rendered.provider == "suno"
    assert rendered.metadata["style_prompt_length"] == 1000
    payload = str(rendered.payload)
    assert "Song Title" in payload
    assert "Exclude Styles" in payload
    assert "Lyrics" in payload


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
