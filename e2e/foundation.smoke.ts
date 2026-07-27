import { expect, test } from "@playwright/test";

import { HealthResponseSchema } from "../packages/protocol/src";
import {
  parseWorldJson,
  REPRESENTATIVE_WORLD_V1,
  serializeWorldDocument,
  validateWorldDocument,
} from "../packages/domain/src";
import {
  computeSimulationDigest,
  createInitialSimulationState,
  createSimulationSnapshot,
  restoreSimulationSnapshot,
  stepSimulation,
  TransitionPlanSchema,
} from "../packages/engine/src";
import {
  createDrawCommands,
  createRenderSceneFromSimulationState,
  createRenderSceneFromWorld,
  createViewport,
  fitGridToViewport,
  getObjectsAtWorldCoordinate,
  hitTestScene,
  LIGHT_RENDERER_THEME,
  screenToScene,
  sceneToScreen,
} from "../packages/renderer/src";
import {
  applyEditorCommand,
  computeEditorDocumentDigest,
  createEditorState,
  redoEditorCommand,
  undoEditorCommand,
} from "../packages/editor/src";
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
    ["/viewer", "World Viewer"],
    ["/editor", "World Editor"],
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

test("Renderer scenes, transforms, hit testing, visibility, and commands remain deterministic", () => {
  const initial = createInitialSimulationState(REPRESENTATIVE_WORLD_V1);
  expect(initial.success).toBe(true);
  if (!initial.success) return;
  const worldScene = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
  const stateScene = createRenderSceneFromSimulationState(initial.data);
  expect(worldScene.entities).toHaveLength(stateScene.entities.length);
  const viewport = fitGridToViewport(
    createViewport({ viewportWidth: 800, viewportHeight: 600 }),
    stateScene.grid,
  );
  const point = { x: 240, y: 180 };
  const roundTrip = screenToScene(sceneToScreen(point, viewport), viewport);
  expect(roundTrip.x).toBeCloseTo(point.x);
  expect(roundTrip.y).toBeCloseTo(point.y);
  expect(
    hitTestScene(stateScene, viewport, sceneToScreen({ x: 120, y: 72 }, viewport)),
  ).toMatchObject({
    kind: "entity",
  });
  expect(
    getObjectsAtWorldCoordinate(stateScene, { x: 2, y: 1 }, { "layer:objects": false }).entities,
  ).toHaveLength(0);
  const first = createDrawCommands(stateScene, viewport, LIGHT_RENDERER_THEME);
  expect(createDrawCommands(stateScene, viewport, LIGHT_RENDERER_THEME)).toEqual(first);
});

test("Editor commands remain valid, deterministic, and undoable", () => {
  const initial = createEditorState(REPRESENTATIVE_WORLD_V1);
  expect(initial.success).toBe(true);
  if (!initial.success) return;
  const digest = computeEditorDocumentDigest(initial.data.document);
  const result = applyEditorCommand(initial.data, {
    commandId: "command:smoke-add",
    kind: "add_entity",
    expectedRevision: 0,
    entity: {
      id: "entity:smoke",
      symbolId: "symbol:moss-circle",
      layerId: "layer:objects",
      coordinate: { x: 0, y: 0 },
      orientation: 0,
      properties: {},
    },
  });
  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.data.state.document.entities).toHaveLength(4);
  const undone = undoEditorCommand(result.data.state);
  expect(undone.success).toBe(true);
  if (!undone.success) return;
  expect(computeEditorDocumentDigest(undone.data.state.document)).toBe(digest);

  const redone = redoEditorCommand(undone.data.state);
  expect(redone.success).toBe(true);
  if (!redone.success) return;
  expect(redone.data.state.document.entities).toHaveLength(4);
  expect(validateWorldDocument(redone.data.state.document).success).toBe(true);

  const engineState = createInitialSimulationState(redone.data.state.document);
  expect(engineState.success).toBe(true);
  if (!engineState.success) return;
  expect(createRenderSceneFromSimulationState(engineState.data).entities).toHaveLength(4);

  const objectsLayer = redone.data.state.document.layers.find(
    (layer) => layer.id === "layer:objects",
  );
  expect(objectsLayer).toBeDefined();
  if (!objectsLayer) return;
  const locked = applyEditorCommand(redone.data.state, {
    commandId: "command:smoke-lock",
    kind: "replace_layer",
    expectedRevision: redone.data.state.revision,
    layerId: objectsLayer.id,
    replacement: { ...objectsLayer, locked: true },
  });
  expect(locked.success).toBe(true);
  if (!locked.success) return;
  const rejected = applyEditorCommand(locked.data.state, {
    commandId: "command:smoke-locked-add",
    kind: "add_entity",
    expectedRevision: locked.data.state.revision,
    entity: {
      id: "entity:smoke-locked",
      symbolId: "symbol:moss-circle",
      layerId: "layer:objects",
      coordinate: { x: 1, y: 0 },
      orientation: 0,
      properties: {},
    },
  });
  expect(rejected.success).toBe(false);
  if (!rejected.success) {
    expect(rejected.issues.some((issue) => issue.code === "locked_layer")).toBe(true);
  }
});

test("Worker health remains compatible with the shared schema", async () => {
  const response = await app.request("/api/health");
  expect(response.ok).toBe(true);
  const parsed = HealthResponseSchema.safeParse(await response.json());
  expect(parsed.success).toBe(true);
});
