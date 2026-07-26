import { describe, expect, it } from "vitest";

import { HealthResponseSchema, safeParseHealthResponse } from "../src";

const validResponse = {
  status: "ok",
  service: "axiom-garden-worker",
  version: "0.1.0",
  timestamp: "2026-01-01T00:00:00.000Z",
};

describe("HealthResponseSchema", () => {
  it("accepts a valid health response", () => {
    expect(HealthResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it("rejects a missing field", () => {
    const incompleteResponse = {
      status: validResponse.status,
      version: validResponse.version,
      timestamp: validResponse.timestamp,
    };
    expect(safeParseHealthResponse(incompleteResponse).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(safeParseHealthResponse({ ...validResponse, status: "degraded" }).success).toBe(false);
  });

  it("rejects an invalid timestamp", () => {
    expect(safeParseHealthResponse({ ...validResponse, timestamp: "yesterday" }).success).toBe(
      false,
    );
  });
});
