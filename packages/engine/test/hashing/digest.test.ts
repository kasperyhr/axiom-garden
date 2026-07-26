import { describe, expect, it } from "vitest";

import { SIMULATION_DIGEST_ALGORITHM, computeSimulationDigest, stepSimulation } from "../../src";
import { cloneWorld, initialState, plan } from "../helpers";

describe("stable simulation digest", () => {
  it("matches the v1 golden vector", () => {
    expect(computeSimulationDigest(initialState())).toBe("ag1:370c165ed799a537");
    expect(SIMULATION_DIGEST_ALGORITHM).toBe("fnv1a-64-utf8");
  });

  it("has the versioned algorithm prefix", () => {
    expect(computeSimulationDigest(initialState())).toMatch(/^ag1:[0-9a-f]{16}$/u);
  });

  it("ignores property insertion order", () => {
    const left = cloneWorld();
    const right = cloneWorld();
    left.entities[0]!.properties = { alpha: 1, beta: 2 };
    right.entities[0]!.properties = { beta: 2, alpha: 1 };
    expect(computeSimulationDigest(initialState(left))).toBe(
      computeSimulationDigest(initialState(right)),
    );
  });

  it("ignores canonical collection input order", () => {
    const left = cloneWorld();
    const right = cloneWorld();
    right.entities.reverse();
    right.cells.reverse();
    expect(computeSimulationDigest(initialState(left))).toBe(
      computeSimulationDigest(initialState(right)),
    );
  });

  it("changes when tick or entity content changes", () => {
    const state = initialState();
    const stepped = stepSimulation(state, plan(0));
    expect(stepped.success).toBe(true);
    if (!stepped.success) return;
    expect(computeSimulationDigest(stepped.state)).not.toBe(computeSimulationDigest(state));

    const changed = cloneWorld();
    changed.entities[0]!.orientation = 270;
    expect(computeSimulationDigest(initialState(changed))).not.toBe(computeSimulationDigest(state));
  });
});
