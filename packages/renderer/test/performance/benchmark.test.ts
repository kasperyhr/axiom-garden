import { performance } from "node:perf_hooks";

import { REPRESENTATIVE_WORLD_V1, WorldDocumentV1Schema } from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import {
  createDrawCommands,
  createRenderSceneFromWorld,
  createViewport,
  drawCommands,
  fitGridToViewport,
  hitTestScene,
  LIGHT_RENDERER_THEME,
  sceneToScreen,
  screenToScene,
} from "../../src";

describe("renderer performance budget", () => {
  it("completes bounded scene, transform, hit-test, and draw workloads", () => {
    const started = performance.now();
    const scene = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    const viewport = fitGridToViewport(
      createViewport({ viewportWidth: 1280, viewportHeight: 720 }),
      scene.grid,
    );
    for (let index = 0; index < 1000; index += 1) {
      const scenePoint = { x: index % 600, y: index % 400 };
      screenToScene(sceneToScreen(scenePoint, viewport), viewport);
      hitTestScene(scene, viewport, { x: index % 1280, y: index % 720 });
    }
    const commands = createDrawCommands(scene, viewport, LIGHT_RENDERER_THEME, {
      showCoordinates: true,
    });
    expect(commands.length).toBeGreaterThan(0);
    expect(performance.now() - started).toBeLessThan(30_000);
  });

  it("draws a bounded 4,000-entity scene through the minimal Canvas adapter", () => {
    const largeWorld = WorldDocumentV1Schema.parse({
      ...REPRESENTATIVE_WORLD_V1,
      id: "world:renderer-benchmark",
      grid: { ...REPRESENTATIVE_WORLD_V1.grid, width: 64, height: 64 },
      cells: [],
      entities: Array.from({ length: 4_000 }, (_, index) => ({
        id: `entity:benchmark-${String(index).padStart(4, "0")}`,
        symbolId: "symbol:moss-circle",
        layerId: "layer:objects",
        coordinate: { x: index % 64, y: Math.floor(index / 64) },
        orientation: 0,
        properties: {},
      })),
    });
    const started = performance.now();
    const scene = createRenderSceneFromWorld(largeWorld);
    const viewport = fitGridToViewport(
      createViewport({ viewportWidth: 1280, viewportHeight: 720 }),
      scene.grid,
    );
    const commands = createDrawCommands(scene, viewport, LIGHT_RENDERER_THEME);
    const context = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left" as CanvasTextAlign,
      setTransform() {},
      setLineDash() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      stroke() {},
      fill() {},
      fillRect() {},
      strokeRect() {},
      arc() {},
      fillText() {},
    };
    drawCommands(context, commands);
    expect(scene.entities).toHaveLength(4_000);
    expect(commands.length).toBeGreaterThan(1_000);
    expect(performance.now() - started).toBeLessThan(30_000);
  });
});
