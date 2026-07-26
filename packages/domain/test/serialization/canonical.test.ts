import { describe, expect, it } from "vitest";

import {
  parseWorldJson,
  REPRESENTATIVE_WORLD_V1,
  serializeWorldDocument,
  validateWorldDocument,
} from "../../src";
import { fixtureText, fixtureValue } from "../helpers";

describe("canonical serialization", () => {
  it("matches the committed representative canonical fixture", async () => {
    expect(serializeWorldDocument(REPRESENTATIVE_WORLD_V1)).toBe(
      await fixtureText("representative-valid-world-v1.json"),
    );
  });

  it("stabilizes fields, collections, properties, tags, and LF newline", async () => {
    const result = validateWorldDocument(await fixtureValue("representative-valid-world-v1.json"));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const serialized = serializeWorldDocument(result.data);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized.endsWith("\n\n")).toBe(false);
    expect(serialized.includes("\r")).toBe(false);
    expect(serialized.indexOf('"format"')).toBeLessThan(serialized.indexOf('"schemaVersion"'));
    expect(serialized.indexOf('"abstract"')).toBeLessThan(serialized.indexOf('"example"'));
    expect(serialized.indexOf('"markers"')).toBeLessThan(serialized.indexOf('"weight"'));
    expect(serialized.indexOf('"symbol:brass-diamond"')).toBeLessThan(
      serialized.indexOf('"symbol:moss-circle"'),
    );
  });

  it("is stable over repeated parse and serialization", async () => {
    const initial = await fixtureText("representative-valid-world-v1.json");
    const parsed = parseWorldJson(initial);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const once = serializeWorldDocument(parsed.data);
    const reparsed = parseWorldJson(once);
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;
    expect(serializeWorldDocument(reparsed.data)).toBe(once);
  });

  it("produces identical bytes for equivalent collection orderings", async () => {
    const canonical = (await fixtureValue("representative-valid-world-v1.json")) as Record<
      string,
      unknown
    >;
    const reordered = structuredClone(canonical);
    (reordered.layers as unknown[]).reverse();
    (reordered.cells as unknown[]).reverse();
    (reordered.entities as unknown[]).reverse();
    ((reordered.palette as Record<string, unknown>).symbols as unknown[]).reverse();
    const left = validateWorldDocument(canonical);
    const right = validateWorldDocument(reordered);
    expect(left.success && right.success).toBe(true);
    if (!left.success || !right.success) return;
    expect(serializeWorldDocument(left.data)).toBe(serializeWorldDocument(right.data));
  });
});
