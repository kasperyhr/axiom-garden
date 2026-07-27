import { REPRESENTATIVE_WORLD_V1 } from "@axiom-garden/domain";
import { createInitialSimulationState } from "@axiom-garden/engine";

import { createRenderSceneFromSimulationState, createViewport } from "../src";

export function simulationState() {
  const result = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  if (!result.success) throw new Error("Expected representative world to create a state");
  return result.data;
}

export function representativeScene() {
  return createRenderSceneFromSimulationState(simulationState());
}

export function fittedViewport() {
  return createViewport({
    offsetX: 40,
    offsetY: 30,
    zoom: 1,
    viewportWidth: 800,
    viewportHeight: 600,
    devicePixelRatio: 2,
  });
}
