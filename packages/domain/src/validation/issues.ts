export type DomainIssueCode =
  | "json_too_large"
  | "invalid_json"
  | "invalid_root"
  | "not_world_document"
  | "missing_version"
  | "invalid_version"
  | "unsupported_version"
  | "schema_validation"
  | "unknown_field"
  | "invalid_identifier"
  | "invalid_datetime"
  | "invalid_property_key"
  | "invalid_property_value"
  | "limit_exceeded"
  | "duplicate_id"
  | "duplicate_layer_order"
  | "missing_reference"
  | "coordinate_out_of_bounds"
  | "duplicate_cell_coordinate"
  | "empty_cell_record"
  | "invalid_time_order";

export type DomainIssueSeverity = "error" | "warning";
export type DomainPathSegment = string | number;
export type DomainIssueDetail = string | number | boolean | null;

export interface DomainIssue {
  readonly code: DomainIssueCode;
  readonly severity: DomainIssueSeverity;
  readonly path: readonly DomainPathSegment[];
  readonly message: string;
  readonly details?: Readonly<Record<string, DomainIssueDetail>>;
}

export type ValidationResult<T> =
  | { readonly success: true; readonly data: T; readonly issues: readonly DomainIssue[] }
  | { readonly success: false; readonly issues: readonly DomainIssue[] };

export function failure<T>(issues: readonly DomainIssue[]): ValidationResult<T> {
  return { success: false, issues };
}

export function success<T>(data: T, issues: readonly DomainIssue[] = []): ValidationResult<T> {
  return { success: true, data, issues };
}
