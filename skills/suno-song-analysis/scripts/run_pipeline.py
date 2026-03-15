#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Suno fetch/analyze/adapt pipeline via ai_music CLI.")
    parser.add_argument("--style-query", required=True, help='Example: "clinical dnb"')
    parser.add_argument("--theme", required=True, help='Example: "flying by a private jet"')
    parser.add_argument(
        "--mapping-config",
        default="configs/suno_api_mapping.template.json",
        help="Path to mapping config JSON.",
    )
    parser.add_argument(
        "--aliases-config",
        default="configs/suno_style_aliases.json",
        help="Path to alias config JSON.",
    )
    parser.add_argument("--window-size", type=int, default=500)
    parser.add_argument("--page-size", type=int, default=None)
    parser.add_argument(
        "--fixture-page",
        action="append",
        default=[],
        help="Repeatable fixture page path for offline smoke runs.",
    )
    parser.add_argument("--model", default=None, help="Optional OpenRouter model override.")
    args = parser.parse_args()

    cmd = [
        sys.executable,
        "-m",
        "ai_music.cli",
        "suno",
        "mine",
        "--style-query",
        args.style_query,
        "--theme",
        args.theme,
        "--mapping-config",
        args.mapping_config,
        "--aliases-config",
        args.aliases_config,
        "--window-size",
        str(args.window_size),
    ]
    if args.page_size is not None:
        cmd.extend(["--page-size", str(args.page_size)])
    for page in args.fixture_page:
        cmd.extend(["--fixture-page", str(Path(page))])
    if args.model:
        cmd.extend(["--model", args.model])

    result = subprocess.run(cmd, check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
