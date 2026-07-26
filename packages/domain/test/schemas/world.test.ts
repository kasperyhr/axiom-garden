import { describe, expect, it } from "vitest";

import {
  DomainPropertiesSchema,
  EntityV1Schema,
  GridV1Schema,
  SymbolDefinitionV1Schema,
  WorldDocumentV1Schema,
  WorldIdSchema,
} from "../../src";
import { fixtureValue } from "../helpers";

describe("World Document v1 schemas", () => {
  it("accepts minimal and representative valid documents", async () => {
    expect(
      WorldDocumentV1Schema.safeParse(await fixtureValue("minimal-valid-world-v1.json")).success,
    ).toBe(true);
    expect(
      WorldDocumentV1Schema.safeParse(await fixtureValue("representative-valid-world-v1.json"))
        .success,
    ).toBe(true);
  });

  it("rejects unknown keys at nested boundaries", async () => {
    const result = WorldDocumentV1Schema.safeParse(
      await fixtureValue("invalid-unknown-field.json"),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("rejects invalid enums, grids, IDs, datetimes, and orientations", async () => {
    expect(GridV1Schema.safeParse({ kind: "hex", width: 1, height: 1 }).success).toBe(false);
    expect(
      GridV1Schema.safeParse({
        kind: "square",
        width: 1.5,
        height: 1,
        origin: "top-left",
        boundary: "bounded",
      }).success,
    ).toBe(false);
    expect(
      GridV1Schema.safeParse({
        kind: "square",
        width: 257,
        height: 1,
        origin: "top-left",
        boundary: "bounded",
      }).success,
    ).toBe(false);
    expect(WorldIdSchema.safeParse("../unsafe").success).toBe(false);
    expect(WorldIdSchema.safeParse("world:two..dots").success).toBe(false);

    const world = await fixtureValue("minimal-valid-world-v1.json");
    expect(typeof world === "object" && world !== null).toBe(true);
    const invalidDate = structuredClone(world) as Record<string, unknown>;
    invalidDate.metadata = {
      ...(invalidDate.metadata as Record<string, unknown>),
      createdAt: "not-a-date",
    };
    expect(WorldDocumentV1Schema.safeParse(invalidDate).success).toBe(false);

    expect(
      EntityV1Schema.safeParse({
        id: "entity:test",
        symbolId: "symbol:test",
        layerId: "layer:test",
        coordinate: { x: 0, y: 0 },
        orientation: 45,
        properties: {},
      }).success,
    ).toBe(false);
  });

  it("accepts only the finite, shallow property value model", () => {
    expect(
      DomainPropertiesSchema.safeParse({
        text: "value",
        number: 1,
        enabled: true,
        absent: null,
        series: [1, "two", false, null],
      }).success,
    ).toBe(true);
    for (const value of [
      { nested: true },
      [[1]],
      Number.NaN,
      Number.POSITIVE_INFINITY,
      new Date(),
      new Map(),
      new Set(),
      undefined,
      1n,
      Symbol("value"),
      () => undefined,
    ]) {
      expect(DomainPropertiesSchema.safeParse({ value }).success).toBe(false);
    }
  });

  it("rejects arbitrary appearance data and URLs", () => {
    expect(
      SymbolDefinitionV1Schema.safeParse({
        id: "symbol:unsafe",
        name: "Unsafe",
        shape: "svg",
        appearance: {
          fill: "url(https://example.invalid/image)",
          stroke: "#fff",
          variant: "gradient",
        },
        defaultProperties: {},
      }).success,
    ).toBe(false);
  });
});
