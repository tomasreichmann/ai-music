---
name: suno-lyrics-tag-guardrails
description: Use when creating or revising Suno lyrics to enforce tag-safe formatting where instructions stay in [] and support vocals use ().
---

# Suno Lyrics Tag Guardrails

Use this skill to keep Suno lyric outputs structurally safe: instruction text must stay in square tags, sung support vocals must be in round brackets, and only intentional lead vocals appear as plain lines.

## Core Rules

- Put all non-sung instructions and production notes inside `[]`.
- Treat text in `(...)` as support vocals that are intentionally sung.
- Allow only these non-empty line types:
  - section or instruction line in `[]`
  - lead-vocal lyric line as plain text
  - support-vocal lyric line in `(...)`
- If uncertain whether a line should be sung, move it into `[]`.
- If style mentions ad-libs, support vocals, or call-response, define those vocal elements explicitly in the `Lyrics` body, not only in `Styles`.

## Workflow

1. Draft section skeleton first using `[]` lines.
2. Add intended sung lead lines only as plain lyric lines.
3. Add intended support vocals only in `(...)`.
4. Run a final line-by-line compliance pass:
   - no instruction prose outside `[]`
   - no placeholder `...` outside `[]`
   - no unlabeled production notes in plain lyric lines
5. Rewrite accidental instruction prose into the nearest appropriate `[]` line before returning output.

## Anti-Patterns and Fixes

- `...` outside tags -> move into `[Section | ...]` or remove.
- Meta comments outside tags -> rewrite as `[Note | ...]`.
- Production instructions as plain lyric lines -> rewrite into `[]`.
- Style says "ad-libs/call-response" but Lyrics do not define them -> add explicit ad-lib lines in the target sections.

## Quick Self-Check

- Every non-empty line matches one of: `[]`, plain lyric, `(...)`.
- Every non-sung instruction is inside `[]`.
- Every support vocal is inside `(...)`.
- Any ambiguous line defaults to `[]`.

## Example: Vocal Track

```text
[Verse 1 | Tight drums, low pad, steady groove | Energy 6/10]
I keep running through the neon rain
I feel the pressure but I hold my lane
(hey)

[Pre-Chorus | Snare lift, riser, filter open | Energy 8/10]
Take me higher when the lights collide
(oh)

[Drop | Full drums and bass hook, stab responses | Energy 10/10]
We break the night and never come down
(run it)
```

## Example: Instrumental Ad-Lib Only

```text
[Intro | Instrumental, filtered motif teaser | Energy 3/10]
[Build | Instrumental, snare ladder and riser | Energy 8/10]
(run it)
(switch)
[Drop | Instrumental, full-time two-step and reese hook | Energy 10/10]
(hey)
(oi)
```
