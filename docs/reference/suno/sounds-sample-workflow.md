# Suno Sounds -> "Sample" Workflow (Full Song from a Sound)

As checked on February 24, 2026.

## Terminology Note (Repo vs Suno UI)

This repo uses "Sample feature" to mean Suno's audio-guided song creation workflow:

- create a sound in **Sounds**, or
- bring in source audio via **Audio Uploads / Upload Audio**, then
- build a full song around it.

Suno Help articles currently document this under **Sounds** and **Audio Uploads / Upload Audio** (not a separate Help article named "Sample").

## What Suno Sounds Is Good For

Use **Sounds** when you want Suno to generate short, reusable audio ideas (motifs, textures, loops, hooks) before writing a full song.

Good use cases:

- Hook-first workflow (build the song around one strong motif)
- Sound-design-first workflow (texture, riser, vocal chop-like flavor, percussive idea)
- Faster iteration before spending full-song generations
- Creating multiple source candidates and only promoting the best one to a full track

Useful operational notes from Suno Help:

- Sounds can generate multiple candidates in one run (the current Help article describes up to 4 sounds)
- Sounds outputs are short-form source ideas (the current Help article describes sounds up to 40 seconds)
- Audio Uploads has upload constraints; check the current Help article before batch prep (currently documented with format/size/duration limits)

## Practical Workflow: Sound -> Full Song

1. Generate a source idea in **Sounds** (or upload your own audio with **Audio Uploads**).
2. Keep only the strongest segment (crop/trim if needed) before building the song.
3. Start the full-song creation flow using the sound/audio as the source.
4. Fill the fields with separation of roles:
   - **Sample Prompt**: what to do with the source audio in the new song
   - **Styles**: genre/style/production direction
   - **Lyrics**: only lyrics or section text (if vocal song)
5. Run a **lyric QA pass** (vocal tracks only) before generating:
   - check section phrasing/line counts for genre fit (especially DnB phrase regularity)
   - check syllable-count consistency by line/section (avoid obvious outliers)
   - check rhyme scheme quality/consistency (avoid forced perfect rhymes outside chant sections)
   - check semantic coherence (lyrics should actually make sense end-to-end)
   - check accidental word repetition / duplicate phrases
   - pad sparse sections with standalone `...` lines when needed to keep section boundaries visible in Suno
6. Set sliders conservatively first, especially if you want to preserve the source identity.
7. Iterate with one variable at a time (Sample Prompt, Styles, or slider changes), then compare results.

### Lyric QA Gate (Recommended for Vocal Songs)

Use this as a manual review checklist before pressing generate.

- Keep section headers explicit and structured. Meta-tagged headers are allowed and often useful, e.g.:
  - `[Drop | Aggressive synth lead]`
  - `[Drop | Energy 9/10]`
  - `[Verse | Spoken]`
- For DnB and other phrase-driven genres, keep line counts and phrase lengths consistent within a section.
- If a section is intentionally sparse (drop hype, intro stingers, post-drop callbacks), add `...` padding lines so Suno is less likely to merge it into the next section.
- Reserve heavy repetition for chant/drop sections; use more varied wording in verses/bridges.
- Confirm rhyme scheme intent per section (e.g., AABB or ABAB) instead of accidental drift.
- Read the lyrics top-to-bottom once for narrative/logical coherence before generation.

Examples (DnB-friendly sparse section padding):

```text
[Intro]
...
...
City lights on the canopy
Count us in, set engines free
```

```text
[Drop 2]
Open the gate
...
Open the gate
...
```

## How to Write the Sample Prompt

Treat **Sample Prompt** as the transformation brief for the source audio.

Include:

- Role of the source in the finished song: hook, motif, intro texture, drop lead, vocal chop layer, etc.
- What should be preserved: rhythm contour, tone, vibe, groove, melody fragment
- What should change: arrangement size, energy, instrumentation, polish, genre framing
- Song-level target: club banger, cinematic opener, radio-ready drop, dark halftime section, etc.

