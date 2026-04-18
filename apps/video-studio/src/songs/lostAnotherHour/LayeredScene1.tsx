import { deterministicJitter, ramp } from "../../lib/scene-motion";
import type { LayerSpec, SceneRendererProps } from "../../lib/types";
import { MaskedLayer, SceneAtmosphere, SceneEffectsOverlay, getLayerTransform } from "../../remotion/scenes/shared";

const getLayer = (layers: LayerSpec[], id: string): LayerSpec | null => layers.find((layer) => layer.id === id) ?? null;

export const LayeredScene1 = ({
  scene,
  runtime
}: SceneRendererProps) => {
  const background = getLayer(scene.layers, "scene-1-background");
  const doorway = getLayer(scene.layers, "scene-1-doorway");
  const mirror = getLayer(scene.layers, "scene-1-mirror");
  const baggie = getLayer(scene.layers, "scene-1-baggie");
  const sink = getLayer(scene.layers, "scene-1-sink");
  const guy = getLayer(scene.layers, "scene-1-guy");
  const sinkIndex = 4;
  const sinkRotation = deterministicJitter(runtime.frame, 11) * runtime.bands.bass * 10;
  const sinkTransform = sink
    ? getLayerTransform(sink, sinkIndex, runtime).replace(/rotate\([^)]*\)/, `rotate(${sinkRotation.toFixed(2)}deg)`)
    : undefined;
  const fadeFromBlack = 1 - ramp(runtime.sceneProgress, 0, 0.06);

  return (
    <>
      <SceneAtmosphere />
      {background ? <MaskedLayer layer={background} runtime={runtime} index={0} /> : null}
      {doorway ? <MaskedLayer layer={doorway} runtime={runtime} index={1} /> : null}
      {mirror ? <MaskedLayer layer={mirror} runtime={runtime} index={2} /> : null}
      {baggie ? <MaskedLayer layer={baggie} runtime={runtime} index={3} /> : null}
      {sink ? <MaskedLayer layer={sink} runtime={runtime} index={sinkIndex} styleOverrides={{ transform: sinkTransform }} /> : null}
      {guy ? <MaskedLayer layer={guy} runtime={runtime} index={5} /> : null}
      <SceneEffectsOverlay scene={scene} runtime={runtime} />
      <div className="composition-blackout" style={{ opacity: fadeFromBlack }} />
    </>
  );
};
