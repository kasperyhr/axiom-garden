import { describe, expect, it } from "vitest";

import {
  computeSimulationDigest,
  runSimulation,
  stepSimulation,
  type TransitionPlan,
} from "../../src";
import { addedEntity, initialState, plan } from "../helpers";

function sequence(): TransitionPlan[] {
  return [
    plan(0),
    plan(1, [
      {
        kind: "addEntity",
        operationId: "operation:add-deterministic",
        entity: addedEntity(),
      },
    ]),
    plan(2),
  ];
}

describe("determinism contract", () => {
  it("produces the same final state and receipts for the same input", () => {
    const left = runSimulation(initialState(), sequence());
    const right = runSimulation(initialState(), sequence());
    expect(left).toEqual(right);
  });

  it("keeps receipt fields stable", () => {
    const first = stepSimulation(initialState(), plan(0));
    const second = stepSimulation(initialState(), plan(0));
    expect(first).toEqual(second);
  });

  it("keeps issue order stable", () => {
    const invalid = plan(0, [
      {
        kind: "removeEntity",
        operationId: "operation:missing-one",
        entityId: "entity:missing-one",
      },
      {
        kind: "removeEntity",
        operationId: "operation:missing-two",
        entityId: "entity:missing-two",
      },
    ]);
    expect(stepSimulation(initialState(), invalid)).toEqual(
      stepSimulation(initialState(), invalid),
    );
  });

  it("stops a bounded run at the first failed plan", () => {
    const result = runSimulation(initialState(), [plan(0), plan(99), plan(2)]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.failedPlanIndex).toBe(1);
    expect(result.state.tick).toBe(1);
    expect(result.receipts).toHaveLength(1);
  });

  it("enforces maxSteps without accepting iterators or callbacks", () => {
    const result = runSimulation(initialState(), [plan(0), plan(1)], { maxSteps: 1 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.failedPlanIndex).toBe(1);
    expect(result.issues[0]?.code).toBe("max_steps_exceeded");
  });

  it("repeats no-op runs with stable digests", () => {
    const plans = Array.from({ length: 20 }, (_, tick) => plan(tick));
    const left = runSimulation(initialState(), plans);
    const right = runSimulation(initialState(), plans);
    expect(left.success).toBe(true);
    expect(right.success).toBe(true);
    expect(computeSimulationDigest(left.state)).toBe(computeSimulationDigest(right.state));
  });
});
