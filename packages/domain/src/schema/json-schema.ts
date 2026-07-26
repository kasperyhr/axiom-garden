import { z } from "zod";

import { WorldDocumentV1Schema } from "../schemas/world";
import { MAX_PROPERTIES_PER_RECORD } from "../constants/limits";

export function generateWorldDocumentV1JsonSchema(): object {
  const schema: Record<string, unknown> = {
    $id: "https://axiom.garden/schema/axiom-garden-world-v1.schema.json",
    title: "Axiom Garden World Document v1",
    description:
      "Strict, versioned format for a bounded abstract square-grid world. Semantic reference checks are performed by @axiom-garden/domain.",
    ...z.toJSONSchema(WorldDocumentV1Schema, {
      target: "draft-2020-12",
      unrepresentable: "throw",
    }),
  };
  applyDomainPropertyLimits(schema);
  return schema;
}

function applyDomainPropertyLimits(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(applyDomainPropertyLimits);
    return;
  }
  if (typeof node !== "object" || node === null) return;
  const record = node as Record<string, unknown>;
  if (record.propertyNames !== undefined) {
    record.maxProperties = MAX_PROPERTIES_PER_RECORD;
  }
  Object.values(record).forEach(applyDomainPropertyLimits);
}

export function serializeWorldDocumentV1JsonSchema(): string {
  return `${JSON.stringify(generateWorldDocumentV1JsonSchema(), null, 2)}\n`;
}
