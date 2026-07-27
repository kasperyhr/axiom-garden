import {
  CellRecordIdSchema,
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  CoordinateSchema,
} from "@axiom-garden/domain";
import { z } from "zod";

export const EditorSelectionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("entity"), entityId: EntityIdSchema }),
  z.strictObject({ kind: z.literal("cell"), cellId: CellRecordIdSchema }),
  z.strictObject({ kind: z.literal("coordinate"), coordinate: CoordinateSchema }),
  z.strictObject({ kind: z.literal("layer"), layerId: LayerIdSchema }),
  z.strictObject({ kind: z.literal("symbol"), symbolId: SymbolIdSchema }),
]);

export type EditorSelection = z.infer<typeof EditorSelectionSchema>;

export const EMPTY_SELECTION: EditorSelection = { kind: "none" };
