import { describe, expect, it } from "vitest";

import {
  computeSimulationDigest,
  createInitialSimulationState,
  getEntitiesAt,
  getEntityById,
  getLayerById,
  getSymbolById,
} from "../../src";
import { cloneWorld, initialState } from "../helpers";

describe("initial simulation state", () => {
  it("creates tick zero from a valid world", () => {
    const result = createInitialSimulationState(cloneWorld());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tick).toBe(0);
    expect(result.data.sourceWorldId).toBe("world:quiet-orbit");
    expect(result.data.stateVersion).toBe(1);
  });

  it("defensively copies and does not mutate the input world", () => {
    const world = cloneWorld();
    const before = JSON.stringify(world);
    const state = initialState(world);
    world.entities[0]!.properties.weight = 99;
    expect(JSON.stringify(world)).not.toBe(before);
    expect(state.entities[2]?.properties.weight).toBe(3);
  });

  it("uses canonical ordering", () => {
    const state = initialState();
    expect(state.symbols.map((symbol) => symbol.id)).toEqual([
      "symbol:brass-diamond",
      "symbol:moss-circle",
    ]);
    expect(state.layers.map((layer) => layer.order)).toEqual([10, 20]);
    expect(state.entities.map((entity) => entity.id)).toEqual([
      "entity:circle-001",
      "entity:circle-002",
      "entity:diamond-001",
    ]);
  });

  it("produces equal digests for semantically equivalent collection ordering", () => {
    const left = cloneWorld();
    const right = cloneWorld();
    right.entities.reverse();
    right.cells.reverse();
    right.layers.reverse();
    right.palette.symbols.reverse();
    expect(computeSimulationDigest(initialState(left))).toBe(
      computeSimulationDigest(initialState(right)),
    );
  });

  it("rejects invalid worlds defensively", () => {
    const invalid = cloneWorld();
    invalid.entities[0]!.symbolId =
      "symbol:missing" as (typeof invalid.entities)[number]["symbolId"];
    const result = createInitialSimulationState(invalid);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.code).toBe("invalid_state");
  });

  it("returns selector copies rather than mutable state references", () => {
    const state = initialState();
    const entity = getEntityById(
      state,
      "entity:circle-001" as (typeof state.entities)[number]["id"],
    );
    const symbol = getSymbolById(
      state,
      "symbol:moss-circle" as (typeof state.symbols)[number]["id"],
    );
    const layer = getLayerById(state, "layer:objects" as (typeof state.layers)[number]["id"]);
    expect(entity).not.toBe(state.entities[0]);
    expect(symbol).not.toBe(state.symbols[1]);
    expect(layer).not.toBe(state.layers[0]);
    expect(getEntitiesAt(state, { x: 2, y: 1 })).toHaveLength(2);
  });
});
