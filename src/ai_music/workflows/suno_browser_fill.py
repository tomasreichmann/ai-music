from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Protocol

import httpx

from ai_music.models.schemas import SunoFragments


class HttpResponse(Protocol):
    def raise_for_status(self) -> None: ...

    def json(self) -> Any: ...


class WebSocketConnection(Protocol):
    def send(self, payload: str) -> None: ...

    def recv(self) -> str: ...

    def close(self) -> None: ...


HttpGet = Callable[[str, float], HttpResponse]
WebSocketFactory = Callable[[str, float], WebSocketConnection]


@dataclass(slots=True)
class ChromeDebugTab:
    id: str
    title: str
    url: str
    websocket_debugger_url: str


def _default_http_get(url: str, timeout: float) -> HttpResponse:
    return httpx.get(url, timeout=timeout)


def _default_websocket_factory(url: str, timeout: float) -> WebSocketConnection:
    try:
        import websocket
    except ImportError as exc:  # pragma: no cover - dependency error path
        raise RuntimeError(
            "Missing `websocket-client`. Reinstall the project so `suno fill-browser` can talk to Chrome."
        ) from exc
    return websocket.create_connection(url, timeout=timeout)


def list_debug_tabs(
    debug_url: str,
    *,
    http_get: HttpGet = _default_http_get,
) -> list[ChromeDebugTab]:
    endpoint = debug_url.rstrip("/")
    if not endpoint.endswith("/json"):
        endpoint = f"{endpoint}/json"
    response = http_get(endpoint, timeout=5.0)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list):
        raise ValueError(f"Chrome debug endpoint `{endpoint}` returned an unexpected payload.")

    tabs: list[ChromeDebugTab] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        if row.get("type") != "page":
            continue
        websocket_url = str(row.get("webSocketDebuggerUrl") or "").strip()
        if not websocket_url:
            continue
        tabs.append(
            ChromeDebugTab(
                id=str(row.get("id") or ""),
                title=str(row.get("title") or ""),
                url=str(row.get("url") or ""),
                websocket_debugger_url=websocket_url,
            )
        )
    if not tabs:
        raise ValueError(
            "No debuggable Chrome pages were found. Open the Suno tab in the Chrome instance started with remote debugging."
        )
    return tabs


def choose_debug_tab(tabs: list[ChromeDebugTab], query: str | None = None) -> ChromeDebugTab:
    if not tabs:
        raise ValueError("No Chrome tabs are available to select from.")

    normalized_query = (query or "").strip().lower()
    if normalized_query:
        scored_tabs: list[tuple[int, ChromeDebugTab]] = []
        for tab in tabs:
            haystacks = [tab.title.lower(), tab.url.lower()]
            score = 0
            if any(item == normalized_query for item in haystacks):
                score += 10
            if normalized_query in tab.url.lower():
                score += 6
            if normalized_query in tab.title.lower():
                score += 4
            if score:
                scored_tabs.append((score, tab))
        if not scored_tabs:
            raise ValueError(f"No Chrome tab matched query `{query}`.")
        scored_tabs.sort(key=lambda item: (item[0], len(item[1].url), len(item[1].title)), reverse=True)
        return scored_tabs[0][1]

    for tab in tabs:
        if "suno.com" in tab.url.lower():
            return tab
    if len(tabs) == 1:
        return tabs[0]
    raise ValueError("Multiple Chrome tabs are available. Pass `--tab-query` to choose the right one.")


