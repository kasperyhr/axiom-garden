import type { OperationId, TransitionId } from "./schema";

export interface TransitionSummary {
  readonly entitiesAdded: number;
  readonly entitiesRemoved: number;
  readonly entitiesReplaced: number;
  readonly cellsAdded: number;
  readonly cellsRemoved: number;
  readonly cellsReplaced: number;
}

export interface TransitionReceipt {
  readonly transitionId: TransitionId;
  readonly tickBefore: number;
  readonly tickAfter: number;
  readonly operationCount: number;
  readonly appliedOperationIds: readonly OperationId[];
  readonly stateDigestBefore: string;
  readonly stateDigestAfter: string;
  readonly summary: TransitionSummary;
}

export const EMPTY_TRANSITION_SUMMARY: TransitionSummary = {
  entitiesAdded: 0,
  entitiesRemoved: 0,
  entitiesReplaced: 0,
  cellsAdded: 0,
  cellsRemoved: 0,
  cellsReplaced: 0,
};
