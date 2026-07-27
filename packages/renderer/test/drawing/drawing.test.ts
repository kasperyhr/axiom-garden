import { describe, expect, it } from "vitest";

import {
  createDrawCommands,
  DARK_RENDERER_THEME,
  drawCommands,
  LIGHT_RENDERER_THEME,
  prepareCanvasBackingStore,
} from "../../src";
import { fittedViewport, representativeScene } from "../helpers";

function mockContext() {
  const calls: string[] = [];
  return {
    calls,
    context: {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left" as CanvasTextAlign,
      setTransform: (...values: number[]) => calls.push(`transform:${values.join(",")}`),
      setLineDash: (values: number[]) => calls.push(`dash:${values.join(",")}`),
      beginPath: () => calls.push("begin"),
      moveTo: (x: number, y: number) => calls.push(`move:${x},${y}`),
      lineTo: (x: number, y: number) => calls.push(`line:${x},${y}`),
      closePath: () => calls.push("close"),
      stroke: () => calls.push("stroke"),
      fill: () => calls.push("fill"),
      fillRect: (x: number, y: number, width: number, height: number) =>
        calls.push(`fillRect:${x},${y},${width},${height}`),
      strokeRect: (x: number, y: number, width: number, height: number) =>
        calls.push(`strokeRect:${x},${y},${width},${height}`),
      arc: (x: number, y: number, radius: number) => calls.push(`arc:${x},${y},${radius}`),
      fillText: (text: string, x: number, y: number) => calls.push(`text:${text}:${x},${y}`),
    },
  };
}

describe("drawing commands", () => {
  it("generates deterministic grid, cell, entity, and overlay order", () => {
    const scene = representativeScene();
    const viewport = fittedViewport();
    const first = createDrawCommands(scene, viewport, LIGHT_RENDERER_THEME, {
      selectedCoordinate: { x: 2, y: 1 },
      hoveredCoordinate: { x: 8, y: 5 },
    });
    const second = createDrawCommands(scene, viewport, LIGHT_RENDERER_THEME, {
      selectedCoordinate: { x: 2, y: 1 },
      hoveredCoordinate: { x: 8, y: 5 },
    });
    expect(first).toEqual(second);
    expect(first[0]?.kind).toBe("clear");
    expect(
      first.filter((command) => command.kind === "polygon" || command.kind === "circle"),
    ).not.toHaveLength(0);
    expect(first.slice(-3).every((command) => command.kind === "rect")).toBe(true);
  });

  it("clips grid work to the visible bounds and reduces density when zoomed out", () => {
    const scene = representativeScene();
    const normal = createDrawCommands(scene, fittedViewport(), LIGHT_RENDERER_THEME);
    const zoomedOut = createDrawCommands(
      scene,
      { ...fittedViewport(), zoom: 0.2 },
      LIGHT_RENDERER_THEME,
    );
    expect(zoomedOut.filter((command) => command.kind === "line").length).toBeLessThan(
      normal.filter((command) => command.kind === "line").length,
    );
  });

  it("honors hidden layers and theme changes", () => {
    const scene = representativeScene();
    const hidden = createDrawCommands(scene, fittedViewport(), LIGHT_RENDERER_THEME, {
      layerVisibility: { "layer:objects": false },
    });
    const dark = createDrawCommands(scene, fittedViewport(), DARK_RENDERER_THEME);
    expect(
      hidden.filter((command) => command.kind === "circle" || command.kind === "polygon"),
    ).toHaveLength(0);
    expect(dark[0]).toEqual({
      kind: "clear",
      color: DARK_RENDERER_THEME.background,
      width: 800,
      height: 600,
    });
  });

  it("adapts commands to a minimal Canvas 2D context", () => {
    const { calls, context } = mockContext();
    const commands = createDrawCommands(
      representativeScene(),
      fittedViewport(),
      LIGHT_RENDERER_THEME,
    );
    drawCommands(context, commands);
    expect(calls).toContain("begin");
    expect(calls.some((call) => call.startsWith("strokeRect:"))).toBe(true);
  });

  it("uses distinct non-color-only overlays for entity and cell selection", () => {
    const scene = representativeScene();
    const entity = createDrawCommands(scene, fittedViewport(), LIGHT_RENDERER_THEME, {
      selectedCoordinate: { x: 2, y: 1 },
      selectedKind: "entity",
    });
    const cell = createDrawCommands(scene, fittedViewport(), LIGHT_RENDERER_THEME, {
      selectedCoordinate: { x: 2, y: 1 },
      selectedKind: "cell",
    });
    expect(cell).not.toEqual(entity);
    expect(
      cell
        .filter((command) => command.kind === "rect")
        .some((command) => command.kind === "rect" && command.dash?.length),
    ).toBe(true);
  });

  it("sets a bounded high-DPI backing store", () => {
    const { calls, context } = mockContext();
    const canvas = { width: 0, height: 0 };
    prepareCanvasBackingStore(canvas, context, fittedViewport());
    expect(canvas).toEqual({ width: 1600, height: 1200 });
    expect(calls[0]).toBe("transform:2,0,0,2,0,0");
  });
});
