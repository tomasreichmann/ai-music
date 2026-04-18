# Round Runbook

Use these templates to execute the 3-round workflow consistently.

## Round 1 Template: Questions + Idea Generation

### User Questions (ask before proposing final edits)

1. Are we targeting stock `v5.5`, a saved `Voice`, or a `Custom Model`?
2. Should I keep `Styles` fully manual, or use My Taste after we draft the manual brief?
3. What crowd mood should dominate: menace, euphoria, or equal split?
4. Do you want the hook more vocal-led or bass-led?
5. How aggressive should the low end be: controlled punch or near-chaotic weight?
6. Which section should be the biggest surprise: Drop 1B or Drop 2B?
7. Should melodic content come from synth stabs, pads, or short lead motifs?

### Idea Board Template

| ID | Role | Idea | Why It Works | Risk | Mitigation |
|---|---|---|---|---|---|
| A1 | Producer |  |  |  |  |
| B1 | Lyrics Writer |  |  |  |  |
| C1 | Sound Designer |  |  |  |  |

Target: produce 2-3 candidate directions from combined role ideas.

## Round 2 Template: Selection Matrix

Score each candidate from 1-5.

| Candidate | Impact | Originality | Clarity | Mix-Space | Crowd Response | Total |
|---|---:|---:|---:|---:|---:|---:|
| Direction 1 |  |  |  |  |  |  |
| Direction 2 |  |  |  |  |  |  |
| Direction 3 |  |  |  |  |  |  |

Selection rule:
- Pick the highest total.
- If tied, prefer higher `Impact` and `Crowd Response`.
- If still tied, choose the option with lower lyric density.

## Round 3 Template: Polish Checklist

### Arrangement and Energy

- Hook-first momentum is obvious before first drop.
- Drop 1A vs 1B distinction is clear.
- Drop 2 introduces meaningful variation, not repetition only.

### Lyrics and Vocal Density

- Lyrics are sparse and intentional.
- Ad-libs and support vocals are explicitly placed in section context.
- No accidental instruction prose appears outside square tags.
- `Styles` and `Lyrics` responsibilities stay separate in the v5.5 form.

### Sound Design

- Sub is clean and stable while mid-bass provides movement.
- Drums have clear transient hierarchy (kick, snare, hats, ghosts).
- Stereo excitement is wide but club-safe with mono low-end discipline.

### v5.5 Controls

- Model path is explicit: stock `v5.5`, `Voice`, or `Custom Model`.
- My Taste usage is explicit when relevant.
- `Sample Prompt` is blank unless source audio is actually part of the workflow.
- `Styles` stays under roughly `500` characters and leads with overall vibe plus high-impact sonic anchors.
- First-pass dancefloor defaults stay near `Weirdness 20-30` and `Style Influence 70-80` unless the brief explicitly calls for riskier behavior.
- If excludes stop holding, test a tighter pass near `Weirdness 18-24` before adding more negative text.
- If style prose starts getting sung, shorten `Styles` and reduce `Style Influence` before rewriting `Lyrics`.
- `Weirdness >55` is treated as a deliberate effect choice, not a default setting.

### Final Deliverable Skeleton

```text
Round 3 Polished Fragments

Model Setup:
...

Sample Prompt:
...

Lyrics:
...

Styles:
...

Final Change Notes:
- ...
- ...
- ...
```
