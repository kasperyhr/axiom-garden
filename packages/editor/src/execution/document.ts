import {
  MAX_GRID_HEIGHT,
  MAX_GRID_WIDTH,
  isCoordinateInBounds,
  normalizeWorldDocument,
  validateWorldDocument,
  type CellRecordV1,
  type EntityV1,
  type LayerV1,
  type WorldDocumentV1,
} from "@axiom-garden/domain";

import type { DocumentEditorCommand } from "../commands/schema";
import {
  editorFailure,
  editorIssue,
  editorSuccess,
  type EditorIssue,
  type EditorResult,
} from "../issues/issues";
import { cloneWorldDocument } from "../state/clone";

export interface DocumentMutation {
  readonly document: WorldDocumentV1;
  readonly summary: string;
  readonly affectedIds: readonly string[];
}

function lockedIssue(layer: LayerV1 | undefined, path: readonly (string | number)[]) {
  return layer?.locked
    ? editorIssue("locked_layer", path, "Layer is locked and its contents cannot be edited", {
        layerId: layer.id,
      })
    : null;
}

function findLayer(document: WorldDocumentV1, layerId: string) {
  return document.layers.find((layer) => layer.id === layerId);
}

function requireLayer(
  document: WorldDocumentV1,
  layerId: string,
  path: readonly (string | number)[],
): EditorIssue | null {
  return findLayer(document, layerId)
    ? null
    : editorIssue("layer_not_found", path, "Referenced layer does not exist", { layerId });
}

function requireSymbol(
  document: WorldDocumentV1,
  symbolId: string,
  path: readonly (string | number)[],
): EditorIssue | null {
  return document.palette.symbols.some((symbol) => symbol.id === symbolId)
    ? null
    : editorIssue("symbol_not_found", path, "Referenced symbol does not exist", { symbolId });
}

function validateEntityPlacement(
  document: WorldDocumentV1,
  entity: EntityV1,
  path: readonly (string | number)[],
): readonly EditorIssue[] {
  const issues = [
    requireLayer(document, entity.layerId, [...path, "layerId"]),
    requireSymbol(document, entity.symbolId, [...path, "symbolId"]),
    !isCoordinateInBounds(entity.coordinate, document.grid)
      ? editorIssue(
          "coordinate_out_of_bounds",
          [...path, "coordinate"],
          "Entity coordinate is outside the bounded grid",
        )
      : null,
    lockedIssue(findLayer(document, entity.layerId), [...path, "layerId"]),
  ];
  return issues.filter((issue): issue is EditorIssue => issue !== null);
}

function validateCellPlacement(
  document: WorldDocumentV1,
  cell: CellRecordV1,
  path: readonly (string | number)[],
  ignoreCellId?: string,
): readonly EditorIssue[] {
  const coordinateConflict = document.cells.find(
    (candidate) =>
      candidate.id !== ignoreCellId &&
      candidate.layerId === cell.layerId &&
      candidate.coordinate.x === cell.coordinate.x &&
      candidate.coordinate.y === cell.coordinate.y,
  );
  const issues = [
    requireLayer(document, cell.layerId, [...path, "layerId"]),
    !isCoordinateInBounds(cell.coordinate, document.grid)
      ? editorIssue(
          "coordinate_out_of_bounds",
          [...path, "coordinate"],
          "Cell coordinate is outside the bounded grid",
        )
      : null,
    lockedIssue(findLayer(document, cell.layerId), [...path, "layerId"]),
    coordinateConflict
      ? editorIssue(
          "cell_already_exists",
          [...path, "coordinate"],
          "A sparse cell record already exists at this layer and coordinate",
          { cellId: coordinateConflict.id },
        )
      : null,
  ];
  return issues.filter((issue): issue is EditorIssue => issue !== null);
}

function replaceAt<T>(items: readonly T[], index: number, value: T): T[] {
  return items.map((item, candidateIndex) => (candidateIndex === index ? value : item));
}

function validateCandidate(document: WorldDocumentV1): EditorResult<WorldDocumentV1> {
  const validation = validateWorldDocument(document);
  if (!validation.success) {
    return editorFailure([
      editorIssue(
        "invalid_document",
        ["document"],
        "Command would create an invalid World Document",
        {
          issueCount: validation.issues.length,
        },
      ),
    ]);
  }
  return editorSuccess(normalizeWorldDocument(validation.data));
}

