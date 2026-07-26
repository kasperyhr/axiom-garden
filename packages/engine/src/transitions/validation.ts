import {
  coordinateKey,
  isCoordinateInBounds,
  type CellRecordV1,
  type EntityV1,
} from "@axiom-garden/domain";

import {
  engineFailure,
  engineIssue,
  engineSuccess,
  type EngineIssue,
  type EngineResult,
} from "../issues/issues";
import {
  MAX_ENGINE_CELL_RECORDS,
  MAX_ENGINE_ENTITIES,
  MAX_OPERATIONS_PER_TRANSITION,
  MAX_TICK,
} from "../limits/constants";
import { canonicalizeSimulationState } from "../state/canonical";
import type { SimulationStateV1 } from "../state/schema";
import { validateSimulationState } from "../state/validation";
import { EMPTY_TRANSITION_SUMMARY, type TransitionSummary } from "./receipt";
import {
  TransitionPlanSchema,
  type OperationId,
  type TransitionOperation,
  type TransitionPlan,
} from "./schema";

export interface TransitionValidation {
  readonly operationCount: number;
  readonly appliedOperationIds: readonly OperationId[];
}

export interface PreparedTransition extends TransitionValidation {
  readonly plan: TransitionPlan;
  readonly entities: readonly EntityV1[];
  readonly cells: readonly CellRecordV1[];
  readonly summary: TransitionSummary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainData(value: unknown, seen = new WeakSet<object>()): boolean {
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    return value.every((item) => isPlainData(item, seen));
  }
  if (!isRecord(value)) return typeof value !== "function" && typeof value !== "symbol";
  if (seen.has(value)) return false;
  seen.add(value);
  const prototype = Reflect.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every((item) => isPlainData(item, seen))
  );
}

function parsePlan(value: unknown): EngineResult<TransitionPlan> {
  if (!isPlainData(value)) {
    return engineFailure([
      engineIssue("invalid_operation", [], "Transition plan must contain plain data only"),
    ]);
  }
  if (
    isRecord(value) &&
    Array.isArray(value.operations) &&
    value.operations.length > MAX_OPERATIONS_PER_TRANSITION
  ) {
    return engineFailure([
      engineIssue(
        "too_many_operations",
        ["operations"],
        "Transition plan exceeds the operation limit",
        { count: value.operations.length, maximum: MAX_OPERATIONS_PER_TRANSITION },
      ),
    ]);
  }

  const parsed = TransitionPlanSchema.safeParse(value);
  if (!parsed.success) {
    return engineFailure(
      parsed.error.issues.map((item) => {
        const path = item.path.flatMap((segment) =>
          typeof segment === "string" || typeof segment === "number" ? [segment] : [],
        );
        return engineIssue(
          path[0] === "id" ? "invalid_transition_id" : "invalid_operation",
          path,
          item.message,
        );
      }),
    );
  }
  return engineSuccess(parsed.data);
}

function operationIssue(
  code: EngineIssue["code"],
  index: number,
  operation: TransitionOperation,
  suffix: readonly (string | number)[],
  message: string,
): EngineIssue {
  return engineIssue(code, ["operations", index, ...suffix], message, {
    operationId: operation.operationId,
  });
}

function cellCoordinateKey(cell: CellRecordV1): string {
  return `${cell.layerId}:${coordinateKey(cell.coordinate)}`;
}

