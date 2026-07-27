import { CellRecordIdSchema, EntityIdSchema, LayerIdSchema } from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import { allocateDeterministicId, applyEditorCommand, createPasteCommand } from "../../src/index";
import { editorState, expectApplied } from "../helpers";

describe("Selection and clipboard", () => {
  it("changes selection and tool without changing document revision", () => {
    let state = editorState();
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:select-entity",
        kind: "set_selection",
        expectedRevision: 0,
        selection: { kind: "entity", entityId: EntityIdSchema.parse("entity:circle-001") },
      }),
    );
    expect(state.selection.kind).toBe("entity");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:set-tool",
        kind: "set_active_tool",
        expectedRevision: 0,
        tool: "placeEntity",
      }),
    );
    expect(state.activeTool).toBe("placeEntity");
    expect(state.revision).toBe(0);
  });

  it("copies an Entity deeply and creates an explicit deterministic paste command", () => {
    let state = editorState();
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:select-copy",
        kind: "set_selection",
        expectedRevision: 0,
        selection: { kind: "entity", entityId: EntityIdSchema.parse("entity:circle-001") },
      }),
    );
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:copy",
        kind: "copy_selection",
        expectedRevision: 0,
      }),
    );
    expect(state.clipboard.kind).toBe("entity");
    const id = EntityIdSchema.parse(
      allocateDeterministicId(
        "entity",
        "moss-circle-copy",
        state.document.entities.map((entity) => entity.id),
      ),
    );
    const paste = createPasteCommand(state, {
      commandId: "command:paste",
      id,
      coordinate: { x: 5, y: 3 },
      layerId: LayerIdSchema.parse("layer:objects"),
    });
    expect(paste.success).toBe(true);
    if (!paste.success) return;
    const pasted = expectApplied(applyEditorCommand(state, paste.data));
    expect(pasted.document.entities.some((entity) => entity.id === id)).toBe(true);
    expect(pasted.revision).toBe(1);
  });

  it("copies and pastes a Cell Record and reports unsupported selections", () => {
    let state = editorState();
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:select-cell",
        kind: "set_selection",
        expectedRevision: 0,
        selection: { kind: "cell", cellId: CellRecordIdSchema.parse("cell:anchor-a") },
      }),
    );
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:copy-cell",
        kind: "copy_selection",
        expectedRevision: 0,
      }),
    );
    const paste = createPasteCommand(state, {
      commandId: "command:paste-cell",
      id: CellRecordIdSchema.parse("cell:anchor-copy"),
      coordinate: { x: 4, y: 4 },
      layerId: LayerIdSchema.parse("layer:annotations"),
    });
    expect(paste.success).toBe(true);

    const coordinateSelected = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:select-coordinate",
        kind: "set_selection",
        expectedRevision: 0,
        selection: { kind: "coordinate", coordinate: { x: 0, y: 0 } },
      }),
    );
    const rejected = applyEditorCommand(coordinateSelected, {
      commandId: "command:copy-coordinate",
      kind: "copy_selection",
      expectedRevision: 0,
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success) expect(rejected.issues[0]?.code).toBe("unsupported_selection");
  });
});
