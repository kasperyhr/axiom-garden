import type { LayerId, WorldDocumentV1 } from "@axiom-garden/domain";

import type { EditorClipboard } from "../clipboard/clipboard";
import type { EditorTool } from "../commands/schema";
import type { EditorSelection } from "../selection/selection";

export interface EditorReceipt {
  readonly commandId: string;
  readonly kind: string;
  readonly revisionBefore: number;
  readonly revisionAfter: number;
  readonly documentDigestBefore: string;
  readonly documentDigestAfter: string;
  readonly summary: string;
  readonly affectedIds: readonly string[];
}

export interface EditorHistoryEntry {
  readonly commandId: string;
  readonly kind: string;
  readonly beforeDocument: WorldDocumentV1;
  readonly afterDocument: WorldDocumentV1;
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly summary: string;
  readonly affectedIds: readonly string[];
}

export interface EditorStateV1 {
  readonly editorStateVersion: 1;
  readonly document: WorldDocumentV1;
  readonly selection: EditorSelection;
  readonly activeLayerId: LayerId;
  readonly activeTool: EditorTool;
  readonly clipboard: EditorClipboard;
  readonly undoStack: readonly EditorHistoryEntry[];
  readonly redoStack: readonly EditorHistoryEntry[];
  readonly revision: number;
  readonly lastReceipt: EditorReceipt | null;
}

export interface AppliedEditorCommand {
  readonly state: EditorStateV1;
  readonly receipt: EditorReceipt | null;
}
