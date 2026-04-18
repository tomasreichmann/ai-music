import type { CSSProperties } from "react";
import { Img, interpolate, staticFile } from "remotion";

import { resolveMediaUrl } from "../../lib/bridge";
import { resolveBoundValue, resolveEffectBindings } from "../../lib/effects";
import type {
  EffectPresetSpec,
  LayerSpec,
  LyricLineCue,
  LyricWordCue,
  RuntimeBands,
  RuntimeState,
  RuntimeStateInput,
  VisualSegmentSpec
} from "../../lib/types";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const assetPath = (value: string): string =>
  value.startsWith("/") ? staticFile(value.slice(1)) : resolveMediaUrl(value);

export const getSegmentFilter = (effects: EffectPresetSpec[], runtime: RuntimeStateInput): string => {
  const filters: string[] = [];

  for (const effect of effects) {
    const resolved = resolveEffectBindings(effect, runtime);
    if (effect.kind === "colorGrade") {
      filters.push(`saturate(${resolved.saturation ?? 1})`);
      filters.push(`hue-rotate(${resolved.hueShift ?? 0}deg)`);
    }
    if (effect.kind === "blurChromatic") {
      filters.push(`blur(${resolved.blur ?? 0}px)`);
      filters.push(`contrast(${1 + Number(resolved.split ?? 0) * 0.08})`);
    }
    if (effect.kind === "glowBloom") {
      filters.push(`brightness(${resolved.brightness ?? 1.08})`);
    }
  }

  return filters.join(" ");
};

export const getSegmentTransform = (segment: VisualSegmentSpec, runtime: RuntimeState): string => {
  const translateY: number[] = [];
  const scale: number[] = [];

  for (const effect of segment.effects) {
    const resolved = resolveEffectBindings(effect, runtime);
    if (effect.kind === "parallax") {
      translateY.push(Number(resolved.amount ?? 0) * -0.25);
    }
    if (effect.kind === "zoomPan") {
      translateY.push(Number(resolved.offsetY ?? 0));
      scale.push(Number(resolved.scale ?? 1));
    }
  }

  const y = translateY.reduce((sum, value) => sum + value, 0);
  const nextScale = scale.at(-1) ?? 1;
  return `translate3d(0, ${y.toFixed(2)}px, 0) scale(${nextScale.toFixed(4)})`;
};

export const getLayerFilter = (layer: LayerSpec, runtime: RuntimeState): string => {
  const filters: string[] = [];
  const brightness = resolveBoundValue(layer.motion?.brightness, runtime);
  const hueRotate = resolveBoundValue(layer.motion?.hueRotate, runtime);

  if (typeof brightness === "number") {
    filters.push(`brightness(${brightness})`);
  }
  if (typeof hueRotate === "number") {
    filters.push(`hue-rotate(${hueRotate}deg)`);
  }

  return filters.join(" ");
};

export const getLayerTransform = (layer: LayerSpec, index: number, runtime: RuntimeState): string => {
  const depth = layer.depth ?? 0.5;
  const travel = interpolate(runtime.sceneProgress, [0, 1], [0, depth * -40]);
  const translateX = resolveBoundValue(layer.motion?.translateX, runtime) ?? 0;
  const translateY = resolveBoundValue(layer.motion?.translateY, runtime) ?? 0;
  const rotate = resolveBoundValue(layer.motion?.rotate, runtime) ?? 0;
  const scale = resolveBoundValue(layer.motion?.scale, runtime) ?? 1;
  const baseScale = 1 + depth * 0.04 + index * 0.01;

  return `translate3d(${translateX.toFixed(2)}px, ${(travel + translateY).toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${(baseScale * scale).toFixed(4)})`;
};

