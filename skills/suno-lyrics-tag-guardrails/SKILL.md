---
name: suno-lyrics-tag-guardrails
description: Use when creating or revising Suno v5.5 lyrics to enforce tag-safe formatting where instructions stay in [] and support vocals use ().
---

# Suno Lyrics Tag Guardrails

Use this skill to keep Suno lyric outputs structurally safe: instruction text must stay in square tags, sung support vocals must be in round brackets, and only intentional lead vocals appear as plain lines.

Default target: Suno v5.5 Create. `Voice`, `Custom Model`, `My Taste`, and Style Personas do not change the lyric line grammar.

## Core Rules

- Assume v5.5 field separation by default:
  - keep the sonic brief in `Styles`
  - keep sung words and section guidance in `Lyrics`
- Put all non-sung instructions and production notes inside `[]`.
- Treat text in `(...)` as support vocals that are intentionally sung.
- Allow only these non-empty line types:
  - section or instruction line in `[]`
  - lead-vocal lyric line as plain text
  - support-vocal lyric line in `(...)`
  - standalone padding line `...` when deliberately preserving sparse section boundaries
- If uncertain whether a line should be sung, move it into `[]`.
- If style mentions ad-libs, support vocals, or call-response, define those vocal elements explicitly in the `Lyrics` body, not only in `Styles`.
- If style-box prose leaks into sung lines, shorten `Styles` and reduce `Style Influence` before rewriting the lyric body.

## Workflow

1. Draft section skeleton first using `[]` lines.
2. Keep full-song production prose in `Styles`; only keep section-level direction in `Lyrics`.
3. Add intended sung lead lines only as plain lyric lines.
4. Add intended support vocals only in `(...)`.
5. If Suno tends to merge adjacent sparse sections, add a standalone `...` line as padding inside those sections.
6. Use `...` only as a spacer line, never as inline lyric prose.
7. Run a final line-by-line compliance pass:
   - no instruction prose outside `[]`
   - any `...` line is a deliberate standalone spacer, not stray prose
   - no unlabeled production notes in plain lyric lines
8. Rewrite accidental instruction prose into the nearest appropriate `[]` line before returning output.

## Anti-Patterns and Fixes

- Inline `...` prose -> rewrite as a standalone spacer line or remove it.
- Sparse sections collapse into each other -> insert a standalone `...` padding line after the section header or between sparse vocal cues.
- Meta comments outside tags -> rewrite as `[Note | ...]`.
- Production instructions as plain lyric lines -> rewrite into `[]`.
- Style says "ad-libs/call-response" but Lyrics do not define them -> add explicit ad-lib lines in the target sections.
- My Taste or style-box prose pasted into plain lyric lines -> move it back to `Styles` or compress it into the relevant `[]` section header.
- The model sings the `Styles` box back as lyrics -> remove lyric-like wording from `Styles`, shorten it, and pull `Style Influence` back toward `65-80`.

## Quick Self-Check

- Every non-empty line matches one of: `[]`, plain lyric, `(...)`, standalone `...`.
- A standalone `...` line is used only as section padding.
- Every non-sung instruction is inside `[]`.
- Every support vocal is inside `(...)`.
- Any ambiguous line defaults to `[]`.
- If a line reads like style prose instead of singable text, it probably belongs in `Styles`.

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
