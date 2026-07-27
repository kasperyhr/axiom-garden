import { REPRESENTATIVE_WORLD_V1 } from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import {
  createRenderSceneFromSimulationState,
  createRenderSceneFromWorld,
  DARK_RENDERER_THEME,
  getShapePoints,
  getSameCellLayout,
  getSceneCounts,
  LIGHT_RENDERER_THEME,
  shouldUseSimplifiedGlyph,
} from "../../src";
import { simulationState } from "../helpers";

describe("RenderScene", () => {
  it("creates a canonical scene from World Document v1", () => {
    const scene = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    expect(scene.source).toBe("world");
    expect(scene.tick).toBe(0);
    expect(scene.layers.map((layer) => layer.order)).toEqual([10, 20]);
    expect(scene.entities.map((entity) => entity.id)).toEqual([
      "entity:circle-001",
      "entity:circle-002",
      "entity:diamond-001",
    ]);
    expect(scene.cells).toHaveLength(2);
  });

  it("creates a deterministic scene from SimulationState", () => {
    const state = simulationState();
    const first = createRenderSceneFromSimulationState(state);
    const second = createRenderSceneFromSimulationState(state);
    expect(first).toEqual(second);
    expect(first.sceneKey).toMatch(/^rs1:/u);
    expect(first.stateDigest).toMatch(/^ag1:/u);
  });

  it("does not modify source inputs", () => {
    const before = JSON.stringify(REPRESENTATIVE_WORLD_V1);
    createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    expect(JSON.stringify(REPRESENTATIVE_WORLD_V1)).toBe(before);
  });

  it("counts total and temporarily visible records", () => {
    const scene = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    expect(getSceneCounts(scene)).toEqual({
      totalEntities: 3,
      visibleEntities: 3,
      totalCells: 2,
      visibleCells: 2,
      visibleLayers: 2,
    });
    expect(getSceneCounts(scene, { "layer:objects": false })).toMatchObject({
      visibleEntities: 0,
      visibleCells: 2,
      visibleLayers: 1,
    });
  });

  it("provides independent light and dark renderer palettes", () => {
    expect(LIGHT_RENDERER_THEME.name).toBe("light");
    expect(DARK_RENDERER_THEME.name).toBe("dark");
    expect(LIGHT_RENDERER_THEME.domainColors.moss).not.toBe(DARK_RENDERER_THEME.domainColors.moss);
  });

  it("uses deterministic same-cell placement and overflow strategy", () => {
    expect(getSameCellLayout(1)).toHaveLength(1);
    expect(getSameCellLayout(2).map(({ offsetX }) => offsetX)).toEqual([0.32, 0.68]);
    expect(getSameCellLayout(6)).toHaveLength(4);
  });

  it("switches to simplified glyphs only at small screen sizes", () => {
    expect(shouldUseSimplifiedGlyph(10)).toBe(true);
    expect(shouldUseSimplifiedGlyph(24)).toBe(false);
  });

  it("defines finite geometry for every v1 shape and applies orientation", () => {
    const center = { x: 50, y: 50 };
    for (const shape of ["square", "triangle", "diamond", "hexagon"] as const) {
      const points = getShapePoints(shape, center, 20, 0);
      expect(points.length).toBeGreaterThanOrEqual(3);
      expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(
        true,
      );
    }
    expect(getShapePoints("triangle", center, 20, 0)).not.toEqual(
      getShapePoints("triangle", center, 20, 90),
    );
  });
});
