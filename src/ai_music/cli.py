from __future__ import annotations

import json
import shutil
from dataclasses import asdict
from pathlib import Path
from typing import Any

import typer

from ai_music.analyze.playlist_profiles import compute_overlaps, compute_playlist_stats
from ai_music.config import dump_summary_json, env_doctor_summary, get_app_config
from ai_music.enrich.lastfm import LastFMClient
from ai_music.enrich.musicbrainz import MusicBrainzClient
from ai_music.io.csv_playlists import load_all_playlists
from ai_music.io.files import read_json, slugify, write_csv, write_json, write_text
from ai_music.llm.openrouter_client import OpenRouterClient
from ai_music.media.indexer import index_media_files
from ai_music.media.matching import match_media_to_playlist
from ai_music.normalize.tracks import dedupe_normalized_rows, fuzzy_candidates, normalize_rows
from ai_music.workflows.docs_to_prompts import build_prompt_briefs_from_docs, index_docs, render_prompt_artifacts
from ai_music.workflows.playlist_to_guide import build_guide_for_playlist
from ai_music.workflows.stem_split_batch import run_stem_split_batch


app = typer.Typer(help="AI music workflow CLI")
env_app = typer.Typer(help="Environment checks")
provider_app = typer.Typer(help="Provider smoke tests")
docs_app = typer.Typer(help="Docs ingestion")
prompt_app = typer.Typer(help="Prompt workflows")
playlists_app = typer.Typer(help="Playlist ingest/normalize/analyze")
metadata_app = typer.Typer(help="Metadata enrichment")
guide_app = typer.Typer(help="Playlist-specific guide generation")
media_app = typer.Typer(help="Media indexing and matching")
stems_app = typer.Typer(help="Stem split workflows")

app.add_typer(env_app, name="env")
app.add_typer(provider_app, name="provider")
app.add_typer(docs_app, name="docs")
app.add_typer(prompt_app, name="prompt")
app.add_typer(playlists_app, name="playlists")
app.add_typer(metadata_app, name="metadata")
app.add_typer(guide_app, name="guide")
app.add_typer(media_app, name="media")
app.add_typer(stems_app, name="stems")


def _cfg():
    return get_app_config()


def _json_echo(data: dict[str, Any]) -> None:
    typer.echo(json.dumps(data, indent=2, ensure_ascii=False))


def _load_raw_rows(cfg) -> list[dict[str, Any]]:
    path = cfg.data_dir / "staging" / "raw_playlists.json"
    if not path.exists():
        raise FileNotFoundError("Missing raw playlist data. Run `playlists ingest` first.")
    return read_json(path)


def _load_normalized_rows(cfg) -> list[dict[str, Any]]:
    path = cfg.data_dir / "normalized" / "playlist_rows.normalized.json"
    if not path.exists():
        raise FileNotFoundError("Missing normalized rows. Run `playlists normalize` first.")
    return read_json(path)


def _load_canonical_tracks(cfg) -> list[dict[str, Any]]:
    path = cfg.data_dir / "normalized" / "tracks.canonical.json"
    if not path.exists():
        raise FileNotFoundError("Missing canonical tracks. Run `playlists normalize` first.")
    return read_json(path)


@env_app.command("doctor")
def env_doctor() -> None:
    """Check Python/tooling/provider key presence without printing secrets."""
    summary = env_doctor_summary()
    write_json(_cfg().outputs_dir / "reports" / "env_doctor.json", summary)
    _json_echo(summary)