def _build_fill_expression(fragments: SunoFragments, *, submit: bool) -> str:
    payload = {
        "sample_prompt": fragments.sample_prompt,
        "lyrics": fragments.lyrics,
        "styles": fragments.style_prompt,
        "exclude_styles": ", ".join(fragments.exclude_styles),
        "title": fragments.song_title,
        "weirdness": fragments.weirdness,
        "style_influence": fragments.style_influence,
        "audio_influence": fragments.audio_influence,
        "target_fields": [],
        "submit": submit,
    }
    payload_json = json.dumps(payload, ensure_ascii=False)
    return f"""
(async () => {{
  const payload = {payload_json};
  const report = {{
    filled_fields: [],
    missing_fields: [],
    submit_clicked: false,
  }};

  const normalize = (value) => String(value || "").toLowerCase().replace(/\\s+/g, " ").trim();
  const addReport = (bucket, field) => {{
    if (!report[bucket].includes(field)) {{
      report[bucket].push(field);
    }}
  }};

  const textCandidates = () => Array.from(
    document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"], [role="textbox"]')
  ).filter((el) => !el.disabled);

  const sliderCandidates = () => Array.from(
    document.querySelectorAll('input[type="range"], [role="slider"]')
  ).filter((el) => !el.disabled);

  const describeNode = (el) => {{
    const snippets = new Set();
    const push = (value) => {{
      const text = normalize(value);
      if (text) {{
        snippets.add(text);
      }}
    }};
    push(el.getAttribute && el.getAttribute("aria-label"));
    push(el.getAttribute && el.getAttribute("placeholder"));
    push(el.getAttribute && el.getAttribute("name"));
    push(el.id);
    if (el.id) {{
      const label = document.querySelector(`label[for="${{el.id}}"]`);
      if (label) {{
        push(label.textContent);
      }}
    }}
    let current = el.parentElement;
    for (let depth = 0; depth < 3 && current; depth += 1, current = current.parentElement) {{
      push(current.getAttribute && current.getAttribute("aria-label"));
      push((current.textContent || "").slice(0, 400));
    }}
    return Array.from(snippets);
  }};

  const pickBest = (candidates, terms) => {{
    let best = null;
    const normalizedTerms = terms.map((term) => normalize(term)).filter(Boolean);
    for (const el of candidates) {{
      const descriptors = describeNode(el);
      let score = 0;
      for (const descriptor of descriptors) {{
        for (const term of normalizedTerms) {{
          if (!term) continue;
          if (descriptor === term) {{
            score += 10;
          }} else if (descriptor.includes(term)) {{
            score += 4;
          }}
        }}
      }}
      if (!best || score > best.score) {{
        best = {{ el, score }};
      }}
    }}
    return best && best.score > 0 ? best.el : null;
  }};

  const dispatchCommonEvents = (el) => {{
    el.dispatchEvent(new Event("input", {{ bubbles: true }}));
    el.dispatchEvent(new Event("change", {{ bubbles: true }}));
    el.dispatchEvent(new Event("blur", {{ bubbles: true }}));
  }};

  const isVisible = (el) => {{
    if (!el) {{
      return false;
    }}
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }};

  const setTextValue = (el, value) => {{
    const text = String(value || "");
    if (el.hasAttribute && el.hasAttribute("contenteditable")) {{
      el.focus();
      el.textContent = text;
      dispatchCommonEvents(el);
      return;
    }}
    if ("value" in el) {{
      el.focus();
      el.value = text;
      dispatchCommonEvents(el);
      return;
    }}
    el.textContent = text;
    dispatchCommonEvents(el);
  }};

  const selectField = (selectors, fallbackTerms) => {{
    let hiddenMatch = null;
    for (const selector of selectors) {{
      const el = document.querySelector(selector);
      if (el) {{
        if (isVisible(el)) {{
          return el;
        }}
        if (!hiddenMatch) {{
          hiddenMatch = el;
        }}
      }}
    }}
    return pickBest(textCandidates().filter(isVisible), fallbackTerms) || hiddenMatch;
  }};

  const fillTextField = (fieldName, selectors, terms, value) => {{
    if (value === null || value === undefined || value === "") {{
      return;
    }}
    const el = selectField(selectors, terms);
    if (!el) {{
      addReport("missing_fields", fieldName);
      return;
    }}
    setTextValue(el, value);
    addReport("filled_fields", fieldName);
  }};

  const setSliderValue = async (fieldName, terms, value) => {{
    if (value === null || value === undefined) {{
      return;
    }}
    const el = pickBest(sliderCandidates(), terms);
    if (!el) {{
      addReport("missing_fields", fieldName);
      return;
    }}
    const stringValue = String(value);
    const container = el.parentElement || el;
    const valueNode = Array.from(container.children).find((child) =>
      child.tagName === "DIV" && !child.getAttribute("role") && /%$/.test((child.textContent || "").trim())
    );
    if (valueNode) {{
      valueNode.dispatchEvent(new MouseEvent("dblclick", {{ bubbles: true, cancelable: true, view: window }}));
    }}
    await new Promise((resolve) => setTimeout(resolve, 0));
    const percentInput = container.querySelector('input[type="text"]');
    if (percentInput) {{
      percentInput.focus();
      if ("value" in percentInput) {{
        percentInput.value = stringValue;
      }}
      percentInput.setSelectionRange?.(0, stringValue.length);
      dispatchCommonEvents(percentInput);
      percentInput.dispatchEvent(new KeyboardEvent("keydown", {{ key: "Enter", bubbles: true, cancelable: true }}));
      percentInput.dispatchEvent(new KeyboardEvent("keyup", {{ key: "Enter", bubbles: true, cancelable: true }}));
    }} else {{
      el.focus && el.focus();
      if ("value" in el) {{
        el.value = stringValue;
      }}
      if (el.setAttribute) {{
        el.setAttribute("aria-valuenow", stringValue);
        el.setAttribute("aria-valuetext", stringValue);
      }}
      dispatchCommonEvents(el);
    }}
    addReport("filled_fields", fieldName);
  }};

  const targetFields = new Set((payload.target_fields || []).map((field) => normalize(field)));
  const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";
  const shouldFill = (fieldName) => targetFields.size === 0 || targetFields.has(fieldName);
  const getVisibleField = (selectors) => {{
    for (const selector of selectors) {{
      const el = Array.from(document.querySelectorAll(selector)).find(isVisible);
      if (el) {{
        return el;
      }}
    }}
    return null;
  }};
  const readTextField = (selectors) => {{
    const el = getVisibleField(selectors);
    if (!el) {{
      return "";
    }}
    if ("value" in el) {{
      return String(el.value || "");
    }}
    return String(el.textContent || "");
  }};
  const readSliderValue = (label) => {{
    const el = document.querySelector('[aria-label="' + label + '"]');
    return el ? String(el.getAttribute("aria-valuenow") || "") : "";
  }};
  const expectedFields = {{
    sample_prompt: payload.sample_prompt,
    lyrics: payload.lyrics,
    styles: payload.styles,
    exclude_styles: payload.exclude_styles,
    title: payload.title,
    weirdness: payload.weirdness === null || payload.weirdness === undefined ? null : String(payload.weirdness),
    style_influence: payload.style_influence === null || payload.style_influence === undefined ? null : String(payload.style_influence),
    audio_influence: payload.audio_influence === null || payload.audio_influence === undefined ? null : String(payload.audio_influence),
  }};
  const readObservedFields = () => ({{
    sample_prompt: readTextField(['textarea[placeholder*="Grand 2-step song"]', 'textarea[placeholder*="sample prompt"]']),
    lyrics: readTextField(['textarea[data-testid="lyrics-textarea"]', 'textarea[placeholder*="Write some lyrics"]']),
    styles: readTextField(['textarea[maxlength="1000"]', 'textarea[placeholder*="garage rock revival"]', 'textarea[placeholder*="Describe the sound you want"]']),
    exclude_styles: readTextField(['input[placeholder*="low fidelity artifacts"]', 'input[placeholder*="muddy low end"]', 'input[placeholder="Exclude styles"]', 'textarea[placeholder*="xylophone"]']),
    title: readTextField(['input[placeholder*="Song Title (Optional)"]', 'input[placeholder*="title"]', 'input[aria-label*="title"]']),
    weirdness: readSliderValue("Weirdness"),
    style_influence: readSliderValue("Style Influence"),
    audio_influence: readSliderValue("Audio Influence"),
  }});
  const compareObservedFields = (observedFields) => {{
    const mismatches = [];
    for (const [fieldName, expected] of Object.entries(expectedFields)) {{
      if (!hasValue(expected)) {{
        continue;
      }}
      const observed = observedFields[fieldName];
      if (String(observed || "").trim() !== String(expected).trim()) {{
        mismatches.push(fieldName);
      }}
    }}
    return mismatches;
  }};
  const fieldActions = {{
    sample_prompt: () => fillTextField(
      "sample_prompt",
      ['textarea[placeholder*="Grand 2-step song"]', 'textarea[placeholder*="sample prompt"]'],
      ["sample prompt", "sample"],
      payload.sample_prompt
    ),
    lyrics: () => fillTextField(
      "lyrics",
      ['textarea[data-testid="lyrics-textarea"]', 'textarea[placeholder*="Write some lyrics"]'],
      ["lyrics"],
      payload.lyrics
    ),
    styles: () => fillTextField(
      "styles",
      ['textarea[maxlength="1000"]', 'textarea[placeholder*="garage rock revival"]', 'textarea[placeholder*="Describe the sound you want"]'],
      ["styles", "style"],
      payload.styles
    ),
    exclude_styles: () => fillTextField(
      "exclude_styles",
      ['input[placeholder*="low fidelity artifacts"]', 'input[placeholder*="muddy low end"]', 'input[placeholder="Exclude styles"]', 'textarea[placeholder*="xylophone"]'],
      ["exclude styles", "exclude style"],
      payload.exclude_styles
    ),
    title: () => fillTextField("title", ['input[placeholder*="Song Title (Optional)"]', 'input[placeholder*="title"]', 'input[aria-label*="title"]'], ["title", "song title"], payload.title),
    weirdness: () => setSliderValue("weirdness", ["weirdness"], payload.weirdness),
    style_influence: () => setSliderValue("style_influence", ["style influence"], payload.style_influence),
    audio_influence: () => setSliderValue("audio_influence", ["audio influence"], payload.audio_influence),
  }};
  const fillOrder = ["sample_prompt", "lyrics", "styles", "exclude_styles", "title", "weirdness", "style_influence", "audio_influence"];
  const runFillPass = async (fieldNames) => {{
    for (const fieldName of fieldNames) {{
      const action = fieldActions[fieldName];
      if (action) {{
        await action();
      }}
    }}
  }};

  await runFillPass(fillOrder.filter((fieldName) => shouldFill(fieldName) && hasValue(expectedFields[fieldName])));
  let observedFields = readObservedFields();
  let mismatchedFields = compareObservedFields(observedFields);
  if (mismatchedFields.length) {{
    await runFillPass(mismatchedFields);
    observedFields = readObservedFields();
    mismatchedFields = compareObservedFields(observedFields);
  }}
  if (mismatchedFields.length === 0) {{
    await new Promise((resolve) => setTimeout(resolve, 250));
    observedFields = readObservedFields();
    mismatchedFields = compareObservedFields(observedFields);
    if (mismatchedFields.length) {{
      await runFillPass(mismatchedFields);
      observedFields = readObservedFields();
      mismatchedFields = compareObservedFields(observedFields);
    }}
  }}

  report.observed_fields = observedFields;
  report.mismatched_fields = mismatchedFields;

  if (payload.submit) {{
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const submitButton = buttons.find((button) => {{
      const text = normalize(button.textContent || button.getAttribute("aria-label"));
      return text.includes("generate") || text.includes("create");
    }});
    if (submitButton) {{
      submitButton.click();
      report.submit_clicked = true;
    }}
  }}

  return report;
}})();
""".strip()


