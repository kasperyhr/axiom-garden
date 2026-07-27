import { describe, expect, it } from "vitest";

import {
  centerCoordinate,
  clampViewport,
  createViewport,
  fitGridToViewport,
  getCanvasBackingStore,
  getVisibleWorldBounds,
  MAX_BACKING_STORE_PIXELS,
  panViewport,
  sceneToScreen,
  screenToScene,
  screenToWorld,
  worldToScreen,
  zoomViewportAt,
  zoomViewportFromPinch,
} from "../../src";
import { representativeScene } from "../helpers";

describe("viewport", () => {
  it("round trips scene and screen coordinates", () => {
    const viewport = createViewport({ offsetX: 13, offsetY: -4, zoom: 1.75 });
    const scene = { x: 120.5, y: 88.25 };
    const result = screenToScene(sceneToScreen(scene, viewport), viewport);
    expect(result.x).toBeCloseTo(scene.x);
    expect(result.y).toBeCloseTo(scene.y);
  });

  it("keeps the zoom anchor invariant", () => {
    const viewport = createViewport({ offsetX: 30, offsetY: 45, zoom: 1 });
    const anchor = { x: 280, y: 190 };
    const before = screenToScene(anchor, viewport);
    const after = screenToScene(anchor, zoomViewportAt(viewport, 2.5, anchor));
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("uses the pinch center as a stable zoom and pan anchor", () => {
    const viewport = createViewport({ offsetX: 20, offsetY: 30, zoom: 1 });
    const next = zoomViewportFromPinch(
      viewport,
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 90, y: 110 },
      { x: 230, y: 110 },
    );
    expect(next.zoom).toBeCloseTo(1.4);
    const anchoredPoint = screenToScene({ x: 160, y: 110 }, next);
    expect(Number.isFinite(anchoredPoint.x)).toBe(true);
    expect(Number.isFinite(anchoredPoint.y)).toBe(true);
    expect(viewport).toMatchObject({ offsetX: 20, offsetY: 30, zoom: 1 });
  });

  it("pans without mutating the input", () => {
    const viewport = createViewport({ offsetX: 10, offsetY: 20 });
    const next = panViewport(viewport, 25, -5);
    expect(next).toMatchObject({ offsetX: 35, offsetY: 15 });
    expect(viewport).toMatchObject({ offsetX: 10, offsetY: 20 });
  });

  it("fits and centers the bounded grid", () => {
    const scene = representativeScene();
    const viewport = createViewport({ viewportWidth: 800, viewportHeight: 600 });
    const fitted = fitGridToViewport(viewport, scene.grid);
    expect(fitted.zoom).toBeGreaterThan(0);
    const centered = centerCoordinate(fitted, { x: 2, y: 1 });
    expect(worldToScreen({ x: 2.5, y: 1.5 }, centered).x).toBeCloseTo(400);
  });

  it("clamps invalid numeric values and viewport extents", () => {
    const scene = representativeScene();
    const invalid = createViewport({
      zoom: Number.POSITIVE_INFINITY,
      offsetX: Number.NaN,
      devicePixelRatio: 100,
    });
    expect(invalid.zoom).toBe(1);
    expect(invalid.offsetX).toBe(0);
    expect(invalid.devicePixelRatio).toBe(3);
    expect(clampViewport({ ...invalid, offsetX: 999999 }, scene.grid).offsetX).toBeLessThan(999999);
  });

  it("reports bounded visible world coordinates", () => {
    const scene = representativeScene();
    const viewport = createViewport({ viewportWidth: 300, viewportHeight: 200 });
    const bounds = getVisibleWorldBounds(viewport, scene.grid);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.width).toBeLessThanOrEqual(scene.grid.width);
  });

  it("uses CSS pixels for hit math and bounded DPR for backing store", () => {
    const scene = representativeScene();
    const viewport = createViewport({
      viewportWidth: 10000,
      viewportHeight: 10000,
      devicePixelRatio: 3,
    });
    const backing = getCanvasBackingStore(viewport);
    expect(backing.width * backing.height).toBeLessThanOrEqual(MAX_BACKING_STORE_PIXELS);
    expect(screenToWorld({ x: 49, y: 49 }, createViewport())).toEqual({ x: 1, y: 1 });
    expect(scene.grid.width).toBe(12);
  });
});
