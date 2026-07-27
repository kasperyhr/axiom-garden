import {
  REPRESENTATIVE_WORLD_V1,
  normalizeWorldDocument,
  type WorldDocumentV1,
} from "@axiom-garden/domain";
import {
  createEditorState,
  type AppliedEditorCommand,
  type EditorResult,
  type EditorStateV1,
} from "../src/index";

export function representativeWorld(): WorldDocumentV1 {
  return normalizeWorldDocument(REPRESENTATIVE_WORLD_V1);
}

export function editorState(): EditorStateV1 {
  const result = createEditorState(representativeWorld());
  if (!result.success) throw new Error("Representative world should create an editor state");
  return result.data;
}

export function expectApplied(result: EditorResult<AppliedEditorCommand>): EditorStateV1 {
  if (!result.success) {
    throw new Error(`Expected command success, received ${result.issues[0]?.code ?? "unknown"}`);
  }
  return result.data.state;
}
