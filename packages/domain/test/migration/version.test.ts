import { describe, expect, it } from "vitest";

import { getWorldDocumentVersion, migrateWorldDocument, WORLD_MIGRATION_REGISTRY } from "../../src";
import { fixtureValue } from "../helpers";

describe("world document versioning", () => {
  it("accepts and normalizes v1", async () => {
    expect(getWorldDocumentVersion(await fixtureValue("minimal-valid-world-v1.json"))).toEqual({
      kind: "v1",
      version: 1,
    });
    expect(migrateWorldDocument(await fixtureValue("minimal-valid-world-v1.json")).success).toBe(
      true,
    );
  });

  it("distinguishes missing, invalid, future, arbitrary, and invented v0 versions", () => {
    expect(getWorldDocumentVersion({ format: "axiom-garden/world" }).kind).toBe("missing-version");
    expect(
      getWorldDocumentVersion({
        format: "axiom-garden/world",
        schemaVersion: "1",
      }).kind,
    ).toBe("invalid-version");
    expect(getWorldDocumentVersion({ format: "axiom-garden/world", schemaVersion: 2 }).kind).toBe(
      "unsupported-future-version",
    );
    expect(getWorldDocumentVersion({ arbitrary: true }).kind).toBe("not-world-document");
    expect(getWorldDocumentVersion({ format: "axiom-garden/world", schemaVersion: 0 }).kind).toBe(
      "unsupported-past-version",
    );
  });

  it("returns structured failures instead of inventing migrations", async () => {
    for (const value of [
      { format: "axiom-garden/world" },
      { format: "axiom-garden/world", schemaVersion: "1" },
      await fixtureValue("invalid-future-version.json"),
      { arbitrary: true },
      { format: "axiom-garden/world", schemaVersion: 0 },
    ]) {
      expect(migrateWorldDocument(value).success).toBe(false);
    }
    expect(WORLD_MIGRATION_REGISTRY.size).toBe(0);
  });
});
