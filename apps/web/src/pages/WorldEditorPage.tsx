import {
  REPRESENTATIVE_WORLD_V1,
  serializeWorldDocument,
  validateWorldDocument,
  type CellRecordId,
  type CellRecordV1,
  type EntityId,
  type EntityV1,
  type SymbolId,
} from "@axiom-garden/domain";
import {
  allocateDeterministicId,
  applyEditorCommand,
  computeEditorDocumentDigest,
  createEditorState,
  createPasteCommand,
  redoEditorCommand,
  undoEditorCommand,
  type EditorIssue,
  type EditorSelection,
  type EditorStateV1,
  type EditorTool,
} from "@axiom-garden/editor";
import { computeSimulationDigest, createInitialSimulationState } from "@axiom-garden/engine";
import {
  DARK_RENDERER_THEME,
  LIGHT_RENDERER_THEME,
  createRenderSceneFromWorld,
  createViewport,
  fitGridToViewport,
  zoomViewportAt,
  type HitResult,
  type Point,
} from "@axiom-garden/renderer";
import {
  Badge,
  Button,
  Callout,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  DatabaseZap,
  Dialog,
  FileCheck2,
  FileJson,
  Grid3X3,
  Hand,
  Layers3,
  Maximize,
  MousePointer2,
  PanelRight,
  Redo2,
  RotateCcw,
  Shapes,
  StatusIndicator,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  useTheme,
  useToast,
} from "@axiom-garden/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EditorCanvas } from "../features/editor/EditorCanvas";
import { EditorInspector } from "../features/editor/EditorInspector";
import { EditorLayerPanel } from "../features/editor/EditorLayerPanel";
import { EditorSymbolPalette } from "../features/editor/EditorSymbolPalette";
import { usePageMetadata } from "../hooks/usePageMetadata";

const initialEditor = createEditorState(REPRESENTATIVE_WORLD_V1);
if (!initialEditor.success) {
  throw new Error("Built-in representative world must create an Editor state");
}
const INITIAL_EDITOR_STATE = initialEditor.data;

function commandId(label: string, revision: number): string {
  return `command:${label}-${revision}`;
}

function selectionFromHit(hit: HitResult): EditorSelection {
  if (hit.kind === "entity" && hit.entityId) {
    return { kind: "entity", entityId: hit.entityId };
  }
  if (hit.kind === "cell" && hit.cellId) {
    return { kind: "cell", cellId: hit.cellId };
  }
  return { kind: "coordinate", coordinate: { ...hit.worldCoordinate } };
}

function hitFromSelection(state: EditorStateV1): HitResult | null {
  const common = { screenPosition: { x: 0, y: 0 }, scenePosition: { x: 0, y: 0 } };
  const selection = state.selection;
  if (selection.kind === "entity") {
    const entity = state.document.entities.find((candidate) => candidate.id === selection.entityId);
    return entity
      ? {
          ...common,
          kind: "entity",
          entityId: entity.id,
          layerId: entity.layerId,
          worldCoordinate: { ...entity.coordinate },
        }
      : null;
  }
  if (selection.kind === "cell") {
    const cell = state.document.cells.find((candidate) => candidate.id === selection.cellId);
    return cell
      ? {
          ...common,
          kind: "cell",
          cellId: cell.id,
          layerId: cell.layerId,
          worldCoordinate: { ...cell.coordinate },
        }
      : null;
  }
  return selection.kind === "coordinate"
    ? {
        ...common,
        kind: "empty",
        worldCoordinate: { ...selection.coordinate },
      }
    : null;
}

function selectionCoordinate(state: EditorStateV1): Point {
  const selection = state.selection;
  if (selection.kind === "coordinate") return selection.coordinate;
  if (selection.kind === "entity") {
    return (
      state.document.entities.find((entity) => entity.id === selection.entityId)?.coordinate ?? {
        x: 0,
        y: 0,
      }
    );
  }
  if (selection.kind === "cell") {
    return (
      state.document.cells.find((cell) => cell.id === selection.cellId)?.coordinate ?? {
        x: 0,
        y: 0,
      }
    );
  }
  return { x: 0, y: 0 };
}

