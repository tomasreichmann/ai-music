from pathlib import Path

from ai_music.config import AppConfig, ProviderConfig
from ai_music.io.files import read_json
from ai_music.workflows.suno_song_analysis import (
    analyze_suno_created_songs,
    fetch_suno_created_songs,
    mine_suno_prompt_pack,
)


class _FakeLLM:
    provider_name = "fake"

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
        return {
            "song_title": "Jet Protocol",
            "style_prompt": "clinical dnb for private jet ascent",
            "exclude_styles": ["trance"],
            "lyrics": "[Verse]\nGlass runway and turbine choir",
            "weirdness": 88,
            "style_influence": 3,
            "rationale": "theme remap",
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


def test_fetch_analyze_and_mine_pipeline_with_fixture_page(tmp_path: Path) -> None:
    cfg = _cfg(tmp_path)
    mapping_path = Path("configs/suno_api_mapping.template.json")
    alias_path = Path("configs/suno_style_aliases.json")
    fixture_page = Path("tests/fixtures/suno/api_created_page_01.synthetic.json")

    fetch_result = fetch_suno_created_songs(
        cfg=cfg,
        mapping_config_path=mapping_path,
        window_size=500,
        fixture_pages=[fixture_page],
    )
    assert fetch_result["fetched_song_count"] == 3

    analyze_result = analyze_suno_created_songs(
        cfg=cfg,
        style_query="clinical dnb",
        aliases_config_path=alias_path,
    )
    assert analyze_result["selected_count"] == 1

    mine_result = mine_suno_prompt_pack(
        cfg=cfg,
        mapping_config_path=mapping_path,
        aliases_config_path=alias_path,
        style_query="clinical dnb",
        theme="flying by a private jet",
        fixture_pages=[fixture_page],
        llm_client=_FakeLLM(),
        model="fake-model",
    )
    adapted = read_json(cfg.root_dir / mine_result["adapt"]["json_path"])
    assert adapted["song_title"] == "Jet Protocol"
    assert adapted["weirdness"] == 25
    assert adapted["style_influence"] == 70
