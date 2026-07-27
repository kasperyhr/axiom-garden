import { getObjectsAtWorldCoordinate } from "../hit-testing/hit-test";
import { getSceneCounts } from "../scene/selectors";
import type { LayerVisibilityOverrides, Point, RenderScene } from "../scene/types";

export interface AccessibleSceneSummary {
  readonly worldTitle: string;
  readonly dimensions: string;
  readonly tick: number;
  readonly visibleLayers: number;
  readonly totalLayers: number;
  readonly visibleEntities: number;
  readonly totalEntities: number;
  readonly visibleCells: number;
  readonly totalCells: number;
  readonly focus: string;
  readonly selection: string;
  readonly zoom: string;
}

export function createAccessibleSceneSummary(
  scene: RenderScene,
  options: {
    readonly visibility?: LayerVisibilityOverrides;
    readonly focusCoordinate?: Point | null;
    readonly selectionCoordinate?: Point | null;
    readonly zoom: number;
  },
): AccessibleSceneSummary {
  const counts = getSceneCounts(scene, options.visibility);
  const focus = options.focusCoordinate
    ? `Coordinate ${options.focusCoordinate.x}, ${options.focusCoordinate.y}`
    : "No focused coordinate";
  let selection = "Nothing selected";
  if (options.selectionCoordinate) {
    const objects = getObjectsAtWorldCoordinate(
      scene,
      options.selectionCoordinate,
      options.visibility,
    );
    const entity = objects.entities.at(-1);
    const cell = objects.cells.at(-1);
    selection = entity
      ? `Entity ${entity.id}, symbol ${entity.symbolName}, layer ${entity.layerId}, orientation ${entity.orientation} degrees`
      : cell
        ? `Cell ${cell.id}, layer ${cell.layerId}`
        : `Coordinate ${options.selectionCoordinate.x}, ${options.selectionCoordinate.y}, no object`;
  }
  return {
    worldTitle: scene.title,
    dimensions: `${scene.grid.width} by ${scene.grid.height}`,
    tick: scene.tick,
    visibleLayers: counts.visibleLayers,
    totalLayers: scene.layers.length,
    visibleEntities: counts.visibleEntities,
    totalEntities: counts.totalEntities,
    visibleCells: counts.visibleCells,
    totalCells: counts.totalCells,
    focus,
    selection,
    zoom: `${Math.round(options.zoom * 100)} percent`,
  };
}
