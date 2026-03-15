from ai_music.suno.adaptation import adapt_baseline_prompt


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
        assert task_name == "suno_adapt_baseline_prompt"
        assert "private jet" in inputs["theme"]
        return {
            "song_title": "Jetstream Protocol",
            "style_prompt": "clinical dnb with sterile reese bass and executive jet imagery",
            "exclude_styles": ["trance"],
            "lyrics": "[Verse]\nSkylines under a private wing",
            "weirdness": 99,
            "style_influence": 2,
            "rationale": "theme adapted",
        }


def test_adapt_baseline_prompt_preserves_core_controls_by_default() -> None:
    baseline = {
        "style_prompt": "clinical dnb, precise drums, dry transient snap",
        "exclude_styles": ["hardstyle", "dubstep"],
        "weirdness": 22,
        "style_influence": 71,
    }
    result = adapt_baseline_prompt(
        baseline=baseline,
        theme="flying by a private jet",
        llm_client=_FakeLLM(),
        model="test-model",
        preserve_controls=True,
    )

    assert result.song_title == "Jetstream Protocol"
    assert "private" in result.style_prompt.lower() or "jet" in result.style_prompt.lower()
    assert result.weirdness == 22
    assert result.style_influence == 71
    assert result.exclude_styles == ["hardstyle", "dubstep"]
    assert result.rationale == "theme adapted"
