import {
  normalizeWorldDocument,
  WorldDocumentV1Schema,
  type WorldDocumentV1,
} from "@axiom-garden/domain";

export function cloneWorldDocument(document: WorldDocumentV1): WorldDocumentV1 {
  return normalizeWorldDocument(WorldDocumentV1Schema.parse(document));
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
