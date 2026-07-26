import { validateWorldDocument, type WorldDocumentV1 } from "@axiom-garden/domain";

import { engineFailure, type EngineResult } from "../issues/issues";
import { CURRENT_SIMULATION_STATE_VERSION } from "../limits/constants";
import { finalizeSimulationState } from "./canonical";
import type { SimulationStateV1 } from "./schema";
import { validateSimulationState } from "./validation";

export function createInitialSimulationState(
  world: WorldDocumentV1,
): EngineResult<SimulationStateV1> {
  const validated = validateWorldDocument(world);
  if (!validated.success) {
    return engineFailure(
      validated.issues.map((item) => ({
        code: "invalid_state",
        severity: "error",
        path: item.path,
        message: item.message,
        ...(item.details === undefined ? {} : { details: item.details }),
      })),
    );
  }

  return validateSimulationState(
    finalizeSimulationState({
      stateVersion: CURRENT_SIMULATION_STATE_VERSION,
      sourceWorldId: validated.data.id,
      sourceSchemaVersion: validated.data.schemaVersion,
      tick: 0,
      metadata: validated.data.metadata,
      grid: validated.data.grid,
      symbols: validated.data.palette.symbols,
      layers: validated.data.layers,
      cells: validated.data.cells,
      entities: validated.data.entities,
    }),
  );
}
