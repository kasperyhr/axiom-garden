import { MAX_CELL_RECORDS, MAX_ENTITIES } from "@axiom-garden/domain";

export const CURRENT_SIMULATION_STATE_VERSION = 1 as const;
export const CURRENT_SIMULATION_SNAPSHOT_VERSION = 1 as const;

export const MAX_TICK = 1_000_000;
export const MAX_OPERATIONS_PER_TRANSITION = 4_096;
export const MAX_RUN_STEPS = 10_000;
export const MAX_ENGINE_ENTITIES = Math.min(4_096, MAX_ENTITIES);
export const MAX_ENGINE_CELL_RECORDS = Math.min(2_048, MAX_CELL_RECORDS);
export const MAX_TRANSITION_ID_LENGTH = 128;
export const MAX_OPERATION_ID_LENGTH = 128;
