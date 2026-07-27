import type { LayerId } from "@axiom-garden/domain";
import type { ZodIssue } from "zod";

import { copyCell, copyEntity, EMPTY_CLIPBOARD } from "../clipboard/clipboard";
import {
  EditorCommandBatchSchema,
  EditorCommandSchema,
  type DocumentEditorCommand,
  type EditorCommand,
  type EditorCommandBatch,
  type EditorOnlyCommand,
} from "../commands/schema";
import { computeEditorDocumentDigest } from "../hashing/digest";
import {
  editorFailure,
  editorIssue,
  editorSuccess,
  type EditorIssue,
  type EditorResult,
} from "../issues/issues";
import { MAX_EDITOR_HISTORY } from "../limits/constants";
import { EMPTY_SELECTION } from "../selection/selection";
import { cloneWorldDocument, deepFreeze } from "../state/clone";
import type {
  AppliedEditorCommand,
  EditorHistoryEntry,
  EditorReceipt,
  EditorStateV1,
} from "../state/types";
import { recoverSelection, isSelectionValid } from "../validation/selection";
import { executeDocumentCommand, type DocumentMutation } from "./document";

function isPureData(value: unknown, seen = new Set<object>()): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.every((item) => isPureData(item, seen));
  const prototype: object | null = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.keys(value).every(
    (key) =>
      key !== "__proto__" &&
      key !== "prototype" &&
      key !== "constructor" &&
      isPureData((value as Record<string, unknown>)[key], seen),
  );
}

function schemaIssues(issues: readonly ZodIssue[]): readonly EditorIssue[] {
  return issues.map((issue) =>
    editorIssue(
      issue.path[0] === "commandId" ? "invalid_command_id" : "invalid_command",
      issue.path.flatMap((segment) =>
        typeof segment === "string" || typeof segment === "number" ? [segment] : [],
      ),
      issue.message,
    ),
  );
}

function receipt(
  state: EditorStateV1,
  mutation: DocumentMutation,
  commandId: string,
  kind: string,
): EditorReceipt {
  return {
    commandId,
    kind,
    revisionBefore: state.revision,
    revisionAfter: state.revision + 1,
    documentDigestBefore: computeEditorDocumentDigest(state.document),
    documentDigestAfter: computeEditorDocumentDigest(mutation.document),
    summary: mutation.summary,
    affectedIds: [...mutation.affectedIds],
  };
}

function commitDocument(
  state: EditorStateV1,
  mutation: DocumentMutation,
  commandId: string,
  kind: string,
): AppliedEditorCommand {
  const nextReceipt = receipt(state, mutation, commandId, kind);
  const history: EditorHistoryEntry = {
    commandId,
    kind,
    beforeDocument: cloneWorldDocument(state.document),
    afterDocument: cloneWorldDocument(mutation.document),
    beforeRevision: state.revision,
    afterRevision: state.revision + 1,
    summary: mutation.summary,
    affectedIds: [...mutation.affectedIds],
  };
  const undoStack = [...state.undoStack, history].slice(-MAX_EDITOR_HISTORY);
  const activeLayerId = mutation.document.layers.some((layer) => layer.id === state.activeLayerId)
    ? state.activeLayerId
    : (mutation.document.layers[0]?.id as LayerId);
  return {
    state: deepFreeze({
      ...state,
      document: cloneWorldDocument(mutation.document),
      selection: recoverSelection(state.selection, mutation.document),
      activeLayerId,
      undoStack,
      redoStack: [],
      revision: state.revision + 1,
      lastReceipt: nextReceipt,
    }),
    receipt: nextReceipt,
  };
}

