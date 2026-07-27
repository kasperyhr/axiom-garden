import { REPRESENTATIVE_WORLD_V1 } from "@axiom-garden/domain";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  clampViewport,
  createRenderSceneFromWorld,
  createViewport,
  hitTestScene,
  sceneToScreen,
  screenToScene,
  zoomViewportAt,
} from "../../src";
import { representativeScene } from "../helpers";

describe("renderer properties", () => {
  it("round trips finite scene points", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        (x, y) => {
          const viewport = createViewport({ offsetX: 17, offsetY: -11, zoom: 1.7 });
          const result = screenToScene(sceneToScreen({ x, y }, viewport), viewport);
          expect(result.x).toBeCloseTo(x, 8);
          expect(result.y).toBeCloseTo(y, 8);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("preserves zoom anchors", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        fc.double({ min: 0.2, max: 6, noNaN: true }),
        (x, y, zoom) => {
          const viewport = createViewport({ offsetX: 20, offsetY: 30, zoom: 1.2 });
          const anchor = { x, y };
          const before = screenToScene(anchor, viewport);
          const after = screenToScene(anchor, zoomViewportAt(viewport, zoom, anchor));
          expect(after.x).toBeCloseTo(before.x, 8);
          expect(after.y).toBeCloseTo(before.y, 8);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("clamping is idempotent", () => {
    const scene = representativeScene();
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: 10000 }), (offsetX) => {
        const first = clampViewport(createViewport({ offsetX }), scene.grid);
        expect(clampViewport(first, scene.grid)).toEqual(first);
      }),
      { numRuns: 50 },
    );
  });

  it("scene creation and repeated hit tests are deterministic without input mutation", () => {
    const before = JSON.stringify(REPRESENTATIVE_WORLD_V1);
    const first = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    const second = createRenderSceneFromWorld(REPRESENTATIVE_WORLD_V1);
    expect(first).toEqual(second);
    const viewport = createViewport();
    expect(hitTestScene(first, viewport, { x: 120, y: 72 })).toEqual(
      hitTestScene(first, viewport, { x: 120, y: 72 }),
    );
    expect(JSON.stringify(REPRESENTATIVE_WORLD_V1)).toBe(before);
  });
});
