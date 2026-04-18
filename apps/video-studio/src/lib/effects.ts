import type { BindingSpec, EffectPresetSpec, RuntimeStateInput } from "./types";

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const getSourceValue = (binding: BindingSpec, runtimeState: RuntimeStateInput): number => {
  if (binding.source === "sceneProgress") {
    return runtimeState.sceneProgress;
  }
  if (binding.source === "songProgress") {
    return runtimeState.songProgress;
  }
  if (binding.source === "beatPulse") {
    return runtimeState.beatPulse;
  }
  if (binding.source === "loudness") {
    return runtimeState.loudness;
  }
  return runtimeState.bands[binding.source];
};

export const mapBinding = (binding: BindingSpec, runtimeState: RuntimeStateInput): number => {
  const [inputStart, inputEnd] = binding.inputRange ?? [0, 1];
  const [outputStart, outputEnd] = binding.outputRange ?? [0, 1];
  const rawSource = getSourceValue(binding, runtimeState);
  const normalized = (rawSource - inputStart) / Math.max(inputEnd - inputStart, 0.0001);
  const safe = binding.clamp === false ? normalized : clamp(normalized);
  return outputStart + (outputEnd - outputStart) * safe;
};

export const resolveBoundValue = (
  bindingOrBindings: BindingSpec | BindingSpec[] | undefined,
  runtimeState: RuntimeStateInput
): number | undefined => {
  if (!bindingOrBindings) {
    return undefined;
  }

  const bindings = Array.isArray(bindingOrBindings) ? bindingOrBindings : [bindingOrBindings];
  const value = bindings.at(-1) ? mapBinding(bindings.at(-1) as BindingSpec, runtimeState) : undefined;

  return typeof value === "number" ? Number(value.toFixed(4)) : undefined;
};

export const resolveEffectBindings = (
  effect: EffectPresetSpec,
  runtimeState: RuntimeStateInput
): Record<string, number | string | boolean> => {
  const resolved: Record<string, number | string | boolean> = {
    ...(effect.params ?? {})
  };

  for (const [paramName, bindingOrBindings] of Object.entries(effect.bindings ?? {})) {
    resolved[paramName] = resolveBoundValue(bindingOrBindings, runtimeState) ?? 0;
  }

  return resolved;
};
