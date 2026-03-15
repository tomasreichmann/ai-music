import json
from pathlib import Path

from typer.testing import CliRunner

from ai_music.cli import app
from ai_music.config import AppConfig, ProviderConfig


class _FakeOpenRouterClient:
    provider_name = "openrouter"

    def __init__(self, api_key: str, **kwargs):
        _ = kwargs
        self.api_key = api_key

    def generate(self, system: str, user: str, model: str | None = None, **kwargs):  # pragma: no cover
        raise NotImplementedError

    def generate_structured(
        self,
        task_name: str,
        inputs: dict,
        schema: dict,
        model: str | None = None,
        max_attempts: int = 2,
    ) -> dict:
        _ = (task_name, inputs, schema, model, max_attempts)
        return {
            "song_title": "Private Altitude",
            "style_prompt": "clinical dnb for private jet ascent",
            "exclude_styles": ["trance"],
            "lyrics": "[Verse]\nCabin glass and city sparks",
            "weirdness": 99,
            "style_influence": 10,
            "rationale": "adapted",
        }


def _cfg(root: Path) -> AppConfig:
    providers = ProviderConfig(
        openrouter_api_key="test-openrouter-key",
        fal_api_key=None,
        suno_api_key="test-suno-key",
        leonardo_api_key=None,
        gemini_api_key=None,
        lastfm_api_key=None,
        acoustid_api_key=None,
        musicbrainz_user_agent="ai-music-test/0.1.0",
        ollama_base_url="http://localhost:11434",
        ffmpeg_path=None,
        uvr_executable_path=None,
        uvr_workflow_path=None,
    )
    cfg = AppConfig(
        root_dir=root,
        docs_dir=root / "docs",
        playlists_dir=root / "playlists",
        media_dir=root / "media",
        data_dir=root / "data",
        cache_dir=root / "cache",
        outputs_dir=root / "outputs",
        providers=providers,
    )
    cfg.ensure_runtime_dirs()
    return cfg


def test_suno_cli_fetch_analyze_and_mine(monkeypatch, tmp_path: Path) -> None:
    runner = CliRunner()
    cfg = _cfg(tmp_path)
    fixture = str(Path("tests/fixtures/suno/api_created_page_01.synthetic.json").resolve())
    mapping = str(Path("configs/suno_api_mapping.template.json").resolve())
    aliases = str(Path("configs/suno_style_aliases.json").resolve())

    monkeypatch.setattr("ai_music.cli._cfg", lambda: cfg)
    monkeypatch.setattr(
        "ai_music.workflows.suno_song_analysis.OpenRouterClient",
        _FakeOpenRouterClient,
    )

    fetched = runner.invoke(
        app,
        [
            "suno",
            "fetch",
            "--mapping-config",
            mapping,
            "--fixture-page",
            fixture,
        ],
    )
    assert fetched.exit_code == 0
    fetched_payload = json.loads(fetched.stdout)
    assert fetched_payload["fetched_song_count"] == 3

    analyzed = runner.invoke(
        app,
        [
            "suno",
            "analyze",
            "--style-query",
            "clinical dnb",
            "--aliases-config",
            aliases,
        ],
    )
    assert analyzed.exit_code == 0
    analyzed_payload = json.loads(analyzed.stdout)
    assert analyzed_payload["selected_count"] == 1

    mined = runner.invoke(
        app,
        [
            "suno",
            "mine",
            "--mapping-config",
            mapping,
            "--aliases-config",
            aliases,
            "--style-query",
            "clinical dnb",
            "--theme",
            "flying by a private jet",
            "--fixture-page",
            fixture,
        ],
    )
    assert mined.exit_code == 0
    mined_payload = json.loads(mined.stdout)
    assert mined_payload["adapt"]["song_title"] == "Private Altitude"
