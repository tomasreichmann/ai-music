# Suno Creative Sliders Reference (Weirdness / Style Influence / Audio Influence)

As checked on April 1, 2026.

This note separates three things:

- official Suno behavior descriptions
- repo heuristics for practical working ranges
- genre-specific starting windows that are a repo synthesis, not Suno presets

## Official Baseline (Suno Help)

Suno's current Creative Sliders help article still gives the clearest official slider semantics:

- **Weirdness** runs from safe to chaos
- **50% Weirdness** is the official "normal expected" result
- **Style Influence** runs from loose to strong and controls how closely Suno follows your style input
- **Audio Influence** appears when you are using uploaded audio

The official docs do not publish genre-by-genre slider presets. Those sections below are therefore practical heuristics.

## Absolute UI Range vs Practical Working Range

The current Suno UI exposes these sliders as percentages, and the repo stores them as `0-100` integers.

Absolute UI limits:

- `Weirdness`: `0-100`
- `Style Influence`: `0-100`
- `Audio Influence`: `0-100`

Recommended practical working limits for most repeatable work:

- `Weirdness`: usually stay inside `20-65`
- `Style Influence`: usually stay inside `45-80`
- `Audio Influence`: usually stay inside `25-85`

Inference: values outside those practical bands are still valid, but they are best treated as special-purpose edge cases rather than default workflow settings.

## Weirdness

### What it does

Increase Weirdness when you want more novelty, stranger phrasing, unexpected transitions, or looser interpretation.

Lower Weirdness when you need cleaner genre execution, stronger hook preservation, or more predictable section behavior.

### Practical bands

- `0-15`: ultra-safe / lowest-novelty edge case
- `15-20`: low-novelty control band; useful when preservation or exclude discipline matters more than excitement
- `20-35`: best general first-pass range
- `35-55`: balanced exploration
- `55-70`: controlled experimentation with visibly higher risk
- `70-100`: special-purpose chaos hunting; expect more throwaways

### Recommended minimum and maximum

- Recommended practical minimum for general new work: `20`
- DnB / tighter-excludes exception: try `18-24`
- Recommended practical maximum for normal work: `65-70`

Go lower than `20` only when you are trying to preserve identity as tightly as possible or keep DnB exclude rules from washing out. Go higher than `70` only when deliberate instability is part of the brief.

## Style Influence

### What it does

Increase Style Influence when the genre target is vague, the output keeps drifting, or you need the prompt wording to matter more.

Lower Style Influence when the result feels too rigid, too samey, or you want more hybridization and reinterpretation.

### Practical bands

- `0-25`: very loose interpretation / prompt underweighted
- `25-45`: loose and genre-bending
- `45-65`: balanced / medium control
- `65-80`: genre-locked sweet spot for most work
- `80-85`: caution zone; style-box prose is more likely to bleed into sung lines
- `85-100`: high adherence, but phrasing variety can collapse and style text can leak into lyrics

### Recommended minimum and maximum

- Recommended practical minimum for genre-controlled work: `45`
- Recommended practical maximum for normal work: `80`

Inference: broad tags such as `pop`, `rock`, or `edm` usually benefit from more Style Influence than already-specific briefs because the prompt itself is less precise, but once you cross roughly `80`, long or vocal-heavy `Styles` text becomes more likely to be sung back.

## Audio Influence (Audio-Guided Generation Only)

- `20-45`: source as inspiration
- `45-70`: balanced preservation + expansion
- `70-85`: strong source retention
- `85+`: edge case for near-locking the source

Raise Audio Influence when the uploaded sound loses its identity. Lower it when the result feels trapped by the upload.

## Best Practices

