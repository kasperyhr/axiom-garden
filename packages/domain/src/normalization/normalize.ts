import type {
  CellRecordV1,
  EntityV1,
  LayerV1,
  SymbolDefinitionV1,
  WorldDocumentV1,
} from "../schemas/world";
import { compareCoordinates } from "../utilities/coordinates";
import { compareCodePoints, normalizeProperties } from "../utilities/properties";

export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()))].sort(compareCodePoints);
}

function normalizeSymbol(symbol: SymbolDefinitionV1): SymbolDefinitionV1 {
  return {
    id: symbol.id,
    name: symbol.name,
    shape: symbol.shape,
    appearance: {
      fill: symbol.appearance.fill,
      stroke: symbol.appearance.stroke,
      variant: symbol.appearance.variant,
    },
    defaultProperties: normalizeProperties(symbol.defaultProperties),
  };
}

function normalizeLayer(layer: LayerV1): LayerV1 {
  return {
    id: layer.id,
    name: layer.name,
    order: layer.order,
    visible: layer.visible,
    locked: layer.locked,
  };
}

function normalizeCell(cell: CellRecordV1): CellRecordV1 {
  return {
    id: cell.id,
    layerId: cell.layerId,
    coordinate: { x: cell.coordinate.x, y: cell.coordinate.y },
    tags: normalizeTags(cell.tags),
    properties: normalizeProperties(cell.properties),
  };
}

function normalizeEntity(entity: EntityV1): EntityV1 {
  return {
    id: entity.id,
    symbolId: entity.symbolId,
    layerId: entity.layerId,
    coordinate: { x: entity.coordinate.x, y: entity.coordinate.y },
    orientation: entity.orientation,
    properties: normalizeProperties(entity.properties),
  };
}

export function normalizeWorldDocument(world: WorldDocumentV1): WorldDocumentV1 {
  const layers = world.layers
    .map(normalizeLayer)
    .sort((left, right) => left.order - right.order || compareCodePoints(left.id, right.id));
  const layerOrder = new Map<string, number>(layers.map((layer) => [layer.id, layer.order]));
  const byLocation = <
    T extends {
      readonly id: string;
      readonly layerId: string;
      readonly coordinate: { x: number; y: number };
    },
  >(
    left: T,
    right: T,
  ) =>
    (layerOrder.get(left.layerId) ?? Number.MAX_SAFE_INTEGER) -
      (layerOrder.get(right.layerId) ?? Number.MAX_SAFE_INTEGER) ||
    compareCoordinates(left.coordinate, right.coordinate) ||
    compareCodePoints(left.id, right.id);

  return {
    format: world.format,
    schemaVersion: world.schemaVersion,
    id: world.id,
    metadata: {
      title: world.metadata.title.trim(),
      description: world.metadata.description,
      createdAt: world.metadata.createdAt,
      updatedAt: world.metadata.updatedAt,
      tags: normalizeTags(world.metadata.tags),
    },
    grid: {
      kind: world.grid.kind,
      width: world.grid.width,
      height: world.grid.height,
      origin: world.grid.origin,
      boundary: world.grid.boundary,
    },
    palette: {
      symbols: world.palette.symbols
        .map(normalizeSymbol)
        .sort((left, right) => compareCodePoints(left.id, right.id)),
    },
    layers,
    cells: world.cells.map(normalizeCell).sort(byLocation),
    entities: world.entities.map(normalizeEntity).sort(byLocation),
  };
}
