# Suno Feature Reference (Repo Notes)

As checked on February 24, 2026.

This folder stores Suno feature reference notes for this repo's prompt workflows and manual generation steps.

- `sounds-sample-workflow.md`: Sounds/audio-guided workflow notes (including this repo's "Sample" terminology)
- `remix-and-inspire-workflows.md`: Practical guidance for `Remix` and `Inspire`
- `creative-sliders-reference.md`: Creative slider definitions plus working heuristics
- `genre-feedback-notes.md`: Genre-specific prompting/lyric QA feedback captured from iteration

Notes:

- These are reference docs, not source production guides for prompt-pack ingestion.
- The current docs indexer only scans top-level `docs/*.md`, so files in this nested folder are not included in prompt generation.
- For created-song mining and prompt baseline adaptation, use the `suno` CLI commands and mapping configs:
  - `configs/suno_api_mapping.template.json`
  - `configs/suno_style_aliases.json`
- Fixture-first workflow is supported while locking schema:
  - `tests/fixtures/suno/api_created_page_01.template.json` as placeholder contract
  - `tests/fixtures/suno/api_created_page_01.synthetic.json` as smoke-test payload
  - replace these with real API payload fixtures before production runs
