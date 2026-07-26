import type { SimulationStateV1 } from "../state/schema";
import { canonicalizeSimulationState } from "../state/canonical";

const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

export const SIMULATION_DIGEST_ALGORITHM = "fnv1a-64-utf8" as const;
export const SIMULATION_DIGEST_PREFIX = "ag1:" as const;

export function serializeSimulationState(state: SimulationStateV1): string {
  return `${JSON.stringify(canonicalizeSimulationState(state))}\n`;
}

export function computeSimulationDigest(state: SimulationStateV1): string {
  const bytes = new TextEncoder().encode(serializeSimulationState(state));
  let hash = FNV_OFFSET_BASIS_64;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
  }
  return `${SIMULATION_DIGEST_PREFIX}${hash.toString(16).padStart(16, "0")}`;
}
