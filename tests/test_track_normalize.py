from ai_music.models.types import RawPlaylistRow
from ai_music.normalize.tracks import dedupe_normalized_rows, normalize_rows, parse_track_string


def test_parse_track_string_extracts_artists_and_title() -> None:
    parsed = parse_track_string("Ben Böhmer · Jan Blomqvist - Decade")
    assert parsed["parsed_title"] == "Decade"
    assert "Ben Böhmer" in parsed["parsed_artists"]
    assert "Jan Blomqvist" in parsed["parsed_artists"]


def test_dedupe_normalized_rows_merges_exact_keys() -> None:
    rows = [
        RawPlaylistRow("a.csv", 1, "Artist - Song", None, None, "P1", "Playlist", None),
        RawPlaylistRow("b.csv", 1, "Artist - Song", None, None, "P2", "Playlist", None),
    ]
    normalized = normalize_rows(rows)
    canonical, alias_map = dedupe_normalized_rows(normalized)
    assert len(canonical) == 1
    assert len(alias_map) == 2