function applyEditorOnly(
  state: EditorStateV1,
  command: EditorOnlyCommand,
): EditorResult<AppliedEditorCommand> {
  switch (command.kind) {
    case "set_selection":
      if (!isSelectionValid(command.selection, state.document)) {
        return editorFailure([
          editorIssue(
            "unsupported_selection",
            ["selection"],
            "Selection does not reference the current document",
          ),
        ]);
      }
      return editorSuccess({
        state: deepFreeze({ ...state, selection: command.selection }),
        receipt: null,
      });
    case "clear_selection":
      return editorSuccess({
        state: deepFreeze({ ...state, selection: EMPTY_SELECTION }),
        receipt: null,
      });
    case "set_active_layer":
      if (!state.document.layers.some((layer) => layer.id === command.layerId)) {
        return editorFailure([
          editorIssue("layer_not_found", ["layerId"], "Layer does not exist", {
            layerId: command.layerId,
          }),
        ]);
      }
      return editorSuccess({
        state: deepFreeze({ ...state, activeLayerId: command.layerId }),
        receipt: null,
      });
    case "set_active_tool":
      return editorSuccess({
        state: deepFreeze({ ...state, activeTool: command.tool }),
        receipt: null,
      });
    case "clear_clipboard":
      return editorSuccess({
        state: deepFreeze({ ...state, clipboard: EMPTY_CLIPBOARD }),
        receipt: null,
      });
    case "copy_selection": {
      const selection = state.selection;
      if (selection.kind === "entity") {
        const entity = state.document.entities.find(
          (candidate) => candidate.id === selection.entityId,
        );
        if (entity) {
          return editorSuccess({
            state: deepFreeze({ ...state, clipboard: copyEntity(entity) }),
            receipt: null,
          });
        }
      }
      if (selection.kind === "cell") {
        const cell = state.document.cells.find((candidate) => candidate.id === selection.cellId);
        if (cell) {
          return editorSuccess({
            state: deepFreeze({ ...state, clipboard: copyCell(cell) }),
            receipt: null,
          });
        }
      }
      return editorFailure([
        editorIssue(
          "unsupported_selection",
          ["selection"],
          "Only an Entity or Cell Record selection can be copied",
        ),
      ]);
    }
  }
}

export function applyEditorCommand(
  state: EditorStateV1,
  input: unknown,
): EditorResult<AppliedEditorCommand> {
  if (!isPureData(input)) {
    return editorFailure([
      editorIssue("invalid_command", [], "Editor command must be finite pure data"),
    ]);
  }
  const parsed = EditorCommandSchema.safeParse(input);
  if (!parsed.success) return editorFailure(schemaIssues(parsed.error.issues));
  const command = parsed.data;
  if (command.expectedRevision !== state.revision) {
    return editorFailure([
      editorIssue("revision_mismatch", ["expectedRevision"], "Command revision is stale", {
        expectedRevision: command.expectedRevision,
        actualRevision: state.revision,
      }),
    ]);
  }
  if (!isDocumentEditorCommand(command)) return applyEditorOnly(state, command);
  const mutation = executeDocumentCommand(state.document, command);
  return mutation.success
    ? editorSuccess(commitDocument(state, mutation.data, command.commandId, command.kind))
    : mutation;
}

function isDocumentEditorCommand(command: EditorCommand): command is DocumentEditorCommand {
  return !(
    command.kind === "set_selection" ||
    command.kind === "clear_selection" ||
    command.kind === "set_active_layer" ||
    command.kind === "set_active_tool" ||
    command.kind === "copy_selection" ||
    command.kind === "clear_clipboard"
  );
}

export function applyEditorCommandBatch(
  state: EditorStateV1,
  input: unknown,
): EditorResult<AppliedEditorCommand> {
  if (!isPureData(input)) {
    return editorFailure([
      editorIssue("invalid_command", [], "Editor command batch must be finite pure data"),
    ]);
  }
  const parsed = EditorCommandBatchSchema.safeParse(input);
  if (!parsed.success) return editorFailure(schemaIssues(parsed.error.issues));
  const batch: EditorCommandBatch = parsed.data;
  if (batch.expectedRevision !== state.revision) {
    return editorFailure([
      editorIssue("revision_mismatch", ["expectedRevision"], "Batch revision is stale", {
        expectedRevision: batch.expectedRevision,
        actualRevision: state.revision,
      }),
    ]);
  }
  let document = state.document;
  const summaries: string[] = [];
  const affectedIds: string[] = [];
  for (const [index, command] of batch.commands.entries()) {
    if (command.expectedRevision !== state.revision) {
      return editorFailure([
        editorIssue(
          "revision_mismatch",
          ["commands", index, "expectedRevision"],
          "Batch child revision must match the batch base revision",
        ),
      ]);
    }
    const mutation = executeDocumentCommand(document, command);
    if (!mutation.success) {
      return editorFailure(
        mutation.issues.map((issue) => ({
          ...issue,
          path: ["commands", index, ...issue.path],
        })),
      );
    }
    document = mutation.data.document;
    summaries.push(mutation.data.summary);
    affectedIds.push(...mutation.data.affectedIds);
  }
  return editorSuccess(
    commitDocument(
      state,
      {
        document,
        summary: summaries.join("; "),
        affectedIds: [...new Set(affectedIds)],
      },
      batch.commandId,
      batch.kind,
    ),
  );
}
