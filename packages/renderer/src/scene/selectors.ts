import type {
  LayerVisibilityOverrides,
  RenderBucket,
  RenderCell,
  RenderEntity,
  RenderLayer,
  RenderScene,
  SceneCounts,
} from "./types";

export function isLayerVisible(
  layer: RenderLayer,
  overrides: LayerVisibilityOverrides = {},
): boolean {
  return overrides[layer.id] ?? layer.visible;
}

export function getSceneCounts(
  scene: RenderScene,
  overrides: LayerVisibilityOverrides = {},
): SceneCounts {
  const visibleLayerIds = new Set(
    scene.layers.filter((layer) => isLayerVisible(layer, overrides)).map((layer) => layer.id),
  );
  return {
    totalEntities: scene.entities.length,
    visibleEntities: scene.entities.filter((entity) => visibleLayerIds.has(entity.layerId)).length,
    totalCells: scene.cells.length,
    visibleCells: scene.cells.filter((cell) => visibleLayerIds.has(cell.layerId)).length,
    visibleLayers: visibleLayerIds.size,
  };
}

export function findBucket(scene: RenderScene, x: number, y: number): RenderBucket | undefined {
  let low = 0;
  let high = scene.buckets.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const bucket = scene.buckets[middle];
    if (!bucket) return undefined;
    const comparison = bucket.coordinate.y - y || bucket.coordinate.x - x;
    if (comparison === 0) return bucket;
    if (comparison < 0) low = middle + 1;
    else high = middle - 1;
  }
  return undefined;
}

export function getRenderEntity(scene: RenderScene, id: string): RenderEntity | undefined {
  const entity = scene.entities.find((candidate) => candidate.id === id);
  return entity ? structuredClone(entity) : undefined;
}

export function getRenderCell(scene: RenderScene, id: string): RenderCell | undefined {
  const cell = scene.cells.find((candidate) => candidate.id === id);
  return cell ? structuredClone(cell) : undefined;
}
