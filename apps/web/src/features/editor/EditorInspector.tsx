import type {
  CellRecordV1,
  DomainProperties,
  EntityV1,
  WorldDocumentV1,
} from "@axiom-garden/domain";
import type { EditorIssue, EditorSelection } from "@axiom-garden/editor";
import { Button, EmptyState } from "@axiom-garden/ui";
import { useState } from "react";

import { PropertiesEditor } from "./PropertiesEditor";

interface EditorInspectorProps {
  readonly document: WorldDocumentV1;
  readonly selection: EditorSelection;
  readonly issues: readonly EditorIssue[];
  readonly onReplaceEntity: (entity: EntityV1) => void;
  readonly onReplaceCell: (cell: CellRecordV1) => void;
  readonly onCancelDraft: () => void;
}

function IssueList({ issues }: { readonly issues: readonly EditorIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="editor-issues" role="alert">
      <strong>Change not applied</strong>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.code}-${index}`}>
            <code>{issue.code}</code> · {issue.path.join(".") || "command"} · {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntityForm({
  document,
  entity,
  issues,
  onApply,
  onCancel,
}: {
  readonly document: WorldDocumentV1;
  readonly entity: EntityV1;
  readonly issues: readonly EditorIssue[];
  readonly onApply: (entity: EntityV1) => void;
  readonly onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EntityV1>(() => ({
    ...entity,
    coordinate: { ...entity.coordinate },
    properties: { ...entity.properties },
  }));
  const updateProperties = (properties: DomainProperties) => setDraft({ ...draft, properties });

  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <h2>Entity inspector</h2>
      <IssueList issues={issues} />
      <label>
        <span>ID</span>
        <input value={draft.id} readOnly aria-readonly="true" />
      </label>
      <label>
        <span>Symbol</span>
        <select
          value={draft.symbolId}
          onChange={(event) =>
            setDraft({
              ...draft,
              symbolId: event.target.value as EntityV1["symbolId"],
            })
          }
        >
          {document.palette.symbols.map((symbol) => (
            <option key={symbol.id} value={symbol.id}>
              {symbol.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Layer</span>
        <select
          value={draft.layerId}
          onChange={(event) =>
            setDraft({ ...draft, layerId: event.target.value as EntityV1["layerId"] })
          }
        >
          {document.layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
              {layer.locked ? " · Locked" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="editor-form__coordinates">
        <label>
          <span>X</span>
          <input
            type="number"
            min={0}
            max={document.grid.width - 1}
            value={draft.coordinate.x}
            onChange={(event) =>
              setDraft({
                ...draft,
                coordinate: { ...draft.coordinate, x: event.currentTarget.valueAsNumber },
              })
            }
          />
        </label>
        <label>
          <span>Y</span>
          <input
            type="number"
            min={0}
            max={document.grid.height - 1}
            value={draft.coordinate.y}
            onChange={(event) =>
              setDraft({
                ...draft,
                coordinate: { ...draft.coordinate, y: event.currentTarget.valueAsNumber },
              })
            }
          />
        </label>
      </div>
      <label>
        <span>Orientation</span>
        <select
          value={draft.orientation}
          onChange={(event) =>
            setDraft({
              ...draft,
              orientation: Number(event.target.value) as EntityV1["orientation"],
            })
          }
        >
          {[0, 90, 180, 270].map((orientation) => (
            <option key={orientation} value={orientation}>
              {orientation}°
            </option>
          ))}
        </select>
      </label>
      <PropertiesEditor idPrefix="entity" value={draft.properties} onChange={updateProperties} />
      <div className="editor-form__actions">
        <Button type="submit">Apply entity changes</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDraft({
              ...entity,
              coordinate: { ...entity.coordinate },
              properties: { ...entity.properties },
            });
            onCancel();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CellForm({
  cell,
  document,
  issues,
  onApply,
  onCancel,
}: {
  readonly cell: CellRecordV1;
  readonly document: WorldDocumentV1;
  readonly issues: readonly EditorIssue[];
  readonly onApply: (cell: CellRecordV1) => void;
  readonly onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CellRecordV1>(() => ({
    ...cell,
    coordinate: { ...cell.coordinate },
    tags: [...cell.tags],
    properties: { ...cell.properties },
  }));
  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <h2>Cell inspector</h2>
      <IssueList issues={issues} />
      <label>
        <span>ID</span>
        <input value={draft.id} readOnly aria-readonly="true" />
      </label>
      <label>
        <span>Layer</span>
        <select
          value={draft.layerId}
          onChange={(event) =>
            setDraft({ ...draft, layerId: event.target.value as CellRecordV1["layerId"] })
          }
        >
          {document.layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
              {layer.locked ? " · Locked" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="editor-form__coordinates">
        <label>
          <span>X</span>
          <input
            type="number"
            min={0}
            max={document.grid.width - 1}
            value={draft.coordinate.x}
            onChange={(event) =>
              setDraft({
                ...draft,
                coordinate: { ...draft.coordinate, x: event.currentTarget.valueAsNumber },
              })
            }
          />
        </label>
        <label>
          <span>Y</span>
          <input
            type="number"
            min={0}
            max={document.grid.height - 1}
            value={draft.coordinate.y}
            onChange={(event) =>
              setDraft({
                ...draft,
                coordinate: { ...draft.coordinate, y: event.currentTarget.valueAsNumber },
              })
            }
          />
        </label>
      </div>
      <label>
        <span>Tags (comma-separated)</span>
        <input
          value={draft.tags.join(", ")}
          onChange={(event) =>
            setDraft({
              ...draft,
              tags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <PropertiesEditor
        idPrefix="cell"
        value={draft.properties}
        onChange={(properties) => setDraft({ ...draft, properties })}
      />
      <div className="editor-form__actions">
        <Button type="submit">Apply cell changes</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDraft({
              ...cell,
              coordinate: { ...cell.coordinate },
              tags: [...cell.tags],
              properties: { ...cell.properties },
            });
            onCancel();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function EditorInspector({
  document,
  issues,
  onCancelDraft,
  onReplaceCell,
  onReplaceEntity,
  selection,
}: EditorInspectorProps) {
  if (selection.kind === "entity") {
    const entity = document.entities.find((candidate) => candidate.id === selection.entityId);
    return entity ? (
      <EntityForm
        key={JSON.stringify(entity)}
        document={document}
        entity={entity}
        issues={issues}
        onApply={onReplaceEntity}
        onCancel={onCancelDraft}
      />
    ) : null;
  }
  if (selection.kind === "cell") {
    const cell = document.cells.find((candidate) => candidate.id === selection.cellId);
    return cell ? (
      <CellForm
        key={JSON.stringify(cell)}
        cell={cell}
        document={document}
        issues={issues}
        onApply={onReplaceCell}
        onCancel={onCancelDraft}
      />
    ) : null;
  }
  if (selection.kind === "coordinate") {
    return (
      <div className="editor-empty-inspector">
        <h2>Coordinate inspector</h2>
        <p>
          ({selection.coordinate.x}, {selection.coordinate.y})
        </p>
        <p>No object at this coordinate.</p>
      </div>
    );
  }
  return (
    <EmptyState
      title="Nothing selected"
      description="Use Inspect on the Canvas or choose a symbol or layer to review its details."
    />
  );
}
