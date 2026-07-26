import { coordinateKey } from "@axiom-garden/domain";

import type { SimulationStateV1 } from "./schema";

export interface SimulationIndexes {
  readonly entityById: ReadonlyMap<string, number>;
  readonly symbolById: ReadonlyMap<string, number>;
  readonly layerById: ReadonlyMap<string, number>;
  readonly entitiesByCoordinate: ReadonlyMap<string, readonly number[]>;
  readonly cellsByCoordinate: ReadonlyMap<string, number>;
}

export function buildSimulationIndexes(state: SimulationStateV1): SimulationIndexes {
  const entitiesByCoordinate = new Map<string, number[]>();
  state.entities.forEach((entity, index) => {
    const key = coordinateKey(entity.coordinate);
    const indexes = entitiesByCoordinate.get(key) ?? [];
    indexes.push(index);
    entitiesByCoordinate.set(key, indexes);
  });
  return {
    entityById: new Map(state.entities.map((entity, index) => [entity.id, index])),
    symbolById: new Map(state.symbols.map((symbol, index) => [symbol.id, index])),
    layerById: new Map(state.layers.map((layer, index) => [layer.id, index])),
    entitiesByCoordinate,
    cellsByCoordinate: new Map(
      state.cells.map((cell, index) => [
        `${cell.layerId}:${coordinateKey(cell.coordinate)}`,
        index,
      ]),
    ),
  };
}
