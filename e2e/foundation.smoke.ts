import { expect, test } from "@playwright/test";

import { HealthResponseSchema } from "../packages/protocol/src";
import {
  parseWorldJson,
  REPRESENTATIVE_WORLD_V1,
  serializeWorldDocument,
} from "../packages/domain/src";
import {
  computeSimulationDigest,
  createInitialSimulationState,
  createSimulationSnapshot,
  restoreSimulationSnapshot,
  stepSimulation,
  TransitionPlanSchema,
} from "../packages/engine/src";
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
    ["/world-format", "World Document v1"],
    ["/engine", "Engine Playground"],
    ["/missing", "Page not found"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("World Document fixtures and canonical serialization remain valid", () => {
  const canonical = serializeWorldDocument(REPRESENTATIVE_WORLD_V1);
  const parsed = parseWorldJson(canonical);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(serializeWorldDocument(parsed.data)).toBe(canonical);
  }
  expect(parseWorldJson('{"format":"axiom-garden/world","schemaVersion":2}').success).toBe(false);
});

test("Engine initial state, atomic step, digest, and snapshot remain deterministic", () => {
  const left = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  const right = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  expect(left.success).toBe(true);
  expect(right.success).toBe(true);
  if (!left.success || !right.success) return;
  expect(computeSimulationDigest(left.data)).toBe(computeSimulationDigest(right.data));

  const noOp = TransitionPlanSchema.parse({
    id: "transition:smoke-no-op",
    expectedTick: 0,
    operations: [],
  });
  const stepped = stepSimulation(left.data, noOp);
  expect(stepped.success).toBe(true);
  if (!stepped.success) return;
  expect(stepped.state.tick).toBe(1);

  const invalid = TransitionPlanSchema.parse({
    id: "transition:smoke-invalid",
    expectedTick: 0,
    operations: [
      {
        kind: "removeEntity",
        operationId: "operation:missing",
        entityId: "entity:missing",
      },
    ],
  });
  const digestBefore = computeSimulationDigest(left.data);
  expect(stepSimulation(left.data, invalid).success).toBe(false);
  expect(computeSimulationDigest(left.data)).toBe(digestBefore);

  const snapshot = createSimulationSnapshot(stepped.state);
  const restored = restoreSimulationSnapshot(JSON.parse(JSON.stringify(snapshot)));
  expect(restored.success).toBe(true);
  if (restored.success) {
    expect(computeSimulationDigest(restored.data)).toBe(snapshot.digest);
  }
});

test("Worker health remains compatible with the shared schema", async () => {
  const response = await app.request("/api/health");
  expect(response.ok).toBe(true);
  const parsed = HealthResponseSchema.safeParse(await response.json());
  expect(parsed.success).toBe(true);
});
