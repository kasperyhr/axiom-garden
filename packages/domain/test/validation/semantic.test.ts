import { describe, expect, it } from "vitest";

import { MAX_LAYERS, validateWorldDocument, type DomainIssueCode } from "../../src";
import { fixtureValue } from "../helpers";

async function minimalWorld(): Promise<Record<string, unknown>> {
  return (await fixtureValue("minimal-valid-world-v1.json")) as Record<string, unknown>;
}

function expectCode(result: ReturnType<typeof validateWorldDocument>, code: DomainIssueCode): void {
  expect(result.success).toBe(false);
  expect(result.issues.some((item) => item.code === code)).toBe(true);
}

describe("semantic validation", () => {
  it("detects duplicate IDs", async () => {
    expectCode(
      validateWorldDocument(await fixtureValue("invalid-duplicate-id.json")),
      "duplicate_id",
    );
  });

  it("detects duplicate layer order", async () => {
    const world = await minimalWorld();
    world.layers = [
      ...(world.layers as unknown[]),
      {
        id: "layer:second",
        name: "Second",
        order: 0,
        visible: true,
        locked: false,
      },
    ];
    expectCode(validateWorldDocument(world), "duplicate_layer_order");
  });

  it("detects missing symbol and layer references", async () => {
    const result = validateWorldDocument(await fixtureValue("invalid-missing-reference.json"));
    expectCode(result, "missing_reference");
    expect(result.issues.filter((item) => item.code === "missing_reference")).toHaveLength(2);
  });

  it("detects out-of-bounds cells and entities", async () => {
    expectCode(
      validateWorldDocument(await fixtureValue("invalid-out-of-bounds.json")),
      "coordinate_out_of_bounds",
    );
    const world = await fixtureValue("representative-valid-world-v1.json");
    const value = structuredClone(world) as Record<string, unknown>;
    const entities = value.entities as Array<Record<string, unknown>>;
    entities[0] = {
      ...entities[0],
      coordinate: { x: 12, y: 0 },
    };
    expectCode(validateWorldDocument(value), "coordinate_out_of_bounds");
  });

  it("detects duplicate and empty sparse cells", async () => {
    const world = (await fixtureValue("representative-valid-world-v1.json")) as Record<
      string,
      unknown
    >;
    const cells = world.cells as Array<Record<string, unknown>>;
    cells.push({
      id: "cell:duplicate-coordinate",
      layerId: cells[0]?.layerId,
      coordinate: cells[0]?.coordinate,
      tags: ["duplicate"],
      properties: {},
    });
    expectCode(validateWorldDocument(world), "duplicate_cell_coordinate");

    const emptyWorld = (await fixtureValue("representative-valid-world-v1.json")) as Record<
      string,
      unknown
    >;
    const emptyCells = emptyWorld.cells as Array<Record<string, unknown>>;
    emptyCells[0] = { ...emptyCells[0], tags: [], properties: {} };
    expectCode(validateWorldDocument(emptyWorld), "empty_cell_record");
  });

  it("detects invalid metadata time order", async () => {
    const world = await minimalWorld();
    world.metadata = {
      ...(world.metadata as Record<string, unknown>),
      updatedAt: "2026-07-25T00:00:00.000Z",
    };
    expectCode(validateWorldDocument(world), "invalid_time_order");
  });

  it("rejects dangerous property keys", async () => {
    expectCode(
      validateWorldDocument(await fixtureValue("invalid-dangerous-property-key.json")),
      "invalid_property_key",
    );
  });

  it("enforces collection count limits", async () => {
    const world = await minimalWorld();
    world.layers = Array.from({ length: MAX_LAYERS + 1 }, (_, index) => ({
      id: `layer:item-${index}`,
      name: `Layer ${index}`,
      order: index,
      visible: true,
      locked: false,
    }));
    expectCode(validateWorldDocument(world), "limit_exceeded");
  });

  it("returns issues in stable traversal order", async () => {
    const value = await fixtureValue("invalid-missing-reference.json");
    expect(validateWorldDocument(value)).toEqual(validateWorldDocument(value));
  });
});
