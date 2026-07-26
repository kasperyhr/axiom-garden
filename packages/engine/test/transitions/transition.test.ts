import { describe, expect, it } from "vitest";

import {
  MAX_OPERATIONS_PER_TRANSITION,
  TransitionPlanSchema,
  computeSimulationDigest,
  stepSimulation,
  validateTransitionPlan,
  type TransitionPlan,
} from "../../src";
import { addedCell, addedEntity, initialState, plan } from "../helpers";

describe("transition validation and atomic step", () => {
  it("allows an empty deterministic no-op tick", () => {
    const state = initialState();
    const result = stepSimulation(state, plan(0));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.tick).toBe(1);
    expect(result.receipt.operationCount).toBe(0);
    expect(result.receipt.stateDigestAfter).not.toBe(result.receipt.stateDigestBefore);
  });

  it("rejects a tick mismatch without advancing state", () => {
    const state = initialState();
    const result = stepSimulation(state, plan(1));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("tick_mismatch");
    expect(state.tick).toBe(0);
  });

  it("rejects duplicate operation IDs", () => {
    const state = initialState();
    const duplicate = "operation:duplicate";
    const result = validateTransitionPlan(
      state,
      plan(0, [
        { kind: "addEntity", operationId: duplicate, entity: addedEntity() },
        {
          kind: "removeEntity",
          operationId: duplicate,
          entityId: "entity:circle-001",
        },
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.map((issue) => issue.code)).toContain("duplicate_operation_id");
  });

  it("rejects invalid transition IDs and non-plain operation data", () => {
    const invalidId = validateTransitionPlan(initialState(), {
      id: "invalid" as TransitionPlan["id"],
      expectedTick: 0,
      operations: [],
    });
    expect(invalidId.success).toBe(false);
    if (!invalidId.success) {
      expect(invalidId.issues[0]?.code).toBe("invalid_transition_id");
    }

    class ExecutableLookingPlan {
      id = "transition:class-instance" as TransitionPlan["id"];
      expectedTick = 0;
      operations = [];
    }
    const classResult = validateTransitionPlan(initialState(), new ExecutableLookingPlan());
    expect(classResult.success).toBe(false);
    if (classResult.success) return;
    expect(classResult.issues[0]?.code).toBe("invalid_operation");
  });

  it("rejects an operation count above the execution budget", () => {
    const operations = Array.from({ length: MAX_OPERATIONS_PER_TRANSITION + 1 }, (_, index) => ({
      kind: "removeEntity",
      operationId: `operation:remove-${index}`,
      entityId: "entity:circle-001",
    }));
    const raw = {
      id: "transition:large",
      expectedTick: 0,
      operations,
    } as TransitionPlan;
    const result = validateTransitionPlan(initialState(), raw);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("too_many_operations");
  });

  it("adds, replaces, and removes entities", () => {
    const state = initialState();
    const entity = addedEntity();
    const result = stepSimulation(
      state,
      plan(0, [
        { kind: "addEntity", operationId: "operation:add-entity", entity },
        {
          kind: "replaceEntity",
          operationId: "operation:replace-entity",
          entityId: entity.id,
          replacement: { ...entity, orientation: 180, properties: { phase: "replaced" } },
        },
        {
          kind: "removeEntity",
          operationId: "operation:remove-entity",
          entityId: "entity:circle-002",
        },
      ]),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.entities.find((item) => item.id === entity.id)?.orientation).toBe(180);
    expect(result.state.entities.some((item) => item.id === "entity:circle-002")).toBe(false);
    expect(result.receipt.summary).toMatchObject({
      entitiesAdded: 1,
      entitiesReplaced: 1,
      entitiesRemoved: 1,
    });
  });

  it("adds, replaces, and removes sparse cells", () => {
    const state = initialState();
    const cell = addedCell();
    const result = stepSimulation(
      state,
      plan(0, [
        { kind: "addCellRecord", operationId: "operation:add-cell", cell },
        {
          kind: "replaceCellRecord",
          operationId: "operation:replace-cell",
          cellId: cell.id,
          replacement: { ...cell, tags: ["updated"] },
        },
        {
          kind: "removeCellRecord",
          operationId: "operation:remove-cell",
          cellId: "cell:anchor-b",
        },
      ]),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.cells.find((item) => item.id === cell.id)?.tags).toEqual(["updated"]);
    expect(result.receipt.summary.cellsAdded).toBe(1);
  });

  it.each([
    [
      "missing_symbol_reference",
      {
        kind: "addEntity",
        operationId: "operation:missing-symbol",
        entity: { ...addedEntity(), symbolId: "symbol:missing" },
      },
    ],
    [
      "missing_layer_reference",
      {
        kind: "addEntity",
        operationId: "operation:missing-layer",
        entity: { ...addedEntity(), layerId: "layer:missing" },
      },
    ],
    [
      "coordinate_out_of_bounds",
      {
        kind: "addEntity",
        operationId: "operation:outside",
        entity: { ...addedEntity(), coordinate: { x: 999, y: 0 } },
      },
    ],
  ])("reports %s for invalid entity data", (code, operation) => {
    const rawPlan = TransitionPlanSchema.parse({
      id: "transition:invalid-entity",
      expectedTick: 0,
      operations: [operation],
    });
    const result = stepSimulation(initialState(), rawPlan);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects replace ID changes for entities and cells", () => {
    const result = stepSimulation(
      initialState(),
      plan(0, [
        {
          kind: "replaceEntity",
          operationId: "operation:entity-id",
          entityId: "entity:circle-001",
          replacement: addedEntity("entity:different"),
        },
        {
          kind: "replaceCellRecord",
          operationId: "operation:cell-id",
          cellId: "cell:anchor-a",
          replacement: addedCell("cell:different"),
        },
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "entity_id_mismatch",
      "cell_id_mismatch",
    ]);
  });

  it("rejects duplicate sparse coordinates while allowing multiple entities", () => {
    const duplicateCell = {
      ...addedCell(),
      coordinate: { x: 2, y: 1 },
    };
    const cellResult = stepSimulation(
      initialState(),
      plan(0, [
        {
          kind: "addCellRecord",
          operationId: "operation:duplicate-cell",
          cell: duplicateCell,
        },
      ]),
    );
    expect(cellResult.success).toBe(false);
    if (cellResult.success) return;
    expect(cellResult.issues[0]?.code).toBe("duplicate_cell_coordinate");

    const entityResult = stepSimulation(
      initialState(),
      plan(0, [
        {
          kind: "addEntity",
          operationId: "operation:same-coordinate",
          entity: { ...addedEntity(), coordinate: { x: 2, y: 1 } },
        },
      ]),
    );
    expect(entityResult.success).toBe(true);
  });

  it("uses sequential staged semantics for remove then add of the same ID", () => {
    const state = initialState();
    const replacement = {
      ...addedEntity("entity:circle-001"),
      properties: { phase: "reintroduced" },
    };
    const result = stepSimulation(
      state,
      plan(0, [
        {
          kind: "removeEntity",
          operationId: "operation:remove-first",
          entityId: replacement.id,
        },
        {
          kind: "addEntity",
          operationId: "operation:add-second",
          entity: replacement,
        },
      ]),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.state.entities.find((entity) => entity.id === replacement.id)?.properties,
    ).toEqual({ phase: "reintroduced" });
  });

  it("is atomic when a later operation fails", () => {
    const state = initialState();
    const before = computeSimulationDigest(state);
    const result = stepSimulation(
      state,
      plan(0, [
        {
          kind: "addEntity",
          operationId: "operation:would-add",
          entity: addedEntity(),
        },
        {
          kind: "removeEntity",
          operationId: "operation:missing",
          entityId: "entity:not-present",
        },
      ]),
    );
    expect(result.success).toBe(false);
    expect(computeSimulationDigest(state)).toBe(before);
    expect(state.entities.some((entity) => entity.id === "entity:added-001")).toBe(false);
  });

  it("does not mutate the state or plan inputs", () => {
    const state = initialState();
    const transition = plan(0, [
      {
        kind: "addEntity",
        operationId: "operation:immutable",
        entity: addedEntity(),
      },
    ]);
    const stateBefore = JSON.stringify(state);
    const planBefore = JSON.stringify(transition);
    stepSimulation(state, transition);
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(JSON.stringify(transition)).toBe(planBefore);
  });
});