@provider_app.command("smoke-test")
def provider_smoke_test(
    provider: str = typer.Option(..., "--provider", "-p", help="openrouter|fal|suno"),
    online: bool = typer.Option(True, help="Attempt network connectivity checks where supported."),
) -> None:
    cfg = _cfg()
    p = provider.lower()
    result: dict[str, Any] = {"provider": p, "ok": False, "mode": "smoke-test", "notes": []}
    if p == "openrouter":
        if not cfg.providers.openrouter_api_key:
            result["notes"].append("OPENROUTER_API_KEY missing.")
        elif online:
            try:
                client = OpenRouterClient(cfg.providers.openrouter_api_key, timeout=15)
                data = client.list_models()
                models = data.get("data", [])
                result["ok"] = True
                result["model_count"] = len(models)
                result["notes"].append("Listed models successfully.")
            except Exception as exc:  # noqa: BLE001
                result["notes"].append(f"OpenRouter connectivity failed: {exc}")
        else:
            result["ok"] = True
            result["notes"].append("Key present; online check skipped.")
    elif p == "fal":
        if not cfg.providers.fal_api_key:
            result["notes"].append("FAL_API_KEY missing.")
        else:
            result["ok"] = True
            result["notes"].append("FAL key present.")
            if online:
                try:
                    import httpx

                    resp = httpx.get("https://fal.run", timeout=10)
                    result["fal_run_status"] = resp.status_code
                    result["notes"].append("fal.run reachable.")
                except Exception as exc:  # noqa: BLE001
                    result["ok"] = False
                    result["notes"].append(f"fal.run reachability check failed: {exc}")
    elif p == "suno":
        result["ok"] = bool(cfg.providers.suno_api_key)
        result["notes"].append(
            "Suno phase-1 smoke test is credential/config validation only (no generation submission)."
        )
        if not result["ok"]:
            result["notes"].append("SUNO_API_KEY missing.")
    else:
        raise typer.BadParameter("Provider must be one of: openrouter, fal, suno")
    out_path = cfg.outputs_dir / "reports" / f"provider_smoke_{slugify(p)}.json"
    write_json(out_path, result)
    _json_echo(result)


@docs_app.command("index")
def docs_index() -> None:
    cfg = _cfg()
    result = index_docs(cfg)
    _json_echo(result)


@prompt_app.command("build-from-docs")
def prompt_build_from_docs(
    no_llm: bool = typer.Option(False, "--no-llm", help="Disable LLM calls and use fallback deterministic generation."),
    model: str | None = typer.Option(None, "--model"),
    suno_model: str | None = typer.Option(
        None,
        "--suno-model",
        help="Optional override for Suno style/lyrics fragment generation (e.g. a Gemini model via OpenRouter).",
    ),
    max_attempts: int = typer.Option(2, min=1, max=5),
) -> None:
    cfg = _cfg()
    result = build_prompt_briefs_from_docs(
        cfg,
        use_llm=not no_llm,
        model=model,
        suno_model=suno_model,
        max_attempts=max_attempts,
    )
    _json_echo(result)


@prompt_app.command("render")
def prompt_render(
    provider: str = typer.Option(..., "--provider", help="suno|fal|openrouter"),
) -> None:
    cfg = _cfg()
    result = render_prompt_artifacts(cfg, provider=provider)
    _json_echo(result)


@prompt_app.command("pack")
def prompt_pack(
    source: str = typer.Option("docs", "--source", help="Currently only `docs` is supported."),
    no_llm: bool = typer.Option(False, "--no-llm"),
    suno_model: str | None = typer.Option(
        None,
        "--suno-model",
        help="Optional frontier/specialized model for Suno style+lyrics fragments.",
    ),
) -> None:
    if source != "docs":
        raise typer.BadParameter("Only `--source docs` is supported in MVP.")
    cfg = _cfg()
    idx = index_docs(cfg)
    built = build_prompt_briefs_from_docs(cfg, use_llm=not no_llm, suno_model=suno_model)
    rendered = render_prompt_artifacts(cfg, provider=None)
    _json_echo({"index": idx, "built": built, "rendered": rendered})


@playlists_app.command("ingest")
def playlists_ingest() -> None:
    cfg = _cfg()
    rows = load_all_playlists(cfg.playlists_dir)
    row_dicts = [asdict(r) for r in rows]
    out_path = cfg.data_dir / "staging" / "raw_playlists.json"
    write_json(out_path, row_dicts)
    by_file: dict[str, int] = {}
    for row in row_dicts:
        by_file[row["source_file"]] = by_file.get(row["source_file"], 0) + 1
    report_lines = [
        "# Playlist Ingest Report",
        "",
        f"- Files: {len(by_file)}",
        f"- Rows: {len(row_dicts)}",
        "",
        "## Per File",
        "",
        *[f"- `{name}`: {count}" for name, count in sorted(by_file.items())],
    ]
    write_text(cfg.outputs_dir / "reports" / "playlist_ingest_report.md", "\n".join(report_lines))
    _json_echo({"rows": len(row_dicts), "files": len(by_file), "output_path": str(out_path.relative_to(cfg.root_dir))})


