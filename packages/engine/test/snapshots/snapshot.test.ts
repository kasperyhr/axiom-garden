import { describe, expect, it } from "vitest";

import {
  cloneSimulationState,
  compareSimulationStates,
  computeSimulationDigest,
  createSimulationSnapshot,
  restoreSimulationSnapshot,
  stepSimulation,
} from "../../src";
import { initialState, plan } from "../helpers";

describe("simulation snapshots", () => {
  it("creates and restores a JSON-compatible snapshot", () => {
    const state = initialState();
    const snapshot = createSimulationSnapshot(state);
    const jsonValue = JSON.parse(JSON.stringify(snapshot)) as unknown;
    const restored = restoreSimulationSnapshot(jsonValue);
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(computeSimulationDigest(restored.data)).toBe(snapshot.digest);
  });

  it("rejects a tampered snapshot digest", () => {
    const snapshot = createSimulationSnapshot(initialState());
    const tampered = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    tampered.state.tick = 1;
    const restored = restoreSimulationSnapshot(tampered);
    expect(restored.success).toBe(false);
    if (restored.success) return;
    expect(restored.issues[0]?.code).toBe("snapshot_digest_mismatch");
  });

  it("rejects unsupported snapshot versions", () => {
    const snapshot = { ...createSimulationSnapshot(initialState()), snapshotVersion: 2 };
    const result = restoreSimulationSnapshot(snapshot);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("unsupported_snapshot_version");
  });

  it("rejects an invalid state inside a snapshot", () => {
    const snapshot = createSimulationSnapshot(initialState());
    const invalid = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    invalid.state.entities[0]!.coordinate.x = 999;
    invalid.digest = computeSimulationDigest(invalid.state);
    const result = restoreSimulationSnapshot(invalid);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("invalid_snapshot");
  });

  it("clones without sharing nested mutable references", () => {
    const state = initialState();
    const clone = cloneSimulationState(state);
    expect(clone).not.toBe(state);
    expect(clone.entities).not.toBe(state.entities);
    expect(clone.entities[0]).not.toBe(state.entities[0]);
  });

  it("returns a structured comparison", () => {
    const state = initialState();
    const stepped = stepSimulation(state, plan(0));
    expect(stepped.success).toBe(true);
    if (!stepped.success) return;
    expect(compareSimulationStates(state, stepped.state)).toMatchObject({
      equal: false,
      digestEqual: false,
      tickDelta: 1,
      entityCountDelta: 0,
      cellCountDelta: 0,
    });
  });
});
