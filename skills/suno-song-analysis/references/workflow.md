# Workflow Reference

## 0. Default v5.5 Target

Unless the user explicitly asks otherwise, treat the adapted output as a prompt pack for stock Suno v5.5 in Create.

Default field mapping:

- `style_prompt` -> `Styles`
- `lyrics` -> `Lyrics`
- `sample_prompt` -> use only for audio-guided creation

Personalization note:

- add `Voice` only if singer identity matters
- add a `Custom Model` only if matching the user's own catalog matters
- treat My Taste as a later augmentation pass, not as part of the reproducible baseline

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

## 5. Use The Adapted Pack In Suno v5.5 Create

1. Open Create and stay on stock `v5.5` unless a `Voice` or `Custom Model` is intentionally part of the run.
2. Paste `style_prompt` into `Styles`.
3. Paste `lyrics` into `Lyrics`.
4. Use `sample_prompt` only if the run starts from source audio.
5. Keep `Exclude Styles`, `Weirdness`, and `Style Influence` from the adapted output as the first reproducible pass.
6. If you try My Taste afterward, save that as a second pass rather than overwriting the baseline.
7. If the mined slider values feel extreme, keep the original baseline intact and create a second comparison pass instead of silently normalizing it.
8. For that comparison pass, use:
   - genre-locked cleanup: `Weirdness 15-35`, `Style Influence 70-85`
   - looser exploration: `Weirdness 35-55`, `Style Influence 55-75`
9. Change only one slider at a time while comparing the baseline to the fallback pass.

## Troubleshooting

- `SUNO_API_KEY is required for live fetch mode`: add `SUNO_API_KEY` in `.env.local` or use `--fixture-page`.
- `OPENROUTER_API_KEY is required for adaptation`: set `OPENROUTER_API_KEY` for `suno adapt`/`suno mine`.
- `No songs matched ... after filtering`: broaden query aliases or fetch larger window.
