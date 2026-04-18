import type { RuntimeState, VisualSegmentSpec } from "../../lib/types";
import { MaskedLayer, SceneAtmosphere, SceneEffectsOverlay } from "./shared";

export const GenericScene = ({
  segment,
  runtime
}: {
  segment: VisualSegmentSpec;
  runtime: RuntimeState;
}) => (
  <>
    <SceneAtmosphere />
    {segment.layers.map((layer, index) => (
      <MaskedLayer key={layer.id} layer={layer} runtime={runtime} index={index} />
    ))}
    <SceneEffectsOverlay scene={segment} runtime={runtime} />
  </>
);
