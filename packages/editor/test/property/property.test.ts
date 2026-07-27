import {
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  normalizeWorldDocument,
  serializeWorldDocument,
} from "@axiom-garden/domain";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  allocateDeterministicId,
  applyEditorCommand,
  computeEditorDocumentDigest,
  redoEditorCommand,
  undoEditorCommand,
} from "../../src/index";
import { editorState } from "../helpers";

describe("Editor property-based invariants", () => {
  it("applies the same move deterministically without mutating inputs", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 11 }), fc.integer({ min: 0, max: 7 }), (x, y) => {
        const state = editorState();
        const command = {
          commandId: "command:property-move",
          kind: "move_entity",
          expectedRevision: 0,
          entityId: EntityIdSchema.parse("entity:circle-001"),
          coordinate: { x, y },
        } as const;
        const stateBefore = serializeWorldDocument(state.document);
        const commandBefore = JSON.stringify(command);
        const first = applyEditorCommand(state, command);
        const second = applyEditorCommand(state, command);
        expect(first.success).toBe(true);
        expect(second.success).toBe(true);
        if (first.success && second.success) {
          expect(computeEditorDocumentDigest(first.data.state.document)).toBe(
            computeEditorDocumentDigest(second.data.state.document),
          );
        }
        expect(serializeWorldDocument(state.document)).toBe(stateBefore);
        expect(JSON.stringify(command)).toBe(commandBefore);
      }),
      { numRuns: 30 },
    );
  });

  it("undo and redo round-trip every valid generated placement", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 11 }), fc.integer({ min: 0, max: 7 }), (x, y) => {
        const state = editorState();
        const applied = applyEditorCommand(state, {
          commandId: "command:property-add",
          kind: "add_entity",
          expectedRevision: 0,
          entity: {
            id: EntityIdSchema.parse("entity:property"),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x, y },
            orientation: 0,
            properties: {},
          },
        });
        expect(applied.success).toBe(true);
        if (!applied.success) return;
        const undone = undoEditorCommand(applied.data.state);
        expect(undone.success).toBe(true);
        if (!undone.success) return;
        expect(serializeWorldDocument(undone.data.state.document)).toBe(
          serializeWorldDocument(state.document),
        );
        const redone = redoEditorCommand(undone.data.state);
        expect(redone.success).toBe(true);
        if (redone.success) {
          expect(serializeWorldDocument(redone.data.state.document)).toBe(
            serializeWorldDocument(applied.data.state.document),
          );
        }
      }),
      { numRuns: 25 },
    );
  });

  it("keeps failed commands atomic and normalization idempotent", () => {
    fc.assert(
      fc.property(fc.integer({ min: 12, max: 300 }), (x) => {
        const state = editorState();
        const before = computeEditorDocumentDigest(state.document);
        const result = applyEditorCommand(state, {
          commandId: "command:property-invalid",
          kind: "move_entity",
          expectedRevision: 0,
          entityId: EntityIdSchema.parse("entity:circle-001"),
          coordinate: { x, y: 0 },
        });
        expect(result.success).toBe(false);
        expect(state.revision).toBe(0);
        expect(computeEditorDocumentDigest(state.document)).toBe(before);
        expect(normalizeWorldDocument(normalizeWorldDocument(state.document))).toEqual(
          normalizeWorldDocument(state.document),
        );
      }),
      { numRuns: 25 },
    );
  });

  it("allocates IDs deterministically for arbitrary safe labels", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (label) => {
        const used = ["entity:item", "entity:item-2"];
        expect(allocateDeterministicId("entity", label, used)).toBe(
          allocateDeterministicId("entity", label, [...used]),
        );
      }),
      { numRuns: 50 },
    );
  });

  it("rejects class instances and prototype-shaped commands", () => {
    class ExecutableCommand {
      commandId = "command:class";
      kind = "clear_selection";
      expectedRevision = 0;
    }
    expect(applyEditorCommand(editorState(), new ExecutableCommand()).success).toBe(false);
    const polluted = Object.create({ inherited: true }) as Record<string, unknown>;
    polluted.commandId = "command:prototype";
    polluted.kind = "clear_selection";
    polluted.expectedRevision = 0;
    expect(applyEditorCommand(editorState(), polluted).success).toBe(false);
    expect((Object.prototype as { polluted?: unknown }).polluted).toBeUndefined();
  });
});
