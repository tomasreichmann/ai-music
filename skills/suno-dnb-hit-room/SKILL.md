---
name: suno-dnb-hit-room
description: Use when creating or iterating Suno v5.5 drum and bass prompt packs with a multi-role workflow that needs idea discovery, direction selection, and final polish for high-impact jump-up festival tracks.
---

# Suno DnB Hit Room

Use this skill to run a structured 3-role, 3-round collaboration that upgrades a Suno DnB track concept into a hit-focused prompt pack.

## Default Target and Defaults

- Version/model: stock Suno v5.5 in Create
- Personalization: no `Voice` or `Custom Model` unless the user explicitly wants one
- My Taste: allowed only after a manual `Styles` draft exists; use it as an expansion pass, not the source of direction
- Baseline file: `outputs/prompts/providers/suno/suno_dancefloor_dnb_gritty_jumpup_instrumental_generic_v1.md`
- Theme: mosh pit at a DnB festival
- BPM/arrangement: 174 BPM, hook-first jump-up flow
- Vocal density: very sparse (ad-libs and short hooks, no full verses by default)
- Dark vs melodic balance: 60/40
- Tone: edgy explicit

If the user does not answer Round 1 questions, continue with the defaults above.

## Slider Defaults For Dancefloor DnB

Use these as the default first-pass windows unless the user asks for something riskier:

- First pass: `Weirdness 20-30`, `Style Influence 70-80`
- Tighter-excludes pass: `Weirdness 18-24`, `Style Influence 72-80`
- Switch-up pass: `Weirdness 32-45`, `Style Influence 65-78`
- Only push `Weirdness >55` when the brief explicitly wants chaos, hard genre-bending, or an unstable alt-drop

If excludes stop holding, try the tighter-excludes pass before adding more negative text. If style prose starts getting sung, shorten `Styles` and pull `Style Influence` back under `80`.

## Persona Subagents

### 1) Music Producer

Focus:
- arrangement pressure and pacing
- hook strength and drop impact
- dark/melodic balance and dancefloor viability

Must output:
- arrangement changes by section
- one core hook strategy
- one risk to avoid and a mitigation

### 2) Lyrics Writer

Focus:
- sparse lyric strategy, chant utility, ad-lib quality
- clarity of call-and-response phrases
- lyric rule compliance and section-level lyric density

Must output:
- allowed vocal moments by section
- ad-lib or hook options
- lyric risk to avoid and a mitigation

### 3) Sound Designer

Focus:
- bass architecture and movement
- drum transient language and groove texture
- stereo excitement and atmospheric contrast

Must output:
- bass/drum/synth recipe changes
- one signature sound-moment descriptor
- sound-design risk to avoid and a mitigation

## Three-Round Protocol

### Round 1: Discovery

1. Ask targeted questions first (use `references/round-runbook.md` question template).
2. Lock the v5.5 model path first: stock `v5.5`, `Voice`, or `Custom Model`.
3. Decide whether My Taste should be used after the manual style draft is written.
4. Each persona proposes improvement ideas independently.
5. Build a shared idea board with strengths and risks.

Round 1 outcome:
- a compact shortlist of candidate directions with tradeoffs

### Round 2: Selection

1. Score candidate directions using the matrix in `references/round-runbook.md`.
2. Compare by impact, originality, clarity, mix-space, and crowd response.
3. Select one winning direction and record why it wins.

Round 2 outcome:
- single locked concept with explicit constraints

### Round 3: Polish

1. Refine the selected direction into Suno-ready fragments.
2. Tighten structure, hook language, sound-design precision, and density balance.
3. Produce final edit guidance and change notes.

Round 3 outcome:
- final `Model Setup`, `Sample Prompt`, `Lyrics`, `Styles`, and concise change log

## Hard Operating Rules

- Always run lyric outputs through `$suno-lyrics-tag-guardrails` before final output.
- Assume Suno v5.5 field roles by default:
  - `Styles` = sonic brief
  - `Lyrics` = sung text and section guidance
  - `Sample Prompt` = source-audio brief only
- Keep non-sung instructions inside `[]`.
- Keep support vocals inside `(...)`.
- Keep lyrics sparse; prioritize instrumental space when tradeoffs conflict.
- Do not leave ad-libs or call-response implicit in `Styles` only; define them explicitly in `Lyrics`.
- Keep arrangement optimized for festival/mosh-pit energy rather than dense storytelling.
- Keep first-pass `Styles` under roughly `500` characters and focused on overall vibe plus a few drum/bass/hook anchors.
- Use My Taste only to refine a manual `Styles` draft.
- Do not stack `Voice`, `Custom Model`, high Weirdness, and aggressive My Taste on the first pass unless the user specifically asks for that.
- Keep first-pass slider pressure moderate enough that the drop stays recognizably dancefloor DnB before chasing novelty.

## Output Contract

Return these sections in order:

1. `Round 1 Questions`
2. `Round 1 Ideas` (Producer/Lyrics Writer/Sound Designer)
3. `Round 2 Scoring and Winner`
4. `Round 3 Polished Fragments`
5. `Final Change Notes`

For reused sessions, load `references/round-runbook.md` first and follow its templates.