function toolLabel(tool: EditorTool): string {
  return {
    inspect: "Inspect",
    pan: "Pan",
    placeEntity: "Place entity",
    placeCell: "Place cell",
  }[tool];
}

function MetadataForm({
  state,
  onApply,
}: {
  readonly state: EditorStateV1;
  readonly onApply: (metadata: {
    readonly title: string;
    readonly description: string;
    readonly tags: readonly string[];
  }) => void;
}) {
  const [title, setTitle] = useState(state.document.metadata.title);
  const [description, setDescription] = useState(state.document.metadata.description);
  const [tags, setTags] = useState(state.document.metadata.tags.join(", "));
  return (
    <form
      className="editor-form editor-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          title,
          description,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        });
      }}
    >
      <label>
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        <span>Tags (comma-separated)</span>
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <p className="editor-form__hint">
        createdAt and updatedAt remain unchanged to preserve deterministic editing.
      </p>
      <Button type="submit">Apply metadata</Button>
    </form>
  );
}

function GridForm({
  state,
  onApply,
}: {
  readonly state: EditorStateV1;
  readonly onApply: (width: number, height: number) => void;
}) {
  const [width, setWidth] = useState(state.document.grid.width);
  const [height, setHeight] = useState(state.document.grid.height);
  return (
    <form
      className="editor-form editor-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(width, height);
      }}
    >
      <div className="editor-form__coordinates">
        <label>
          <span>Width</span>
          <input
            type="number"
            min={1}
            max={256}
            value={width}
            onChange={(event) => setWidth(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          <span>Height</span>
          <input
            type="number"
            min={1}
            max={256}
            value={height}
            onChange={(event) => setHeight(event.currentTarget.valueAsNumber)}
          />
        </label>
      </div>
      <p className="editor-form__hint">
        Shrinking is rejected when it would orphan an Entity or Cell Record.
      </p>
      <Button type="submit">Resize grid</Button>
    </form>
  );
}

