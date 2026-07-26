export type EngineIssueCode =
  | "invalid_state"
  | "unsupported_state_version"
  | "tick_mismatch"
  | "tick_limit_exceeded"
  | "duplicate_operation_id"
  | "too_many_operations"
  | "entity_already_exists"
  | "entity_not_found"
  | "entity_id_mismatch"
  | "cell_already_exists"
  | "cell_not_found"
  | "cell_id_mismatch"
  | "missing_symbol_reference"
  | "missing_layer_reference"
  | "coordinate_out_of_bounds"
  | "duplicate_cell_coordinate"
  | "entity_limit_exceeded"
  | "cell_limit_exceeded"
  | "invalid_operation"
  | "invalid_transition_id"
  | "invalid_snapshot"
  | "unsupported_snapshot_version"
  | "snapshot_digest_mismatch"
  | "max_steps_exceeded";

export type EngineIssueSeverity = "error" | "warning";
export type EnginePathSegment = string | number;
export type EngineIssueDetail = string | number | boolean | null;

export interface EngineIssue {
  readonly code: EngineIssueCode;
  readonly severity: EngineIssueSeverity;
  readonly path: readonly EnginePathSegment[];
  readonly message: string;
  readonly details?: Readonly<Record<string, EngineIssueDetail>>;
}

export type EngineResult<T> =
  | { readonly success: true; readonly data: T; readonly issues: readonly EngineIssue[] }
  | { readonly success: false; readonly issues: readonly EngineIssue[] };

export function engineIssue(
  code: EngineIssueCode,
  path: readonly EnginePathSegment[],
  message: string,
  details?: EngineIssue["details"],
): EngineIssue {
  return {
    code,
    severity: "error",
    path,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

export function engineSuccess<T>(data: T, issues: readonly EngineIssue[] = []): EngineResult<T> {
  return { success: true, data, issues };
}

export function engineFailure<T>(issues: readonly EngineIssue[]): EngineResult<T> {
  return { success: false, issues };
}