export const resolveActiveWordText = (word: LyricWordCue | null): string | null =>
  word?.text.replace(/[^\w']/g, "").toLowerCase() ?? null;

export const SceneAtmosphere = () => <div className="composition-haze" />;

export const SceneEq = ({ bands, className = "" }: { bands: RuntimeBands; className?: string }) => {
  const entries = Object.entries(bands) as Array<[keyof RuntimeBands, number]>;

  return (
    <div className={`eq-bars ${className}`.trim()} aria-hidden="true">
      {entries.map(([label, value]) => (
        <span key={label} className="eq-bar">
          <span className="eq-fill" style={{ height: `${clamp(value) * 100}%` }} />
          <small>{label}</small>
        </span>
      ))}
    </div>
  );
};

export const SceneLyrics = ({
  line,
  nextLine,
  activeWordText,
  className = "",
  backdropClassName
}: {
  line: LyricLineCue | null;
  nextLine: LyricLineCue | null;
  activeWordText: string | null;
  className?: string;
  backdropClassName?: string;
}) => {
  if (!line) {
    return null;
  }

  const words = line.text.split(/\s+/).filter(Boolean);

  return (
    <div className={className || "lyric-caption"}>
      {backdropClassName ? <div aria-hidden="true" className={backdropClassName} /> : null}
      <p>
        {words.map((word, index) => {
          const normalized = word.replace(/[^\w']/g, "").toLowerCase();
          const active = activeWordText ? normalized === activeWordText : false;
          return (
            <span key={`${word}-${index}`} className={active ? "is-active" : ""}>
              {word}
            </span>
          );
        })}
      </p>
      {nextLine ? <small>{nextLine.text}</small> : null}
    </div>
  );
};

export const SceneEffectsOverlay = ({
  scene,
  runtime,
  eqClassName
}: {
  scene: VisualSegmentSpec;
  runtime: RuntimeState;
  eqClassName?: string;
}) => {
  const flashEffect = scene.effects.find((effect) => effect.kind === "beatFlash");
  const particleEffect = scene.effects.find((effect) => effect.kind === "particlesOverlay");
  const showEq = scene.effects.some((effect) => effect.kind === "visualEqBars");
  const flashOpacity = flashEffect ? Number(resolveEffectBindings(flashEffect, runtime).opacity ?? 0) : 0;
  const particleOpacity = particleEffect ? Number(resolveEffectBindings(particleEffect, runtime).opacity ?? 0.18) : 0;

  return (
    <>
      {showEq ? <SceneEq bands={runtime.bands} className={eqClassName} /> : null}
      <div className="flash-overlay" style={{ opacity: flashOpacity }} />
      {particleEffect ? (
        <div className="particle-overlay" style={{ opacity: particleOpacity }}>
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="particle-dot"
              style={{
                left: `${(index * 7.1 + runtime.frame * 0.15) % 100}%`,
                top: `${(index * 13.4) % 100}%`,
                transform: `scale(${0.5 + (index % 5) * 0.18})`
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
};

export const MaskedLayer = ({
  layer,
  runtime,
  index,
  className = "",
  styleOverrides
}: {
  layer: LayerSpec;
  runtime: RuntimeState;
  index: number;
  className?: string;
  styleOverrides?: CSSProperties & Record<string, string | number | undefined>;
}) => {
  const maskImage = layer.maskSrc ? `url("${assetPath(layer.maskSrc)}")` : undefined;
  const maskMode = layer.maskMode ?? "alpha";
  const style: CSSProperties & Record<string, string | number | undefined> = {
    opacity: layer.opacity ?? 1,
    mixBlendMode: layer.blendMode,
    objectPosition: layer.objectPosition ?? "center",
    transformOrigin: layer.transformOrigin ?? "center",
    transform: getLayerTransform(layer, index, runtime),
    filter: getLayerFilter(layer, runtime),
    maskImage,
    maskPosition: maskImage ? "center" : undefined,
    maskRepeat: maskImage ? "no-repeat" : undefined,
    maskSize: maskImage ? "cover" : undefined,
    maskMode: maskImage ? maskMode : undefined,
    WebkitMaskImage: maskImage,
    WebkitMaskPosition: maskImage ? "center" : undefined,
    WebkitMaskRepeat: maskImage ? "no-repeat" : undefined,
    WebkitMaskSize: maskImage ? "cover" : undefined,
    WebkitMaskMode: maskImage ? maskMode : undefined
  };
  const mergedStyle = {
    ...style,
    ...styleOverrides
  };

  return (
    <Img
      src={assetPath(layer.src)}
      className={`scene-layer ${className}`.trim()}
      style={mergedStyle}
      data-layer-id={layer.id}
      data-mask-mode={maskImage ? maskMode : undefined}
    />
  );
};
