import {
  compareCodePoints,
  compareCoordinates,
  normalizeProperties,
  normalizeTags,
} from "@axiom-garden/domain";
import type { CellRecordV1, EntityV1, LayerV1, SymbolDefinitionV1 } from "@axiom-garden/domain";

import type { SimulationStateV1 } from "./schema";

type StateSource = Omit<SimulationStateV1, "symbols" | "layers" | "cells" | "entities"> & {
  readonly symbols: readonly SymbolDefinitionV1[];
  readonly layers: readonly LayerV1[];
  readonly cells: readonly CellRecordV1[];
  readonly entities: readonly EntityV1[];
};

function cloneSymbol(symbol: SymbolDefinitionV1): SymbolDefinitionV1 {
  return {
    id: symbol.id,
    name: symbol.name,
    shape: symbol.shape,
    appearance: { ...symbol.appearance },
    defaultProperties: normalizeProperties(symbol.defaultProperties),
  };
}

function cloneLayer(layer: LayerV1): LayerV1 {
  return { ...layer };
}

function cloneCell(cell: CellRecordV1): CellRecordV1 {
  return {
    id: cell.id,
    layerId: cell.layerId,
    coordinate: { ...cell.coordinate },
    tags: normalizeTags(cell.tags),
    properties: normalizeProperties(cell.properties),
  };
}

function cloneEntity(entity: EntityV1): EntityV1 {
  return {
    id: entity.id,
    symbolId: entity.symbolId,
    layerId: entity.layerId,
    coordinate: { ...entity.coordinate },
    orientation: entity.orientation,
    properties: normalizeProperties(entity.properties),
  };
}

export function canonicalizeSimulationState(source: StateSource): SimulationStateV1 {
  const layers = source.layers
    .map(cloneLayer)
    .sort((left, right) => left.order - right.order || compareCodePoints(left.id, right.id));
  const orderByLayer = new Map(layers.map((layer) => [layer.id, layer.order]));
  const compareLocated = (left: CellRecordV1 | EntityV1, right: CellRecordV1 | EntityV1): number =>
    (orderByLayer.get(left.layerId) ?? Number.MAX_SAFE_INTEGER) -
      (orderByLayer.get(right.layerId) ?? Number.MAX_SAFE_INTEGER) ||
    compareCoordinates(left.coordinate, right.coordinate) ||
    compareCodePoints(left.id, right.id);

  return {
    stateVersion: source.stateVersion,
    sourceWorldId: source.sourceWorldId,
    sourceSchemaVersion: source.sourceSchemaVersion,
    tick: source.tick,
    metadata: {
      title: source.metadata.title.trim(),
      description: source.metadata.description,
      createdAt: source.metadata.createdAt,
      updatedAt: source.metadata.updatedAt,
      tags: normalizeTags(source.metadata.tags),
    },
    grid: { ...source.grid },
    symbols: source.symbols
      .map(cloneSymbol)
      .sort((left, right) => compareCodePoints(left.id, right.id)),
    layers,
    cells: source.cells.map(cloneCell).sort(compareLocated),
    entities: source.entities.map(cloneEntity).sort(compareLocated),
  };
}

function freezeValue(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeValue(child);
  Object.freeze(value);
}

export function finalizeSimulationState(source: StateSource): SimulationStateV1 {
  const canonical = canonicalizeSimulationState(source);
  freezeValue(canonical);
  return canonical;
}
