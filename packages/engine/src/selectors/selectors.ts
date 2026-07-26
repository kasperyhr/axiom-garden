import {
  coordinateKey,
  normalizeProperties,
  normalizeTags,
  type CellRecordV1,
  type Coordinate,
  type EntityId,
  type EntityV1,
  type LayerId,
  type LayerV1,
  type SymbolDefinitionV1,
  type SymbolId,
} from "@axiom-garden/domain";

import type { SimulationStateV1 } from "../state/schema";
import { buildSimulationIndexes } from "../state/indexes";

function cloneEntity(entity: EntityV1): EntityV1 {
  return {
    ...entity,
    coordinate: { ...entity.coordinate },
    properties: normalizeProperties(entity.properties),
  };
}

function cloneCell(cell: CellRecordV1): CellRecordV1 {
  return {
    ...cell,
    coordinate: { ...cell.coordinate },
    tags: normalizeTags(cell.tags),
    properties: normalizeProperties(cell.properties),
  };
}

function cloneSymbol(symbol: SymbolDefinitionV1): SymbolDefinitionV1 {
  return {
    ...symbol,
    appearance: { ...symbol.appearance },
    defaultProperties: normalizeProperties(symbol.defaultProperties),
  };
}

export function getEntityById(state: SimulationStateV1, entityId: EntityId): EntityV1 | undefined {
  const index = buildSimulationIndexes(state).entityById.get(entityId);
  const entity = index === undefined ? undefined : state.entities[index];
  return entity === undefined ? undefined : cloneEntity(entity);
}

export function getSymbolById(
  state: SimulationStateV1,
  symbolId: SymbolId,
): SymbolDefinitionV1 | undefined {
  const index = buildSimulationIndexes(state).symbolById.get(symbolId);
  const symbol = index === undefined ? undefined : state.symbols[index];
  return symbol === undefined ? undefined : cloneSymbol(symbol);
}

export function getLayerById(state: SimulationStateV1, layerId: LayerId): LayerV1 | undefined {
  const index = buildSimulationIndexes(state).layerById.get(layerId);
  const layer = index === undefined ? undefined : state.layers[index];
  return layer === undefined ? undefined : { ...layer };
}

export function getCellRecordAt(
  state: SimulationStateV1,
  layerId: LayerId,
  coordinate: Coordinate,
): CellRecordV1 | undefined {
  const index = buildSimulationIndexes(state).cellsByCoordinate.get(
    `${layerId}:${coordinateKey(coordinate)}`,
  );
  const cell = index === undefined ? undefined : state.cells[index];
  return cell === undefined ? undefined : cloneCell(cell);
}

export function getEntitiesAt(
  state: SimulationStateV1,
  coordinate: Coordinate,
): readonly EntityV1[] {
  const indexes = buildSimulationIndexes(state).entitiesByCoordinate.get(coordinateKey(coordinate));
  return (indexes ?? []).flatMap((index) => {
    const entity = state.entities[index];
    return entity === undefined ? [] : [cloneEntity(entity)];
  });
}

export function getEntitiesInLayer(
  state: SimulationStateV1,
  layerId: LayerId,
): readonly EntityV1[] {
  return state.entities.filter((entity) => entity.layerId === layerId).map(cloneEntity);
}

export function countEntities(state: SimulationStateV1): number {
  return state.entities.length;
}
