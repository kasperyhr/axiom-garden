import { HealthResponseSchema } from "@axiom-garden/protocol";
import { describe, expect, it } from "vitest";

import { app } from "../src/app";

describe("GET /api/health", () => {
  it("returns a schema-valid health response with security headers", async () => {
    const response = await app.request("/api/health");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(HealthResponseSchema.safeParse(body).success).toBe(true);
    expect(response.headers.get("content-type")).toMatch(/^application\/json\b/u);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