- Start with prompt quality first. A weak `Styles` brief is harder to rescue with sliders.
- Keep first-pass `Styles` under roughly `500` characters.
- Prefer an overall vibe plus a few high-impact production anchors over long concrete shopping lists.
- Avoid lyric-like phrases, quoted hooks, or sentence-shaped chorus ideas inside `Styles`.
- Move one slider at a time when diagnosing a bad generation.
- For genre drift, raise `Style Influence` before you start pushing `Weirdness`.
- For chorus or hook protection, lower `Weirdness` before pushing `Style Influence` to the ceiling.
- If style-box prose starts getting sung, shorten `Styles` first and pull `Style Influence` back toward `65-80`.
- Use higher Weirdness in bridges, alternate drops, intros, and experimental variations rather than across the whole song by default.
- In DnB, if `Exclude Styles` stops holding, try lowering `Weirdness` toward `18-24` before adding more negative text.
- Treat `Weirdness 70+` and `Style Influence 80+` as intentional stress-test territory, not routine settings.
- High `Weirdness` plus low `Style Influence` is the easiest way to lose genre identity.
- Very high `Style Influence` plus dense prompts can flatten phrasing variety even when the genre lands.

## Suggested Starting Presets (Full Song from a Sound / "Sample" Workflow)

### Balanced Expansion (Recommended first pass)

- Weirdness: `25-40`
- Style Influence: `60-75`
- Audio Influence: `50-65`

### Faithful Adaptation (Preserve source identity)

- Weirdness: `15-30`
- Style Influence: `65-85`
- Audio Influence: `70-85`

### Exploratory Reinterpretation (Riskiest)

- Weirdness: `45-65`
- Style Influence: `45-65`
- Audio Influence: `25-45`

## Genre-Specific Starting Windows (Repo Synthesis, Not Official Presets)

These ranges are a repo synthesis from Suno's official slider semantics plus recent creator workflow notes. Treat them as starting windows, not fixed recipes.

### Pop / R&B / singer-songwriter

- Weirdness: `20-30`
- Style Influence: `70-80`

Why: vocal phrasing, hook clarity, and genre readability usually matter more than novelty.

### Hip-hop / boom bap / trap

- Weirdness: `15-35`
- Style Influence: `68-80`

Why: the groove and voice can handle some novelty, but beat identity usually benefits from a firm style anchor.

### Dancefloor DnB / EDM / neurofunk

- Weirdness: `20-30` for the first pass, `18-24` for tighter exclude control, `32-45` for alt-drops and switch-ups
- Style Influence: `70-80`

Why: festival-ready drops want strong genre lock first, then controlled novelty in selected sections.

### Rock / metal / punk

- Weirdness: `15-35`
- Style Influence: `68-80`

Why: riff language and arrangement identity normally improve when the style brief stays strong and the novelty pressure stays moderate.

### Cinematic / ambient / post-rock

- Weirdness: `25-45`
- Style Influence: `55-70`

Why: these genres often benefit from more emergent texture and slower-evolving interpretation.

### Experimental / glitch / hyperpop / genre-mashup work

- Weirdness: `45-70`
- Style Influence: `40-65`

Why: the goal is usually surprise and contrast, not strict genre obedience.

## Interaction Notes

- `Low Weirdness` + `high Style Influence` = safest "make the brief land" combination
- `Mid Weirdness` + `mid/high Style Influence` = best general exploration zone
- `High Weirdness` + `low Style Influence` = highest drift risk
- `High Style Influence` + verbose `Styles` = higher chance that style prose gets sung
- `High Style Influence` + `high Audio Influence` = easiest way to make audio-guided runs feel over-constrained

## Sources

- Suno Help: [How to Use: Creative Sliders](https://help.suno.com/en/articles/6141377)
- Suno Help: [Create in V4.5: Detailed Style Instructions](https://help.suno.com/en/articles/5782849)
- Suno Help: [Create in V4.5: Better Prompts in Lyrics](https://help.suno.com/en/articles/5782977)
- Jack Righteous: [How to Use Suno's Advanced Sliders](https://jackrighteous.com/blogs/guides-using-suno-ai-music-creation/how-to-use-suno-s-advanced-sliders-weirdness-style-audio-influence)
- Raycobz: [Suno AI Prompt Guidelines (personal notes)](https://note.com/bitzed/n/nd2f5e961a9dd)
- loftwah gist: [Suno AI v4.5 Cheatsheet](https://gist.github.com/loftwah/45d038bdbcab77baa7d2c79d44ff8a06)

