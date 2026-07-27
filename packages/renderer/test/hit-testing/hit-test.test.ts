import { describe, expect, it } from "vitest";

import {
  getObjectsAtWorldCoordinate,
  hitTestScene,
  pickTopmostObject,
  worldToScreen,
} from "../../src";
import { fittedViewport, representativeScene } from "../helpers";

describe("hit testing", () => {
  it("picks the deterministic topmost entity in a same-cell stack", () => {
    const scene = representativeScene();
    const objects = getObjectsAtWorldCoordinate(scene, { x: 2, y: 1 });
    expect(objects.entities).toHaveLength(2);
    expect(pickTopmostObject(objects)?.id).toBe("entity:circle-002");
  });

  it("returns entity, cell, and empty results", () => {
    const scene = representativeScene();
    const viewport = fittedViewport();
    const center = (x: number, y: number) => {
      const topLeft = worldToScreen({ x, y }, viewport);
      return {
        x: topLeft.x + viewport.cellSize * viewport.zoom * 0.5,
        y: topLeft.y + viewport.cellSize * viewport.zoom * 0.5,
      };
    };
    expect(hitTestScene(scene, viewport, center(2, 1))?.kind).toBe("entity");
    expect(hitTestScene(scene, viewport, center(8, 5))?.kind).toBe("entity");
    expect(hitTestScene(scene, viewport, center(0, 0))?.kind).toBe("empty");
  });

  it("ignores hidden layers", () => {
    const scene = representativeScene();
    const objects = getObjectsAtWorldCoordinate(
      scene,
      { x: 2, y: 1 },
      {
        "layer:objects": false,
      },
    );
    expect(objects.entities).toHaveLength(0);
    expect(objects.cells).toHaveLength(1);
    expect(pickTopmostObject(objects)?.id).toBe("cell:anchor-a");
  });

  it("remains stable after pan and zoom", () => {
    const scene = representativeScene();
    const viewport = { ...fittedViewport(), offsetX: -120, offsetY: 80, zoom: 2 };
    const topLeft = worldToScreen({ x: 8, y: 5 }, viewport);
    const hit = hitTestScene(scene, viewport, {
      x: topLeft.x + viewport.cellSize,
      y: topLeft.y + viewport.cellSize,
    });
    expect(hit?.entityId).toBe("entity:diamond-001");
  });

  it("returns null outside the bounded world", () => {
    expect(
      hitTestScene(representativeScene(), fittedViewport(), { x: -1000, y: -1000 }),
    ).toBeNull();
  });

  it("uses CSS-pixel tolerance only at the bounded edge", () => {
    const scene = representativeScene();
    const viewport = fittedViewport();
    const boundary = worldToScreen({ x: 0, y: 0 }, viewport);
    expect(
      hitTestScene(scene, viewport, { x: boundary.x - 3, y: boundary.y + 4 }, {}, 6),
    ).toMatchObject({
      kind: "empty",
      worldCoordinate: { x: 0, y: 0 },
    });
    expect(
      hitTestScene(scene, viewport, { x: boundary.x - 12, y: boundary.y + 4 }, {}, 6),
    ).toBeNull();
  });
});
