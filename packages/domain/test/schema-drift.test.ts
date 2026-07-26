import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { serializeWorldDocumentV1JsonSchema } from "../src";

describe("generated JSON Schema", () => {
  it("matches the committed schema byte for byte", async () => {
    const committed = await readFile(
      fileURLToPath(new URL("../schema/axiom-garden-world-v1.schema.json", import.meta.url)),
      "utf8",
    );
    expect(committed).toBe(serializeWorldDocumentV1JsonSchema());
  });

  it("uses draft 2020-12 and strict object boundaries", () => {
    const schema = JSON.parse(serializeWorldDocumentV1JsonSchema()) as Record<string, unknown>;
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.additionalProperties).toBe(false);
    expect(JSON.stringify(schema)).not.toContain('"additionalProperties":true');
  });
});
