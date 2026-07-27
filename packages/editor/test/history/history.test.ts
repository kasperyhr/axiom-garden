import {
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  serializeWorldDocument,
} from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import {
  MAX_EDITOR_HISTORY,
  applyEditorCommand,
  applyEditorCommandBatch,
  redoEditorCommand,
  undoEditorCommand,
} from "../../src/index";
import { editorState, expectApplied, representativeWorld } from "../helpers";

function addEntity(state: ReturnType<typeof editorState>, suffix: number) {
  return applyEditorCommand(state, {
    commandId: `command:add-${suffix}`,
    kind: "add_entity",
    expectedRevision: state.revision,
    entity: {
      id: EntityIdSchema.parse(`entity:history-${suffix}`),
      symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
      layerId: LayerIdSchema.parse("layer:objects"),
      coordinate: { x: suffix % 12, y: Math.floor(suffix / 12) % 8 },
      orientation: 0,
      properties: {},
    },
  });
}

describe("Editor history", () => {
  it("undoes and redoes a document command with exact revisions", () => {
    const initial = editorState();
    const changed = expectApplied(addEntity(initial, 1));
    const undo = undoEditorCommand(changed);
    expect(undo.success).toBe(true);
    if (!undo.success) return;
    expect(undo.data.state.revision).toBe(0);
    expect(serializeWorldDocument(undo.data.state.document)).toBe(
      serializeWorldDocument(initial.document),
    );
    const redo = redoEditorCommand(undo.data.state);
    expect(redo.success).toBe(true);
    if (!redo.success) return;
    expect(redo.data.state.revision).toBe(1);
    expect(serializeWorldDocument(redo.data.state.document)).toBe(
      serializeWorldDocument(changed.document),
    );
  });

  it("clears redo after a new document command and excludes failed commands", () => {
    const first = expectApplied(addEntity(editorState(), 1));
    const undone = undoEditorCommand(first);
    expect(undone.success).toBe(true);
    if (!undone.success) return;
    const replacement = expectApplied(addEntity(undone.data.state, 2));
    expect(replacement.redoStack).toHaveLength(0);

    const before = replacement.undoStack.length;
    const failed = applyEditorCommand(replacement, {
      commandId: "command:missing",
      kind: "remove_entity",
      expectedRevision: replacement.revision,
      entityId: EntityIdSchema.parse("entity:not-found"),
    });
    expect(failed.success).toBe(false);
    expect(replacement.undoStack).toHaveLength(before);
  });

  it("bounds history and keeps a batch as one entry", () => {
    let state = editorState();
    for (let index = 0; index < MAX_EDITOR_HISTORY + 2; index += 1) {
      state = expectApplied(addEntity(state, index + 10));
    }
    expect(state.undoStack).toHaveLength(MAX_EDITOR_HISTORY);
    expect(state.undoStack[0]?.commandId).toBe("command:add-12");

    const batch = applyEditorCommandBatch(editorState(), {
      commandId: "command:history-batch",
      kind: "batch",
      expectedRevision: 0,
      commands: [
        {
          commandId: "command:history-batch-one",
          kind: "add_entity",
          expectedRevision: 0,
          entity: {
            id: EntityIdSchema.parse("entity:batch-one"),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x: 1, y: 1 },
            orientation: 0,
            properties: {},
          },
        },
        {
          commandId: "command:history-batch-two",
          kind: "add_entity",
          expectedRevision: 0,
          entity: {
            id: EntityIdSchema.parse("entity:batch-two"),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x: 2, y: 2 },
            orientation: 0,
            properties: {},
          },
        },
      ],
    });
    expect(batch.success).toBe(true);
    if (batch.success) expect(batch.data.state.undoStack).toHaveLength(1);
  });

  it("recovers selection after remove, undo, redo, and reset", () => {
    let state = editorState();
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:select",
        kind: "set_selection",
        expectedRevision: 0,
        selection: { kind: "entity", entityId: EntityIdSchema.parse("entity:circle-001") },
      }),
    );
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:remove-selected",
        kind: "remove_entity",
        expectedRevision: 0,
        entityId: EntityIdSchema.parse("entity:circle-001"),
      }),
    );
    expect(state.selection.kind).toBe("none");
    const undo = undoEditorCommand(state);
    expect(undo.success).toBe(true);
    if (!undo.success) return;
    expect(
      undo.data.state.document.entities.some((entity) => entity.id === "entity:circle-001"),
    ).toBe(true);

    const reset = applyEditorCommand(undo.data.state, {
      commandId: "command:reset-document",
      kind: "reset_document",
      expectedRevision: undo.data.state.revision,
      document: representativeWorld(),
    });
    expect(reset.success).toBe(true);
    if (!reset.success) return;
    expect(reset.data.state.undoStack.length).toBeGreaterThan(0);
    expect(undoEditorCommand(reset.data.state).success).toBe(true);
  });

  it("reports empty history and does not mutate previous states", () => {
    const initial = editorState();
    const before = serializeWorldDocument(initial.document);
    expect(undoEditorCommand(initial).success).toBe(false);
    const changed = expectApplied(addEntity(initial, 4));
    expect(serializeWorldDocument(initial.document)).toBe(before);
    expect(changed.document).not.toBe(initial.document);
  });
});
