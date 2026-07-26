import {
  validateWorldDocument,
  WORLD_FORMAT,
  type DomainIssue,
  type WorldDocumentV1,
} from "@axiom-garden/domain";

import { engineFailure, engineIssue, engineSuccess, type EngineResult } from "../issues/issues";
import {
  CURRENT_SIMULATION_STATE_VERSION,
  MAX_ENGINE_CELL_RECORDS,
  MAX_ENGINE_ENTITIES,
} from "../limits/constants";
import { finalizeSimulationState } from "./canonical";
import { SimulationStateV1Schema, type SimulationStateV1 } from "./schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapDomainIssue(item: DomainIssue) {
  const finalPath = item.path.at(-1);
  const code =
    item.code === "coordinate_out_of_bounds"
      ? "coordinate_out_of_bounds"
      : item.code === "duplicate_cell_coordinate"
        ? "duplicate_cell_coordinate"
        : item.code === "missing_reference" && finalPath === "symbolId"
          ? "missing_symbol_reference"
          : item.code === "missing_reference" && finalPath === "layerId"
            ? "missing_layer_reference"
            : "invalid_state";
  return engineIssue(code, item.path, item.message, item.details);
}

function toWorldDocument(state: SimulationStateV1): WorldDocumentV1 {
  return {
    format: WORLD_FORMAT,
    schemaVersion: state.sourceSchemaVersion,
    id: state.sourceWorldId,
    metadata: state.metadata,
    grid: state.grid,
    palette: { symbols: state.symbols },
    layers: state.layers,
    cells: state.cells,
    entities: state.entities,
  };
}

export function validateSimulationState(value: unknown): EngineResult<SimulationStateV1> {
  if (isRecord(value) && value.stateVersion !== CURRENT_SIMULATION_STATE_VERSION) {
    return engineFailure([
      engineIssue(
        "unsupported_state_version",
        ["stateVersion"],
        "Simulation state version is unsupported",
      ),
    ]);
  }

  const parsed = SimulationStateV1Schema.safeParse(value);
  if (!parsed.success) {
    return engineFailure(
      parsed.error.issues.map((item) =>
        engineIssue(
          "invalid_state",
          item.path.flatMap((segment) =>
            typeof segment === "string" || typeof segment === "number" ? [segment] : [],
          ),
          item.message,
        ),
      ),
    );
  }

  if (parsed.data.entities.length > MAX_ENGINE_ENTITIES) {
    return engineFailure([
      engineIssue(
        "entity_limit_exceeded",
        ["entities"],
        "Simulation state exceeds the entity limit",
      ),
    ]);
  }
  if (parsed.data.cells.length > MAX_ENGINE_CELL_RECORDS) {
    return engineFailure([
      engineIssue(
        "cell_limit_exceeded",
        ["cells"],
        "Simulation state exceeds the sparse cell record limit",
      ),
    ]);
  }

  const worldResult = validateWorldDocument(toWorldDocument(parsed.data));
  if (!worldResult.success) {
    return engineFailure(worldResult.issues.map(mapDomainIssue));
  }

  return engineSuccess(finalizeSimulationState(parsed.data));
}
