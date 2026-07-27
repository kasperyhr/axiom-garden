import {
  CellRecordIdSchema,
  CellRecordV1Schema,
  CoordinateSchema,
  EntityIdSchema,
  EntityV1Schema,
  LayerIdSchema,
  LayerV1Schema,
  SymbolDefinitionV1Schema,
  SymbolIdSchema,
  TagListSchema,
  WorldDocumentV1Schema,
} from "@axiom-garden/domain";
import { z } from "zod";

import { MAX_EDITOR_BATCH_COMMANDS, MAX_EDITOR_COMMAND_ID_LENGTH } from "../limits/constants";
import { EditorSelectionSchema } from "../selection/selection";

export const EditorToolSchema = z.enum(["inspect", "pan", "placeEntity", "placeCell"]);
export type EditorTool = z.infer<typeof EditorToolSchema>;

export const EditorCommandIdSchema = z
  .string()
  .min(1)
  .max(MAX_EDITOR_COMMAND_ID_LENGTH)
  .regex(
    /^command:[a-z0-9](?:(?:[a-z0-9_-]|\.(?=[a-z0-9])){0,94}[a-z0-9])?$/u,
    "Command ID must use the safe command:local-name form",
  );

const commandBase = {
  commandId: EditorCommandIdSchema,
  expectedRevision: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
};

export const AddEntityCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("add_entity"),
  entity: EntityV1Schema,
});
export const RemoveEntityCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("remove_entity"),
  entityId: EntityIdSchema,
});
export const ReplaceEntityCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("replace_entity"),
  entityId: EntityIdSchema,
  replacement: EntityV1Schema,
});
export const MoveEntityCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("move_entity"),
  entityId: EntityIdSchema,
  coordinate: CoordinateSchema,
});
export const AddCellRecordCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("add_cell_record"),
  cell: CellRecordV1Schema,
});
export const RemoveCellRecordCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("remove_cell_record"),
  cellId: CellRecordIdSchema,
});
export const ReplaceCellRecordCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("replace_cell_record"),
  cellId: CellRecordIdSchema,
  replacement: CellRecordV1Schema,
});
export const AddLayerCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("add_layer"),
  layer: LayerV1Schema,
});
export const ReplaceLayerCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("replace_layer"),
  layerId: LayerIdSchema,
  replacement: LayerV1Schema,
});
export const RemoveLayerCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("remove_layer"),
  layerId: LayerIdSchema,
});
export const AddSymbolCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("add_symbol"),
  symbol: SymbolDefinitionV1Schema,
});
export const ReplaceSymbolCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("replace_symbol"),
  symbolId: SymbolIdSchema,
  replacement: SymbolDefinitionV1Schema,
});
export const RemoveSymbolCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("remove_symbol"),
  symbolId: SymbolIdSchema,
});
export const UpdateMetadataCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("update_metadata"),
  metadata: z.strictObject({
    title: z.string(),
    description: z.string(),
    tags: TagListSchema,
  }),
});
export const ResizeGridCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("resize_grid"),
  width: z.int(),
  height: z.int(),
});
export const ResetDocumentCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("reset_document"),
  document: WorldDocumentV1Schema,
});

export const DocumentEditorCommandSchema = z.discriminatedUnion("kind", [
  AddEntityCommandSchema,
  RemoveEntityCommandSchema,
  ReplaceEntityCommandSchema,
  MoveEntityCommandSchema,
  AddCellRecordCommandSchema,
  RemoveCellRecordCommandSchema,
  ReplaceCellRecordCommandSchema,
  AddLayerCommandSchema,
  ReplaceLayerCommandSchema,
  RemoveLayerCommandSchema,
  AddSymbolCommandSchema,
  ReplaceSymbolCommandSchema,
  RemoveSymbolCommandSchema,
  UpdateMetadataCommandSchema,
  ResizeGridCommandSchema,
  ResetDocumentCommandSchema,
]);

export const SetSelectionCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("set_selection"),
  selection: EditorSelectionSchema,
});
export const ClearSelectionCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("clear_selection"),
});
export const SetActiveLayerCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("set_active_layer"),
  layerId: LayerIdSchema,
});
export const SetActiveToolCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("set_active_tool"),
  tool: EditorToolSchema,
});
export const CopySelectionCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("copy_selection"),
});
export const ClearClipboardCommandSchema = z.strictObject({
  ...commandBase,
  kind: z.literal("clear_clipboard"),
});

export const EditorOnlyCommandSchema = z.discriminatedUnion("kind", [
  SetSelectionCommandSchema,
  ClearSelectionCommandSchema,
  SetActiveLayerCommandSchema,
  SetActiveToolCommandSchema,
  CopySelectionCommandSchema,
  ClearClipboardCommandSchema,
]);

export const EditorCommandSchema = z.union([DocumentEditorCommandSchema, EditorOnlyCommandSchema]);

export const EditorCommandBatchSchema = z.strictObject({
  commandId: EditorCommandIdSchema,
  kind: z.literal("batch"),
  expectedRevision: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  commands: z.array(DocumentEditorCommandSchema).min(1).max(MAX_EDITOR_BATCH_COMMANDS),
});

export type AddEntityCommand = z.infer<typeof AddEntityCommandSchema>;
export type RemoveEntityCommand = z.infer<typeof RemoveEntityCommandSchema>;
export type ReplaceEntityCommand = z.infer<typeof ReplaceEntityCommandSchema>;
export type MoveEntityCommand = z.infer<typeof MoveEntityCommandSchema>;
export type AddCellRecordCommand = z.infer<typeof AddCellRecordCommandSchema>;
export type RemoveCellRecordCommand = z.infer<typeof RemoveCellRecordCommandSchema>;
export type ReplaceCellRecordCommand = z.infer<typeof ReplaceCellRecordCommandSchema>;
export type AddLayerCommand = z.infer<typeof AddLayerCommandSchema>;
export type ReplaceLayerCommand = z.infer<typeof ReplaceLayerCommandSchema>;
export type RemoveLayerCommand = z.infer<typeof RemoveLayerCommandSchema>;
export type AddSymbolCommand = z.infer<typeof AddSymbolCommandSchema>;
export type ReplaceSymbolCommand = z.infer<typeof ReplaceSymbolCommandSchema>;
export type RemoveSymbolCommand = z.infer<typeof RemoveSymbolCommandSchema>;
export type UpdateMetadataCommand = z.infer<typeof UpdateMetadataCommandSchema>;
export type ResizeGridCommand = z.infer<typeof ResizeGridCommandSchema>;
export type ResetDocumentCommand = z.infer<typeof ResetDocumentCommandSchema>;
export type DocumentEditorCommand = z.infer<typeof DocumentEditorCommandSchema>;
export type EditorOnlyCommand = z.infer<typeof EditorOnlyCommandSchema>;
export type EditorCommand = z.infer<typeof EditorCommandSchema>;
export type EditorCommandBatch = z.infer<typeof EditorCommandBatchSchema>;
