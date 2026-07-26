import { z } from "zod";

import { computeSimulationDigest } from "../hashing/digest";
import { engineFailure, engineIssue, engineSuccess, type EngineResult } from "../issues/issues";
import { CURRENT_SIMULATION_SNAPSHOT_VERSION } from "../limits/constants";
import { finalizeSimulationState } from "../state/canonical";
import { SimulationStateV1Schema, type SimulationStateV1 } from "../state/schema";
import { validateSimulationState } from "../state/validation";

export const SimulationSnapshotV1Schema = z.strictObject({
  snapshotVersion: z.literal(CURRENT_SIMULATION_SNAPSHOT_VERSION),
  state: SimulationStateV1Schema,
  digest: z.string().regex(/^ag1:[0-9a-f]{16}$/u),
});

export type SimulationSnapshotV1 = z.infer<typeof SimulationSnapshotV1Schema>;

export interface SimulationStateComparison {
  readonly equal: boolean;
  readonly digestEqual: boolean;
  readonly tickDelta: number;
  readonly entityCountDelta: number;
  readonly cellCountDelta: number;
  readonly changedEntityIds: readonly string[];
  readonly changedCellIds: readonly string[];
}

export function cloneSimulationState(state: SimulationStateV1): SimulationStateV1 {
  return finalizeSimulationState(state);
}

export function createSimulationSnapshot(state: SimulationStateV1): SimulationSnapshotV1 {
  const cloned = cloneSimulationState(state);
  return {
    snapshotVersion: CURRENT_SIMULATION_SNAPSHOT_VERSION,
    state: cloned,
    digest: computeSimulationDigest(cloned),
  };
}

export function restoreSimulationSnapshot(value: unknown): EngineResult<SimulationStateV1> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "snapshotVersion" in value &&
    value.snapshotVersion !== CURRENT_SIMULATION_SNAPSHOT_VERSION
  ) {
    return engineFailure([
      engineIssue(
        "unsupported_snapshot_version",
        ["snapshotVersion"],
        "Simulation snapshot version is unsupported",
      ),
    ]);
  }

  const parsed = SimulationSnapshotV1Schema.safeParse(value);
  if (!parsed.success) {
    return engineFailure(
      parsed.error.issues.map((item) =>
        engineIssue(
          "invalid_snapshot",
          item.path.flatMap((segment) =>
            typeof segment === "string" || typeof segment === "number" ? [segment] : [],
          ),
          item.message,
        ),
      ),
    );
  }

  const stateResult = validateSimulationState(parsed.data.state);
  if (!stateResult.success) {
    return engineFailure(
      stateResult.issues.map((item) =>
        engineIssue("invalid_snapshot", ["state", ...item.path], item.message, item.details),
      ),
    );
  }
  const actualDigest = computeSimulationDigest(stateResult.data);
  if (actualDigest !== parsed.data.digest) {
    return engineFailure([
      engineIssue(
        "snapshot_digest_mismatch",
        ["digest"],
        "Snapshot digest does not match its simulation state",
        { expected: parsed.data.digest, actual: actualDigest },
      ),
    ]);
  }
  return engineSuccess(cloneSimulationState(stateResult.data));
}

function changedIds(
  left: readonly { readonly id: string }[],
  right: readonly { readonly id: string }[],
): string[] {
  const leftById = new Map(left.map((item) => [item.id, JSON.stringify(item)]));
  const rightById = new Map(right.map((item) => [item.id, JSON.stringify(item)]));
  return [...new Set([...leftById.keys(), ...rightById.keys()])]
    .filter((id) => leftById.get(id) !== rightById.get(id))
    .sort();
}

export function compareSimulationStates(
  left: SimulationStateV1,
  right: SimulationStateV1,
): SimulationStateComparison {
  const leftDigest = computeSimulationDigest(left);
  const rightDigest = computeSimulationDigest(right);
  return {
    equal: leftDigest === rightDigest,
    digestEqual: leftDigest === rightDigest,
    tickDelta: right.tick - left.tick,
    entityCountDelta: right.entities.length - left.entities.length,
    cellCountDelta: right.cells.length - left.cells.length,
    changedEntityIds: changedIds(left.entities, right.entities),
    changedCellIds: changedIds(left.cells, right.cells),
  };
}