export function prepareTransition(
  stateValue: SimulationStateV1,
  planValue: TransitionPlan,
): EngineResult<PreparedTransition> {
  const stateResult = validateSimulationState(stateValue);
  if (!stateResult.success) return stateResult;
  const planResult = parsePlan(planValue);
  if (!planResult.success) return planResult;

  const state = stateResult.data;
  const plan = planResult.data;
  const issues: EngineIssue[] = [];

  if (plan.expectedTick !== state.tick) {
    issues.push(
      engineIssue(
        "tick_mismatch",
        ["expectedTick"],
        "Transition expectedTick does not match state",
        {
          expected: plan.expectedTick,
          actual: state.tick,
        },
      ),
    );
  }
  if (state.tick >= MAX_TICK) {
    issues.push(
      engineIssue("tick_limit_exceeded", ["tick"], "Simulation tick limit has been reached", {
        maximum: MAX_TICK,
      }),
    );
  }

  const seenOperationIds = new Set<string>();
  plan.operations.forEach((operation, index) => {
    if (seenOperationIds.has(operation.operationId)) {
      issues.push(
        operationIssue(
          "duplicate_operation_id",
          index,
          operation,
          ["operationId"],
          "Operation ID must be unique within a transition",
        ),
      );
    }
    seenOperationIds.add(operation.operationId);
  });

  const canonical = canonicalizeSimulationState(state);
  let entities = [...canonical.entities];
  let cells = [...canonical.cells];
  const symbolIds = new Set(state.symbols.map((symbol) => symbol.id));
  const layerIds = new Set(state.layers.map((layer) => layer.id));
  const summary = { ...EMPTY_TRANSITION_SUMMARY };

  const validateEntity = (
    entity: EntityV1,
    operation: TransitionOperation,
    index: number,
    basePath: readonly (string | number)[],
  ): EngineIssue[] => {
    const entityIssues: EngineIssue[] = [];
    if (!symbolIds.has(entity.symbolId)) {
      entityIssues.push(
        operationIssue(
          "missing_symbol_reference",
          index,
          operation,
          [...basePath, "symbolId"],
          "Entity symbolId does not exist",
        ),
      );
    }
    if (!layerIds.has(entity.layerId)) {
      entityIssues.push(
        operationIssue(
          "missing_layer_reference",
          index,
          operation,
          [...basePath, "layerId"],
          "Entity layerId does not exist",
        ),
      );
    }
    if (!isCoordinateInBounds(entity.coordinate, state.grid)) {
      entityIssues.push(
        operationIssue(
          "coordinate_out_of_bounds",
          index,
          operation,
          [...basePath, "coordinate"],
          "Entity coordinate is outside the bounded grid",
        ),
      );
    }
    return entityIssues;
  };

  const validateCell = (
    cell: CellRecordV1,
    operation: TransitionOperation,
    index: number,
    basePath: readonly (string | number)[],
    replacedId?: string,
  ): EngineIssue[] => {
    const cellIssues: EngineIssue[] = [];
    if (!layerIds.has(cell.layerId)) {
      cellIssues.push(
        operationIssue(
          "missing_layer_reference",
          index,
          operation,
          [...basePath, "layerId"],
          "Cell layerId does not exist",
        ),
      );
    }
    if (!isCoordinateInBounds(cell.coordinate, state.grid)) {
      cellIssues.push(
        operationIssue(
          "coordinate_out_of_bounds",
          index,
          operation,
          [...basePath, "coordinate"],
          "Cell coordinate is outside the bounded grid",
        ),
      );
    }
    if (cell.tags.length === 0 && Object.keys(cell.properties).length === 0) {
      cellIssues.push(
        operationIssue(
          "invalid_operation",
          index,
          operation,
          basePath,
          "Sparse cell record must contain at least one tag or property",
        ),
      );
    }
    const coordinate = cellCoordinateKey(cell);
    if (
      cells.some(
        (candidate) => candidate.id !== replacedId && cellCoordinateKey(candidate) === coordinate,
      )
    ) {
      cellIssues.push(
        operationIssue(
          "duplicate_cell_coordinate",
          index,
          operation,
          [...basePath, "coordinate"],
          "Only one sparse cell record is allowed per layer and coordinate",
        ),
      );
    }
    return cellIssues;
  };

  plan.operations.forEach((operation, index) => {
    const operationIssues: EngineIssue[] = [];
    switch (operation.kind) {
      case "addEntity": {
        if (entities.some((entity) => entity.id === operation.entity.id)) {
          operationIssues.push(
            operationIssue(
              "entity_already_exists",
              index,
              operation,
              ["entity", "id"],
              "Entity ID already exists",
            ),
          );
        }
        if (entities.length >= MAX_ENGINE_ENTITIES) {
          operationIssues.push(
            operationIssue(
              "entity_limit_exceeded",
              index,
              operation,
              ["entity"],
              "Entity limit would be exceeded",
            ),
          );
        }
        operationIssues.push(...validateEntity(operation.entity, operation, index, ["entity"]));
        if (operationIssues.length === 0) {
          entities = [...entities, operation.entity];
          summary.entitiesAdded += 1;
        }
        break;
      }
      case "removeEntity": {
        const target = entities.findIndex((entity) => entity.id === operation.entityId);
        if (target < 0) {
          operationIssues.push(
            operationIssue(
              "entity_not_found",
              index,
              operation,
              ["entityId"],
              "Entity to remove does not exist",
            ),
          );
        } else {
          entities = entities.filter((_, entityIndex) => entityIndex !== target);
          summary.entitiesRemoved += 1;
        }
        break;
      }
      case "replaceEntity": {
        const target = entities.findIndex((entity) => entity.id === operation.entityId);
        if (target < 0) {
          operationIssues.push(
            operationIssue(
              "entity_not_found",
              index,
              operation,
              ["entityId"],
              "Entity to replace does not exist",
            ),
          );
        }
        if (operation.replacement.id !== operation.entityId) {
          operationIssues.push(
            operationIssue(
              "entity_id_mismatch",
              index,
              operation,
              ["replacement", "id"],
              "Replacement entity ID must match the target ID",
            ),
          );
        }
        operationIssues.push(
          ...validateEntity(operation.replacement, operation, index, ["replacement"]),
        );
        if (operationIssues.length === 0 && target >= 0) {
          entities = entities.map((entity, entityIndex) =>
            entityIndex === target ? operation.replacement : entity,
          );
          summary.entitiesReplaced += 1;
        }
        break;
      }
      case "addCellRecord": {
        if (cells.some((cell) => cell.id === operation.cell.id)) {
          operationIssues.push(
            operationIssue(
              "cell_already_exists",
              index,
              operation,
              ["cell", "id"],
              "Cell record ID already exists",
            ),
          );
        }
        if (cells.length >= MAX_ENGINE_CELL_RECORDS) {
          operationIssues.push(
            operationIssue(
              "cell_limit_exceeded",
              index,
              operation,
              ["cell"],
              "Sparse cell record limit would be exceeded",
            ),
          );
        }
        operationIssues.push(...validateCell(operation.cell, operation, index, ["cell"]));
        if (operationIssues.length === 0) {
          cells = [...cells, operation.cell];
          summary.cellsAdded += 1;
        }
        break;
      }
      case "removeCellRecord": {
        const target = cells.findIndex((cell) => cell.id === operation.cellId);
        if (target < 0) {
          operationIssues.push(
            operationIssue(
              "cell_not_found",
              index,
              operation,
              ["cellId"],
              "Cell record to remove does not exist",
            ),
          );
        } else {
          cells = cells.filter((_, cellIndex) => cellIndex !== target);
          summary.cellsRemoved += 1;
        }
        break;
      }
      case "replaceCellRecord": {
        const target = cells.findIndex((cell) => cell.id === operation.cellId);
        if (target < 0) {
          operationIssues.push(
            operationIssue(
              "cell_not_found",
              index,
              operation,
              ["cellId"],
              "Cell record to replace does not exist",
            ),
          );
        }
        if (operation.replacement.id !== operation.cellId) {
          operationIssues.push(
            operationIssue(
              "cell_id_mismatch",
              index,
              operation,
              ["replacement", "id"],
              "Replacement cell record ID must match the target ID",
            ),
          );
        }
        operationIssues.push(
          ...validateCell(
            operation.replacement,
            operation,
            index,
            ["replacement"],
            operation.cellId,
          ),
        );
        if (operationIssues.length === 0 && target >= 0) {
          cells = cells.map((cell, cellIndex) =>
            cellIndex === target ? operation.replacement : cell,
          );
          summary.cellsReplaced += 1;
        }
        break;
      }
    }
    issues.push(...operationIssues);
  });

  if (issues.length > 0) return engineFailure(issues);
  return engineSuccess({
    plan,
    operationCount: plan.operations.length,
    appliedOperationIds: plan.operations.map((operation) => operation.operationId),
    entities,
    cells,
    summary,
  });
}

export function validateTransitionPlan(
  state: SimulationStateV1,
  plan: TransitionPlan,
): EngineResult<TransitionValidation> {
  const result = prepareTransition(state, plan);
  return result.success
    ? engineSuccess({
        operationCount: result.data.operationCount,
        appliedOperationIds: result.data.appliedOperationIds,
      })
    : result;
}
