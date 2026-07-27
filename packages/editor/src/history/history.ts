import type { LayerId } from "@axiom-garden/domain";

import { computeEditorDocumentDigest } from "../hashing/digest";
import { editorFailure, editorIssue, editorSuccess, type EditorResult } from "../issues/issues";
import { cloneWorldDocument, deepFreeze } from "../state/clone";
import type { AppliedEditorCommand, EditorReceipt, EditorStateV1 } from "../state/types";
import { recoverSelection } from "../validation/selection";

function restore(
  state: EditorStateV1,
  direction: "undo" | "redo",
): EditorResult<AppliedEditorCommand> {
  const source = direction === "undo" ? state.undoStack : state.redoStack;
  const entry = source.at(-1);
  if (!entry) {
    return editorFailure([
      editorIssue("history_empty", [direction], `There is no command to ${direction}`),
    ]);
  }
  const document =
    direction === "undo"
      ? cloneWorldDocument(entry.beforeDocument)
      : cloneWorldDocument(entry.afterDocument);
  const revision = direction === "undo" ? entry.beforeRevision : entry.afterRevision;
  const receipt: EditorReceipt = {
    commandId: entry.commandId,
    kind: direction,
    revisionBefore: state.revision,
    revisionAfter: revision,
    documentDigestBefore: computeEditorDocumentDigest(state.document),
    documentDigestAfter: computeEditorDocumentDigest(document),
    summary: `${direction === "undo" ? "Undid" : "Redid"}: ${entry.summary}`,
    affectedIds: [...entry.affectedIds],
  };
  const undoStack =
    direction === "undo" ? state.undoStack.slice(0, -1) : [...state.undoStack, entry];
  const redoStack =
    direction === "undo" ? [...state.redoStack, entry] : state.redoStack.slice(0, -1);
  const activeLayerId = document.layers.some((layer) => layer.id === state.activeLayerId)
    ? state.activeLayerId
    : (document.layers[0]?.id as LayerId);
  return editorSuccess({
    state: deepFreeze({
      ...state,
      document,
      selection: recoverSelection(state.selection, document),
      activeLayerId,
      undoStack,
      redoStack,
      revision,
      lastReceipt: receipt,
    }),
    receipt,
  });
}

export function undoEditorCommand(state: EditorStateV1): EditorResult<AppliedEditorCommand> {
  return restore(state, "undo");
}

export function redoEditorCommand(state: EditorStateV1): EditorResult<AppliedEditorCommand> {
  return restore(state, "redo");
}
