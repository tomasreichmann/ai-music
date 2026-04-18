# Suno v5.5 Song Creation Reference

As checked on April 1, 2026.

This is the repo's quick reference for the current Suno default workflow.

## Official v5.5 Features

- `v5.5` launched on March 26, 2026.
- `Voices` lets Pro and Premier users create with their own verified singing voice.
- `Custom Models` let Pro and Premier users train up to three private models from owned songs.
- `My Taste` is available to all users and is enabled by default.
- In `Create`, the `Voices` control replaced the old top-level `Personas` control. Style Personas still exist inside the Voices area.

## Repo Default Decisions

### Model choice

- default: stock `v5.5`
- switch to `Voice` only when singer identity is a main requirement
- switch to a `Custom Model` only when matching your own catalog is more important than neutral exploration

### Field ownership

- `Styles`: sonic brief
- `Lyrics`: sung text, section structure, section-level direction
- `Sample Prompt`: source-audio transformation brief only
- `Exclude Styles`: hard negatives

### My Taste usage

- assume it is available
- assume it is on by default in the product
- use it after writing a manual style draft, not instead of one

### Creative sliders

- `Weirdness`: UI `0-100`, but start `20-35` for most work; use `18-24` as a lower-control band when preservation or DnB exclude discipline matters
- `Style Influence`: UI `0-100`, but start `65-80` for genre-locked work; `80+` is a caution zone because style-box prose may start leaking into sung lines
- `Audio Influence`: only when generating from source audio, start `50-65`

### Styles text

- keep the first-pass `Styles` brief under roughly `500` characters
- focus on overall vibe plus a few high-impact sonic anchors
- avoid lyric-like phrases inside `Styles`

## Working Inference For v5.5 Prompting

Suno has not yet published a standalone v5.5 prompt-writing article that replaces all of the older v4.5 creation docs. The repo therefore treats these older official guidance patterns as still relevant in v5.5:

- detailed `Styles` text helps when genre execution matters
- putting structure and section cues in `Lyrics` improves controllability
- slider changes should be conservative on first pass

This is a repo inference based on the current v5.5 UI, the current My Taste flow, and the still-relevant official 2025 creation docs.

## Source Links

- Suno Blog: [Suno v5.5: More Expressive. More You.](https://suno.com/blog/v5-5)
- Suno Help: [v5.5: Voices, Custom models & My Taste](https://help.suno.com/en/categories/2327233-v-5-5-voices-custom-models-my-taste)
- Suno Help: [Custom Models in v5.5](https://help.suno.com/en/articles/11362497)
- Suno Help: [My Taste](https://help.suno.com/en/articles/11362561)
- Suno Help: [What are Personas?](https://help.suno.com/en/articles/3484161)
