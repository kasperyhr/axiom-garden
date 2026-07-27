import {
  normalizeWorldDocument,
  validateWorldDocument,
  type WorldDocumentV1,
} from "@axiom-garden/domain";

import { EMPTY_CLIPBOARD } from "../clipboard/clipboard";
import { editorFailure, editorIssue, editorSuccess, type EditorResult } from "../issues/issues";
import { CURRENT_EDITOR_STATE_VERSION } from "../limits/constants";
import { EMPTY_SELECTION } from "../selection/selection";
import { cloneWorldDocument, deepFreeze } from "./clone";
import type { EditorStateV1 } from "./types";

export function createEditorState(world: WorldDocumentV1): EditorResult<EditorStateV1> {
  const validation = validateWorldDocument(world);
  if (!validation.success) {
    return editorFailure([
      editorIssue("invalid_document", ["document"], "World Document is invalid", {
        issueCount: validation.issues.length,
      }),
    ]);
  }
  const document = cloneWorldDocument(normalizeWorldDocument(validation.data));
  const activeLayer = document.layers[0];
  if (!activeLayer) {
    return editorFailure([
      editorIssue("invalid_document", ["document", "layers"], "Editor requires at least one layer"),
    ]);
  }
  return editorSuccess(
    deepFreeze({
      editorStateVersion: CURRENT_EDITOR_STATE_VERSION,
      document,
      selection: EMPTY_SELECTION,
      activeLayerId: activeLayer.id,
      activeTool: "inspect",
      clipboard: EMPTY_CLIPBOARD,
      undoStack: [],
      redoStack: [],
      revision: 0,
      lastReceipt: null,
    }),
  );
}
