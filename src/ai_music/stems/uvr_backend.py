from __future__ import annotations

import shutil
import time
from pathlib import Path

from ai_music.config import AppConfig
from ai_music.io.files import write_text
from ai_music.stems.base import StemSplitResult


class UVRBackend:
    backend_name = "uvr"

    def __init__(self, cfg: AppConfig):
        self.cfg = cfg

    def _resolve_executable(self) -> str | None:
        if self.cfg.providers.uvr_executable_path:
            return self.cfg.providers.uvr_executable_path
        return shutil.which("UVR") or shutil.which("ultimatevocalremover")

    def _build_command(self, input_path: str, output_dir: str, profile: str, device: str) -> list[str]:
        exe = self._resolve_executable() or "<UVR_EXECUTABLE_PATH>"
        # UVR command line differs by distribution; keep a consistent placeholder command manifest for MVP.
        return [
            exe,
            "--input",
            input_path,
            "--output_dir",
            output_dir,
            "--profile",
            profile,
            "--device",
            device,
        ]

    def split(
        self,
        input_path: str,
        output_dir: str,
        profile: str = "4stem",
        device: str = "cuda",
        dry_run: bool = False,
        overwrite: bool = False,
    ) -> StemSplitResult:
        del overwrite  # Not used in MVP backend wrapper.
        start = time.perf_counter()
        command = self._build_command(input_path, output_dir, profile, device)
        if dry_run:
            return StemSplitResult(status="dry_run", runtime_ms=0, outputs={}, command=command)
        exe = self._resolve_executable()
        if not exe:
            return StemSplitResult(
                status="error",
                runtime_ms=int((time.perf_counter() - start) * 1000),
                outputs={},
                command=command,
                error="UVR executable not found. Set UVR_EXECUTABLE_PATH or install UVR.",
            )
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        # MVP placeholder manifest marker when UVR is installed but command execution wiring is still environment-specific.
        write_text(out_dir / "_uvr_command.txt", " ".join(command))
        return StemSplitResult(
            status="queued_manual",
            runtime_ms=int((time.perf_counter() - start) * 1000),
            outputs={},
            command=command,
            error="UVR backend wrapper generated command; automatic execution wiring depends on local UVR CLI variant.",
        )
