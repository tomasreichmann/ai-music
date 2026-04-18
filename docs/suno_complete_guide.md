# Suno v5.5 Song Creation Guide

As checked on April 1, 2026.

This repo now treats Suno v5.5 as the default song-creation target.

This guide is built from:

- the official Suno v5.5 launch post from March 26, 2026
- the official v5.5 Help articles for `What's New in v5.5`, `Voices`, `Voices FAQ`, `Custom Models`, and `My Taste`
- still-relevant official creation docs for detailed style instructions, lyrics-box prompting, creative sliders, audio uploads, Add Vocals, Inspire, and Song Editor
- repo-tested prompting heuristics from existing Suno reference notes

When a recommendation below is a repo inference rather than an explicit Suno statement, it is labeled as an inference.

## Official Current Picture

### v5.5 is the default current model

Suno announced v5.5 on March 26, 2026 as its newest model and positioned it as a more expressive, more personalized creation flow.

### Voices

Voices are available to Pro and Premier users. They let you use your own verified singing voice in Suno-generated songs. Suno says the feature is private to the account owner.

### Custom Models

Custom Models are also for Pro and Premier users. Suno says you can build up to three private models from music you own, using as few as six songs. Training is described as taking about 2 to 5 minutes.

### My Taste

My Taste is available to all users and is enabled by default. In Create, the magic wand in the `Styles` box can expand your draft style text into a more personalized style description based on your Suno listening and creation habits.

### Personas are no longer the top-level default control

The current v5.5 Help flow says the `Voices` button replaced `Personas` in Create. Style Personas still exist, but they are now accessed from within the Voices area.

## Repo Defaults For v5.5

Unless a user explicitly asks for another version, assume all Suno guidance in this repo targets:

- stock Suno v5.5 in `Create`
- `Custom mode` style entry
- `Styles` for the sonic brief
- `Lyrics` for sung words, section headers, and section-level direction
- `Sample Prompt` only when a source sound or uploaded audio is involved

Default workflow assumptions:

- Start with a manual `Styles` draft first.
- Use the v5.5 magic wand and My Taste as an optional expansion pass, not as a substitute for intent.
- Keep negative genre bans out of the prompt text when possible. Use `Exclude Styles` for hard negatives.
- Leave `Audio Influence` unset unless you are actually generating from source audio.

## Fastest Good v5.5 Workflow

1. Pick the right model path.
   - Use stock `v5.5` for most work.
   - Use `Voice` when singer identity matters most.
   - Use a `Custom Model` when continuity with your own catalog matters more than neutral model behavior.
2. Write a clean manual `Styles` draft before touching the magic wand.
3. Add structure and performance cues in `Lyrics`.
4. Set conservative sliders for the first pass.
5. Generate one version.
6. Diagnose one thing to change.
7. Iterate with only one major variable changed at a time.

## Choosing Between Stock v5.5, Voice, and Custom Model

### Use stock v5.5 when

- you are exploring a new concept
- you want the cleanest read on the prompt itself
- you do not need your own singing voice or catalog fingerprint

### Use Voice when

- the song should sound like you singing it
- lyric delivery and vocal identity are the main priority
- you want the arrangement to change but the singer to stay recognizable

### Use a Custom Model when

- you want the arrangement, harmonic language, and production taste to stay closer to your own catalog
- you have at least six owned songs that reflect the target sound
- you are building a repeatable house sound rather than a one-off experiment

### Use both only deliberately

Inference: v5.5 gives you multiple personalization levers now. Do not stack `Voice`, `Custom Model`, aggressive `My Taste`, and high-constraining sliders on the first pass unless you already know why each control is needed. Start simpler, then layer personalization.

## How To Fill Each v5.5 Field

### Styles

Treat `Styles` as the production brief, not the lyric sheet.

Include:

- genre and subgenre
- mood and energy
- rhythm or BPM feel
- instrumentation
- vocal character
- mix or era texture
- arrangement motion

Keep it concrete. Good v5.5 style text usually reads like a short creative brief, not a bag of disconnected tags.

Repo heuristic:

- keep the first-pass `Styles` box under roughly `500` characters
- lead with overall vibe, groove, and 3-5 high-impact production anchors
- avoid lyric-like phrases or quoted hook ideas inside `Styles`
- if the magic wand expansion gets too long, trim it back instead of keeping every detail

