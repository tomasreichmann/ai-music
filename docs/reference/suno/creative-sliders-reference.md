# Suno Creative Sliders Reference (Weirdness / Style Influence / Audio Influence)

As checked on February 24, 2026.

## Official Baseline (Suno Help)

Suno's Creative Sliders article describes the sliders as controls for how far a generation moves from your prompt and source material.

Official behavior notes (summarized):

- **Weirdness**: more divergence / novelty / unusual choices
- **Style Influence**: how strongly Suno follows your style prompt and genre framing
- **Audio Influence**: how strongly Suno follows the uploaded/source audio (only relevant in audio-guided generation)
- **50%** is the "normal expected" baseline in the Suno article

## Slider Range and Defaults

Practical UI note (current Suno UI): these are percentage sliders and are used as `0-100` values.

- Repo implementation uses `0-100` integer bounds for `Weirdness`, `Style Influence`, and `Audio Influence`
- Treat **50** as the neutral starting point unless you have a reason to bias toward preservation or experimentation

## Safe Boundaries and Usual Values (Heuristics, Not Official Presets)

These are working ranges for faster iteration and fewer unusable generations. They are starting points, not rules.

### Weirdness

- Safe baseline: `15-35`
- Usual exploratory range: `35-60`
- High-risk / extreme: `70+`

Use higher Weirdness when:

- You want surprising transitions, timbres, or interpretation
- You are intentionally searching for unusual variations

Use lower Weirdness when:

- You need cleaner genre execution
- The sample/source identity is already strong and should stay readable

### Style Influence

- Looser interpretation: `40-60`
- Usual range: `60-80`
- Over-constrained risk: `85+`

Raise Style Influence when:

- The genre/style target is not landing
- Suno keeps drifting away from the intended production style

Lower Style Influence when:

- Outputs are too rigid/repetitive
- You want a more hybrid or emergent result

### Audio Influence (Audio-Guided Generation Only)

- Loose reinterpretation: `20-45`
- Balanced preservation/expansion: `45-70`
- Strong source preservation: `70-90`

Raise Audio Influence when:

- The generated song loses the core sample motif/character
- You need stronger continuity with the uploaded sound

Lower Audio Influence when:

- The output feels trapped by the source
- You want the source to act as inspiration rather than a strict template

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

## Interaction Notes (Important)

- High `Weirdness` + low `Style Influence` can overpower a good prompt and produce drift
- High `Style Influence` + high `Audio Influence` can feel over-constrained or repetitive
- Adjust one slider at a time when debugging outputs
- Revisit prompt quality before assuming the slider is the problem

## Sources

- Suno Help: [What do the creative sliders do?](https://help.suno.com/en/articles/11046409-what-do-the-creative-sliders-do)
- Suno Help: [How to use Audio Uploads](https://help.suno.com/en/articles/10719464-how-to-use-audio-uploads)

