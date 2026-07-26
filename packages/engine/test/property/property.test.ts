import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  canonicalizeSimulationState,
  cloneSimulationState,
  compareSimulationStates,
  computeSimulationDigest,
  createSimulationSnapshot,
  getEntitiesAt,
  restoreSimulationSnapshot,
  stepSimulation,
} from "../../src";
import { addedEntity, initialState, plan } from "../helpers";

describe("engine properties", () => {
  it("canonicalization is idempotent", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (tick) => {
        const state = { ...initialState(), tick };
        expect(canonicalizeSimulationState(canonicalizeSimulationState(state))).toEqual(
          canonicalizeSimulationState(state),
        );
      }),
    );
  });

  it("clone preserves equality", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (tick) => {
        const state = canonicalizeSimulationState({ ...initialState(), tick });
        expect(compareSimulationStates(state, cloneSimulationState(state)).equal).toBe(true);
      }),
    );
  });

  it("snapshot round-trips", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (tick) => {
        const state = canonicalizeSimulationState({ ...initialState(), tick });
        const restored = restoreSimulationSnapshot(createSimulationSnapshot(state));
        expect(restored.success).toBe(true);
        if (!restored.success) return;
        expect(computeSimulationDigest(restored.data)).toBe(computeSimulationDigest(state));
      }),
    );
  });

  it("no-op stepping is deterministic", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (tick) => {
        const state = canonicalizeSimulationState({ ...initialState(), tick });
        expect(stepSimulation(state, plan(tick))).toEqual(stepSimulation(state, plan(tick)));
      }),
    );
  });

  it("failed transitions are atomic", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (suffix) => {
        const state = initialState();
        const before = computeSimulationDigest(state);
        const result = stepSimulation(
          state,
          plan(0, [
            {
              kind: "addEntity",
              operationId: `operation:add-${suffix}`,
              entity: addedEntity(`entity:added-${suffix}`),
            },
            {
              kind: "removeEntity",
              operationId: `operation:fail-${suffix}`,
              entityId: `entity:missing-${suffix}`,
            },
          ]),
        );
        expect(result.success).toBe(false);
        expect(computeSimulationDigest(state)).toBe(before);
      }),
      { numRuns: 40 },
    );
  });

  it("selectors never alter state", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 11 }), fc.integer({ min: 0, max: 7 }), (x, y) => {
        const state = initialState();
        const before = computeSimulationDigest(state);
        getEntitiesAt(state, { x, y });
        expect(computeSimulationDigest(state)).toBe(before);
      }),
    );
  });
});
