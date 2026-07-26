import { describe, expect, it } from "vitest";

import {
  MAX_ENGINE_CELL_RECORDS,
  MAX_ENGINE_ENTITIES,
  MAX_TICK,
  finalizeSimulationState,
  stepSimulation,
  type SimulationStateV1,
} from "../../src";
import { addedCell, addedEntity, initialState, plan } from "../helpers";

describe("engine execution limits", () => {
  it("rejects stepping at MAX_TICK", () => {
    const state = finalizeSimulationState({ ...initialState(), tick: MAX_TICK });
    const result = stepSimulation(state, plan(MAX_TICK));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("tick_limit_exceeded");
  });

  it("rejects an entity addition at the Engine entity limit", () => {
    const base = initialState();
    const entities = Array.from({ length: MAX_ENGINE_ENTITIES }, (_, index) => ({
      ...addedEntity(`entity:limit-${index}`),
      coordinate: { x: index % base.grid.width, y: index % base.grid.height },
    }));
    const state = finalizeSimulationState({ ...base, entities });
    const result = stepSimulation(
      state,
      plan(0, [
        {
          kind: "addEntity",
          operationId: "operation:over-entity-limit",
          entity: addedEntity("entity:over-limit"),
        },
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("entity_limit_exceeded");
  });

  it("rejects a cell addition at the Engine sparse cell limit", () => {
    const base = initialState();
    const cells = Array.from({ length: MAX_ENGINE_CELL_RECORDS }, (_, index) => ({
      ...addedCell(`cell:limit-${index}`),
      coordinate: { x: index % 256, y: Math.floor(index / 256) },
    }));
    const state: SimulationStateV1 = finalizeSimulationState({
      ...base,
      grid: { ...base.grid, width: 256, height: 256 },
      cells,
    });
    const result = stepSimulation(
      state,
      plan(0, [
        {
          kind: "addCellRecord",
          operationId: "operation:over-cell-limit",
          cell: {
            ...addedCell("cell:over-limit"),
            coordinate: { x: 0, y: 8 },
          },
        },
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("cell_limit_exceeded");
  });
});
