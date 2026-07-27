import {
  CellRecordIdSchema,
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  validateWorldDocument,
} from "@axiom-garden/domain";
import { describe, expect, it } from "vitest";

import {
  allocateDeterministicId,
  applyEditorCommand,
  applyEditorCommandBatch,
  computeEditorDocumentDigest,
  createEditorState,
} from "../../src/index";
import { editorState, expectApplied, representativeWorld } from "../helpers";

describe("Editor commands", () => {
  it("creates a defensive canonical state at revision zero", () => {
    const world = representativeWorld();
    const result = createEditorState(world);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.revision).toBe(0);
    expect(result.data.activeTool).toBe("inspect");
    expect(result.data.document).not.toBe(world);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(computeEditorDocumentDigest(result.data.document)).toMatch(/^agd1:[0-9a-f]{16}$/u);
  });

  it("adds, moves, replaces, and removes an Entity atomically", () => {
    let state = editorState();
    const id = EntityIdSchema.parse("entity:new-circle");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:add-entity",
        kind: "add_entity",
        expectedRevision: 0,
        entity: {
          id,
          symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
          layerId: LayerIdSchema.parse("layer:objects"),
          coordinate: { x: 4, y: 3 },
          orientation: 0,
          properties: { note: "placed" },
        },
      }),
    );
    expect(state.revision).toBe(1);
    expect(state.document.entities.some((entity) => entity.id === id)).toBe(true);

    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:move-entity",
        kind: "move_entity",
        expectedRevision: 1,
        entityId: id,
        coordinate: { x: 5, y: 4 },
      }),
    );
    expect(state.document.entities.find((entity) => entity.id === id)?.coordinate).toEqual({
      x: 5,
      y: 4,
    });

    const entity = state.document.entities.find((candidate) => candidate.id === id);
    expect(entity).toBeDefined();
    if (!entity) return;
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:replace-entity",
        kind: "replace_entity",
        expectedRevision: 2,
        entityId: id,
        replacement: { ...entity, orientation: 90, properties: { tone: "quiet" } },
      }),
    );
    expect(state.document.entities.find((candidate) => candidate.id === id)?.orientation).toBe(90);

    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:remove-entity",
        kind: "remove_entity",
        expectedRevision: 3,
        entityId: id,
      }),
    );
    expect(state.document.entities.some((candidate) => candidate.id === id)).toBe(false);
    expect(validateWorldDocument(state.document).success).toBe(true);
  });

  it("adds, replaces, and removes sparse Cell Records", () => {
    let state = editorState();
    const id = CellRecordIdSchema.parse("cell:marker");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:add-cell",
        kind: "add_cell_record",
        expectedRevision: 0,
        cell: {
          id,
          layerId: LayerIdSchema.parse("layer:objects"),
          coordinate: { x: 4, y: 3 },
          tags: ["marker"],
          properties: {},
        },
      }),
    );
    const cell = state.document.cells.find((candidate) => candidate.id === id);
    expect(cell).toBeDefined();
    if (!cell) return;
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:replace-cell",
        kind: "replace_cell_record",
        expectedRevision: 1,
        cellId: id,
        replacement: { ...cell, tags: ["marker", "quiet"] },
      }),
    );
    expect(state.document.cells.find((candidate) => candidate.id === id)?.tags).toEqual([
      "marker",
      "quiet",
    ]);
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:remove-cell",
        kind: "remove_cell_record",
        expectedRevision: 2,
        cellId: id,
      }),
    );
    expect(state.document.cells.some((candidate) => candidate.id === id)).toBe(false);
  });

  it("edits symbols and refuses to remove a referenced symbol", () => {
    let state = editorState();
    const symbolId = SymbolIdSchema.parse("symbol:clay-square");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:add-symbol",
        kind: "add_symbol",
        expectedRevision: 0,
        symbol: {
          id: symbolId,
          name: "Clay square",
          shape: "square",
          appearance: { fill: "clay", stroke: "graphite", variant: "outline" },
          defaultProperties: {},
        },
      }),
    );
    const symbol = state.document.palette.symbols.find((candidate) => candidate.id === symbolId);
    expect(symbol).toBeDefined();
    if (!symbol) return;
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:replace-symbol",
        kind: "replace_symbol",
        expectedRevision: 1,
        symbolId,
        replacement: { ...symbol, name: "Quiet clay square", shape: "diamond" },
      }),
    );
    expect(
      state.document.palette.symbols.find((candidate) => candidate.id === symbolId)?.shape,
    ).toBe("diamond");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:remove-symbol",
        kind: "remove_symbol",
        expectedRevision: 2,
        symbolId,
      }),
    );
    expect(state.document.palette.symbols.some((candidate) => candidate.id === symbolId)).toBe(
      false,
    );

    const rejected = applyEditorCommand(state, {
      commandId: "command:remove-used-symbol",
      kind: "remove_symbol",
      expectedRevision: 3,
      symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success) expect(rejected.issues[0]?.code).toBe("symbol_in_use");
    expect(state.revision).toBe(3);
  });

  it("edits layers, enforces order, use, last-layer, and locked content", () => {
    let state = editorState();
    const layerId = LayerIdSchema.parse("layer:quiet");
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:add-layer",
        kind: "add_layer",
        expectedRevision: 0,
        layer: { id: layerId, name: "Quiet", order: 30, visible: true, locked: false },
      }),
    );
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:replace-layer",
        kind: "replace_layer",
        expectedRevision: 1,
        layerId,
        replacement: {
          id: layerId,
          name: "Quiet layer",
          order: 31,
          visible: false,
          locked: true,
        },
      }),
    );
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:remove-layer",
        kind: "remove_layer",
        expectedRevision: 2,
        layerId,
      }),
    );
    const used = applyEditorCommand(state, {
      commandId: "command:remove-used-layer",
      kind: "remove_layer",
      expectedRevision: 3,
      layerId: LayerIdSchema.parse("layer:objects"),
    });
    expect(used.success).toBe(false);
    if (!used.success) expect(used.issues[0]?.code).toBe("layer_in_use");

    const locked = applyEditorCommand(state, {
      commandId: "command:add-to-locked",
      kind: "add_entity",
      expectedRevision: 3,
      entity: {
        id: EntityIdSchema.parse("entity:locked"),
        symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
        layerId: LayerIdSchema.parse("layer:annotations"),
        coordinate: { x: 1, y: 1 },
        orientation: 0,
        properties: {},
      },
    });
    expect(locked.success).toBe(false);
    if (!locked.success)
      expect(locked.issues.some((issue) => issue.code === "locked_layer")).toBe(true);
  });

  it("resizes the grid, updates metadata, and preserves fixed timestamps", () => {
    let state = editorState();
    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:resize-grid",
        kind: "resize_grid",
        expectedRevision: 0,
        width: 16,
        height: 12,
      }),
    );
    expect(state.document.grid).toMatchObject({ width: 16, height: 12 });
    const shrink = applyEditorCommand(state, {
      commandId: "command:shrink-grid",
      kind: "resize_grid",
      expectedRevision: 1,
      width: 2,
      height: 2,
    });
    expect(shrink.success).toBe(false);
    if (!shrink.success) expect(shrink.issues[0]?.code).toBe("resize_would_orphan_objects");

    state = expectApplied(
      applyEditorCommand(state, {
        commandId: "command:update-metadata",
        kind: "update_metadata",
        expectedRevision: 1,
        metadata: {
          title: "Quiet Orbit Revised",
          description: "An in-memory edit.",
          tags: ["edited", "abstract"],
        },
      }),
    );
    expect(state.document.metadata.title).toBe("Quiet Orbit Revised");
    expect(state.document.metadata.createdAt).toBe("2026-07-26T00:00:00.000Z");
    expect(state.document.metadata.updatedAt).toBe("2026-07-26T00:00:00.000Z");
  });

  it("applies ordered batches as one atomic revision", () => {
    const state = editorState();
    const result = applyEditorCommandBatch(state, {
      commandId: "command:batch-add-move",
      kind: "batch",
      expectedRevision: 0,
      commands: [
        {
          commandId: "command:batch-add",
          kind: "add_entity",
          expectedRevision: 0,
          entity: {
            id: EntityIdSchema.parse("entity:batch"),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x: 1, y: 1 },
            orientation: 0,
            properties: {},
          },
        },
        {
          commandId: "command:batch-move",
          kind: "move_entity",
          expectedRevision: 0,
          entityId: EntityIdSchema.parse("entity:batch"),
          coordinate: { x: 4, y: 4 },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.state.revision).toBe(1);
    expect(result.data.state.undoStack).toHaveLength(1);
    expect(
      result.data.state.document.entities.find((entity) => entity.id === "entity:batch")
        ?.coordinate,
    ).toEqual({ x: 4, y: 4 });

    const atomicFailure = applyEditorCommandBatch(state, {
      commandId: "command:batch-failure",
      kind: "batch",
      expectedRevision: 0,
      commands: [
        {
          commandId: "command:batch-temporary",
          kind: "add_entity",
          expectedRevision: 0,
          entity: {
            id: EntityIdSchema.parse("entity:temporary"),
            symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
            layerId: LayerIdSchema.parse("layer:objects"),
            coordinate: { x: 1, y: 1 },
            orientation: 0,
            properties: {},
          },
        },
        {
          commandId: "command:batch-invalid",
          kind: "move_entity",
          expectedRevision: 0,
          entityId: EntityIdSchema.parse("entity:missing"),
          coordinate: { x: 2, y: 2 },
        },
      ],
    });
    expect(atomicFailure.success).toBe(false);
    expect(state.document.entities.some((entity) => entity.id === "entity:temporary")).toBe(false);
  });

  it("allocates deterministic safe IDs", () => {
    expect(allocateDeterministicId("entity", "Moss Circle", [])).toBe("entity:moss-circle");
    expect(
      allocateDeterministicId("entity", "Moss Circle", [
        "entity:moss-circle",
        "entity:moss-circle-2",
      ]),
    ).toBe("entity:moss-circle-3");
  });
});
