import { REPRESENTATIVE_WORLD_V1 } from "@axiom-garden/domain";
import {
  createInitialSimulationState,
  stepSimulation,
  TransitionPlanSchema,
  type SimulationStateV1,
} from "@axiom-garden/engine";

export function createViewerStates(): {
  readonly initial: SimulationStateV1;
  readonly demonstration: SimulationStateV1;
} {
  const initialResult = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  if (!initialResult.success) throw new Error("Built-in Viewer world must be valid");
  const target = initialResult.data.entities.find((entity) => entity.id === "entity:circle-001");
  if (!target) throw new Error("Built-in Viewer entity must exist");
  const plan = TransitionPlanSchema.parse({
    id: "transition:viewer-demonstration",
    expectedTick: 0,
    operations: [
      {
        kind: "replaceEntity",
        operationId: "operation:viewer-replace",
        entityId: target.id,
        replacement: {
          ...target,
          orientation: 90,
          properties: { ...target.properties, displayPhase: "demonstration" },
        },
      },
    ],
  });
  const demonstrationResult = stepSimulation(initialResult.data, plan);
  if (!demonstrationResult.success) {
    throw new Error("Built-in Viewer transition must be valid");
  }
  return { initial: initialResult.data, demonstration: demonstrationResult.state };
}
