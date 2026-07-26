import { engineIssue, type EngineIssue } from "../issues/issues";
import { MAX_RUN_STEPS } from "../limits/constants";
import type { SimulationStateV1 } from "../state/schema";
import type { TransitionReceipt } from "../transitions/receipt";
import type { TransitionPlan } from "../transitions/schema";
import { stepSimulation } from "./step";

export interface RunSimulationOptions {
  readonly maxSteps?: number;
}

export type RunSimulationResult =
  | {
      readonly success: true;
      readonly state: SimulationStateV1;
      readonly receipts: readonly TransitionReceipt[];
    }
  | {
      readonly success: false;
      readonly state: SimulationStateV1;
      readonly receipts: readonly TransitionReceipt[];
      readonly failedPlanIndex: number;
      readonly issues: readonly EngineIssue[];
    };

export function runSimulation(
  initialState: SimulationStateV1,
  plans: readonly TransitionPlan[],
  options: RunSimulationOptions = {},
): RunSimulationResult {
  const requestedMaximum = options.maxSteps ?? MAX_RUN_STEPS;
  const maximum =
    Number.isSafeInteger(requestedMaximum) && requestedMaximum >= 0
      ? Math.min(requestedMaximum, MAX_RUN_STEPS)
      : 0;
  let state = initialState;
  const receipts: TransitionReceipt[] = [];

  for (let index = 0; index < plans.length; index += 1) {
    if (index >= maximum) {
      return {
        success: false,
        state,
        receipts,
        failedPlanIndex: index,
        issues: [
          engineIssue(
            "max_steps_exceeded",
            ["plans", index],
            "Simulation run exceeded its step budget",
            { maximum },
          ),
        ],
      };
    }
    const plan = plans[index];
    if (plan === undefined) continue;
    const result = stepSimulation(state, plan);
    if (!result.success) {
      return {
        success: false,
        state,
        receipts,
        failedPlanIndex: index,
        issues: result.issues,
      };
    }
    state = result.state;
    receipts.push(result.receipt);
  }

  return { success: true, state, receipts };
}
