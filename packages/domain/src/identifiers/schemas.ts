import { z } from "zod";

import { MAX_IDENTIFIER_LENGTH } from "../constants/limits";

function identifierSchema<Brand extends string>(namespace: string) {
  const identifierPattern = new RegExp(
    `^${namespace}:[a-z0-9](?:(?:[a-z0-9_-]|\\.(?=[a-z0-9])){0,94}[a-z0-9])?$`,
    "u",
  );
  return z
    .string()
    .min(1)
    .max(MAX_IDENTIFIER_LENGTH)
    .regex(identifierPattern, `Identifier must use the safe ${namespace}:local-name form`)
    .brand<Brand>();
}

export const WorldIdSchema = identifierSchema<"WorldId">("world");
export const SymbolIdSchema = identifierSchema<"SymbolId">("symbol");
export const LayerIdSchema = identifierSchema<"LayerId">("layer");
export const CellRecordIdSchema = identifierSchema<"CellRecordId">("cell");
export const EntityIdSchema = identifierSchema<"EntityId">("entity");

export type WorldId = z.infer<typeof WorldIdSchema>;
export type SymbolId = z.infer<typeof SymbolIdSchema>;
export type LayerId = z.infer<typeof LayerIdSchema>;
export type CellRecordId = z.infer<typeof CellRecordIdSchema>;
export type EntityId = z.infer<typeof EntityIdSchema>;
