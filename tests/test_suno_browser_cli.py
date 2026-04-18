from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from ai_music.cli import app


def test_suno_fill_browser_cli_reads_fragments_and_reports_result(monkeypatch, tmp_path: Path) -> None:
    runner = CliRunner()
    fragments_path = tmp_path / "fragments.json"
    fragments_path.write_text(
        json.dumps(
            {
                "song_title": "Slipstream Voltage",
                "style_prompt": "club-ready electro breaks",
                "lyrics": "[Intro]\n(yeah)",
                "exclude_styles": ["xylophone"],
                "weirdness": 22,
                "style_influence": 82,
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(
        "ai_music.cli.fill_suno_create_form",
        lambda **kwargs: {
            "tab": {"title": "Suno Create", "url": "https://suno.com/create"},
            "filled_fields": ["lyrics", "styles", "title"],
            "missing_fields": [],
            "submit_clicked": kwargs["submit"],
            "debug_url": kwargs["debug_url"],
        },
    )

    result = runner.invoke(
        app,
        [
            "suno",
            "fill-browser",
            "--fragments",
            str(fragments_path),
            "--tab-query",
            "suno",
        ],
    )

    assert result.exit_code == 0
    payload = json.loads(result.stdout)
    assert payload["submit_clicked"] is False
    assert payload["debug_url"] == "http://127.0.0.1:9222"