export default function WorldEditorPage() {
  usePageMetadata("World editor", "Edit an in-memory Axiom Garden World Document with undo.");
  const { resolvedTheme } = useTheme();
  const { notify } = useToast();
  const [editor, setEditor] = useState<EditorStateV1>(() => INITIAL_EDITOR_STATE);
  const [issues, setIssues] = useState<readonly EditorIssue[]>([]);
  const [activeSymbolId, setActiveSymbolId] = useState<SymbolId>(
    () => editor.document.palette.symbols[0]?.id as SymbolId,
  );
  const [viewport, setViewport] = useState(() =>
    fitGridToViewport(createViewport(), editor.document.grid),
  );
  const [dragPreview, setDragPreview] = useState<{
    readonly entityId: string;
    readonly coordinate: Point;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("Editor ready");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  const displayDocument = useMemo(() => {
    if (!dragPreview) return editor.document;
    return {
      ...editor.document,
      entities: editor.document.entities.map((entity) =>
        entity.id === dragPreview.entityId
          ? { ...entity, coordinate: { ...dragPreview.coordinate } }
          : entity,
      ),
    };
  }, [dragPreview, editor.document]);
  const scene = useMemo(() => createRenderSceneFromWorld(displayDocument), [displayDocument]);
  const theme = resolvedTheme === "dark" ? DARK_RENDERER_THEME : LIGHT_RENDERER_THEME;
  const selected = hitFromSelection(editor);
  const activeLayer = editor.document.layers.find((layer) => layer.id === editor.activeLayerId);
  const activeSymbol = editor.document.palette.symbols.find(
    (symbol) => symbol.id === activeSymbolId,
  );
  const documentDigest = computeEditorDocumentDigest(editor.document);
  const domainValidation = validateWorldDocument(editor.document);
  const engineValidation = createInitialSimulationState(editor.document);
  const engineDigest = engineValidation.success
    ? computeSimulationDigest(engineValidation.data)
    : null;

  const handleResult = useCallback(
    (
      result: ReturnType<typeof applyEditorCommand>,
      successMessage?: string,
      select?: EditorSelection,
    ) => {
      if (!result.success) {
        setIssues(result.issues);
        const message = result.issues[0]?.message ?? "Editor command was rejected";
        setAnnouncement(message);
        notify(message, "danger");
        return false;
      }
      let next = result.data.state;
      if (select) {
        const selectedResult = applyEditorCommand(next, {
          commandId: commandId("select-result", next.revision),
          kind: "set_selection",
          expectedRevision: next.revision,
          selection: select,
        });
        if (selectedResult.success) next = selectedResult.data.state;
      }
      setEditor(next);
      setIssues([]);
      const message = successMessage ?? result.data.receipt?.summary ?? "Editor state updated";
      setAnnouncement(message);
      notify(message, "success");
      return true;
    },
    [notify],
  );

  const apply = useCallback(
    (command: unknown, successMessage?: string, select?: EditorSelection) =>
      handleResult(applyEditorCommand(editor, command), successMessage, select),
    [editor, handleResult],
  );

  const setTool = useCallback(
    (tool: EditorTool) =>
      apply(
        {
          commandId: commandId(`tool-${tool.toLowerCase()}`, editor.revision),
          kind: "set_active_tool",
          expectedRevision: editor.revision,
          tool,
        },
        `${toolLabel(tool)} tool active`,
      ),
    [apply, editor.revision],
  );

  const setSelection = useCallback(
    (selection: EditorSelection) =>
      apply(
        {
          commandId: commandId("selection", editor.revision),
          kind: "set_selection",
          expectedRevision: editor.revision,
          selection,
        },
        selection.kind === "none" ? "Selection cleared" : `${selection.kind} selected`,
      ),
    [apply, editor.revision],
  );

  const confirmDeleteSelection = useCallback(() => {
    if (editor.selection.kind === "entity") {
      apply(
        {
          commandId: commandId("delete-entity", editor.revision),
          kind: "remove_entity",
          expectedRevision: editor.revision,
          entityId: editor.selection.entityId,
        },
        "Entity deleted",
      );
    } else if (editor.selection.kind === "cell") {
      apply(
        {
          commandId: commandId("delete-cell", editor.revision),
          kind: "remove_cell_record",
          expectedRevision: editor.revision,
          cellId: editor.selection.cellId,
        },
        "Cell Record deleted",
      );
    } else {
      notify("Select an Entity or Cell Record to delete", "warning");
    }
    setDeleteOpen(false);
  }, [apply, editor.revision, editor.selection, notify]);

  const requestDeleteSelection = useCallback(() => {
    if (editor.selection.kind === "entity" || editor.selection.kind === "cell") {
      setDeleteOpen(true);
      return;
    }
    notify("Select an Entity or Cell Record to delete", "warning");
  }, [editor.selection.kind, notify]);

  const activateAt = useCallback(
    (hit: HitResult) => {
      if (editor.activeTool === "pan") return;
      if (editor.activeTool === "inspect") {
        setSelection(selectionFromHit(hit));
        return;
      }
      if (!activeLayer || activeLayer.locked) {
        const message = "Active layer is locked; choose or unlock another layer";
        setIssues([
          {
            code: "locked_layer",
            severity: "error",
            path: ["activeLayerId"],
            message,
          },
        ]);
        setAnnouncement(message);
        notify(message, "danger");
        return;
      }
      if (editor.activeTool === "placeEntity") {
        if (!activeSymbol) return;
        const id = allocateDeterministicId(
          "entity",
          activeSymbol.name,
          editor.document.entities.map((entity) => entity.id),
        ) as EntityId;
        apply(
          {
            commandId: commandId("place-entity", editor.revision),
            kind: "add_entity",
            expectedRevision: editor.revision,
            entity: {
              id,
              symbolId: activeSymbol.id,
              layerId: activeLayer.id,
              coordinate: { ...hit.worldCoordinate },
              orientation: 0,
              properties: {},
            },
          },
          `Placed entity ${id}`,
          { kind: "entity", entityId: id },
        );
        return;
      }
      const existing = editor.document.cells.find(
        (cell) =>
          cell.layerId === activeLayer.id &&
          cell.coordinate.x === hit.worldCoordinate.x &&
          cell.coordinate.y === hit.worldCoordinate.y,
      );
      if (existing) {
        setSelection({ kind: "cell", cellId: existing.id });
        notify("A Cell Record already exists here; selected the existing record", "warning");
        return;
      }
      const id = allocateDeterministicId(
        "cell",
        "marker",
        editor.document.cells.map((cell) => cell.id),
      ) as CellRecordId;
      apply(
        {
          commandId: commandId("place-cell", editor.revision),
          kind: "add_cell_record",
          expectedRevision: editor.revision,
          cell: {
            id,
            layerId: activeLayer.id,
            coordinate: { ...hit.worldCoordinate },
            tags: ["marker"],
            properties: {},
          },
        },
        `Placed cell marker ${id}`,
        { kind: "cell", cellId: id },
      );
    },
    [
      activeLayer,
      activeSymbol,
      apply,
      editor.activeTool,
      editor.document.cells,
      editor.document.entities,
      editor.revision,
      notify,
      setSelection,
    ],
  );

  const moveEntity = useCallback(
    (entityId: string, coordinate: Point) => {
      apply(
        {
          commandId: commandId("drag-entity", editor.revision),
          kind: "move_entity",
          expectedRevision: editor.revision,
          entityId,
          coordinate,
        },
        `Moved ${entityId} to ${coordinate.x}, ${coordinate.y}`,
      );
    },
    [apply, editor.revision],
  );

  const pasteClipboard = useCallback(
    (source = editor) => {
      const coordinate = selectionCoordinate(source);
      const target = {
        x: Math.min(source.document.grid.width - 1, coordinate.x + 1),
        y: Math.min(source.document.grid.height - 1, coordinate.y + 1),
      };
      const namespace = source.clipboard.kind === "cell" ? "cell" : "entity";
      const usedIds =
        namespace === "cell"
          ? source.document.cells.map((cell) => cell.id)
          : source.document.entities.map((entity) => entity.id);
      const id = allocateDeterministicId(namespace, "copy", usedIds) as EntityId | CellRecordId;
      const paste = createPasteCommand(source, {
        commandId: commandId("paste", source.revision),
        id,
        coordinate: target,
        layerId: source.activeLayerId,
      });
      if (!paste.success) {
        setIssues(paste.issues);
        notify(paste.issues[0]?.message ?? "Paste rejected", "danger");
        return;
      }
      const result = applyEditorCommand(source, paste.data);
      handleResult(
        result,
        `Pasted ${id}`,
        namespace === "cell"
          ? { kind: "cell", cellId: id as CellRecordId }
          : { kind: "entity", entityId: id as EntityId },
      );
    },
    [editor, handleResult, notify],
  );

  const copySelection = useCallback(
    (pasteAfter = false) => {
      const copied = applyEditorCommand(editor, {
        commandId: commandId("copy-selection", editor.revision),
        kind: "copy_selection",
        expectedRevision: editor.revision,
      });
      if (!copied.success) {
        handleResult(copied);
        return;
      }
      setEditor(copied.data.state);
      setAnnouncement("Selection copied to the in-memory Editor clipboard");
      notify("Copied to in-memory Editor clipboard", "success");
      if (pasteAfter) pasteClipboard(copied.data.state);
    },
    [editor, handleResult, notify, pasteClipboard],
  );

  const undo = useCallback(() => {
    const result = undoEditorCommand(editor);
    if (!result.success) {
      notify("Nothing to undo", "warning");
      return;
    }
    setEditor(result.data.state);
    setIssues([]);
    setAnnouncement(result.data.receipt?.summary ?? "Undo complete");
  }, [editor, notify]);
  const redo = useCallback(() => {
    const result = redoEditorCommand(editor);
    if (!result.success) {
      notify("Nothing to redo", "warning");
      return;
    }
    setEditor(result.data.state);
    setIssues([]);
    setAnnouncement(result.data.receipt?.summary ?? "Redo complete");
  }, [editor, notify]);

  const fitView = useCallback(
    () => setViewport((current) => fitGridToViewport(current, scene.grid)),
    [scene.grid],
  );
  const resetView = useCallback(
    () =>
      setViewport((current) =>
        fitGridToViewport(
          createViewport({
            viewportWidth: current.viewportWidth,
            viewportHeight: current.viewportHeight,
            devicePixelRatio: current.devicePixelRatio,
          }),
          scene.grid,
        ),
      ),
    [scene.grid],
  );
  const zoom = (multiplier: number) =>
    setViewport((current) =>
      zoomViewportAt(current, current.zoom * multiplier, {
        x: current.viewportWidth / 2,
        y: current.viewportHeight / 2,
      }),
    );

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (modifier && key === "y") {
        event.preventDefault();
        redo();
      } else if (modifier && key === "c") {
        event.preventDefault();
        copySelection();
      } else if (modifier && key === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (key === "v") setTool("inspect");
      else if (key === "h") setTool("pan");
      else if (key === "e") setTool("placeEntity");
      else if (key === "c") setTool("placeCell");
      else if (event.key === "Delete" || event.key === "Backspace") requestDeleteSelection();
      else if (event.key === "Escape") {
        setDragPreview(null);
        setSelection({ kind: "none" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelection, pasteClipboard, redo, requestDeleteSelection, setSelection, setTool, undo]);

  const toolButtons = (
    <>
      {[
        { tool: "inspect" as const, label: "Inspect", icon: <MousePointer2 /> },
        { tool: "pan" as const, label: "Pan", icon: <Hand /> },
        { tool: "placeEntity" as const, label: "Place entity", icon: <Shapes /> },
        { tool: "placeCell" as const, label: "Place cell", icon: <Grid3X3 /> },
      ].map((item) => (
        <Button
          key={item.tool}
          size="small"
          variant={editor.activeTool === item.tool ? "primary" : "secondary"}
          aria-pressed={editor.activeTool === item.tool}
          leadingIcon={item.icon}
          onClick={() => setTool(item.tool)}
        >
          {item.label}
        </Button>
      ))}
    </>
  );

  const symbolPalette = (
    <EditorSymbolPalette
      activeSymbolId={activeSymbolId}
      document={editor.document}
      onSelect={(symbolId) => {
        setActiveSymbolId(symbolId);
        setAnnouncement(`Active symbol ${symbolId}`);
      }}
      onAdd={(symbol) =>
        apply(
          {
            commandId: commandId("add-symbol", editor.revision),
            kind: "add_symbol",
            expectedRevision: editor.revision,
            symbol,
          },
          `Created symbol ${symbol.id}`,
          { kind: "symbol", symbolId: symbol.id },
        ) && setActiveSymbolId(symbol.id)
      }
      onEdit={(symbol) =>
        apply(
          {
            commandId: commandId("edit-symbol", editor.revision),
            kind: "replace_symbol",
            expectedRevision: editor.revision,
            symbolId: symbol.id,
            replacement: symbol,
          },
          `Updated symbol ${symbol.id}`,
        )
      }
      onDelete={(symbolId) =>
        apply(
          {
            commandId: commandId("delete-symbol", editor.revision),
            kind: "remove_symbol",
            expectedRevision: editor.revision,
            symbolId,
          },
          `Deleted symbol ${symbolId}`,
        )
      }
    />
  );

  const layerPanel = (
    <EditorLayerPanel
      activeLayerId={editor.activeLayerId}
      document={editor.document}
      onSelect={(layerId) =>
        apply(
          {
            commandId: commandId("active-layer", editor.revision),
            kind: "set_active_layer",
            expectedRevision: editor.revision,
            layerId,
          },
          `Active layer ${layerId}`,
        )
      }
      onAdd={(layer) =>
        apply(
          {
            commandId: commandId("add-layer", editor.revision),
            kind: "add_layer",
            expectedRevision: editor.revision,
            layer,
          },
          `Created layer ${layer.id}`,
        )
      }
      onEdit={(layer) =>
        apply(
          {
            commandId: commandId("edit-layer", editor.revision),
            kind: "replace_layer",
            expectedRevision: editor.revision,
            layerId: layer.id,
            replacement: layer,
          },
          `Updated layer ${layer.id}`,
        )
      }
      onDelete={(layerId) =>
        apply(
          {
            commandId: commandId("delete-layer", editor.revision),
            kind: "remove_layer",
            expectedRevision: editor.revision,
            layerId,
          },
          `Deleted layer ${layerId}`,
        )
      }
    />
  );

  const inspector = (
    <EditorInspector
      document={editor.document}
      selection={editor.selection}
      issues={issues}
      onCancelDraft={() => {
        setIssues([]);
        setAnnouncement("Inspector draft cancelled");
      }}
      onReplaceEntity={(replacement: EntityV1) =>
        apply(
          {
            commandId: commandId("replace-entity", editor.revision),
            kind: "replace_entity",
            expectedRevision: editor.revision,
            entityId: replacement.id,
            replacement,
          },
          `Updated entity ${replacement.id}`,
        )
      }
      onReplaceCell={(replacement: CellRecordV1) =>
        apply(
          {
            commandId: commandId("replace-cell", editor.revision),
            kind: "replace_cell_record",
            expectedRevision: editor.revision,
            cellId: replacement.id,
            replacement,
          },
          `Updated cell ${replacement.id}`,
        )
      }
    />
  );

  return (
    <div className="editor-page">
      <header className="editor-page__header">
        <div>
          <h1>World Editor</h1>
          <p>Build an in-memory abstract world through validated, undoable data commands.</p>
        </div>
        <Badge tone="info">Milestone 6 · In-memory editing</Badge>
      </header>

      <Callout title="Editing boundary" tone="info">
        This editor changes only an in-memory World Document. No Rule language, simulation playback,
        file operations, persistence, or cloud service is implemented.
      </Callout>

      {issues.length > 0 ? (
        <div className="editor-global-issues" role="alert" aria-label="Editor validation issues">
          <strong>Change not applied</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                <code>{issue.code}</code> · {issue.path.join(".") || "command"} · {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="editor-toolbar" aria-label="Editor toolbar">
        <div className="editor-toolbar__group" aria-label="Tools">
          {toolButtons}
        </div>
        <div className="editor-toolbar__group" aria-label="History and clipboard">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<Undo2 />}
            disabled={editor.undoStack.length === 0}
            onClick={undo}
          >
            Undo
          </Button>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<Redo2 />}
            disabled={editor.redoStack.length === 0}
            onClick={redo}
          >
            Redo
          </Button>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<ClipboardCopy />}
            onClick={() => copySelection()}
          >
            Copy
          </Button>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<ClipboardPaste />}
            onClick={() => pasteClipboard()}
          >
            Paste
          </Button>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<Copy />}
            onClick={() => copySelection(true)}
          >
            Duplicate
          </Button>
          <Button
            size="small"
            variant="danger"
            leadingIcon={<Trash2 />}
            onClick={requestDeleteSelection}
          >
            Delete
          </Button>
        </div>
        <div className="editor-toolbar__group" aria-label="Viewport">
          <Button size="small" variant="ghost" leadingIcon={<ZoomIn />} onClick={() => zoom(1.2)}>
            Zoom in
          </Button>
          <Button
            size="small"
            variant="ghost"
            leadingIcon={<ZoomOut />}
            onClick={() => zoom(1 / 1.2)}
          >
            Zoom out
          </Button>
          <Button size="small" variant="ghost" leadingIcon={<Maximize />} onClick={fitView}>
            Fit
          </Button>
          <Button size="small" variant="ghost" leadingIcon={<RotateCcw />} onClick={resetView}>
            Reset view
          </Button>
        </div>
        <div
          className="editor-toolbar__group editor-toolbar__group--document"
          aria-label="Document"
        >
          <Button
            size="small"
            variant="ghost"
            leadingIcon={<FileCheck2 />}
            onClick={() => {
              const message =
                domainValidation.success && engineValidation.success
                  ? "Document is Domain valid and Engine compatible"
                  : "Document validation failed";
              setAnnouncement(message);
              notify(
                message,
                domainValidation.success && engineValidation.success ? "success" : "danger",
              );
            }}
          >
            Validate document
          </Button>
          <Button
            size="small"
            variant="ghost"
            leadingIcon={<FileJson />}
            onClick={() => setJsonOpen(true)}
          >
            Preview JSON
          </Button>
          <Button
            size="small"
            variant="danger"
            leadingIcon={<RotateCcw />}
            onClick={() => setResetOpen(true)}
          >
            Reset document
          </Button>
        </div>
      </section>

      <p className="editor-canvas-help" id="editor-canvas-help">
        V Inspect · H Pan · E Place entity · C Place cell · Arrow keys observe · Enter selects or
        places · Delete removes selection · Ctrl/Cmd+Z undo · Escape cancels drag or clears.
      </p>

      <div className="editor-mobile-panel-triggers">
        <Dialog
          trigger={
            <Button variant="secondary" leadingIcon={<Shapes />}>
              Tools & symbols
            </Button>
          }
          title="Editor tools and symbols"
          description="Choose a tool and the active abstract symbol."
        >
          <div className="editor-mobile-tools">{toolButtons}</div>
          {symbolPalette}
        </Dialog>
        <Dialog
          trigger={
            <Button variant="secondary" leadingIcon={<Layers3 />}>
              Layers
            </Button>
          }
          title="Editor layers"
          description="Choose, create, reorder, show, hide, lock, or remove a layer."
        >
          {layerPanel}
        </Dialog>
        <Dialog
          trigger={
            <Button variant="secondary" leadingIcon={<PanelRight />}>
              Inspector
            </Button>
          }
          title="Editor inspector"
          description="Edit the selected Entity or Cell Record through a controlled draft."
        >
          {inspector}
        </Dialog>
      </div>

      <section className="editor-workspace" aria-label="World editor workspace">
        <aside className="editor-left-panel">{symbolPalette}</aside>
        <div className="editor-canvas-frame">
          <EditorCanvas
            scene={scene}
            viewport={viewport}
            onViewportChange={setViewport}
            tool={editor.activeTool}
            selected={selected}
            onActivate={activateAt}
            onMoveEntity={moveEntity}
            onDragPreview={setDragPreview}
            onDeleteSelection={requestDeleteSelection}
            theme={theme}
          />
        </div>
        <aside className="editor-right-panel">
          <section className="editor-side-section">{inspector}</section>
          <section className="editor-side-section">{layerPanel}</section>
          <section className="editor-side-section editor-document-actions">
            <h2>Document</h2>
            <Button size="small" variant="secondary" onClick={() => setMetadataOpen(true)}>
              Edit metadata
            </Button>
            <Button size="small" variant="secondary" onClick={() => setGridOpen(true)}>
              Resize grid
            </Button>
          </section>
        </aside>
        <footer className="editor-status">
          <StatusIndicator
            status={domainValidation.success ? "healthy" : "unavailable"}
            label={domainValidation.success ? "Domain valid" : "Domain invalid"}
          />
          <StatusIndicator
            status={engineValidation.success ? "healthy" : "unavailable"}
            label={engineValidation.success ? "Engine compatible" : "Engine incompatible"}
          />
          <span>
            Revision <strong data-testid="editor-revision">{editor.revision}</strong>
          </span>
          <span>{editor.document.entities.length} entities</span>
          <span>{editor.document.cells.length} cells</span>
          <span>
            Active tool: <strong>{toolLabel(editor.activeTool)}</strong>
          </span>
          <span>
            Layer: <strong>{activeLayer?.name ?? "None"}</strong>
            {activeLayer?.locked ? " · Locked" : ""}
          </span>
          <code data-testid="editor-digest">{documentDigest}</code>
        </footer>
      </section>

      <section className="editor-validation-summary" aria-labelledby="editor-validation-heading">
        <div>
          <h2 id="editor-validation-heading">Compatibility summary</h2>
          <p>Web-only validation; Editor remains independent from Engine and Renderer.</p>
        </div>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>{domainValidation.success ? "Valid" : "Invalid"}</dd>
          </div>
          <div>
            <dt>Engine tick 0</dt>
            <dd>{engineValidation.success ? "Compatible" : "Rejected"}</dd>
          </div>
          <div>
            <dt>Engine digest</dt>
            <dd>
              <code>{engineDigest ?? "Unavailable"}</code>
            </dd>
          </div>
        </dl>
      </section>

      <Dialog
        open={jsonOpen}
        onOpenChange={setJsonOpen}
        title="Canonical World JSON"
        description="Read-only canonical output. Direct JSON editing remains in World Format Lab."
      >
        <div className="editor-json-preview">
          <dl>
            <div>
              <dt>Revision</dt>
              <dd>{editor.revision}</dd>
            </div>
            <div>
              <dt>Document digest</dt>
              <dd>
                <code>{documentDigest}</code>
              </dd>
            </div>
          </dl>
          <label>
            <span>Canonical World JSON</span>
            <textarea readOnly value={serializeWorldDocument(editor.document)} />
          </label>
          <div className="editor-form__actions">
            <Button
              leadingIcon={<FileCheck2 />}
              onClick={() =>
                notify(
                  domainValidation.success ? "Canonical document is valid" : "Document is invalid",
                  domainValidation.success ? "success" : "danger",
                )
              }
            >
              Validate
            </Button>
            <Button
              variant="secondary"
              leadingIcon={<ClipboardCopy />}
              onClick={() => {
                if (!navigator.clipboard) {
                  notify("Clipboard is unavailable; select the read-only JSON manually", "danger");
                  return;
                }
                void navigator.clipboard.writeText(serializeWorldDocument(editor.document)).then(
                  () => notify("Canonical JSON copied", "success"),
                  () => notify("Copy failed; select the read-only JSON manually", "danger"),
                );
              }}
            >
              Copy canonical JSON
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete selection?"
        description="Remove the selected Entity or Cell Record from the in-memory document."
      >
        <div className="editor-confirmation">
          <p>This change is recorded in Undo history.</p>
          <Button variant="danger" onClick={confirmDeleteSelection}>
            Confirm delete
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset document?"
        description="Restore the built-in representative world. This command can be undone."
      >
        <div className="editor-confirmation">
          <p>The current in-memory document will be replaced, without clearing Undo history.</p>
          <Button
            variant="danger"
            onClick={() => {
              if (
                apply(
                  {
                    commandId: commandId("reset-document", editor.revision),
                    kind: "reset_document",
                    expectedRevision: editor.revision,
                    document: REPRESENTATIVE_WORLD_V1,
                  },
                  "Document reset; Undo is available",
                )
              ) {
                setResetOpen(false);
                resetView();
              }
            }}
          >
            Confirm reset
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={metadataOpen}
        onOpenChange={setMetadataOpen}
        title="Edit world metadata"
        description="Title, description, and tags are editable; timestamps remain fixed."
      >
        <MetadataForm
          state={editor}
          onApply={(metadata) => {
            if (
              apply(
                {
                  commandId: commandId("metadata", editor.revision),
                  kind: "update_metadata",
                  expectedRevision: editor.revision,
                  metadata,
                },
                "World metadata updated",
              )
            )
              setMetadataOpen(false);
          }}
        />
      </Dialog>

      <Dialog
        open={gridOpen}
        onOpenChange={setGridOpen}
        title="Resize bounded grid"
        description="The grid remains square, top-left origin, and bounded."
      >
        <GridForm
          state={editor}
          onApply={(width, height) => {
            if (
              apply(
                {
                  commandId: commandId("resize-grid", editor.revision),
                  kind: "resize_grid",
                  expectedRevision: editor.revision,
                  width,
                  height,
                },
                `Grid resized to ${width} × ${height}`,
              )
            )
              setGridOpen(false);
          }}
        />
      </Dialog>

      <span
        className="ag-visually-hidden"
        id="editor-live-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
      <span className="ag-visually-hidden">
        Active symbol {activeSymbol?.name ?? "none"}. Active layer {activeLayer?.name ?? "none"}.
      </span>
      <div className="editor-boundary-note">
        <DatabaseZap aria-hidden="true" />
        <span>Refresh restores the initial world. No local or cloud persistence is used.</span>
      </div>
    </div>
  );
}
