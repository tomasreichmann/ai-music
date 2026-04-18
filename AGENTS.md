# Repository Guidelines

This `AGENTS.md` applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## Project Shape

- This is a Python-first CLI project packaged from `src/ai_music`.
- The main entrypoint is [`src/ai_music/cli.py`](src/ai_music/cli.py); keep CLI commands thin and push business logic into domain modules or `src/ai_music/workflows/`.
- Top-level docs intended for ingestion live directly in `docs/*.md`. The docs indexing workflow currently scans only top-level markdown files, not nested `docs/reference/**`.
- Source playlist inputs live in `playlists/*.csv`.
- Repo-local skills live under `skills/` and may include `SKILL.md`, `references/`, `agents/`, and helper scripts.

## Environment And Tooling

- Follow the README's Windows-first workflow and prefer PowerShell-friendly commands/examples.
- Prefer `py -3.12` on Windows when it is available. If the launcher is unavailable, use another Python 3.11+ interpreter explicitly rather than assuming `python` is configured correctly.
- Install the package in editable mode for local work: `pip install -e .`
- Primary quality tools are:
  - `pytest`
  - `ruff`
  - `mypy`

## Code Conventions

- Match the existing style:
  - `from __future__ import annotations` in Python modules
  - `pathlib.Path` over string paths
  - typed built-ins like `list[str]`, `dict[str, Any]`
  - dataclasses with `slots=True` for lightweight models
  - Pydantic models in `src/ai_music/models/schemas.py` for structured validation
- Prefer small, composable functions and straightforward modules over deep abstraction.
- Reuse shared helpers before adding new utility code:
  - file/JSON/text helpers in `src/ai_music/io/files.py`
  - runtime path/config resolution in `src/ai_music/config.py`
- Keep external API specifics configurable instead of hard-coding them. The Suno workflow is the reference pattern:
  - mapping/config lives under `configs/`
  - live API calls are separated from payload normalization
  - fixture/offline mode remains possible
- Preserve the current separation of concerns:
  - `cli.py` parses options and prints results
  - `workflows/` orchestrates multi-step flows
  - domain packages (`suno/`, `normalize/`, `media/`, `prompting/`, `analyze/`, `stems/`, `enrich/`) hold reusable logic

## Testing Expectations

- Add or update `pytest` coverage for behavior changes.
- Prefer deterministic, offline tests:
  - use `tmp_path`, `monkeypatch`, and `typer.testing.CliRunner`
  - use fixtures under `tests/fixtures/`
  - fake or stub LLM/API clients instead of making network calls
- For Suno and provider-related work, keep fixture-driven smoke paths working where possible.
- When changing CLI behavior, add or update CLI-level tests in addition to lower-level unit coverage when that improves confidence.

## Data, Outputs, And Secrets

- Treat these as local/generated unless the task explicitly says otherwise:
  - `data/`
  - `cache/`
  - `outputs/`
  - `media/`
  - `image-covers/`
  - `tools/`
  - `.tools/`
- Do not commit secrets or private credentials. Use `.env.local` / `.env` locally and keep committed config files as examples/templates.
- Keep example/template assets generic:
  - `configs/*.example.toml`
  - `configs/suno_api_mapping.template.json`
  - `.env.example`
- Do not replace placeholder/example values with real user secrets or private production payloads unless explicitly asked.

## Change Discipline

- Make the smallest coherent change that solves the task.
- Avoid broad refactors unless the task requires them.
- Do not rewrite unrelated files just for style consistency.
- If asked to commit, follow the repo's existing conventional-commit style, e.g. `feat: ...`, `fix: ...`.

## Practical Verification

- Preferred verification commands, when the environment supports them:
  - `py -3.12 -m pytest -q`
  - `py -3.12 -m ruff check .`
  - `py -3.12 -m mypy src`
- If `py` is unavailable, run the equivalent commands with the active Python 3.11+ interpreter and report exactly what you could or could not verify.
