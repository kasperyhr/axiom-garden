import { describe, expect, it } from "vitest";

import { parseWorldJson, validateWorldDocument } from "../src";
import { fixtureText } from "./helpers";

describe("prototype pollution defenses", () => {
  it("rejects __proto__, prototype, and constructor property keys", async () => {
    const base = await fixtureText("invalid-dangerous-property-key.json");
    for (const key of ["__proto__", "prototype", "constructor"]) {
      const text = base.replace("__proto__", key);
      const result = parseWorldJson(text);
      expect(result.success).toBe(false);
      expect(result.issues.some((issue) => issue.code === "invalid_property_key")).toBe(true);
    }
  });

  it("rejects nested objects and leaves Object.prototype untouched", async () => {
    const text = (await fixtureText("invalid-dangerous-property-key.json")).replace(
      '"__proto__": "blocked"',
      '"safe": {"polluted": true}',
    );
    expect(parseWorldJson(text).success).toBe(false);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("also protects direct object validation", () => {
    const properties = JSON.parse('{"constructor":"blocked"}') as Record<string, unknown>;
    const result = validateWorldDocument({
      format: "axiom-garden/world",
      schemaVersion: 1,
      id: "world:direct",
      metadata: {
        title: "Direct",
        description: "",
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
        tags: [],
      },
      grid: {
        kind: "square",
        width: 1,
        height: 1,
        origin: "top-left",
        boundary: "bounded",
      },
      palette: {
        symbols: [
          {
            id: "symbol:direct",
            name: "Direct",
            shape: "square",
            appearance: { fill: "paper", stroke: "graphite", variant: "outline" },
            defaultProperties: properties,
          },
        ],
      },
      layers: [{ id: "layer:base", name: "Base", order: 0, visible: true, locked: false }],
      cells: [],
      entities: [],
    });
    expect(result.success).toBe(false);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });
});
