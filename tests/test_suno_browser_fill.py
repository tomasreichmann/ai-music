from __future__ import annotations

import json

import pytest

from ai_music.models.schemas import SunoFragments
from ai_music.workflows.suno_browser_fill import (
    ChromeDebugTab,
    _build_fill_expression,
    choose_debug_tab,
    fill_suno_create_form,
)


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._payload


class _FakeWebSocket:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self.sent_messages: list[dict] = []
        self.closed = False

    def send(self, payload: str) -> None:
        self.sent_messages.append(json.loads(payload))

    def recv(self) -> str:
        if not self._responses:
            raise AssertionError("No fake websocket responses left.")
        return json.dumps(self._responses.pop(0))

    def close(self) -> None:
        self.closed = True


def test_choose_debug_tab_prefers_best_query_match() -> None:
    tabs = [
        ChromeDebugTab(
            id="1",
            title="OpenAI",
            url="https://chatgpt.com/",
            websocket_debugger_url="ws://debug/tab-1",
        ),
        ChromeDebugTab(
            id="2",
            title="Suno Create",
            url="https://suno.com/create",
            websocket_debugger_url="ws://debug/tab-2",
        ),
    ]

    selected = choose_debug_tab(tabs, query="suno")

    assert selected.id == "2"


def test_choose_debug_tab_raises_when_query_matches_nothing() -> None:
    tabs = [
        ChromeDebugTab(
            id="1",
            title="OpenAI",
            url="https://chatgpt.com/",
            websocket_debugger_url="ws://debug/tab-1",
        )
    ]

    with pytest.raises(ValueError, match="No Chrome tab matched"):
        choose_debug_tab(tabs, query="suno")


def test_fill_suno_create_form_uses_matching_tab_and_keeps_submit_disabled_by_default() -> None:
    called_urls: list[str] = []
    fake_ws = _FakeWebSocket(
        [
            {"id": 1, "result": {}},
            {
                "id": 2,
                "result": {
                    "result": {
                        "type": "object",
                        "value": {
                            "filled_fields": ["lyrics", "styles", "title"],
                            "missing_fields": [],
                            "observed_fields": {
                                "lyrics": "[Intro]\\n(yeah)",
                                "styles": "club-ready electro breaks",
                                "title": "Slipstream Voltage",
                            },
                            "mismatched_fields": [],
                            "submit_clicked": False,
                        },
                    }
                },
            },
        ]
    )

    def fake_http_get(url: str, timeout: float) -> _FakeResponse:
        _ = timeout
        called_urls.append(url)
        return _FakeResponse(
            [
                {
                    "id": "tab-1",
                    "type": "page",
                    "title": "Suno Create",
                    "url": "https://suno.com/create",
                    "webSocketDebuggerUrl": "ws://debug/tab-1",
                }
            ]
        )

    fragments = SunoFragments(
        song_title="Slipstream Voltage",
        style_prompt="club-ready electro breaks",
        lyrics="[Intro]\n(yeah)",
        exclude_styles=["xylophone"],
        weirdness=22,
        style_influence=82,
    )

    result = fill_suno_create_form(
        fragments=fragments,
        debug_url="http://127.0.0.1:9222",
        tab_query="suno",
        submit=False,
        http_get=fake_http_get,
        websocket_factory=lambda url, timeout: fake_ws,
    )

    assert called_urls == ["http://127.0.0.1:9222/json"]
    assert result["tab"]["url"] == "https://suno.com/create"
    assert result["submit_clicked"] is False
    assert fake_ws.closed is True
    methods = [message["method"] for message in fake_ws.sent_messages]
    assert methods == ["Runtime.enable", "Runtime.evaluate"]


def test_build_fill_expression_prefers_visible_styles_field() -> None:
    fragments = SunoFragments(
        song_title="Slipstream Voltage",
        style_prompt="club-ready electro breaks",
        lyrics="[Intro]\n(yeah)",
        exclude_styles=["xylophone"],
        weirdness=22,
        style_influence=82,
    )

    expression = _build_fill_expression(fragments, submit=False)

    assert "getComputedStyle" in expression
    assert "textarea[maxlength=\"1000\"]" in expression
    assert expression.index('textarea[maxlength="1000"]') < expression.index('textarea[placeholder*="Describe the sound you want"]')
    assert "compareObservedFields" in expression
    assert "mismatched_fields" in expression
    assert "runFillPass" in expression
    assert "if (mismatchedFields.length)" in expression
    assert "setTimeout(resolve, 250)" in expression