def _cdp_call(
    websocket: WebSocketConnection,
    *,
    request_id: int,
    method: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    websocket.send(
        json.dumps(
            {
                "id": request_id,
                "method": method,
                "params": params or {},
            }
        )
    )
    while True:
        response = json.loads(websocket.recv())
        if response.get("id") != request_id:
            continue
        if "error" in response:
            message = ((response.get("error") or {}).get("message")) or "Unknown Chrome DevTools error."
            raise RuntimeError(f"{method} failed: {message}")
        result = response.get("result")
        if not isinstance(result, dict):
            raise RuntimeError(f"{method} returned an unexpected payload.")
        return result


def fill_suno_create_form(
    *,
    fragments: SunoFragments,
    debug_url: str = "http://127.0.0.1:9222",
    tab_query: str | None = "suno",
    submit: bool = False,
    http_get: HttpGet = _default_http_get,
    websocket_factory: WebSocketFactory = _default_websocket_factory,
) -> dict[str, Any]:
    tabs = list_debug_tabs(debug_url, http_get=http_get)
    tab = choose_debug_tab(tabs, query=tab_query)
    websocket = websocket_factory(tab.websocket_debugger_url, 10.0)
    try:
        _cdp_call(websocket, request_id=1, method="Runtime.enable")
        result = _cdp_call(
            websocket,
            request_id=2,
            method="Runtime.evaluate",
            params={
                "expression": _build_fill_expression(fragments, submit=submit),
                "awaitPromise": True,
                "returnByValue": True,
            },
        )
    finally:
        websocket.close()

    value = ((result.get("result") or {}).get("value")) if isinstance(result.get("result"), dict) else None
    if not isinstance(value, dict):
        raise RuntimeError("Chrome returned an unexpected Suno fill result payload.")

    return {
        "debug_url": debug_url,
        "tab": {
            "id": tab.id,
            "title": tab.title,
            "url": tab.url,
        },
        "filled_fields": list(value.get("filled_fields") or []),
        "missing_fields": list(value.get("missing_fields") or []),
        "observed_fields": dict(value.get("observed_fields") or {}),
        "mismatched_fields": list(value.get("mismatched_fields") or []),
        "submit_clicked": bool(value.get("submit_clicked")),
    }