Inference: the old v4.5 Help articles on detailed style instructions and better prompts in the lyrics box still map well to v5.5 because the current My Taste flow augments text you already place in `Styles`, rather than replacing the need for clear direction.

#### Working style template

```text
[genre/subgenre], [mood], [tempo or groove], [core instrumentation],
[vocal character], [mix texture], [arrangement movement]
```

#### Example

```text
Dancefloor drum and bass, tense but euphoric, 174 BPM, reese bass, clipped
two-step drums, glassy synth lead, short female hook vocals, polished modern
festival mix, clear build-drop contrast with a bigger second drop
```

### My Taste and the magic wand

Use the magic wand after your first draft, not before.

Good use:

- draft your own style text
- press the wand
- keep the added specificity that helps
- delete any personalization that pulls the song away from the actual brief

Bad use:

- pressing the wand into an empty box and letting personalization define the whole song
- keeping a long wand-expanded paragraph when a tighter sub-`500`-character brief says the same thing more clearly

### Lyrics

Treat `Lyrics` as the place for:

- sung words
- section headers
- section-level vocal or energy direction
- instrumental section maps when making an instrumental

Recommended grammar:

- non-sung instructions in `[]`
- sung support vocals in `()`
- lead vocal lines as plain text
- standalone `...` lines only when you need padding to keep sparse sections from collapsing together

#### Vocal-song skeleton

```text
[Verse 1 | Close, controlled delivery]
Line one
Line two

[Pre-Chorus | Rising tension]
Line one
Line two

[Chorus | Wider, louder]
Hook line
(support vocal)
Hook line

[Verse 2]
...
```

#### Instrumental skeleton

```text
[Intro | Instrumental | Filtered pads, sub pulse]
[Build | Instrumental | Snare rise, arp lift]
[Drop | Instrumental | Full drums, reese hook, lead synth]
[Breakdown | Instrumental | Pads, impacts, reduced drums]
[Drop 2 | Instrumental | Hook variation, wider lead]
[Outro | Instrumental | Tail and decay]
```

Use `Lyrics` to clarify section boundaries even for instrumental tracks. Do not leave the box empty if structure matters. If Suno keeps merging sparse adjacent sections, add a standalone `...` spacer line inside those sections as padding.

### Exclude Styles

Put hard negatives here instead of writing `no <genre>` inside the main style text whenever possible.

Reason:

- clearer separation of intent
- less risk of anchoring the model toward the sound you were trying to avoid

### Creative Sliders

For first passes, start conservative.

#### Weirdness

- Official Suno baseline: `50%` is the "normal expected" result.
- Practical UI range: `0-100`, but most repeatable work lives inside `20-65`.
- `20-35`: best general first pass
- `15-20`: low-novelty control band for preservation or tighter DnB exclude discipline
- `35-55`: balanced exploration
- `55-70`: deliberate experimentation
- `70+`: high-risk novelty / chaos-hunting only

#### Style Influence

- Practical UI range: `0-100`, but most repeatable work lives inside `45-80`.
- `45-65`: balanced control
- `65-80`: genre-locked sweet spot
- `80+`: can become too rigid and may start pulling `Styles` prose into sung lines

#### Audio Influence

- only relevant when using source audio
- `50-65`: good first pass
- raise it when the source identity disappears
- lower it when the result feels trapped by the source

#### Genre starting windows (repo heuristics, not official presets)

- Pop / R&B / singer-songwriter: Weirdness `20-30`, Style Influence `70-80`
- Hip-hop / boom bap / trap: Weirdness `15-35`, Style Influence `68-80`
- Dancefloor DnB / EDM: Weirdness `20-30`, Style Influence `70-80`
- Cinematic / ambient / post-rock: Weirdness `25-45`, Style Influence `55-70`
- Experimental / glitch / hyperpop: Weirdness `45-70`, Style Influence `40-65`

Working rule: if the song keeps drifting, raise `Style Influence` before you raise `Weirdness`. If the song feels locked and repetitive, lower `Style Influence` before pushing `Weirdness` higher. If `Styles` text starts getting sung, shorten the `Styles` brief and pull `Style Influence` back under `80` before rewriting the `Lyrics`.

