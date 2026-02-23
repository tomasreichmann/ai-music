# ai-music

Python-first CLI for:

- LLM-first prompt generation from markdown guides (`docs/`)
- Playlist ingestion, normalization, metadata enrichment, and profile/guide generation (`playlists/`)
- Local media indexing, playlist matching, and UVR-first stem splitting (`media/`)

## Status

Scaffold + functional MVP commands for docs/prompting, playlist analysis foundations, media indexing/matching, and UVR dry-run stem workflow.

## Windows Setup (recommended)

Use `py -3.12` explicitly because `python` may resolve to Python 2.7 on this machine.

1. Install `uv` (recommended)
   - `winget install --id=astral-sh.uv -e`
2. Install `ffmpeg`
   - `winget install --id=Gyan.FFmpeg -e`
3. Create env and install deps
   - `py -3.12 -m venv .venv`
   - `.venv\\Scripts\\Activate.ps1`
   - `py -3.12 -m pip install -U pip`
   - `py -3.12 -m pip install -e .`
4. Copy `.env.example` values into `.env.local` as needed (keys only, no secrets committed)

## Quick Start

### Environment checks

```powershell
py -3.12 -m ai_music.cli env doctor
```

### Phase 1: Docs -> prompts

```powershell
py -3.12 -m ai_music.cli docs index
py -3.12 -m ai_music.cli prompt build-from-docs
# Use a stronger/specialized model for Suno style+lyrics fragments (via OpenRouter), e.g. Gemini:
py -3.12 -m ai_music.cli prompt build-from-docs --suno-model "google/gemini-3-flash-preview"
py -3.12 -m ai_music.cli prompt render --provider suno
py -3.12 -m ai_music.cli provider smoke-test --provider openrouter
```

### Phase 2: Playlists -> analysis -> guide

```powershell
py -3.12 -m ai_music.cli playlists ingest
py -3.12 -m ai_music.cli playlists normalize
py -3.12 -m ai_music.cli playlists analyze
py -3.12 -m ai_music.cli guide build-from-playlist --playlist "EDM Chill Energy"
```

### Phase 3: Media -> stems (UVR-first)

```powershell
py -3.12 -m ai_music.cli media index
py -3.12 -m ai_music.cli media match-to-playlist --playlist "EDM Chill Energy"
py -3.12 -m ai_music.cli stems split --backend uvr --profile 4stem --dry-run
```

## Notes

- `OPENROUTER_API_KEY`, `FAL_API_KEY`, and `SUNO_API_KEY` are supported in phase 1.
- `LEONARDO_API_KEY` is reserved for later (phase 2+ cover-art workflows).
- Suno/fal generation submission is intentionally not implemented in MVP; prompt artifacts + smoke tests only.
