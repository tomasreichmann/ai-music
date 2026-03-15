import json
from pathlib import Path

import pytest

from ai_music.suno.mapping import (
    extract_path,
    load_mapping_config,
    normalize_page_payload,
    parse_bool_flag,
)


def test_extract_path_reads_nested_values() -> None:
    payload = {"a": {"b": [{"c": 1}, {"c": 2}]}}
    assert extract_path(payload, "a.b.1.c") == 2


def test_extract_path_raises_for_missing_segments() -> None:
    payload = {"a": {"b": [1, 2, 3]}}
    with pytest.raises(ValueError):
        extract_path(payload, "a.x")


def test_parse_bool_flag_handles_common_variants() -> None:
    assert parse_bool_flag("YES") is True
    assert parse_bool_flag("0") is False
    assert parse_bool_flag(None) is None


def test_normalize_page_payload_extracts_songs_and_next_cursor() -> None:
    fixture_path = Path("tests/fixtures/suno/api_created_page_01.synthetic.json")
    payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    mapping = load_mapping_config(Path("configs/suno_api_mapping.template.json"))
    songs, next_cursor = normalize_page_payload(payload, mapping)

    assert len(songs) == 3
    assert songs[0].song_id == "song-001"
    assert songs[0].likes == 12
    assert songs[0].is_cover is False
    assert songs[0].is_uploaded is False
    assert songs[0].exclude_styles == ["hardstyle", "dubstep"]
    assert songs[0].style_influence == 70
    assert songs[0].weirdness == 25
    assert next_cursor == "cursor-page-2"
