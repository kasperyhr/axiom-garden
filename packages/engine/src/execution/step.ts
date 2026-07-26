import { computeSimulationDigest } from "../hashing/digest";
import type { EngineIssue } from "../issues/issues";
import { finalizeSimulationState } from "../state/canonical";
import type { SimulationStateV1 } from "../state/schema";
import type { TransitionReceipt } from "../transitions/receipt";
import type { TransitionPlan } from "../transitions/schema";
import { prepareTransition } from "../transitions/validation";

export type SimulationStepResult =
  | {
      readonly success: true;
      readonly state: SimulationStateV1;
      readonly receipt: TransitionReceipt;
    }
  | { readonly success: false; readonly issues: readonly EngineIssue[] };

export function applyTransitionPlan(
  state: SimulationStateV1,
  plan: TransitionPlan,
): SimulationStepResult {
  const prepared = prepareTransition(state, plan);
  if (!prepared.success) return prepared;

  const nextState = finalizeSimulationState({
    ...state,
    tick: state.tick + 1,
    entities: prepared.data.entities,
    cells: prepared.data.cells,
  });
  return {
    success: true,
    state: nextState,
    receipt: {
      transitionId: prepared.data.plan.id,
      tickBefore: state.tick,
      tickAfter: nextState.tick,
      operationCount: prepared.data.operationCount,
      appliedOperationIds: [...prepared.data.appliedOperationIds],
      stateDigestBefore: computeSimulationDigest(state),
      stateDigestAfter: computeSimulationDigest(nextState),
      summary: { ...prepared.data.summary },
    },
  };
}

export function stepSimulation(
  state: SimulationStateV1,
  plan: TransitionPlan,
): SimulationStepResult {
  return applyTransitionPlan(state, plan);
}
