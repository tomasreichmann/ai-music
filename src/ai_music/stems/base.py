from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class StemSplitResult:
    status: str
    runtime_ms: int
    outputs: dict[str, str]
    command: list[str]
    error: str | None = None


class StemSplitter(Protocol):
    backend_name: str

    def split(
        self,
        input_path: str,
        output_dir: str,
        profile: str = "4stem",
        device: str = "cuda",
        dry_run: bool = False,
        overwrite: bool = False,
    ) -> StemSplitResult: ...