See `docs/reference/suno/creative-sliders-reference.md` for the repo's fuller slider notes.

### Sample Prompt and audio-guided creation

Only use `Sample Prompt` when you are building from `Sounds` or uploaded audio.

Use it to explain:

- what the source audio should do in the final song
- what should be preserved
- what should change

Do not use it for:

- lyrics
- the whole style brief
- negative genre bans

#### Example sample prompt

```text
Use the uploaded sound as the core hook motif, preserve its rhythmic contour
and airy texture, then expand it into a full dancefloor drum and bass track
with a clean intro, lift, and larger second drop.
```

## Prompt Patterns That Work Well In v5.5

### Pattern 1: Short creative brief

Best for most first passes.

```text
Melancholic synthpop, midtempo, warm analog pads, dry drum machine groove,
close female lead vocal, soft chorus widener, intimate verses that bloom into
an anthemic final chorus.
```

### Pattern 2: Section-aware style brief

Best when structure or pacing matters.

```text
Dark cinematic trap-soul, sparse verse with sub and rimshot, wider pre-chorus,
massive chorus lift with stacked harmonies, glossy but heavy low end, detailed
transition FX, modern streaming-ready mix.
```

### Pattern 3: Manual brief plus My Taste augmentation

Best when you want personalization without surrendering direction.

1. Write your manual style brief.
2. Use the magic wand.
3. Compare the augmented text against your intent.
4. Trim anything that changed the brief instead of sharpening it.

## Iteration Playbook For v5.5

### If the prompt is right but the exact song is wrong

Use `Inspire` for a broader reinterpretation.

### If the song is close and needs targeted changes

Use `Remix` or `Song Editor`.

### If the instrumental works and needs a topline

Use `Add Vocals`.

### If the source audio is good but the full song is not

Keep the source audio and change only one of:

- `Sample Prompt`
- `Styles`
- slider values

### If you want reproducible learning

Save:

- model choice
- whether Voice or Custom Model was used
- final `Styles`
- final `Lyrics`
- slider settings
- whether My Taste augmentation was used

## Common Mistakes In v5.5

### Mistake: Letting personalization replace intent

Fix: draft your own `Styles` first, then use My Taste as an editing pass.

### Mistake: Mixing field responsibilities

Fix:

- `Styles` owns production direction
- `Lyrics` owns words and section guidance
- `Sample Prompt` owns source-audio transformation

### Mistake: Starting with too many constraints

Fix: begin with stock v5.5, moderate sliders, and no stacked personalization unless you have a reason.

### Mistake: Writing negative genre bans into the prompt body

Fix: move hard negatives into `Exclude Styles`.

### Mistake: Leaving the lyrics box unstructured

Fix: use clear section headers, keep support vocals in `()`, and add standalone `...` spacer lines when sparse sections keep collapsing together.

### Mistake: Using Audio Influence without source audio

Fix: leave it blank unless the run actually starts from Sounds or an upload.

## Legacy Note

Older community guidance for `v4.5` and `v5` is still useful for detailed prompting, lyrics-box structure, and slider behavior, but treat it as supporting context rather than the default product surface. The current repo default is the v5.5 creation flow released on March 26, 2026.

## Sources

- Suno Blog: [Suno v5.5: More Expressive. More You.](https://suno.com/blog/v5-5)
- Suno Help: [v5.5: Voices, Custom models & My Taste](https://help.suno.com/en/categories/2327233-v-5-5-voices-custom-models-my-taste)
- Suno Help: [Custom Models in v5.5](https://help.suno.com/en/articles/11362497)
- Suno Help: [My Taste](https://help.suno.com/en/articles/11362561)
- Suno Help: [What are Personas?](https://help.suno.com/en/articles/3484161)
- Suno Help: [Add Vocals](https://help.suno.com/en/articles/6882817)
- Suno Help: [Inspire](https://help.suno.com/en/articles/6882753)
- Suno Help: [Create in V4.5: Better Prompts in Lyrics](https://help.suno.com/en/articles/5782977)
- Suno reference notes in this repo:
  - `docs/reference/suno/creative-sliders-reference.md`
  - `docs/reference/suno/sounds-sample-workflow.md`
  - `docs/reference/suno/remix-and-inspire-workflows.md`
