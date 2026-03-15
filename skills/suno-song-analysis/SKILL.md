---
name: suno-song-analysis
description: Use when Codex needs to fetch created songs from Suno API, filter for original non-uploaded tracks with likes, mine like-weighted prompt baselines, and adapt those baselines to a new theme.
---

# Suno Song Analysis

Use this skill to mine high-performing Suno originals and generate a reusable baseline prompt pack.

## Quick Start

1. Fetch + normalize created songs (live API or fixtures):
   - `py -3.12 -m ai_music.cli suno fetch --mapping-config configs/suno_api_mapping.template.json --window-size 500`
2. Analyze originals for a style query:
   - `py -3.12 -m ai_music.cli suno analyze --style-query "clinical dnb" --aliases-config configs/suno_style_aliases.json`
3. Adapt baseline to new theme:
   - `py -3.12 -m ai_music.cli suno adapt --baseline outputs/reports/suno_prompt_baseline_clinical-dnb.json --theme "flying by a private jet"`
4. Run full pipeline:
   - `py -3.12 -m ai_music.cli suno mine --style-query "clinical dnb" --theme "flying by a private jet"`

## Output Artifacts

- Raw API pages: `data/staging/suno_created.raw.json`
- Normalized songs: `data/normalized/suno_created.normalized.json`
- Strict source filter report: `outputs/reports/suno_source_filter_report.json`
- Baseline report: `outputs/reports/suno_prompt_baseline_<query>.json`
- Adapted prompt JSON/Markdown: `outputs/prompts/providers/suno/suno_adapted_<slug>.json` and `.md`

## Quality Gate

Songs are considered high-signal only when all of these are true:

- `likes >= 1`
- explicit `false` for `is_cover`, `is_remaster`, `is_sample_derived`, `depends_on_existing`, `is_uploaded`
- missing/null dependency flags are rejected

## References

- Mapping contract and schema notes: `references/api-mapping.md`
- End-to-end command flow and troubleshooting: `references/workflow.md`
