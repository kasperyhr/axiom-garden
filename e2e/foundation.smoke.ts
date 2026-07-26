import { expect, test } from "@playwright/test";

import { HealthResponseSchema } from "../packages/protocol/src";
import { app } from "../apps/worker/src/app";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        status: "ok",
        service: "axiom-garden-worker",
        version: "0.1.0",
        timestamp: "2026-07-26T12:00:00.000Z",
      },
    });
  });
});

test("critical routes exist in the built application shell", async ({ page }) => {
  for (const [path, heading] of [
    ["/", /Axiom Garden\s*公理花园/u],
    ["/workspace", "Workspace shell preview"],
    ["/components", "Design system"],
    ["/missing", "Page not found"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("Worker health remains compatible with the shared schema", async () => {
  const response = await app.request("/api/health");
  expect(response.ok).toBe(true);
  const parsed = HealthResponseSchema.safeParse(await response.json());
  expect(parsed.success).toBe(true);
});
