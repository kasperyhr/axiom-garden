import {
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  normalizeWorldDocument,
} from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import {
  applyEditorCommand,
  computeEditorDocumentDigest,
  createEditorState,
  redoEditorCommand,
  undoEditorCommand,
} from "../../src/index";
import { editorState, expectApplied, representativeWorld } from "../helpers";

const BUDGET_MS = 30_000;

describe("Editor wide performance budget", () => {
  it("handles command, history, digest, and a 4,000 entity move within a wide budget", () => {
    const started = performance.now();
    let state = editorState();
    for (let index = 0; index < 100; index += 1) {
      state = expectApplied(
        applyEditorCommand(state, {
          commandId: `command:bench-add-${index}`,
          kind: "add_entity",
          expectedRevision: state.revision,
          entity: {
            id: EntityIdSchema.parse(`entity:bench-${index}`),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x: index % 12, y: Math.floor(index / 12) % 8 },
            orientation: 0,
            properties: {},
          },
        }),
      );
    }
    for (let index = 0; index < 100; index += 1) {
      const undone = undoEditorCommand(state);
      if (!undone.success) throw new Error("Expected undo success");
      state = undone.data.state;
    }
    for (let index = 0; index < 100; index += 1) {
      const redone = redoEditorCommand(state);
      if (!redone.success) throw new Error("Expected redo success");
      state = redone.data.state;
    }
    expect(state.undoStack).toHaveLength(100);
    expect(computeEditorDocumentDigest(state.document)).toMatch(/^agd1:/u);

    const source = representativeWorld();
    const entities = Array.from({ length: 4_000 }, (_, index) => ({
      id: EntityIdSchema.parse(`entity:large-${index}`),
      symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
      layerId: LayerIdSchema.parse("layer:objects"),
      coordinate: { x: index % 64, y: Math.floor(index / 64) % 64 },
      orientation: 0 as const,
      properties: {},
    }));
    const largeWorld = normalizeWorldDocument({
      ...source,
      grid: { ...source.grid, width: 64, height: 64 },
      entities,
    });
    const large = createEditorState(largeWorld);
    expect(large.success).toBe(true);
    if (!large.success) return;
    const moved = applyEditorCommand(large.data, {
      commandId: "command:large-move",
      kind: "move_entity",
      expectedRevision: 0,
      entityId: EntityIdSchema.parse("entity:large-3999"),
      coordinate: { x: 0, y: 0 },
    });
    expect(moved.success).toBe(true);
    expect(performance.now() - started).toBeLessThan(BUDGET_MS);
  });
});
