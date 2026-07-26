import type { ZodIssue } from "zod";

import { MAX_JSON_BYTES } from "../constants/limits";
import { getWorldDocumentVersion, versionFailure } from "../migration/version";
import { normalizeWorldDocument } from "../normalization/normalize";
import type { WorldDocumentV1 } from "../schemas/world";
import { WorldDocumentV1Schema } from "../schemas/world";
import type { DomainIssue, DomainPathSegment, ValidationResult } from "./issues";
import { failure, success } from "./issues";
import { collectSemanticIssues } from "./semantic";

const DANGEROUS_PROPERTY_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawDangerousPropertyIssues(value: unknown): DomainIssue[] {
  if (!isRecord(value)) return [];
  const targets: Array<{
    properties: unknown;
    path: DomainPathSegment[];
  }> = [];
  if (isRecord(value.palette) && Array.isArray(value.palette.symbols)) {
    value.palette.symbols.forEach((symbol, index) => {
      if (isRecord(symbol)) {
        targets.push({
          properties: symbol.defaultProperties,
          path: ["palette", "symbols", index, "defaultProperties"],
        });
      }
    });
  }
  for (const collectionName of ["cells", "entities"] as const) {
    const collection = value[collectionName];
    if (!Array.isArray(collection)) continue;
    collection.forEach((record, index) => {
      if (isRecord(record)) {
        targets.push({
          properties: record.properties,
          path: [collectionName, index, "properties"],
        });
      }
    });
  }
  return targets.flatMap(({ path, properties }) =>
    isRecord(properties)
      ? Object.keys(properties)
          .filter((key) => DANGEROUS_PROPERTY_KEYS.has(key))
          .sort()
          .map((key) => ({
            code: "invalid_property_key" as const,
            severity: "error" as const,
            path: [...path, key],
            message: "Property key is reserved and unsafe",
          }))
      : [],
  );
}

function normalizePath(path: PropertyKey[]): DomainPathSegment[] {
  return path.flatMap((segment) =>
    typeof segment === "string" || typeof segment === "number" ? [segment] : [],
  );
}

function classifySchemaIssue(issue: ZodIssue): DomainIssue["code"] {
  const path = normalizePath(issue.path);
  const final = path.at(-1);
  if (issue.code === "unrecognized_keys") return "unknown_field";
  if (issue.code === "too_big") return "limit_exceeded";
  if (final === "id" || final === "layerId" || final === "symbolId" || final === "format") {
    return "invalid_identifier";
  }
  if (final === "createdAt" || final === "updatedAt") return "invalid_datetime";
  if (path.includes("properties") || path.includes("defaultProperties")) {
    return issue.code === "invalid_key" ? "invalid_property_key" : "invalid_property_value";
  }
  return "schema_validation";
}

function zodIssues(issues: readonly ZodIssue[]): DomainIssue[] {
  return issues.flatMap((item) => {
    if (item.code === "unrecognized_keys") {
      return [...item.keys].sort().map((key) => ({
        code: "unknown_field" as const,
        severity: "error" as const,
        path: [...normalizePath(item.path), key],
        message: "Unknown field is not allowed in World Document v1",
      }));
    }
    return [
      {
        code: classifySchemaIssue(item),
        severity: "error",
        path: normalizePath(item.path),
        message: item.message,
      },
    ];
  });
}

export function validateWorldDocument(value: unknown): ValidationResult<WorldDocumentV1> {
  const version = getWorldDocumentVersion(value);
  if (version.kind !== "v1") return versionFailure(version);

  const unsafePropertyIssues = rawDangerousPropertyIssues(value);
  if (unsafePropertyIssues.length > 0) return failure(unsafePropertyIssues);

  const parsed = WorldDocumentV1Schema.safeParse(value);
  if (!parsed.success) return failure(zodIssues(parsed.error.issues));

  const semanticIssues = collectSemanticIssues(parsed.data);
  if (semanticIssues.length > 0) return failure(semanticIssues);
  return success(parsed.data);
}

export function migrateWorldDocument(value: unknown): ValidationResult<WorldDocumentV1> {
  const version = getWorldDocumentVersion(value);
  if (version.kind !== "v1") return versionFailure(version);
  const result = validateWorldDocument(value);
  return result.success ? success(normalizeWorldDocument(result.data), result.issues) : result;
}

export function parseWorldJson(jsonText: string): ValidationResult<WorldDocumentV1> {
  const byteLength = new TextEncoder().encode(jsonText).byteLength;
  if (byteLength > MAX_JSON_BYTES) {
    return failure([
      {
        code: "json_too_large",
        severity: "error",
        path: [],
        message: `World JSON exceeds the ${MAX_JSON_BYTES} byte limit`,
        details: { byteLength, maximum: MAX_JSON_BYTES },
      },
    ]);
  }

  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch {
    return failure([
      {
        code: "invalid_json",
        severity: "error",
        path: [],
        message: "Input is not valid JSON",
      },
    ]);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return failure([
      {
        code: "invalid_root",
        severity: "error",
        path: [],
        message: "World JSON root must be an object",
      },
    ]);
  }
  return migrateWorldDocument(value);
}