@playlists_app.command("normalize")
def playlists_normalize(
    fuzzy_threshold: float = typer.Option(0.9, "--fuzzy-threshold", min=0.5, max=0.99),
) -> None:
    cfg = _cfg()
    raw_rows = _load_raw_rows(cfg)
    # Convert dict rows back into lightweight objects only where needed. Normalizer accepts dataclass rows.
    from ai_music.models.types import RawPlaylistRow

    rows = [RawPlaylistRow(**r) for r in raw_rows]
    normalized = normalize_rows(rows)
    canonical, alias_map = dedupe_normalized_rows(normalized)
    fuzzy = fuzzy_candidates(normalized, threshold=fuzzy_threshold)
    write_json(cfg.data_dir / "normalized" / "playlist_rows.normalized.json", normalized)
    write_json(cfg.data_dir / "normalized" / "tracks.canonical.json", canonical)
    write_json(cfg.data_dir / "normalized" / "track_alias_map.json", alias_map)
    if fuzzy:
        write_csv(
            cfg.outputs_dir / "reports" / "playlist_fuzzy_candidates.csv",
            fuzzy,
            ["left_source_row_id", "right_source_row_id", "left_track_name", "right_track_name", "score"],
        )
    report = {
        "raw_row_count": len(raw_rows),
        "normalized_row_count": len(normalized),
        "canonical_track_count": len(canonical),
        "duplicate_count": len(normalized) - len(canonical),
        "fuzzy_candidate_rows": len(fuzzy),
    }
    write_json(cfg.outputs_dir / "reports" / "playlist_normalize_report.json", report)
    _json_echo(report)


