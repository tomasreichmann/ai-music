# Suno Genre Feedback Notes (Repo Memory)

As checked on February 25, 2026.

Use this file to capture genre-specific prompting and lyric-structure feedback discovered during iteration, so future prompt packs can reuse what worked.

## Drum and Bass (Dancefloor / Mainstage)

### Lyric Structure and QA

- Add a lyric QA pass before generation:
  - check syllable-count consistency across comparable lines
  - check rhyme quality and scheme consistency
  - avoid forced/absolute perfect rhymes outside chant/drop sections
  - confirm the lyric text is semantically coherent
  - check for accidental repeated words/phrases
- DnB phrases should keep a consistent line/phrase length within each section (especially verse, pre, chorus).
- Sparse DnB sections can be merged by Suno if too short. Use standalone `...` padding lines to preserve section boundaries and place ad-libs/calls correctly.
- Section headers may include meta tags, e.g.:
  - `[Drop | Aggressive synth lead]`
  - `[Drop | Energy 9/10]`
  - `[Verse | Spoken]`

### Style Prompting

- For vocal DnB tracks, specify instrumental sound design in detail (not just vocal tone/mood).
- If the style prompt is vocal-heavy but instrumentation is underspecified, Suno may render a dry or weak instrumental bed under the vocal.
- Avoid negative style/sample prompt fragments that name the unwanted genre directly (example: `no hardstyle`), because this can anchor the model toward the thing you are trying to avoid.
- Prefer positive steering in `Styles`/`Sample Prompt` and use `Exclude Styles` for explicit exclusions when needed.
- On later prompt iterations (after the core direction is landing), compress `Styles` and `Exclude Styles` to the minimum set of high-impact cues/guards; overlong lists can add noise, overconstraint, or accidental anchors.
- Include concrete drum, bass, FX, and transition language:
  - drum transient character (kick/snare, ghost notes, shuffle hats)
  - bass architecture (sub + mid reese/foghorn/FM bounce layers)
  - hooks/leads (synth lead, supersaw lift, call-and-response elements)
  - transition tools (snare rolls, risers, impacts, reverses, fills)

### Sci-Fi Lyric Referencing (Track Feedback)

- Prefer fandom-coded terms over repeated direct franchise name mentions when you want a love-letter tone without sounding too literal.
- Example term cues used/requested: `Lightsaber`, `Chevron`, `Serenity`.
