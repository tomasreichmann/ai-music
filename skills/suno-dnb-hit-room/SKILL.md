---
name: suno-dnb-hit-room
description: Use when creating or iterating Suno drum and bass prompt packs with a multi-role workflow that needs idea discovery, direction selection, and final polish for high-impact jump-up festival tracks.
---

# Suno DnB Hit Room

Use this skill to run a structured 3-role, 3-round collaboration that upgrades a Suno DnB track concept into a hit-focused prompt pack.

## Default Target and Defaults

- Baseline file: `outputs/prompts/providers/suno/suno_dancefloor_dnb_gritty_jumpup_instrumental_generic_v1.md`
- Theme: mosh pit at a DnB festival
- BPM/arrangement: 174 BPM, hook-first jump-up flow
- Vocal density: very sparse (ad-libs and short hooks, no full verses by default)
- Dark vs melodic balance: 60/40
- Tone: edgy explicit

If the user does not answer Round 1 questions, continue with the defaults above.

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
2. Each persona proposes improvement ideas independently.
3. Build a shared idea board with strengths and risks.

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
- final `Sample Prompt`, `Lyrics`, `Styles`, and concise change log

## Hard Operating Rules

- Always run lyric outputs through `$suno-lyrics-tag-guardrails` before final output.
- Keep non-sung instructions inside `[]`.
- Keep support vocals inside `(...)`.
- Keep lyrics sparse; prioritize instrumental space when tradeoffs conflict.
- Do not leave ad-libs or call-response implicit in `Styles` only; define them explicitly in `Lyrics`.
- Keep arrangement optimized for festival/mosh-pit energy rather than dense storytelling.

## Output Contract

Return these sections in order:

1. `Round 1 Questions`
2. `Round 1 Ideas` (Producer/Lyrics Writer/Sound Designer)
3. `Round 2 Scoring and Winner`
4. `Round 3 Polished Fragments`
5. `Final Change Notes`

For reused sessions, load `references/round-runbook.md` first and follow its templates.
