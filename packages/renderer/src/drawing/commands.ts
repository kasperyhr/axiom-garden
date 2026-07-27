import type { DomainColorToken, SymbolVariant } from "@axiom-garden/domain";

import { getSameCellLayout, getShapePoints, shouldUseSimplifiedGlyph } from "../geometry/glyphs";
import { getVisibleWorldBounds, sceneToScreen, type ViewportState } from "../viewport/viewport";
import { isLayerVisible } from "../scene/selectors";
import type {
  LayerVisibilityOverrides,
  Point,
  RenderEntity,
  RendererTheme,
  RenderScene,
} from "../scene/types";

export type DrawCommand =
  | {
      readonly kind: "clear";
      readonly color: string;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "line";
      readonly from: Point;
      readonly to: Point;
      readonly color: string;
      readonly width: number;
      readonly dash?: readonly number[];
    }
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly fill?: string;
      readonly stroke?: string;
      readonly lineWidth?: number;
      readonly dash?: readonly number[];
    }
  | {
      readonly kind: "circle";
      readonly center: Point;
      readonly radius: number;
      readonly fill?: string;
      readonly stroke?: string;
      readonly lineWidth?: number;
    }
  | {
      readonly kind: "polygon";
      readonly points: readonly Point[];
      readonly fill?: string;
      readonly stroke?: string;
      readonly lineWidth?: number;
    }
  | {
      readonly kind: "text";
      readonly position: Point;
      readonly text: string;
      readonly color: string;
      readonly font: string;
      readonly align?: "left" | "center" | "right";
    };

export interface DrawState {
  readonly layerVisibility?: LayerVisibilityOverrides;
  readonly showGrid?: boolean;
  readonly showCoordinates?: boolean;
  readonly hoveredCoordinate?: Point | null;
  readonly selectedCoordinate?: Point | null;
  readonly selectedKind?: "entity" | "cell" | "empty";
  readonly keyboardCoordinate?: Point | null;
}

function colorFor(theme: RendererTheme, token: DomainColorToken): string {
  return theme.domainColors[token];
}

function entityCommands(
  entity: RenderEntity,
  center: Point,
  radius: number,
  theme: RendererTheme,
  simplified: boolean,
): DrawCommand[] {
  const fill = colorFor(theme, entity.appearance.fill);
  const stroke = colorFor(theme, entity.appearance.stroke);
  if (simplified) {
    return [{ kind: "circle", center, radius: Math.max(2, radius * 0.55), fill }];
  }
  const variant: SymbolVariant = entity.appearance.variant;
  const visual =
    variant === "outline"
      ? { stroke, lineWidth: 1.5 }
      : variant === "ring"
        ? { stroke: fill, lineWidth: Math.max(2, radius * 0.22) }
        : variant === "dot"
          ? { fill, stroke, lineWidth: 1 }
          : { fill, stroke, lineWidth: 1 };
  if (entity.shape === "circle") {
    return [
      { kind: "circle", center, radius: variant === "dot" ? radius * 0.4 : radius, ...visual },
    ];
  }
  return [
    {
      kind: "polygon",
      points: getShapePoints(entity.shape, center, radius, entity.orientation),
      ...visual,
    },
  ];
}

