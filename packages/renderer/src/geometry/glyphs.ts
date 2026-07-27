import type { Orientation, SymbolShape } from "@axiom-garden/domain";

import type { Point } from "../scene/types";

export interface GlyphPlacement {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly entityIndex: number;
}

export function getSameCellLayout(entityCount: number): readonly GlyphPlacement[] {
  if (entityCount <= 0) return [];
  if (entityCount === 1) return [{ offsetX: 0.5, offsetY: 0.5, scale: 0.62, entityIndex: 0 }];
  const positions =
    entityCount === 2
      ? [
          [0.32, 0.5],
          [0.68, 0.5],
        ]
      : [
          [0.32, 0.32],
          [0.68, 0.32],
          [0.32, 0.68],
          [0.68, 0.68],
        ];
  return positions.slice(0, Math.min(entityCount, 4)).map(([offsetX, offsetY], index) => ({
    offsetX: offsetX ?? 0.5,
    offsetY: offsetY ?? 0.5,
    scale: 0.34,
    entityIndex: index,
  }));
}

function rotate(point: Point, radians: number): Point {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

export function getShapePoints(
  shape: Exclude<SymbolShape, "circle">,
  center: Point,
  radius: number,
  orientation: Orientation,
): readonly Point[] {
  const sides = shape === "triangle" ? 3 : shape === "hexagon" ? 6 : 4;
  const baseRotation = shape === "square" ? Math.PI / 4 : shape === "diamond" ? 0 : -Math.PI / 2;
  const orientationRadians = (orientation * Math.PI) / 180;
  return Array.from({ length: sides }, (_, index) => {
    const angle = baseRotation + orientationRadians + (index * Math.PI * 2) / sides;
    const local = rotate({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }, 0);
    return { x: center.x + local.x, y: center.y + local.y };
  });
}

export function shouldUseSimplifiedGlyph(cellScreenSize: number): boolean {
  return cellScreenSize < 14;
}
