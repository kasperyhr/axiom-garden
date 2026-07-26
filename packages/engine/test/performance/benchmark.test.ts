import { describe, expect, it } from "vitest";

import {
  computeSimulationDigest,
  createInitialSimulationState,
  runSimulation,
  stepSimulation,
} from "../../src";
import { addedEntity, cloneWorld, initialState, plan } from "../helpers";

describe("engine performance safety budget", () => {
  it("handles representative bounded workloads without exponential behavior", () => {
    const started = performance.now();
    const initial = createInitialSimulationState(cloneWorld());
    expect(initial.success).toBe(true);
    if (!initial.success) return;

    const noOps = Array.from({ length: 100 }, (_, tick) => plan(tick));
    const run = runSimulation(initial.data, noOps);
    expect(run.success).toBe(true);

    const state = initialState();
    const operations = Array.from({ length: 1_000 }, (_, index) => ({
      kind: "addEntity" as const,
      operationId: `operation:bulk-${index}`,
      entity: {
        ...addedEntity(`entity:bulk-${index}`),
        coordinate: { x: index % 12, y: Math.floor(index / 12) % 8 },
      },
    }));
    const bulk = stepSimulation(state, plan(0, operations, "transition:bulk"));
    expect(bulk.success).toBe(true);
    computeSimulationDigest(bulk.success ? bulk.state : state);

    const duration = performance.now() - started;
    console.info(`Engine bounded benchmark: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(30_000);
  }, 40_000);
});
