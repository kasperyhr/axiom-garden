import type { DomainProperties } from "../schemas/properties";
import type { WorldDocumentV1 } from "../schemas/world";
import { coordinateKey, isCoordinateInBounds } from "../utilities/coordinates";
import type { DomainIssue, DomainPathSegment } from "./issues";

function issue(
  code: DomainIssue["code"],
  path: readonly DomainPathSegment[],
  message: string,
  details?: DomainIssue["details"],
): DomainIssue {
  return {
    code,
    severity: "error",
    path,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function duplicateIssues(
  values: readonly string[],
  basePath: readonly DomainPathSegment[],
  label: string,
): DomainIssue[] {
  const seen = new Set<string>();
  const issues: DomainIssue[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push(
        issue("duplicate_id", [...basePath, index, "id"], `${label} ID must be unique`, {
          id: value,
        }),
      );
    }
    seen.add(value);
  });
  return issues;
}

function dangerousPropertyIssues(
  properties: DomainProperties,
  path: readonly DomainPathSegment[],
): DomainIssue[] {
  const dangerous = new Set(["__proto__", "prototype", "constructor"]);
  return Object.keys(properties)
    .filter((key) => dangerous.has(key))
    .map((key) =>
      issue("invalid_property_key", [...path, key], "Property key is reserved and unsafe"),
    );
}

export function collectSemanticIssues(world: WorldDocumentV1): readonly DomainIssue[] {
  const issues: DomainIssue[] = [];
  const layerIds = new Set(world.layers.map((layer) => layer.id));
  const symbolIds = new Set(world.palette.symbols.map((symbol) => symbol.id));

  issues.push(
    ...duplicateIssues(
      world.palette.symbols.map((symbol) => symbol.id),
      ["palette", "symbols"],
      "Symbol",
    ),
    ...duplicateIssues(
      world.layers.map((layer) => layer.id),
      ["layers"],
      "Layer",
    ),
    ...duplicateIssues(
      world.cells.map((cell) => cell.id),
      ["cells"],
      "Cell record",
    ),
    ...duplicateIssues(
      world.entities.map((entity) => entity.id),
      ["entities"],
      "Entity",
    ),
  );

  const seenOrders = new Set<number>();
  world.layers.forEach((layer, index) => {
    if (seenOrders.has(layer.order)) {
      issues.push(
        issue("duplicate_layer_order", ["layers", index, "order"], "Layer order must be unique", {
          order: layer.order,
        }),
      );
    }
    seenOrders.add(layer.order);
  });

  if (Date.parse(world.metadata.updatedAt) < Date.parse(world.metadata.createdAt)) {
    issues.push(
      issue(
        "invalid_time_order",
        ["metadata", "updatedAt"],
        "updatedAt must be greater than or equal to createdAt",
      ),
    );
  }

  world.palette.symbols.forEach((symbol, index) => {
    issues.push(
      ...dangerousPropertyIssues(symbol.defaultProperties, [
        "palette",
        "symbols",
        index,
        "defaultProperties",
      ]),
    );
  });

  const seenCells = new Set<string>();
  world.cells.forEach((cell, index) => {
    if (!layerIds.has(cell.layerId)) {
      issues.push(
        issue("missing_reference", ["cells", index, "layerId"], "Cell layerId does not exist", {
          reference: cell.layerId,
        }),
      );
    }
    if (!isCoordinateInBounds(cell.coordinate, world.grid)) {
      issues.push(
        issue(
          "coordinate_out_of_bounds",
          ["cells", index, "coordinate"],
          "Cell coordinate is outside the bounded grid",
        ),
      );
    }
    if (cell.tags.length === 0 && Object.keys(cell.properties).length === 0) {
      issues.push(
        issue(
          "empty_cell_record",
          ["cells", index],
          "Sparse cell record must contain at least one tag or property",
        ),
      );
    }
    const key = `${cell.layerId}:${coordinateKey(cell.coordinate)}`;
    if (seenCells.has(key)) {
      issues.push(
        issue(
          "duplicate_cell_coordinate",
          ["cells", index, "coordinate"],
          "Only one sparse cell record is allowed per layer and coordinate",
        ),
      );
    }
    seenCells.add(key);
    issues.push(...dangerousPropertyIssues(cell.properties, ["cells", index, "properties"]));
  });

  world.entities.forEach((entity, index) => {
    if (!layerIds.has(entity.layerId)) {
      issues.push(
        issue(
          "missing_reference",
          ["entities", index, "layerId"],
          "Entity layerId does not exist",
          { reference: entity.layerId },
        ),
      );
    }
    if (!symbolIds.has(entity.symbolId)) {
      issues.push(
        issue(
          "missing_reference",
          ["entities", index, "symbolId"],
          "Entity symbolId does not exist",
          { reference: entity.symbolId },
        ),
      );
    }
    if (!isCoordinateInBounds(entity.coordinate, world.grid)) {
      issues.push(
        issue(
          "coordinate_out_of_bounds",
          ["entities", index, "coordinate"],
          "Entity coordinate is outside the bounded grid",
        ),
      );
    }
    issues.push(...dangerousPropertyIssues(entity.properties, ["entities", index, "properties"]));
  });

  return issues;
}
