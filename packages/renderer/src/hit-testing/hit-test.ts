import { HIT_TOLERANCE_PX } from "../limits/constants";
import { findBucket, isLayerVisible } from "../scene/selectors";
import type {
  LayerVisibilityOverrides,
  Point,
  RenderCell,
  RenderEntity,
  RenderScene,
} from "../scene/types";
import {
  sceneToScreen,
  screenToScene,
  screenToWorld,
  type ViewportState,
} from "../viewport/viewport";

export interface ObjectsAtCoordinate {
  readonly entities: readonly RenderEntity[];
  readonly cells: readonly RenderCell[];
}

export interface HitResult {
  readonly worldCoordinate: Point;
  readonly kind: "entity" | "cell" | "empty";
  readonly entityId?: RenderEntity["id"];
  readonly cellId?: RenderCell["id"];
  readonly layerId?: RenderEntity["layerId"];
  readonly screenPosition: Point;
  readonly scenePosition: Point;
}

export function getObjectsAtWorldCoordinate(
  scene: RenderScene,
  coordinate: Point,
  overrides: LayerVisibilityOverrides = {},
): ObjectsAtCoordinate {
  const bucket = findBucket(scene, coordinate.x, coordinate.y);
  if (!bucket) return { entities: [], cells: [] };
  const visibleLayers = new Set(
    scene.layers.filter((layer) => isLayerVisible(layer, overrides)).map((layer) => layer.id),
  );
  const entities = bucket.entityIndexes
    .map((index) => scene.entities[index])
    .filter((entity): entity is RenderEntity =>
      Boolean(entity && visibleLayers.has(entity.layerId)),
    );
  const cells = bucket.cellIndexes
    .map((index) => scene.cells[index])
    .filter((cell): cell is RenderCell => Boolean(cell && visibleLayers.has(cell.layerId)));
  return { entities: structuredClone(entities), cells: structuredClone(cells) };
}

export function pickTopmostObject(objects: ObjectsAtCoordinate): RenderEntity | RenderCell | null {
  const entities = [...objects.entities].sort(
    (left, right) =>
      right.layerOrder - left.layerOrder || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
  );
  if (entities[0]) return structuredClone(entities[0]);
  const cells = [...objects.cells].sort(
    (left, right) =>
      right.layerOrder - left.layerOrder || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
  );
  return cells[0] ? structuredClone(cells[0]) : null;
}

export function hitTestScene(
  scene: RenderScene,
  viewport: ViewportState,
  screenPosition: Point,
  overrides: LayerVisibilityOverrides = {},
  tolerance = HIT_TOLERANCE_PX,
): HitResult | null {
  if (!Number.isFinite(screenPosition.x) || !Number.isFinite(screenPosition.y)) return null;
  const scenePosition = screenToScene(screenPosition, viewport);
  let worldCoordinate = screenToWorld(screenPosition, viewport);
  if (
    worldCoordinate.x < 0 ||
    worldCoordinate.y < 0 ||
    worldCoordinate.x >= scene.grid.width ||
    worldCoordinate.y >= scene.grid.height
  ) {
    const closeToBoundary =
      scenePosition.x >= -tolerance / viewport.zoom &&
      scenePosition.y >= -tolerance / viewport.zoom &&
      scenePosition.x <= scene.grid.width * viewport.cellSize + tolerance / viewport.zoom &&
      scenePosition.y <= scene.grid.height * viewport.cellSize + tolerance / viewport.zoom;
    if (!closeToBoundary) return null;
    worldCoordinate = {
      x: Math.min(scene.grid.width - 1, Math.max(0, worldCoordinate.x)),
      y: Math.min(scene.grid.height - 1, Math.max(0, worldCoordinate.y)),
    };
  }
  const objects = getObjectsAtWorldCoordinate(scene, worldCoordinate, overrides);
  const topmost = pickTopmostObject(objects);
  const coordinateCenter = sceneToScreen(
    {
      x: (worldCoordinate.x + 0.5) * viewport.cellSize,
      y: (worldCoordinate.y + 0.5) * viewport.cellSize,
    },
    viewport,
  );
  if (!topmost) {
    return {
      worldCoordinate,
      kind: "empty",
      screenPosition: coordinateCenter,
      scenePosition,
    };
  }
  if ("symbolId" in topmost) {
    return {
      worldCoordinate,
      kind: "entity",
      entityId: topmost.id,
      layerId: topmost.layerId,
      screenPosition: coordinateCenter,
      scenePosition,
    };
  }
  return {
    worldCoordinate,
    kind: "cell",
    cellId: topmost.id,
    layerId: topmost.layerId,
    screenPosition: coordinateCenter,
    scenePosition,
  };
}
