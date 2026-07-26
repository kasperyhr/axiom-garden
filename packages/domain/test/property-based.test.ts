import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  coordinateKey,
  normalizeProperties,
  normalizeTags,
  serializeWorldDocument,
  validateWorldDocument,
} from "../src";
import { fixtureValue } from "./helpers";

describe("property-based invariants", () => {
  it("creates stable, unambiguous coordinate keys", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), (x, y) => {
        expect(coordinateKey({ x, y })).toBe(`${x},${y}`);
      }),
    );
  });

  it("normalizes tags and properties idempotently", () => {
    const scalar = fc.oneof(
      fc.string({ maxLength: 20 }),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    const properties = fc.dictionary(
      fc.stringMatching(/^[A-Za-z][A-Za-z0-9_-]{0,12}$/u),
      fc.oneof(scalar, fc.array(scalar, { maxLength: 8 })),
      { maxKeys: 10 },
    );
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 12 }), { maxLength: 20 }),
        properties,
        (tags, values) => {
          expect(normalizeTags(normalizeTags(tags))).toEqual(normalizeTags(tags));
          expect(normalizeProperties(normalizeProperties(values))).toEqual(
            normalizeProperties(values),
          );
        },
      ),
    );
  });

  it("keeps canonical serialization idempotent across generated tag orderings", async () => {
    const source = await fixtureValue("representative-valid-world-v1.json");
    fc.assert(
      fc.property(
        fc.shuffledSubarray(["abstract", "example", "format"], {
          minLength: 1,
          maxLength: 3,
        }),
        (tags) => {
          const candidate = structuredClone(source) as Record<string, unknown>;
          candidate.metadata = {
            ...(candidate.metadata as Record<string, unknown>),
            tags,
          };
          const result = validateWorldDocument(candidate);
          expect(result.success).toBe(true);
          if (!result.success) return;
          const once = serializeWorldDocument(result.data);
          const twice = serializeWorldDocument(result.data);
          expect(twice).toBe(once);
        },
      ),
    );
  });

  it("does not mutate input during validate or serialize", async () => {
    const input = await fixtureValue("representative-valid-world-v1.json");
    const beforeValidation = structuredClone(input);
    const result = validateWorldDocument(input);
    expect(input).toEqual(beforeValidation);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const beforeSerialization = structuredClone(result.data);
    serializeWorldDocument(result.data);
    expect(result.data).toEqual(beforeSerialization);
  });
});
