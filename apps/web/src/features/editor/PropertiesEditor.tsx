import {
  MAX_PROPERTIES_PER_RECORD,
  type DomainProperties,
  type DomainPropertyValue,
} from "@axiom-garden/domain";
import { Button, Plus, Trash2 } from "@axiom-garden/ui";

type PropertyKind = "string" | "number" | "boolean" | "null" | "array";

function kindOf(value: DomainPropertyValue): PropertyKind {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function displayValue(value: DomainPropertyValue): string {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "null")).join(", ");
  return value === null ? "" : String(value);
}

function valueForKind(kind: PropertyKind, raw: string): DomainPropertyValue {
  switch (kind) {
    case "string":
      return raw;
    case "number": {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case "boolean":
      return raw === "true";
    case "null":
      return null;
    case "array":
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
  }
}

function nextPropertyKey(properties: DomainProperties): string {
  let index = 1;
  while (`property${index}` in properties) index += 1;
  return `property${index}`;
}

export function PropertiesEditor({
  idPrefix,
  onChange,
  value,
}: {
  readonly idPrefix: string;
  readonly value: DomainProperties;
  readonly onChange: (value: DomainProperties) => void;
}) {
  const entries = Object.entries(value);

  const updateKey = (oldKey: string, nextKey: string) => {
    const next = Object.fromEntries(
      entries.map(([key, propertyValue]) => [key === oldKey ? nextKey : key, propertyValue]),
    );
    onChange(next);
  };
  const updateValue = (key: string, propertyValue: DomainPropertyValue) => {
    onChange({ ...value, [key]: propertyValue });
  };

  return (
    <fieldset className="editor-properties">
      <legend>Properties</legend>
      {entries.length === 0 ? <p className="editor-form__hint">No custom properties.</p> : null}
      {entries.map(([key, propertyValue], index) => {
        const kind = kindOf(propertyValue);
        const fieldId = `${idPrefix}-property-${index}`;
        return (
          <div className="editor-property-row" key={`${key}-${index}`}>
            <label>
              <span>Key</span>
              <input
                aria-label={`Property ${index + 1} key`}
                id={`${fieldId}-key`}
                value={key}
                onChange={(event) => updateKey(key, event.target.value)}
              />
            </label>
            <label>
              <span>Type</span>
              <select
                aria-label={`Property ${index + 1} type`}
                value={kind}
                onChange={(event) =>
                  updateValue(key, valueForKind(event.target.value as PropertyKind, ""))
                }
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="null">Null</option>
                <option value="array">Array</option>
              </select>
            </label>
            {kind === "boolean" ? (
              <label>
                <span>Value</span>
                <select
                  aria-label={`Property ${index + 1} value`}
                  value={String(propertyValue)}
                  onChange={(event) => updateValue(key, event.target.value === "true")}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </label>
            ) : kind === "null" ? (
              <span className="editor-property-row__null">Null value</span>
            ) : (
              <label>
                <span>{kind === "array" ? "Comma-separated values" : "Value"}</span>
                <input
                  aria-label={`Property ${index + 1} value`}
                  inputMode={kind === "number" ? "decimal" : "text"}
                  value={displayValue(propertyValue)}
                  onChange={(event) => updateValue(key, valueForKind(kind, event.target.value))}
                />
              </label>
            )}
            <Button
              aria-label={`Remove property ${key}`}
              size="small"
              variant="ghost"
              leadingIcon={<Trash2 />}
              onClick={() => onChange(Object.fromEntries(entries.filter(([name]) => name !== key)))}
            >
              Remove
            </Button>
          </div>
        );
      })}
      <Button
        size="small"
        variant="secondary"
        leadingIcon={<Plus />}
        disabled={entries.length >= MAX_PROPERTIES_PER_RECORD}
        onClick={() => onChange({ ...value, [nextPropertyKey(value)]: "" })}
      >
        Add property
      </Button>
    </fieldset>
  );
}
