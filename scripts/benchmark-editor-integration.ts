import {
  EntityIdSchema,
  LayerIdSchema,
  REPRESENTATIVE_WORLD_V1,
  SymbolIdSchema,
  normalizeWorldDocument,
} from "../packages/domain/src/index";
import { applyEditorCommand, createEditorState } from "../packages/editor/src/index";
import { createRenderSceneFromWorld } from "../packages/renderer/src/index";

const started = performance.now();
const entities = Array.from({ length: 4_000 }, (_, index) => ({
  id: EntityIdSchema.parse(`entity:integration-${index}`),
  symbolId: SymbolIdSchema.parse("symbol:moss-circle"),
  layerId: LayerIdSchema.parse("layer:objects"),
  coordinate: { x: index % 64, y: Math.floor(index / 64) % 64 },
  orientation: 0 as const,
  properties: {},
}));
const document = normalizeWorldDocument({
  ...REPRESENTATIVE_WORLD_V1,
  grid: { ...REPRESENTATIVE_WORLD_V1.grid, width: 64, height: 64 },
  entities,
});
const created = createEditorState(document);
if (!created.success) throw new Error("Benchmark world did not create EditorState");
const moved = applyEditorCommand(created.data, {
  commandId: "command:benchmark-scene-rebuild",
  kind: "move_entity",
  expectedRevision: 0,
  entityId: EntityIdSchema.parse("entity:integration-3999"),
  coordinate: { x: 0, y: 0 },
});
if (!moved.success) throw new Error("Benchmark move was rejected");
const scene = createRenderSceneFromWorld(moved.data.state.document);
if (scene.entities.length !== 4_000) throw new Error("Renderer scene rebuild lost entities");
const elapsed = performance.now() - started;
if (elapsed > 30_000) throw new Error(`Editor integration benchmark exceeded 30s: ${elapsed}ms`);
process.stdout.write(
  `Editor → Web → Renderer 4,000-entity rebuild: ${elapsed.toFixed(1)}ms (${scene.entities.length} entities)\n`,
);
