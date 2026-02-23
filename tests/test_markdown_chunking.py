from pathlib import Path

from ai_music.io.markdown import chunk_markdown


def test_chunk_markdown_splits_by_headings(tmp_path: Path) -> None:
    md = tmp_path / "guide.md"
    md.write_text(
        "# Title\n\nIntro text\n\n## Prompting\n\nUse prompt tags\n\n## Mixing\n\nEQ and compression\n",
        encoding="utf-8",
    )
    chunks = chunk_markdown(md)
    assert len(chunks) >= 2
    assert any("prompting" in c.tags for c in chunks)
    assert any("mixing-mastering" in c.tags for c in chunks)
