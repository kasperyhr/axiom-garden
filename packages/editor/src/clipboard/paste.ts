import type { CellRecordId, Coordinate, EntityId, LayerId } from "@axiom-garden/domain";

import type { AddCellRecordCommand, AddEntityCommand } from "../commands/schema";
import { cloneDomainProperties } from "./clipboard";
import { editorFailure, editorIssue, editorSuccess, type EditorResult } from "../issues/issues";
import type { EditorStateV1 } from "../state/types";

export type PasteCommand = AddEntityCommand | AddCellRecordCommand;

export function createPasteCommand(
  state: EditorStateV1,
  input: {
    readonly commandId: string;
    readonly id: EntityId | CellRecordId;
    readonly coordinate: Coordinate;
    readonly layerId: LayerId;
  },
): EditorResult<PasteCommand> {
  if (state.clipboard.kind === "empty") {
    return editorFailure([
      editorIssue("clipboard_empty", ["clipboard"], "Editor clipboard is empty"),
    ]);
  }
  if (state.clipboard.kind === "entity") {
    return editorSuccess({
      commandId: input.commandId,
      expectedRevision: state.revision,
      kind: "add_entity",
      entity: {
        ...state.clipboard.entity,
        id: input.id as EntityId,
        layerId: input.layerId,
        coordinate: { ...input.coordinate },
        properties: cloneDomainProperties(state.clipboard.entity.properties),
      },
    });
  }
  return editorSuccess({
    commandId: input.commandId,
    expectedRevision: state.revision,
    kind: "add_cell_record",
    cell: {
      ...state.clipboard.cell,
      id: input.id as CellRecordId,
      layerId: input.layerId,
      coordinate: { ...input.coordinate },
      tags: [...state.clipboard.cell.tags],
      properties: cloneDomainProperties(state.clipboard.cell.properties),
    },
  });
}
