import { isCoordinateInBounds, type WorldDocumentV1 } from "@axiom-garden/domain";

import type { EditorSelection } from "../selection/selection";

export function isSelectionValid(selection: EditorSelection, document: WorldDocumentV1): boolean {
  switch (selection.kind) {
    case "none":
      return true;
    case "entity":
      return document.entities.some((entity) => entity.id === selection.entityId);
    case "cell":
      return document.cells.some((cell) => cell.id === selection.cellId);
    case "coordinate":
      return isCoordinateInBounds(selection.coordinate, document.grid);
    case "layer":
      return document.layers.some((layer) => layer.id === selection.layerId);
    case "symbol":
      return document.palette.symbols.some((symbol) => symbol.id === selection.symbolId);
  }
}

export function recoverSelection(
  selection: EditorSelection,
  document: WorldDocumentV1,
): EditorSelection {
  return isSelectionValid(selection, document) ? selection : { kind: "none" };
}
