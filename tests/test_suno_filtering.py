from ai_music.suno.analysis import filter_high_signal_originals
from ai_music.suno.schemas import SunoSongRecord


def _song(
    song_id: str,
    likes: int,
    *,
    is_cover: bool | None = False,
    is_remaster: bool | None = False,
    is_sample_derived: bool | None = False,
    depends_on_existing: bool | None = False,
    is_uploaded: bool | None = False,
) -> SunoSongRecord:
    return SunoSongRecord(
        song_id=song_id,
        title=f"Title {song_id}",
        created_at="2026-03-01T00:00:00Z",
        likes=likes,
        is_cover=is_cover,
        is_remaster=is_remaster,
        is_sample_derived=is_sample_derived,
        depends_on_existing=depends_on_existing,
        is_uploaded=is_uploaded,
        style_prompt="clinical dnb",
        exclude_styles=["hardstyle"],
        weirdness=20,
        style_influence=70,
        lyrics="",
        source_payload={},
    )


def test_filter_accepts_high_signal_original_song() -> None:
    songs = [_song("s1", likes=1)]
    accepted, report = filter_high_signal_originals(songs)
    assert [s.song_id for s in accepted] == ["s1"]
    assert report["accepted_count"] == 1
    assert report["rejected_count"] == 0


def test_filter_rejects_dependency_flags_and_missing_flags() -> None:
    songs = [
        _song("cover", likes=5, is_cover=True),
        _song("uploaded", likes=4, is_uploaded=True),
        _song("remaster", likes=10, is_remaster=True),
        _song("sample", likes=3, is_sample_derived=True),
        _song("dependent", likes=8, depends_on_existing=True),
        _song("unknown", likes=9, is_cover=None),
    ]
    accepted, report = filter_high_signal_originals(songs)
    assert accepted == []
    assert report["rejected_count"] == 6
    assert report["rejection_reasons"]["is_cover_true"] == 1
    assert report["rejection_reasons"]["is_uploaded_true"] == 1
    assert report["rejection_reasons"]["is_remaster_true"] == 1
    assert report["rejection_reasons"]["is_sample_derived_true"] == 1
    assert report["rejection_reasons"]["depends_on_existing_true"] == 1
    assert report["rejection_reasons"]["missing_dependency_flags"] == 1


def test_filter_rejects_low_like_songs() -> None:
    songs = [_song("low", likes=0)]
    accepted, report = filter_high_signal_originals(songs)
    assert accepted == []
    assert report["rejection_reasons"]["likes_below_threshold"] == 1
