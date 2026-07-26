import {
  CellRecordIdSchema,
  CellRecordV1Schema,
  EntityIdSchema,
  EntityV1Schema,
} from "@axiom-garden/domain";
import { z } from "zod";

import { MAX_OPERATION_ID_LENGTH, MAX_TRANSITION_ID_LENGTH, MAX_TICK } from "../limits/constants";

const TRANSITION_ID_PATTERN = /^transition:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u;
const OPERATION_ID_PATTERN = /^operation:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u;

export const TransitionIdSchema = z
  .string()
  .max(MAX_TRANSITION_ID_LENGTH)
  .regex(TRANSITION_ID_PATTERN)
  .brand<"TransitionId">();

export const OperationIdSchema = z
  .string()
  .max(MAX_OPERATION_ID_LENGTH)
  .regex(OPERATION_ID_PATTERN)
  .brand<"OperationId">();

const operationBase = { operationId: OperationIdSchema };

export const AddEntityOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("addEntity"),
  entity: EntityV1Schema,
});

export const RemoveEntityOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("removeEntity"),
  entityId: EntityIdSchema,
});

export const ReplaceEntityOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("replaceEntity"),
  entityId: EntityIdSchema,
  replacement: EntityV1Schema,
});

export const AddCellRecordOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("addCellRecord"),
  cell: CellRecordV1Schema,
});

export const RemoveCellRecordOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("removeCellRecord"),
  cellId: CellRecordIdSchema,
});

export const ReplaceCellRecordOperationSchema = z.strictObject({
  ...operationBase,
  kind: z.literal("replaceCellRecord"),
  cellId: CellRecordIdSchema,
  replacement: CellRecordV1Schema,
});

export const TransitionOperationSchema = z.discriminatedUnion("kind", [
  AddEntityOperationSchema,
  RemoveEntityOperationSchema,
  ReplaceEntityOperationSchema,
  AddCellRecordOperationSchema,
  RemoveCellRecordOperationSchema,
  ReplaceCellRecordOperationSchema,
]);

export const TransitionPlanSchema = z.strictObject({
  id: TransitionIdSchema,
  expectedTick: z.int().nonnegative().max(MAX_TICK),
  operations: z.array(TransitionOperationSchema),
});

export type TransitionId = z.infer<typeof TransitionIdSchema>;
export type OperationId = z.infer<typeof OperationIdSchema>;
export type AddEntityOperation = z.infer<typeof AddEntityOperationSchema>;
export type RemoveEntityOperation = z.infer<typeof RemoveEntityOperationSchema>;
export type ReplaceEntityOperation = z.infer<typeof ReplaceEntityOperationSchema>;
export type AddCellRecordOperation = z.infer<typeof AddCellRecordOperationSchema>;
export type RemoveCellRecordOperation = z.infer<typeof RemoveCellRecordOperationSchema>;
export type ReplaceCellRecordOperation = z.infer<typeof ReplaceCellRecordOperationSchema>;
export type TransitionOperation = z.infer<typeof TransitionOperationSchema>;
export type TransitionPlan = z.infer<typeof TransitionPlanSchema>;