function finalize(
  document: WorldDocumentV1,
  summary: string,
  affectedIds: readonly string[],
): EditorResult<DocumentMutation> {
  const validated = validateCandidate(document);
  return validated.success
    ? editorSuccess({ document: validated.data, summary, affectedIds: [...affectedIds] })
    : validated;
}

export function executeDocumentCommand(
  source: WorldDocumentV1,
  command: DocumentEditorCommand,
): EditorResult<DocumentMutation> {
  const document = cloneWorldDocument(source);

  switch (command.kind) {
    case "add_entity": {
      if (document.entities.some((entity) => entity.id === command.entity.id)) {
        return editorFailure([
          editorIssue("entity_already_exists", ["entity", "id"], "Entity ID already exists", {
            entityId: command.entity.id,
          }),
        ]);
      }
      const issues = validateEntityPlacement(document, command.entity, ["entity"]);
      if (issues.length > 0) return editorFailure(issues);
      return finalize(
        { ...document, entities: [...document.entities, command.entity] },
        `Added entity ${command.entity.id}`,
        [command.entity.id],
      );
    }
    case "remove_entity": {
      const entity = document.entities.find((candidate) => candidate.id === command.entityId);
      if (!entity) {
        return editorFailure([
          editorIssue("entity_not_found", ["entityId"], "Entity does not exist", {
            entityId: command.entityId,
          }),
        ]);
      }
      const issue = lockedIssue(findLayer(document, entity.layerId), ["entityId"]);
      if (issue) return editorFailure([issue]);
      return finalize(
        {
          ...document,
          entities: document.entities.filter((candidate) => candidate.id !== entity.id),
        },
        `Removed entity ${entity.id}`,
        [entity.id],
      );
    }
    case "replace_entity": {
      const index = document.entities.findIndex((entity) => entity.id === command.entityId);
      const existing = document.entities[index];
      if (!existing) {
        return editorFailure([
          editorIssue("entity_not_found", ["entityId"], "Entity does not exist", {
            entityId: command.entityId,
          }),
        ]);
      }
      if (command.replacement.id !== command.entityId) {
        return editorFailure([
          editorIssue(
            "invalid_command",
            ["replacement", "id"],
            "Replacement entity ID must match the target ID",
          ),
        ]);
      }
      const issues = [
        lockedIssue(findLayer(document, existing.layerId), ["entityId"]),
        ...validateEntityPlacement(document, command.replacement, ["replacement"]),
      ].filter((issue): issue is EditorIssue => issue !== null);
      if (issues.length > 0) return editorFailure(issues);
      return finalize(
        { ...document, entities: replaceAt(document.entities, index, command.replacement) },
        `Replaced entity ${command.entityId}`,
        [command.entityId],
      );
    }
    case "move_entity": {
      const index = document.entities.findIndex((entity) => entity.id === command.entityId);
      const existing = document.entities[index];
      if (!existing) {
        return editorFailure([
          editorIssue("entity_not_found", ["entityId"], "Entity does not exist", {
            entityId: command.entityId,
          }),
        ]);
      }
      const issue = lockedIssue(findLayer(document, existing.layerId), ["entityId"]);
      if (issue) return editorFailure([issue]);
      if (!isCoordinateInBounds(command.coordinate, document.grid)) {
        return editorFailure([
          editorIssue(
            "coordinate_out_of_bounds",
            ["coordinate"],
            "Target coordinate is outside the bounded grid",
          ),
        ]);
      }
      const replacement = { ...existing, coordinate: { ...command.coordinate } };
      return finalize(
        { ...document, entities: replaceAt(document.entities, index, replacement) },
        `Moved entity ${command.entityId}`,
        [command.entityId],
      );
    }
    case "add_cell_record": {
      if (document.cells.some((cell) => cell.id === command.cell.id)) {
        return editorFailure([
          editorIssue("cell_already_exists", ["cell", "id"], "Cell record ID already exists", {
            cellId: command.cell.id,
          }),
        ]);
      }
      const issues = validateCellPlacement(document, command.cell, ["cell"]);
      if (issues.length > 0) return editorFailure(issues);
      return finalize(
        { ...document, cells: [...document.cells, command.cell] },
        `Added cell record ${command.cell.id}`,
        [command.cell.id],
      );
    }
    case "remove_cell_record": {
      const cell = document.cells.find((candidate) => candidate.id === command.cellId);
      if (!cell) {
        return editorFailure([
          editorIssue("cell_not_found", ["cellId"], "Cell record does not exist", {
            cellId: command.cellId,
          }),
        ]);
      }
      const issue = lockedIssue(findLayer(document, cell.layerId), ["cellId"]);
      if (issue) return editorFailure([issue]);
      return finalize(
        { ...document, cells: document.cells.filter((candidate) => candidate.id !== cell.id) },
        `Removed cell record ${cell.id}`,
        [cell.id],
      );
    }
    case "replace_cell_record": {
      const index = document.cells.findIndex((cell) => cell.id === command.cellId);
      const existing = document.cells[index];
      if (!existing) {
        return editorFailure([
          editorIssue("cell_not_found", ["cellId"], "Cell record does not exist", {
            cellId: command.cellId,
          }),
        ]);
      }
      if (command.replacement.id !== command.cellId) {
        return editorFailure([
          editorIssue(
            "invalid_command",
            ["replacement", "id"],
            "Replacement cell ID must match the target ID",
          ),
        ]);
      }
      const issues = [
        lockedIssue(findLayer(document, existing.layerId), ["cellId"]),
        ...validateCellPlacement(document, command.replacement, ["replacement"], command.cellId),
      ].filter((issue): issue is EditorIssue => issue !== null);
      if (issues.length > 0) return editorFailure(issues);
      return finalize(
        { ...document, cells: replaceAt(document.cells, index, command.replacement) },
        `Replaced cell record ${command.cellId}`,
        [command.cellId],
      );
    }
    case "add_layer": {
      if (document.layers.some((layer) => layer.id === command.layer.id)) {
        return editorFailure([
          editorIssue("invalid_command", ["layer", "id"], "Layer ID already exists"),
        ]);
      }
      if (document.layers.some((layer) => layer.order === command.layer.order)) {
        return editorFailure([
          editorIssue("duplicate_layer_order", ["layer", "order"], "Layer order must be unique", {
            order: command.layer.order,
          }),
        ]);
      }
      return finalize(
        { ...document, layers: [...document.layers, command.layer] },
        `Added layer ${command.layer.id}`,
        [command.layer.id],
      );
    }
    case "replace_layer": {
      const index = document.layers.findIndex((layer) => layer.id === command.layerId);
      if (index < 0) {
        return editorFailure([
          editorIssue("layer_not_found", ["layerId"], "Layer does not exist", {
            layerId: command.layerId,
          }),
        ]);
      }
      if (command.replacement.id !== command.layerId) {
        return editorFailure([
          editorIssue(
            "invalid_command",
            ["replacement", "id"],
            "Replacement layer ID must match the target ID",
          ),
        ]);
      }
      if (
        document.layers.some(
          (layer) => layer.id !== command.layerId && layer.order === command.replacement.order,
        )
      ) {
        return editorFailure([
          editorIssue(
            "duplicate_layer_order",
            ["replacement", "order"],
            "Layer order must be unique",
            { order: command.replacement.order },
          ),
        ]);
      }
      return finalize(
        { ...document, layers: replaceAt(document.layers, index, command.replacement) },
        `Replaced layer ${command.layerId}`,
        [command.layerId],
      );
    }
    case "remove_layer": {
      const layer = findLayer(document, command.layerId);
      if (!layer) {
        return editorFailure([
          editorIssue("layer_not_found", ["layerId"], "Layer does not exist", {
            layerId: command.layerId,
          }),
        ]);
      }
      if (document.layers.length === 1) {
        return editorFailure([
          editorIssue("cannot_remove_last_layer", ["layerId"], "The last layer cannot be removed"),
        ]);
      }
      const entityCount = document.entities.filter(
        (entity) => entity.layerId === command.layerId,
      ).length;
      const cellCount = document.cells.filter((cell) => cell.layerId === command.layerId).length;
      if (entityCount > 0 || cellCount > 0) {
        return editorFailure([
          editorIssue("layer_in_use", ["layerId"], "Layer contains world objects", {
            layerId: command.layerId,
            entityCount,
            cellCount,
          }),
        ]);
      }
      return finalize(
        { ...document, layers: document.layers.filter((candidate) => candidate.id !== layer.id) },
        `Removed layer ${layer.id}`,
        [layer.id],
      );
    }
    case "add_symbol": {
      if (document.palette.symbols.some((symbol) => symbol.id === command.symbol.id)) {
        return editorFailure([
          editorIssue("invalid_command", ["symbol", "id"], "Symbol ID already exists"),
        ]);
      }
      return finalize(
        {
          ...document,
          palette: { symbols: [...document.palette.symbols, command.symbol] },
        },
        `Added symbol ${command.symbol.id}`,
        [command.symbol.id],
      );
    }
    case "replace_symbol": {
      const index = document.palette.symbols.findIndex((symbol) => symbol.id === command.symbolId);
      if (index < 0) {
        return editorFailure([
          editorIssue("symbol_not_found", ["symbolId"], "Symbol does not exist", {
            symbolId: command.symbolId,
          }),
        ]);
      }
      if (command.replacement.id !== command.symbolId) {
        return editorFailure([
          editorIssue(
            "invalid_command",
            ["replacement", "id"],
            "Replacement symbol ID must match the target ID",
          ),
        ]);
      }
      return finalize(
        {
          ...document,
          palette: {
            symbols: replaceAt(document.palette.symbols, index, command.replacement),
          },
        },
        `Replaced symbol ${command.symbolId}`,
        [command.symbolId],
      );
    }
    case "remove_symbol": {
      if (!document.palette.symbols.some((symbol) => symbol.id === command.symbolId)) {
        return editorFailure([
          editorIssue("symbol_not_found", ["symbolId"], "Symbol does not exist", {
            symbolId: command.symbolId,
          }),
        ]);
      }
      const referenceCount = document.entities.filter(
        (entity) => entity.symbolId === command.symbolId,
      ).length;
      if (referenceCount > 0) {
        return editorFailure([
          editorIssue("symbol_in_use", ["symbolId"], "Symbol is referenced by entities", {
            symbolId: command.symbolId,
            referenceCount,
          }),
        ]);
      }
      return finalize(
        {
          ...document,
          palette: {
            symbols: document.palette.symbols.filter((symbol) => symbol.id !== command.symbolId),
          },
        },
        `Removed symbol ${command.symbolId}`,
        [command.symbolId],
      );
    }
    case "update_metadata":
      return finalize(
        {
          ...document,
          metadata: {
            ...document.metadata,
            title: command.metadata.title,
            description: command.metadata.description,
            tags: [...command.metadata.tags],
          },
        },
        "Updated world metadata",
        [document.id],
      );
    case "resize_grid": {
      if (
        command.width < 1 ||
        command.width > MAX_GRID_WIDTH ||
        command.height < 1 ||
        command.height > MAX_GRID_HEIGHT
      ) {
        return editorFailure([
          editorIssue(
            "limit_exceeded",
            ["grid"],
            `Grid dimensions must be within 1–${MAX_GRID_WIDTH}`,
          ),
        ]);
      }
      const orphanEntities = document.entities.filter(
        (entity) => entity.coordinate.x >= command.width || entity.coordinate.y >= command.height,
      );
      const orphanCells = document.cells.filter(
        (cell) => cell.coordinate.x >= command.width || cell.coordinate.y >= command.height,
      );
      if (orphanEntities.length > 0 || orphanCells.length > 0) {
        return editorFailure([
          editorIssue(
            "resize_would_orphan_objects",
            ["grid"],
            "Grid resize would place existing objects out of bounds",
            {
              entityCount: orphanEntities.length,
              cellCount: orphanCells.length,
              sampleIds: [...orphanEntities, ...orphanCells]
                .slice(0, 4)
                .map((record) => record.id)
                .join(","),
            },
          ),
        ]);
      }
      return finalize(
        { ...document, grid: { ...document.grid, width: command.width, height: command.height } },
        `Resized grid to ${command.width} × ${command.height}`,
        [document.id],
      );
    }
    case "reset_document":
      return finalize(
        cloneWorldDocument(command.document),
        `Reset document to ${command.document.id}`,
        [command.document.id],
      );
  }
}
