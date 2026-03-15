# API Mapping Contract

The runtime mapping file lives at `configs/suno_api_mapping.template.json`.

## Required Sections

- `api.base_url`
- `api.created_songs_endpoint`
- `api.http_method` (`GET` only)
- `api.headers`
- `api.page_size_param`
- `api.cursor_param`
- `response.songs_path`
- `response.next_cursor_path`
- `response.fields` (all required keys below)

## Required `response.fields` keys

- `song_id`
- `title`
- `created_at`
- `likes`
- `is_cover`
- `is_remaster`
- `is_sample_derived`
- `depends_on_existing`
- `is_uploaded`
- `style_prompt`
- `exclude_styles`
- `weirdness`
- `style_influence`
- `lyrics`

## Path Syntax

Dot-path traversal supports nested objects and list indexes.

- object key: `result.items`
- list index: `result.items.0`
- nested field in list item: `result.items.0.title`

Invalid or missing path segments raise validation errors during fetch/normalize.

## Bool Normalization

Configured in `normalization.truthy_values` and `normalization.falsy_values`.

- truthy default: `true,1,yes,y,on`
- falsy default: `false,0,no,n,off`

Unrecognized or missing values normalize to `null`, and strict filtering rejects those rows.
