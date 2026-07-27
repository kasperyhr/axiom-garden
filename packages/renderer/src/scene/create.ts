import {
  compareCodePoints,
  compareCoordinates,
  normalizeProperties,
  normalizeTags,
  normalizeWorldDocument,
  type CellRecordV1,
  type EntityV1,
  type LayerV1,
  type SymbolDefinitionV1,
  type WorldDocumentV1,
} from "@axiom-garden/domain";
import {
  canonicalizeSimulationState,
  computeSimulationDigest,
  type SimulationStateV1,
} from "@axiom-garden/engine";

import { DEFAULT_CELL_SIZE } from "../limits/constants";
import type {
  RenderBucket,
  RenderCell,
  RenderEntity,
  RenderLayer,
  RenderScene,
  RenderSymbol,
} from "./types";

interface SceneSource {
  readonly source: "world" | "simulation";
  readonly sourceWorldId: WorldDocumentV1["id"];
  readonly title: string;
  readonly tick: number;
  readonly stateDigest: string | null;
  readonly grid: WorldDocumentV1["grid"];
  readonly symbols: readonly SymbolDefinitionV1[];
  readonly layers: readonly LayerV1[];
  readonly cells: readonly CellRecordV1[];
  readonly entities: readonly EntityV1[];
}

function stableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `rs1:${hash.toString(16).padStart(8, "0")}`;
}

function freezeValue(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeValue(child);
  Object.freeze(value);
}

function buildScene(source: SceneSource): RenderScene {
  const layers = [...source.layers].sort(
    (left, right) => left.order - right.order || compareCodePoints(left.id, right.id),
  );
  const layerOrder = new Map(layers.map((layer) => [layer.id, layer.order]));
  const symbols = [...source.symbols].sort((left, right) => compareCodePoints(left.id, right.id));
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const byLocation = (left: CellRecordV1 | EntityV1, right: CellRecordV1 | EntityV1) =>
    (layerOrder.get(left.layerId) ?? Number.MAX_SAFE_INTEGER) -
      (layerOrder.get(right.layerId) ?? Number.MAX_SAFE_INTEGER) ||
    compareCoordinates(left.coordinate, right.coordinate) ||
    compareCodePoints(left.id, right.id);
  const sortedCells = [...source.cells].sort(byLocation);
  const sortedEntities = [...source.entities].sort(byLocation);

  const renderSymbols: RenderSymbol[] = symbols.map((symbol) => ({
    id: symbol.id,
    name: symbol.name,
    shape: symbol.shape,
    appearance: { ...symbol.appearance },
  }));
  const renderCells: RenderCell[] = sortedCells.map((cell) => ({
    id: cell.id,
    layerId: cell.layerId,
    layerOrder: layerOrder.get(cell.layerId) ?? Number.MAX_SAFE_INTEGER,
    coordinate: { ...cell.coordinate },
    tags: normalizeTags(cell.tags),
    properties: normalizeProperties(cell.properties),
  }));
  const renderEntities: RenderEntity[] = sortedEntities.map((entity) => {
    const symbol = symbolById.get(entity.symbolId);
    if (!symbol) throw new Error(`Renderer received missing symbol ${entity.symbolId}`);
    return {
      id: entity.id,
      symbolId: entity.symbolId,
      symbolName: symbol.name,
      layerId: entity.layerId,
      layerOrder: layerOrder.get(entity.layerId) ?? Number.MAX_SAFE_INTEGER,
      coordinate: { ...entity.coordinate },
      orientation: entity.orientation,
      shape: symbol.shape,
      appearance: { ...symbol.appearance },
      properties: normalizeProperties(entity.properties),
    };
  });
  const bucketsByKey = new Map<
    string,
    {
      coordinate: { x: number; y: number };
      cellIndexes: number[];
      entityIndexes: number[];
    }
  >();
  const ensureBucket = (coordinate: { x: number; y: number }) => {
    const key = `${coordinate.x},${coordinate.y}`;
    const existing = bucketsByKey.get(key);
    if (existing) return existing;
    const bucket = { coordinate: { ...coordinate }, cellIndexes: [], entityIndexes: [] };
    bucketsByKey.set(key, bucket);
    return bucket;
  };
  renderCells.forEach((cell, index) => ensureBucket(cell.coordinate).cellIndexes.push(index));
  renderEntities.forEach((entity, index) =>
    ensureBucket(entity.coordinate).entityIndexes.push(index),
  );
  const buckets: RenderBucket[] = [...bucketsByKey.values()].sort((left, right) =>
    compareCoordinates(left.coordinate, right.coordinate),
  );
  const renderLayers: RenderLayer[] = layers.map((layer) => ({
    ...layer,
    entityCount: renderEntities.filter((entity) => entity.layerId === layer.id).length,
    cellCount: renderCells.filter((cell) => cell.layerId === layer.id).length,
  }));
  const scenePayload = {
    source: source.source,
    sourceWorldId: source.sourceWorldId,
    tick: source.tick,
    stateDigest: source.stateDigest,
    grid: source.grid,
    symbols: renderSymbols,
    layers: renderLayers,
    cells: renderCells,
    entities: renderEntities,
  };
  const scene: RenderScene = {
    ...scenePayload,
    title: source.title,
    sceneKey: stableHash(JSON.stringify(scenePayload)),
    bounds: {
      x: 0,
      y: 0,
      width: source.grid.width * DEFAULT_CELL_SIZE,
      height: source.grid.height * DEFAULT_CELL_SIZE,
    },
    buckets,
  };
  freezeValue(scene);
  return scene;
}

export function createRenderSceneFromWorld(world: WorldDocumentV1): RenderScene {
  const normalized = normalizeWorldDocument(world);
  return buildScene({
    source: "world",
    sourceWorldId: normalized.id,
    title: normalized.metadata.title,
    tick: 0,
    stateDigest: null,
    grid: normalized.grid,
    symbols: normalized.palette.symbols,
    layers: normalized.layers,
    cells: normalized.cells,
    entities: normalized.entities,
  });
}

export function createRenderSceneFromSimulationState(state: SimulationStateV1): RenderScene {
  const canonical = canonicalizeSimulationState(state);
  return buildScene({
    source: "simulation",
    sourceWorldId: canonical.sourceWorldId,
    title: canonical.metadata.title,
    tick: canonical.tick,
    stateDigest: computeSimulationDigest(canonical),
    grid: canonical.grid,
    symbols: canonical.symbols,
    layers: canonical.layers,
    cells: canonical.cells,
    entities: canonical.entities,
  });
}
