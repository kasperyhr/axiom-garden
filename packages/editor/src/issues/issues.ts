export type EditorIssueCode =
  | "revision_mismatch"
  | "invalid_command"
  | "invalid_command_id"
  | "locked_layer"
  | "entity_not_found"
  | "entity_already_exists"
  | "cell_not_found"
  | "cell_already_exists"
  | "symbol_not_found"
  | "symbol_in_use"
  | "layer_not_found"
  | "layer_in_use"
  | "cannot_remove_last_layer"
  | "duplicate_layer_order"
  | "coordinate_out_of_bounds"
  | "resize_would_orphan_objects"
  | "invalid_document"
  | "history_empty"
  | "clipboard_empty"
  | "unsupported_selection"
  | "limit_exceeded";

export type EditorPathSegment = string | number;
export type EditorIssueDetail = string | number | boolean | null;

export interface EditorIssue {
  readonly code: EditorIssueCode;
  readonly severity: "error" | "warning";
  readonly path: readonly EditorPathSegment[];
  readonly message: string;
  readonly details?: Readonly<Record<string, EditorIssueDetail>>;
}

export type EditorResult<T> =
  | { readonly success: true; readonly data: T; readonly issues: readonly EditorIssue[] }
  | { readonly success: false; readonly issues: readonly EditorIssue[] };

export function editorFailure<T>(issues: readonly EditorIssue[]): EditorResult<T> {
  return { success: false, issues };
}

export function editorSuccess<T>(data: T): EditorResult<T> {
  return { success: true, data, issues: [] };
}

export function editorIssue(
  code: EditorIssueCode,
  path: readonly EditorPathSegment[],
  message: string,
  details?: EditorIssue["details"],
): EditorIssue {
  return {
    code,
    severity: "error",
    path,
    message,
    ...(details === undefined ? {} : { details }),
  };
}
