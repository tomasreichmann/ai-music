---
name: suno-browser-fill
description: Fill an already-open Suno Create tab through Chrome remote debugging using repo-generated Suno fragments JSON. Use when Codex should attach to a Chrome window launched with `--remote-debugging-port=9222`, pick the Suno tab, populate `Lyrics` / `Styles` / sliders / title, and optionally click Generate only when the user explicitly asks.
---

# Suno Browser Fill

Use this skill to operate an existing Suno Create tab instead of asking the user to paste fragments manually.

## Workflow

1. Confirm Chrome was launched with remote debugging.
2. Ask for the fragments source only if it is not already available in the repo or chat.
3. Prefer the repo CLI command:

```powershell
python -m ai_music.cli suno fill-browser --fragments <path-to-fragments-json> --tab-query suno
```

4. Add `--submit` only when the user explicitly wants the generate/create action clicked.
5. Read the CLI JSON result:
   - `filled_fields` shows what matched
   - `missing_fields` shows what still needs manual help
   - `submit_clicked` confirms whether the button press happened

## Good Inputs

- `outputs/prompts/providers/suno/<brief-id>.json`
- any JSON file matching the `SunoFragments` schema

## Notes

- Default target is `http://127.0.0.1:9222`.
- Default tab query is `suno`.
- Keep this fill-only by default. Generation is a separate, explicit action.
- If field matching looks off, tighten `--tab-query` first, then check the troubleshooting reference.

See [references/troubleshooting.md](references/troubleshooting.md) only when the browser attach or DOM matching fails.