Avoid:

- Repeating genre tags that belong in **Styles**
- Putting lyrics in the Sample Prompt
- Over-specifying every bar (can reduce useful variation)
- Negative genre anchors in the prompt text (e.g., `no hardstyle`, `not dubstep`) because naming the unwanted style can reinforce it

### Sample Prompt Examples

- Use the uploaded sound as the main hook motif and expand it into a full dancefloor DnB arrangement with a clean intro, lift, and festival-ready chorus/drop.
- Keep the rhythmic character of the uploaded percussion loop, but rebuild it as a heavier halftime intro that transitions into an energetic drum and bass drop.
- Preserve the airy texture and melodic contour of the uploaded sound, then turn it into a polished cinematic-electronic vocal track with strong contrast between verses and chorus.

## Where Audio Influence Matters

`Audio Influence` is only relevant when Suno is generating from source audio (Sounds/Audio Uploads).

Practical interpretation:

- Lower values: more freedom to reinterpret the source
- Mid values: balanced preservation + expansion
- Higher values: stronger adherence to the source audio character

See `creative-sliders-reference.md` for working ranges and safer starting points.

## Best Practices for Full-Song Generation from a Sound

- Start with a clean, distinctive source segment (short and memorable; avoid cluttered audio)
- If using Audio Uploads, trim/crop before generating so the important motif lands early and clearly
- Separate responsibilities across fields: Sample Prompt vs Styles vs Lyrics
- Prefer positive wording in **Sample Prompt** and **Styles**; put explicit exclusions in **Exclude Styles** instead of writing `no <genre>` in the prompt text
- For vocal tracks, make **Styles** explicitly describe instrumental sound design (drums, bass layers, FX, hook timbre, transitions), not only vocals/mood
- Use section headers in Lyrics for structure, and consider meta-tagged headers to steer performance/energy by section
- Start with moderate `Weirdness` and moderate/high `Style Influence`
- Increase `Audio Influence` only if the source identity is getting lost
- Lower `Audio Influence` if outputs feel too stuck or repetitive
- Use Detailed Style Instructions when genre execution matters more than novelty
- Iterate from the best near-hit instead of regenerating from scratch every time

## Common Failure Modes

- **Source identity disappears**: raise `Audio Influence`, simplify Styles, reduce Weirdness
- **Output is generic despite a strong sample**: make Sample Prompt more specific about the role/function of the source
- **Song feels over-constrained / samey**: lower `Audio Influence` or `Style Influence`, or reduce prompt density
- **The model ignores structure**: move structure guidance into Lyrics (section headers) and keep Sample Prompt focused on the source role
- **Short sections get merged together**: pad sparse sections with `...` lines and keep section lengths visually clear
- **Vocal track sounds dry/instrumentally weak**: add concrete sound-design and transition details in **Styles** (drum transient character, bass type, FX, fills, risers, hook layers)
- **Negative prompt wording backfires**: remove `no <genre>` / `not <style>` phrasing from prompt text and restate the desired sound positively; use **Exclude Styles** for hard exclusions
- **Too much chaos**: high Weirdness + low Style Influence can overpower a good source sound

## Sources

- Suno Help: [What is Suno Sounds?](https://help.suno.com/en/articles/11392018-what-is-suno-sounds)
- Suno Help: [How to use Audio Uploads](https://help.suno.com/en/articles/10719464-how-to-use-audio-uploads)
- Suno Help: [What does Upload Audio do?](https://help.suno.com/en/articles/3542652-what-does-upload-audio-do)
- Suno Help: [What do the creative sliders do?](https://help.suno.com/en/articles/11046409-what-do-the-creative-sliders-do)
- Suno Help: [Detailed Style Instructions](https://help.suno.com/en/articles/11297992-detailed-style-instructions)