@metadata_app.command("enrich")
def metadata_enrich(
    online: bool = typer.Option(False, "--online", help="Perform API calls (MusicBrainz/Last.fm)."),
    limit: int = typer.Option(50, "--limit", min=1),
    musicbrainz: bool = typer.Option(True, "--musicbrainz/--no-musicbrainz"),
    lastfm: bool = typer.Option(True, "--lastfm/--no-lastfm"),
) -> None:
    cfg = _cfg()
    tracks = _load_canonical_tracks(cfg)
    if limit:
        tracks = tracks[:limit]
    mb_client = MusicBrainzClient(cfg.providers.musicbrainz_user_agent, cfg.cache_dir) if musicbrainz and online else None
    lf_client = LastFMClient(cfg.providers.lastfm_api_key, cfg.cache_dir) if lastfm and online and cfg.providers.lastfm_api_key else None

    enriched: list[dict[str, Any]] = []
    stats = {
        "track_count": len(tracks),
        "musicbrainz_queries": 0,
        "lastfm_queries": 0,
        "musicbrainz_cache_hits": 0,
        "lastfm_cache_hits": 0,
        "lastfm_key_present": bool(cfg.providers.lastfm_api_key),
        "online": online,
    }
    for trk in tracks:
        artist = (trk.get("canonical_artists") or [None])[0]
        title = trk.get("canonical_title") or ""
        record: dict[str, Any] = {"track_id": trk["track_id"], "canonical_title": title, "artist": artist, "providers": {}}
        if mb_client is not None:
            query = f'recording:"{title}"'
            if artist:
                query += f' AND artist:"{artist}"'
            try:
                mb = mb_client.search_recording(query)
                stats["musicbrainz_queries"] += 1
                if mb.get("cache_hit"):
                    stats["musicbrainz_cache_hits"] += 1
                data = mb["data"]
                top = (data.get("recordings") or [None])[0]
                record["providers"]["musicbrainz"] = {
                    "cache_hit": mb.get("cache_hit", False),
                    "top_match": top,
                    "count": len(data.get("recordings", [])),
                }
            except Exception as exc:  # noqa: BLE001
                record["providers"]["musicbrainz_error"] = str(exc)
        if lf_client is not None and artist and title:
            try:
                lf = lf_client.track_info(artist, title)
                stats["lastfm_queries"] += 1
                if lf.get("cache_hit"):
                    stats["lastfm_cache_hits"] += 1
                top_tags = []
                track_data = lf["data"].get("track", {})
                tags = ((track_data.get("toptags") or {}).get("tag")) or []
                for tag in tags[:10]:
                    if isinstance(tag, dict) and tag.get("name"):
                        top_tags.append(tag["name"])
                record["providers"]["lastfm"] = {
                    "cache_hit": lf.get("cache_hit", False),
                    "name": track_data.get("name"),
                    "artist": ((track_data.get("artist") or {}) if isinstance(track_data.get("artist"), dict) else {"name": track_data.get("artist")}).get("name"),
                    "top_tags": top_tags,
                }
            except Exception as exc:  # noqa: BLE001
                record["providers"]["lastfm_error"] = str(exc)
        enriched.append(record)

    out_path = cfg.data_dir / "enriched" / "track_enrichment.json"
    write_json(out_path, {"records": enriched, "stats": stats})
    coverage_lines = [
        "# Metadata Coverage",
        "",
        f"- Tracks processed: {stats['track_count']}",
        f"- Online mode: {stats['online']}",
        f"- MusicBrainz queries: {stats['musicbrainz_queries']} (cache hits: {stats['musicbrainz_cache_hits']})",
        f"- Last.fm queries: {stats['lastfm_queries']} (cache hits: {stats['lastfm_cache_hits']})",
        f"- LASTFM_API_KEY present: {stats['lastfm_key_present']}",
    ]
    write_text(cfg.outputs_dir / "reports" / "metadata_coverage.md", "\n".join(coverage_lines))
    _json_echo({"output_path": str(out_path.relative_to(cfg.root_dir)), "stats": stats})


@playlists_app.command("analyze")
def playlists_analyze() -> None:
    cfg = _cfg()
    raw_rows = _load_raw_rows(cfg)
    normalized_rows = _load_normalized_rows(cfg)
    stats = compute_playlist_stats(raw_rows, normalized_rows)
    overlaps = compute_overlaps(normalized_rows)
    profiles_payload = {"profiles": list(stats.values())}
    write_json(cfg.data_dir / "analysis" / "playlist_profiles.json", profiles_payload)
    write_json(cfg.data_dir / "analysis" / "playlist_overlaps.json", overlaps)

    stats_lines = ["# Playlist Stats", ""]
    for profile in sorted(stats.values(), key=lambda x: x["playlist_name"].lower()):
        stats_lines.extend(
            [
                f"## {profile['playlist_name']}",
                "",
                f"- Genre family: `{profile['genre_family']}`",
                f"- Track count: `{profile['track_count']}`",
                f"- Dominant tags: {', '.join(profile.get('dominant_tags', []))}",
                f"- Top artists: {', '.join([a for a, _ in profile.get('top_artists', [])[:5]]) or '(none parsed)'}",
                "",
            ]
        )
    write_text(cfg.outputs_dir / "reports" / "playlist_stats.md", "\n".join(stats_lines))

    overlap_lines = ["# Playlist Overlaps", ""]
    overlap_lines.extend([f"- `{r['left']}` <-> `{r['right']}`: {r['shared_count']}" for r in overlaps] or ["- None"])
    write_text(cfg.outputs_dir / "reports" / "playlist_overlaps.md", "\n".join(overlap_lines))
    _json_echo({"playlist_count": len(stats), "overlap_pairs": len(overlaps)})


@guide_app.command("build-from-playlist")
def guide_build_from_playlist(
    playlist: str = typer.Option(..., "--playlist"),
    no_llm: bool = typer.Option(False, "--no-llm"),
) -> None:
    cfg = _cfg()
    result = build_guide_for_playlist(cfg, playlist_name=playlist, use_llm=not no_llm)
    _json_echo(result)