export function createDrawCommands(
  scene: RenderScene,
  viewport: ViewportState,
  theme: RendererTheme,
  state: DrawState = {},
): readonly DrawCommand[] {
  const commands: DrawCommand[] = [
    {
      kind: "clear",
      color: theme.background,
      width: viewport.viewportWidth,
      height: viewport.viewportHeight,
    },
  ];
  const visible = getVisibleWorldBounds(viewport, scene.grid);
  const cellPixels = viewport.cellSize * viewport.zoom;
  if (state.showGrid !== false) {
    const density = cellPixels < 8 ? 4 : cellPixels < 16 ? 2 : 1;
    for (let x = visible.x; x <= visible.x + visible.width; x += density) {
      const from = sceneToScreen(
        { x: x * viewport.cellSize, y: visible.y * viewport.cellSize },
        viewport,
      );
      const to = sceneToScreen(
        { x: x * viewport.cellSize, y: (visible.y + visible.height) * viewport.cellSize },
        viewport,
      );
      commands.push({
        kind: "line",
        from,
        to,
        color: x % 5 === 0 ? theme.gridMajor : theme.gridMinor,
        width: x % 5 === 0 ? 1.2 : 1,
      });
    }
    for (let y = visible.y; y <= visible.y + visible.height; y += density) {
      const from = sceneToScreen(
        { x: visible.x * viewport.cellSize, y: y * viewport.cellSize },
        viewport,
      );
      const to = sceneToScreen(
        { x: (visible.x + visible.width) * viewport.cellSize, y: y * viewport.cellSize },
        viewport,
      );
      commands.push({
        kind: "line",
        from,
        to,
        color: y % 5 === 0 ? theme.gridMajor : theme.gridMinor,
        width: y % 5 === 0 ? 1.2 : 1,
      });
    }
  }
  const boundaryTopLeft = sceneToScreen({ x: 0, y: 0 }, viewport);
  commands.push({
    kind: "rect",
    x: boundaryTopLeft.x,
    y: boundaryTopLeft.y,
    width: scene.grid.width * cellPixels,
    height: scene.grid.height * cellPixels,
    stroke: theme.boundary,
    lineWidth: 1.5,
  });

  for (const layer of scene.layers) {
    if (!isLayerVisible(layer, state.layerVisibility)) continue;
    for (const cell of scene.cells) {
      if (cell.layerId !== layer.id) continue;
      const topLeft = sceneToScreen(
        { x: cell.coordinate.x * viewport.cellSize, y: cell.coordinate.y * viewport.cellSize },
        viewport,
      );
      const inset = Math.max(2, cellPixels * 0.12);
      commands.push({
        kind: "rect",
        x: topLeft.x + inset,
        y: topLeft.y + inset,
        width: Math.max(1, cellPixels - inset * 2),
        height: Math.max(1, cellPixels - inset * 2),
        stroke: theme.cellMarker,
        lineWidth: 1.25,
        ...(cellPixels < 18 ? {} : { dash: [3, 3] }),
      });
    }
    const occupied = scene.buckets.filter((bucket) =>
      bucket.entityIndexes.some((index) => scene.entities[index]?.layerId === layer.id),
    );
    for (const bucket of occupied) {
      const entities = bucket.entityIndexes
        .map((index) => scene.entities[index])
        .filter((entity): entity is RenderEntity => entity?.layerId === layer.id);
      const placements = getSameCellLayout(entities.length);
      for (const placement of placements) {
        const entity = entities[placement.entityIndex];
        if (!entity) continue;
        const topLeft = sceneToScreen(
          {
            x: bucket.coordinate.x * viewport.cellSize,
            y: bucket.coordinate.y * viewport.cellSize,
          },
          viewport,
        );
        const center = {
          x: topLeft.x + placement.offsetX * cellPixels,
          y: topLeft.y + placement.offsetY * cellPixels,
        };
        commands.push(
          ...entityCommands(
            entity,
            center,
            Math.max(2, cellPixels * placement.scale * 0.5),
            theme,
            shouldUseSimplifiedGlyph(cellPixels),
          ),
        );
      }
      if (entities.length > 4) {
        const topLeft = sceneToScreen(
          {
            x: bucket.coordinate.x * viewport.cellSize,
            y: bucket.coordinate.y * viewport.cellSize,
          },
          viewport,
        );
        commands.push({
          kind: "text",
          position: { x: topLeft.x + cellPixels - 4, y: topLeft.y + cellPixels - 4 },
          text: `+${entities.length - 4}`,
          color: theme.text,
          font: "600 11px ui-monospace, monospace",
          align: "right",
        });
      }
    }
  }
  const overlay = (
    coordinate: Point | null | undefined,
    color: string,
    dash?: readonly number[],
    inset = 2,
  ) => {
    if (!coordinate) return;
    const topLeft = sceneToScreen(
      { x: coordinate.x * viewport.cellSize, y: coordinate.y * viewport.cellSize },
      viewport,
    );
    commands.push({
      kind: "rect",
      x: topLeft.x + inset,
      y: topLeft.y + inset,
      width: cellPixels - inset * 2,
      height: cellPixels - inset * 2,
      stroke: color,
      lineWidth: 2,
      ...(dash ? { dash } : {}),
    });
  };
  overlay(state.hoveredCoordinate, theme.hover, [4, 3], 4);
  overlay(state.keyboardCoordinate, theme.keyboardFocus, [2, 2], 6);
  if (state.selectedKind === "cell") {
    overlay(state.selectedCoordinate, theme.selection, [5, 2], 5);
    overlay(state.selectedCoordinate, theme.selection, [1, 2], 9);
  } else {
    overlay(state.selectedCoordinate, theme.selection, undefined, 2);
    if (state.selectedCoordinate) {
      overlay(state.selectedCoordinate, theme.selection, undefined, 6);
    }
  }

  if (state.showCoordinates && cellPixels >= 28) {
    for (let y = visible.y; y < visible.y + visible.height; y += 1) {
      for (let x = visible.x; x < visible.x + visible.width; x += 1) {
        const point = sceneToScreen(
          {
            x: x * viewport.cellSize + 4 / viewport.zoom,
            y: y * viewport.cellSize + 12 / viewport.zoom,
          },
          viewport,
        );
        commands.push({
          kind: "text",
          position: point,
          text: `${x},${y}`,
          color: theme.text,
          font: "10px ui-monospace, monospace",
        });
      }
    }
  }
  return commands;
}
