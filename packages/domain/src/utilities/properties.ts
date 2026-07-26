import type { DomainProperties, DomainPropertyValue } from "../schemas/properties";
import type { EntityV1, SymbolDefinitionV1 } from "../schemas/world";

export function compareCodePoints(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function clonePropertyValue(value: DomainPropertyValue): DomainPropertyValue {
  return Array.isArray(value) ? [...value] : value;
}

export function normalizeProperties(properties: DomainProperties): DomainProperties {
  const normalized: DomainProperties = {};
  for (const key of Object.keys(properties).sort(compareCodePoints)) {
    const value = properties[key];
    if (value !== undefined) normalized[key] = clonePropertyValue(value);
  }
  return normalized;
}

export function resolveEntityProperties(
  symbol: SymbolDefinitionV1,
  entity: EntityV1,
): DomainProperties {
  return normalizeProperties({
    ...symbol.defaultProperties,
    ...entity.properties,
  });
}
