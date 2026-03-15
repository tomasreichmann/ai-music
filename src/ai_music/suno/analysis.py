from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any

from ai_music.suno.mapping import normalize_query_tokens
from ai_music.suno.schemas import SunoSongRecord


_STOPWORDS = {
    "and",
    "the",
    "with",
    "for",
    "from",
    "into",
    "that",
    "this",
    "your",
    "you",
    "are",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
}


@dataclass(slots=True)
class MatchResult:
    matched: bool
    score: float
    matched_concepts: list[str]


def _normalize_phrase(text: str) -> str:
    return " ".join(text.lower().split())


def match_song_to_style_query(
    song: SunoSongRecord,
    style_query: str,
    alias_map: dict[str, list[str]],
) -> MatchResult:
    query_tokens = normalize_query_tokens(style_query)
    if not query_tokens:
        return MatchResult(matched=True, score=0.0, matched_concepts=[])

    corpus = _normalize_phrase(
        " ".join(
            [
                song.title or "",
                song.style_prompt or "",
                song.lyrics or "",
                " ".join(song.exclude_styles or []),
            ]
        )
    )

    matched_concepts: list[str] = []
    for token in query_tokens:
        variants = alias_map.get(token, [])
        candidates = [token, *variants]
        found = False
        for candidate in candidates:
            phrase = _normalize_phrase(candidate)
            if phrase and phrase in corpus:
                found = True
                break
        if found:
            matched_concepts.append(token)

    matched = len(matched_concepts) == len(query_tokens)
    score = len(matched_concepts) / max(1, len(query_tokens))
    return MatchResult(matched=matched, score=score, matched_concepts=matched_concepts)


def filter_high_signal_originals(
    songs: list[SunoSongRecord],
    min_likes: int = 1,
) -> tuple[list[SunoSongRecord], dict[str, Any]]:
    accepted: list[SunoSongRecord] = []
    reasons: defaultdict[str, int] = defaultdict(int)
    dependency_fields = (
        ("is_cover", "is_cover_true"),
        ("is_remaster", "is_remaster_true"),
        ("is_sample_derived", "is_sample_derived_true"),
        ("depends_on_existing", "depends_on_existing_true"),
        ("is_uploaded", "is_uploaded_true"),
    )

    for song in songs:
        if song.likes < min_likes:
            reasons["likes_below_threshold"] += 1
            continue

        values = [getattr(song, field_name) for field_name, _ in dependency_fields]
        if any(value is None for value in values):
            reasons["missing_dependency_flags"] += 1
            continue

        rejected = False
        for field_name, reason in dependency_fields:
            if getattr(song, field_name) is True:
                reasons[reason] += 1
                rejected = True
                break
        if rejected:
            continue
        accepted.append(song)

    report = {
        "total_count": len(songs),
        "accepted_count": len(accepted),
        "rejected_count": len(songs) - len(accepted),
        "min_likes": min_likes,
        "rejection_reasons": dict(sorted(reasons.items())),
    }
    return accepted, report


def _tokenize_style_prompt(text: str) -> list[str]:
    tokens = normalize_query_tokens(text)
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 2]


def _weighted_median(values: list[int], weights: list[int]) -> int | None:
    if not values or not weights or len(values) != len(weights):
        return None
    pairs = sorted(zip(values, weights), key=lambda x: x[0])
    total = sum(weights)
    if total <= 0:
        return None
    threshold = total / 2
    cumulative = 0
    for value, weight in pairs:
        cumulative += weight
        if cumulative >= threshold:
            return int(value)
    return int(pairs[-1][0])


def build_prompt_baseline(
    songs: list[SunoSongRecord],
    style_query: str | None,
    alias_map: dict[str, list[str]],
    top_style_tokens: int = 20,
    top_excludes: int = 12,
) -> dict[str, Any]:
    selected: list[tuple[SunoSongRecord, MatchResult]] = []
    for song in songs:
        if style_query:
            match = match_song_to_style_query(song, style_query, alias_map)
            if not match.matched:
                continue
        else:
            match = MatchResult(matched=True, score=1.0, matched_concepts=[])
        selected.append((song, match))

    if not selected:
        raise ValueError("No songs matched the requested style query after filtering.")

    style_counts: Counter[str] = Counter()
    exclude_counts: Counter[str] = Counter()
    weirdness_values: list[int] = []
    weirdness_weights: list[int] = []
    influence_values: list[int] = []
    influence_weights: list[int] = []

    for song, _ in selected:
        weight = max(song.likes, 1)
        for token in _tokenize_style_prompt(song.style_prompt):
            style_counts[token] += weight
        for exclude in song.exclude_styles:
            normalized = _normalize_phrase(exclude)
            if normalized:
                exclude_counts[normalized] += weight
        if song.weirdness is not None:
            weirdness_values.append(song.weirdness)
            weirdness_weights.append(weight)
        if song.style_influence is not None:
            influence_values.append(song.style_influence)
            influence_weights.append(weight)

    style_tokens = [token for token, _ in style_counts.most_common(top_style_tokens)]
    if style_query:
        query_tokens = [token for token in normalize_query_tokens(style_query) if token not in _STOPWORDS]
        for token in reversed(query_tokens):
            if token in style_tokens:
                style_tokens.remove(token)
            style_tokens.insert(0, token)
    excludes = [token for token, _ in exclude_counts.most_common(top_excludes)]
    weirdness = _weighted_median(weirdness_values, weirdness_weights)
    style_influence = _weighted_median(influence_values, influence_weights)

    seed_songs = [
        {
            "song_id": song.song_id,
            "title": song.title,
            "likes": song.likes,
            "style_prompt": song.style_prompt,
            "matched_concepts": match.matched_concepts,
            "match_score": round(match.score, 4),
        }
        for song, match in sorted(selected, key=lambda pair: pair[0].likes, reverse=True)
    ]

    baseline = {
        "style_prompt": ", ".join(style_tokens),
        "exclude_styles": excludes,
        "weirdness": weirdness,
        "style_influence": style_influence,
    }
    return {
        "style_query": style_query,
        "selected_count": len(selected),
        "selected_likes_total": sum(song.likes for song, _ in selected),
        "baseline": baseline,
        "seed_songs": seed_songs,
    }
