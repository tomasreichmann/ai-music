from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

from ai_music.io.files import read_text, stable_hash
from ai_music.models.types import GuideChunk


HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def _tag_chunk(text: str, heading_path: list[str]) -> list[str]:
    corpus = " ".join(heading_path + [text[:600]]).lower()
    tags: set[str] = set()
    if any(k in corpus for k in ["prompt", "suno", "meta tag", "gmiv"]):
        tags.add("prompting")
    if any(k in corpus for k in ["lyric", "chorus", "verse", "vocal"]):
        tags.add("lyrics")
    if any(k in corpus for k in ["arrangement", "structure", "drop", "breakdown", "build"]):
        tags.add("arrangement")
    if any(k in corpus for k in ["mix", "master", "eq", "compression"]):
        tags.add("mixing-mastering")
    if any(k in corpus for k in ["bass", "drum", "sound design", "instrument"]):
        tags.add("production-technique")
    if any(k in corpus for k in ["workflow", "process", "testing methodology"]):
        tags.add("workflow")
    return sorted(tags) or ["general"]


def chunk_markdown(path: Path) -> list[GuideChunk]:
    text = read_text(path)
    lines = text.splitlines()
    heading_stack: list[str] = []
    chunk_lines: list[str] = []
    current_heading_path: list[str] = [path.stem]
    chunks: list[GuideChunk] = []

    def flush() -> None:
        nonlocal chunk_lines, current_heading_path
        body = "\n".join(chunk_lines).strip()
        if not body:
            chunk_lines = []
            return
        chunk_id = f"gc_{stable_hash(path.name, ' > '.join(current_heading_path), body[:500])}"
        chunks.append(
            GuideChunk(
                chunk_id=chunk_id,
                source_file=path.name,
                heading_path=current_heading_path.copy(),
                text=body,
                tags=_tag_chunk(body, current_heading_path),
                token_estimate=max(1, len(body.split())),
            )
        )
        chunk_lines = []

    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            flush()
            level = len(m.group(1))
            title = m.group(2).strip()
            while len(heading_stack) >= level:
                heading_stack.pop()
            heading_stack.append(title)
            current_heading_path = [path.stem] + heading_stack.copy()
            continue
        chunk_lines.append(line)
    flush()
    return chunks


def iter_doc_chunks(doc_paths: Iterable[Path]) -> list[GuideChunk]:
    chunks: list[GuideChunk] = []
    for path in doc_paths:
        chunks.extend(chunk_markdown(path))
    return chunks
