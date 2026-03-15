# Workflow Reference

## 1. Fetch

Live API:

```powershell
py -3.12 -m ai_music.cli suno fetch --mapping-config configs/suno_api_mapping.template.json --window-size 500
```

Fixture smoke:

```powershell
py -3.12 -m ai_music.cli suno fetch `
  --mapping-config configs/suno_api_mapping.template.json `
  --fixture-page tests/fixtures/suno/api_created_page_01.synthetic.json
```

## 2. Analyze

```powershell
py -3.12 -m ai_music.cli suno analyze --style-query "clinical dnb" --aliases-config configs/suno_style_aliases.json
```

This performs:

- strict source filtering (`likes >= 1`, non-cover/non-remaster/non-sample-derived/non-dependent/non-uploaded)
- deterministic query matching via aliases
- like-weighted baseline mining

## 3. Adapt

```powershell
py -3.12 -m ai_music.cli suno adapt `
  --baseline outputs/reports/suno_prompt_baseline_clinical-dnb.json `
  --theme "flying by a private jet"
```

Defaults:

- OpenRouter client
- baseline excludes preserved
- baseline weirdness/style influence preserved

## 4. Full Pipeline

```powershell
py -3.12 -m ai_music.cli suno mine `
  --style-query "clinical dnb" `
  --theme "flying by a private jet"
```

## Troubleshooting

- `SUNO_API_KEY is required for live fetch mode`: add `SUNO_API_KEY` in `.env.local` or use `--fixture-page`.
- `OPENROUTER_API_KEY is required for adaptation`: set `OPENROUTER_API_KEY` for `suno adapt`/`suno mine`.
- `No songs matched ... after filtering`: broaden query aliases or fetch larger window.
