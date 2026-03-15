from ai_music.suno.analysis import build_prompt_baseline
from ai_music.suno.schemas import SunoSongRecord


def _song(
    song_id: str,
    likes: int,
    style_prompt: str,
    weirdness: int,
    style_influence: int,
    exclude_styles: list[str],
) -> SunoSongRecord:
    return SunoSongRecord(
        song_id=song_id,
        title=f"Title {song_id}",
        created_at="2026-03-01T00:00:00Z",
        likes=likes,
        is_cover=False,
        is_remaster=False,
        is_sample_derived=False,
        depends_on_existing=False,
        is_uploaded=False,
        style_prompt=style_prompt,
        exclude_styles=exclude_styles,
        weirdness=weirdness,
        style_influence=style_influence,
        lyrics="",
        source_payload={},
    )


def test_build_prompt_baseline_is_like_weighted_and_query_filtered() -> None:
    alias_map = {
        "clinical": ["clinical", "sterile", "precise"],
        "dnb": ["dnb", "drum and bass", "drum-and-bass"],
    }
    songs = [
        _song(
            "s1",
            likes=1,
            style_prompt="clinical dnb, rolling breaks, clean reese bass",
            weirdness=20,
            style_influence=70,
            exclude_styles=["hardstyle", "dubstep"],
        ),
        _song(
            "s2",
            likes=4,
            style_prompt="sterile drum and bass, precise drums, minimal atmos",
            weirdness=60,
            style_influence=30,
            exclude_styles=["hardstyle"],
        ),
        _song(
            "s3",
            likes=9,
            style_prompt="melodic house, warm pads, piano hooks",
            weirdness=15,
            style_influence=65,
            exclude_styles=["metal"],
        ),
    ]

    result = build_prompt_baseline(
        songs=songs,
        style_query="clinical dnb",
        alias_map=alias_map,
        top_style_tokens=6,
        top_excludes=4,
    )

    baseline = result["baseline"]
    assert result["selected_count"] == 2
    assert baseline["weirdness"] == 60
    assert baseline["style_influence"] == 30
    assert baseline["exclude_styles"][0] == "hardstyle"
    assert "clinical" in baseline["style_prompt"]
    assert "dnb" in baseline["style_prompt"] or "drum" in baseline["style_prompt"]
    assert [s["song_id"] for s in result["seed_songs"]] == ["s2", "s1"]
