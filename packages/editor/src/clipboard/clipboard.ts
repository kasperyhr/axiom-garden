import {
  CellRecordV1Schema,
  EntityV1Schema,
  type CellRecordV1,
  type DomainProperties,
  type EntityV1,
} from "@axiom-garden/domain";
import { z } from "zod";

export const EditorClipboardSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("empty") }),
  z.strictObject({ kind: z.literal("entity"), entity: EntityV1Schema }),
  z.strictObject({ kind: z.literal("cell"), cell: CellRecordV1Schema }),
]);

export type EditorClipboard = z.infer<typeof EditorClipboardSchema>;

export const EMPTY_CLIPBOARD: EditorClipboard = { kind: "empty" };

export function cloneDomainProperties(properties: DomainProperties): DomainProperties {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  );
}

export function copyEntity(entity: EntityV1): EditorClipboard {
  return {
    kind: "entity",
    entity: {
      ...entity,
      coordinate: { ...entity.coordinate },
      properties: cloneDomainProperties(entity.properties),
    },
  };
}

export function copyCell(cell: CellRecordV1): EditorClipboard {
  return {
    kind: "cell",
    cell: {
      ...cell,
      coordinate: { ...cell.coordinate },
      tags: [...cell.tags],
      properties: cloneDomainProperties(cell.properties),
    },
  };
}
