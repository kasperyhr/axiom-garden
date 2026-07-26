import type { WorldDocumentV1 } from "../schemas/world";
import { normalizeWorldDocument } from "../normalization/normalize";

export function serializeWorldDocument(world: WorldDocumentV1): string {
  return `${JSON.stringify(normalizeWorldDocument(world), null, 2)}\n`;
}
