# Suno Browser Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe Chrome-remote-debugging workflow that fills an open Suno Create tab from repo-generated Suno fragments JSON.

**Architecture:** Keep the browser automation in a dedicated workflow module under `src/ai_music/workflows/` and expose it through a thin Typer CLI command under `suno`. Add a repo-local skill that teaches Codex how to launch or reuse a debug-enabled Chrome session and call the CLI without submitting unless explicitly asked.

**Tech Stack:** Python, Typer, httpx, websocket-client, pytest

---

### Task 1: Lock in workflow behavior with tests

**Files:**
- Create: `tests/test_suno_browser_fill.py`
- Create: `tests/test_suno_browser_cli.py`

- [ ] **Step 1: Write the failing workflow tests**

```python
def test_choose_debug_tab_prefers_best_query_match() -> None:
    ...

def test_fill_suno_create_form_uses_matching_tab_and_keeps_submit_disabled_by_default() -> None:
    ...
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `python -m pytest -q tests/test_suno_browser_fill.py tests/test_suno_browser_cli.py`
Expected: FAIL because `ai_music.workflows.suno_browser_fill` and the new CLI surface do not exist yet.

- [ ] **Step 3: Add the minimal CLI-facing behavior test**

```python
def test_suno_fill_browser_cli_reads_fragments_and_reports_result(...) -> None:
    ...
```

- [ ] **Step 4: Re-run the same targeted tests**

Run: `python -m pytest -q tests/test_suno_browser_fill.py tests/test_suno_browser_cli.py`
Expected: FAIL for missing implementation, not because the test setup is broken.

### Task 2: Implement the Suno browser-fill workflow

**Files:**
- Create: `src/ai_music/workflows/suno_browser_fill.py`
- Modify: `pyproject.toml`

- [ ] **Step 1: Add the runtime dependency**

```toml
"websocket-client>=1.8.0",
```

- [ ] **Step 2: Implement Chrome tab discovery and selection**

```python
@dataclass(slots=True)
class ChromeDebugTab:
    id: str
    title: str
    url: str
    websocket_debugger_url: str
```

- [ ] **Step 3: Implement the CDP fill workflow**

```python
def fill_suno_create_form(
    *,
    fragments: SunoFragments,
    debug_url: str = "http://127.0.0.1:9222",
    tab_query: str | None = "suno",
    submit: bool = False,
    ...
) -> dict[str, Any]:
    ...
```

- [ ] **Step 4: Re-run the new tests**

Run: `python -m pytest -q tests/test_suno_browser_fill.py tests/test_suno_browser_cli.py`
Expected: PASS for the new workflow tests.

### Task 3: Expose the workflow through the CLI

**Files:**
- Modify: `src/ai_music/cli.py`

- [ ] **Step 1: Add the new import and Typer command**

```python
from ai_music.workflows.suno_browser_fill import fill_suno_create_form
```

- [ ] **Step 2: Validate fragments JSON and write a report**

```python
payload = read_json(fragments)
suno_fragments = SunoFragments.model_validate(payload)
result = fill_suno_create_form(...)
write_json(cfg.outputs_dir / "reports" / "suno_browser_fill_report.json", result)
```

- [ ] **Step 3: Re-run the targeted tests**

Run: `python -m pytest -q tests/test_suno_browser_fill.py tests/test_suno_browser_cli.py`
Expected: PASS with the CLI command included.

### Task 4: Add a reusable repo-local skill

**Files:**
- Create: `skills/suno-browser-fill/SKILL.md`
- Create: `skills/suno-browser-fill/agents/openai.yaml`
- Create: `skills/suno-browser-fill/references/troubleshooting.md`

- [ ] **Step 1: Write the skill metadata and core workflow**

```md
---
name: suno-browser-fill
description: Fill an already-open Suno Create tab through Chrome remote debugging...
---
```

- [ ] **Step 2: Add operator-facing troubleshooting notes**

```md
## Common failure modes
- Chrome was not launched with `--remote-debugging-port=9222`
- The tab query matched the wrong page
```

- [ ] **Step 3: Validate the skill folder shape**

Run: `python scripts/quick_validate.py skills/suno-browser-fill`
Expected: PASS if the helper tooling is available; otherwise, confirm the folder shape manually.
