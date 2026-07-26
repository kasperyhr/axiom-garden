import {
  REPRESENTATIVE_WORLD_V1,
  type CellRecordV1,
  type EntityV1,
  type WorldDocumentV1,
} from "@axiom-garden/domain";
import {
  createInitialSimulationState,
  TransitionPlanSchema,
  type SimulationStateV1,
  type TransitionPlan,
} from "../src";

export function cloneWorld(): WorldDocumentV1 {
  return JSON.parse(JSON.stringify(REPRESENTATIVE_WORLD_V1)) as WorldDocumentV1;
}

export function initialState(world: WorldDocumentV1 = cloneWorld()): SimulationStateV1 {
  const result = createInitialSimulationState(world);
  if (!result.success) throw new Error(result.issues.map((issue) => issue.code).join(","));
  return result.data;
}

export function plan(
  expectedTick: number,
  operations: readonly unknown[] = [],
  id = `transition:test-${expectedTick}`,
): TransitionPlan {
  return TransitionPlanSchema.parse({ id, expectedTick, operations });
}

export function addedEntity(id = "entity:added-001"): EntityV1 {
  return {
    id: id as EntityV1["id"],
    symbolId: "symbol:moss-circle" as EntityV1["symbolId"],
    layerId: "layer:objects" as EntityV1["layerId"],
    coordinate: { x: 4, y: 3 },
    orientation: 90,
    properties: { phase: "added" },
  };
}

export function addedCell(id = "cell:added-001"): CellRecordV1 {
  return {
    id: id as CellRecordV1["id"],
    layerId: "layer:annotations" as CellRecordV1["layerId"],
    coordinate: { x: 4, y: 3 },
    tags: ["marker"],
    properties: {},
  };
}