@media_app.command("index")
def media_index() -> None:
    cfg = _cfg()
    files = index_media_files(cfg.media_dir)
    payload = {
        "root": str(cfg.media_dir),
        "file_count": len(files),
        "total_bytes": sum(f["size_bytes"] for f in files),
        "files": files,
    }
    out_path = cfg.data_dir / "analysis" / "media_index.json"
    write_json(out_path, payload)
    report = [
        "# Media Inventory",
        "",
        f"- File count: {payload['file_count']}",
        f"- Total bytes: {payload['total_bytes']}",
        "",
        "## Extensions",
        "",
    ]
    ext_counts: dict[str, int] = {}
    for row in files:
        ext_counts[row["extension"]] = ext_counts.get(row["extension"], 0) + 1
    report.extend([f"- `{ext}`: {count}" for ext, count in sorted(ext_counts.items())])
    write_text(cfg.outputs_dir / "reports" / "media_inventory.md", "\n".join(report))
    _json_echo({"file_count": payload["file_count"], "output_path": str(out_path.relative_to(cfg.root_dir))})


@media_app.command("match-to-playlist")
def media_match_to_playlist(
    playlist: str | None = typer.Option(None, "--playlist"),
) -> None:
    cfg = _cfg()
    media_index_path = cfg.data_dir / "analysis" / "media_index.json"
    if not media_index_path.exists():
        raise typer.BadParameter("Missing media index. Run `media index` first.")
    media_rows = read_json(media_index_path)["files"]
    normalized_rows = _load_normalized_rows(cfg)
    result = match_media_to_playlist(media_rows, normalized_rows, playlist_name=playlist)
    slug = slugify(playlist or "all")
    out_json = cfg.outputs_dir / "media" / f"media_playlist_match_{slug}.json"
    out_csv = cfg.outputs_dir / "media" / f"media_playlist_match_review_{slug}.csv"
    write_json(out_json, result)
    review_rows = [
        {
            "media_path": item["media_path"],
            "best_track_name": item.get("best_track_name"),
            "best_score": item.get("best_score"),
            "reason": item["reason"],
        }
        for item in result["unresolved"]
    ]
    if review_rows:
        write_csv(out_csv, review_rows, ["media_path", "best_track_name", "best_score", "reason"])
    _json_echo({"summary": result["summary"], "output_path": str(out_json.relative_to(cfg.root_dir))})


@stems_app.command("split")
def stems_split(
    backend: str = typer.Option("uvr", "--backend"),
    profile: str = typer.Option("4stem", "--profile"),
    device: str = typer.Option("cuda", "--device"),
    dry_run: bool = typer.Option(True, "--dry-run/--no-dry-run"),
    overwrite: bool = typer.Option(False, "--overwrite"),
    limit: int | None = typer.Option(None, "--limit"),
) -> None:
    cfg = _cfg()
    result = run_stem_split_batch(
        cfg,
        backend=backend,
        profile=profile,
        device=device,
        dry_run=dry_run,
        overwrite=overwrite,
        limit=limit,
    )
    _json_echo(result)


@stems_app.command("report")
def stems_report() -> None:
    cfg = _cfg()
    manifests = sorted((cfg.outputs_dir / "stems").glob("stem_manifest_*.json"))
    if not manifests:
        _json_echo({"manifests": [], "message": "No stem manifests found."})
        return
    manifest_summaries: list[dict[str, Any]] = []
    for path in manifests:
        data = read_json(path)
        status_counts: dict[str, int] = {}
        for job in data.get("jobs", []):
            status = job.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        manifest_summaries.append(
            {
                "file": str(path.relative_to(cfg.root_dir)),
                "backend": data.get("backend"),
                "profile": data.get("profile"),
                "dry_run": data.get("dry_run"),
                "job_count": data.get("job_count"),
                "status_counts": status_counts,
            }
        )
    _json_echo({"manifests": manifest_summaries, "latest": manifest_summaries[-1]})


@app.command("version")
def version() -> None:
    from ai_music import __version__

    typer.echo(__version__)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
