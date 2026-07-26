import { CURRENT_WORLD_SCHEMA_VERSION, WORLD_FORMAT } from "../constants/limits";
import type { WorldDocumentV1 } from "../schemas/world";
import type { ValidationResult } from "../validation/issues";
import { failure } from "../validation/issues";

export type WorldDocumentVersionInfo =
  | { readonly kind: "not-world-document" }
  | { readonly kind: "missing-version" }
  | { readonly kind: "invalid-version" }
  | { readonly kind: "v1"; readonly version: 1 }
  | { readonly kind: "unsupported-future-version"; readonly version: number }
  | { readonly kind: "unsupported-past-version"; readonly version: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getWorldDocumentVersion(value: unknown): WorldDocumentVersionInfo {
  if (!isRecord(value) || value.format !== WORLD_FORMAT) {
    return { kind: "not-world-document" };
  }
  if (!Object.hasOwn(value, "schemaVersion")) {
    return { kind: "missing-version" };
  }
  const version = value.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return { kind: "invalid-version" };
  }
  if (version === CURRENT_WORLD_SCHEMA_VERSION) {
    return { kind: "v1", version };
  }
  if (version > CURRENT_WORLD_SCHEMA_VERSION) {
    return { kind: "unsupported-future-version", version };
  }
  return { kind: "unsupported-past-version", version };
}

export type WorldMigration = (value: unknown) => ValidationResult<WorldDocumentV1>;

export const WORLD_MIGRATION_REGISTRY: ReadonlyMap<number, WorldMigration> = new Map();

export function versionFailure(info: WorldDocumentVersionInfo): ValidationResult<WorldDocumentV1> {
  switch (info.kind) {
    case "not-world-document":
      return failure([
        {
          code: "not_world_document",
          severity: "error",
          path: ["format"],
          message: `Document format must be ${WORLD_FORMAT}`,
        },
      ]);
    case "missing-version":
      return failure([
        {
          code: "missing_version",
          severity: "error",
          path: ["schemaVersion"],
          message: "World document is missing schemaVersion",
        },
      ]);
    case "invalid-version":
      return failure([
        {
          code: "invalid_version",
          severity: "error",
          path: ["schemaVersion"],
          message: "schemaVersion must be an integer",
        },
      ]);
    case "unsupported-future-version":
      return failure([
        {
          code: "unsupported_version",
          severity: "error",
          path: ["schemaVersion"],
          message: "World document uses an unsupported future schema version",
          details: { version: info.version },
        },
      ]);
    case "unsupported-past-version":
      return failure([
        {
          code: "unsupported_version",
          severity: "error",
          path: ["schemaVersion"],
          message: "No migration exists for this schema version",
          details: { version: info.version },
        },
      ]);
    case "v1":
      return failure([
        {
          code: "schema_validation",
          severity: "error",
          path: [],
          message: "v1 document has not been validated",
        },
      ]);
  }
}
