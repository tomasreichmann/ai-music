from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Protocol

from ai_music.config import ProviderConfig
from ai_music.video.schemas import GeneratedImageAsset


class ImageProvider(Protocol):
    provider_name: str

    def generate_image(
        self,
        *,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = 1280,
        height: int = 720,
        model: str | None = None,
    ) -> dict[str, Any] | GeneratedImageAsset: ...


@dataclass(slots=True)
class FalImageProvider:
    api_key: str
    default_model: str = "fal-ai/flux/schnell"
    provider_name: str = "fal"

    def generate_image(
        self,
        *,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = 1280,
        height: int = 720,
        model: str | None = None,
    ) -> GeneratedImageAsset:
        try:
            import fal_client
        except ImportError as exc:  # pragma: no cover - depends on optional package
            raise RuntimeError(
                "Missing `fal-client`. Install it to enable scene image generation."
            ) from exc

        previous_key = os.environ.get("FAL_KEY")
        os.environ["FAL_KEY"] = self.api_key
        try:
            arguments: dict[str, Any] = {
                "prompt": prompt,
                "image_size": {"width": width, "height": height},
            }
            if negative_prompt:
                arguments["negative_prompt"] = negative_prompt
            result = fal_client.subscribe(model or self.default_model, arguments=arguments)
        finally:
            if previous_key is None:
                os.environ.pop("FAL_KEY", None)
            else:
                os.environ["FAL_KEY"] = previous_key

        images = result.get("images") if isinstance(result, dict) else None
        first = images[0] if isinstance(images, list) and images else {}
        remote_url = str(first.get("url") or "").strip() or None
        return GeneratedImageAsset(
            provider=self.provider_name,
            model=model or self.default_model,
            remoteUrl=remote_url,
            revisedPrompt=str(result.get("prompt") or prompt),
            width=width,
            height=height,
        )


def build_image_provider(provider_name: str, providers: ProviderConfig) -> ImageProvider:
    normalized = provider_name.strip().lower()
    if normalized == "fal":
        if not providers.fal_api_key:
            raise ValueError("FAL_API_KEY is required for scene image generation.")
        return FalImageProvider(api_key=providers.fal_api_key)
    raise ValueError(f"Unsupported image provider `{provider_name}`.")


def coerce_generated_asset(payload: dict[str, Any] | GeneratedImageAsset) -> GeneratedImageAsset:
    if isinstance(payload, GeneratedImageAsset):
        return payload
    return GeneratedImageAsset.model_validate(
        {
            "provider": payload.get("provider"),
            "model": payload.get("model"),
            "remoteUrl": payload.get("remote_url") or payload.get("remoteUrl"),
            "localPath": payload.get("local_path") or payload.get("localPath"),
            "revisedPrompt": payload.get("revised_prompt") or payload.get("revisedPrompt"),
            "width": payload.get("width"),
            "height": payload.get("height"),
        }
    )
