import type { LayerV1, WorldDocumentV1 } from "@axiom-garden/domain";
import { Button, Dialog, Eye, EyeOff, LockKeyhole, Pencil, Plus, Trash2 } from "@axiom-garden/ui";
import { useState } from "react";

const EMPTY_LAYER: LayerV1 = {
  id: "layer:new-layer" as LayerV1["id"],
  name: "New layer",
  order: 30,
  visible: true,
  locked: false,
};

function LayerForm({
  allowIdEdit = false,
  initial,
  onSubmit,
  submitLabel,
}: {
  readonly allowIdEdit?: boolean;
  readonly initial: LayerV1;
  readonly onSubmit: (layer: LayerV1) => void;
  readonly submitLabel: string;
}) {
  const [draft, setDraft] = useState<LayerV1>({ ...initial });
  return (
    <form
      className="editor-form editor-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <label>
        <span>ID</span>
        <input
          value={draft.id}
          readOnly={!allowIdEdit}
          onChange={(event) => setDraft({ ...draft, id: event.target.value as LayerV1["id"] })}
        />
      </label>
      <label>
        <span>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        <span>Order</span>
        <input
          type="number"
          min={0}
          value={draft.order}
          onChange={(event) => setDraft({ ...draft, order: event.currentTarget.valueAsNumber })}
        />
      </label>
      <label className="editor-form__checkbox">
        <input
          type="checkbox"
          checked={draft.visible}
          onChange={(event) => setDraft({ ...draft, visible: event.target.checked })}
        />
        <span>Visible in the document</span>
      </label>
      <label className="editor-form__checkbox">
        <input
          type="checkbox"
          checked={draft.locked}
          onChange={(event) => setDraft({ ...draft, locked: event.target.checked })}
        />
        <span>Lock layer contents</span>
      </label>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

export function EditorLayerPanel({
  activeLayerId,
  document,
  onAdd,
  onDelete,
  onEdit,
  onSelect,
}: {
  readonly activeLayerId: LayerV1["id"];
  readonly document: WorldDocumentV1;
  readonly onSelect: (layerId: LayerV1["id"]) => void;
  readonly onAdd: (layer: LayerV1) => void;
  readonly onEdit: (layer: LayerV1) => void;
  readonly onDelete: (layerId: LayerV1["id"]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LayerV1 | null>(null);
  const [deleting, setDeleting] = useState<LayerV1 | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <section className="editor-layers" aria-labelledby="editor-layers-heading">
      <div className="editor-panel-heading">
        <div>
          <h2 id="editor-layers-heading">Layers</h2>
          <p>Document visibility and content locks are undoable.</p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger={
            <Button size="small" variant="secondary" leadingIcon={<Plus />}>
              New
            </Button>
          }
          title="Create layer"
          description="Layer order must be unique and content locks prevent edits."
        >
          <LayerForm
            allowIdEdit
            key={`new-layer-${document.layers.length}`}
            initial={{
              ...EMPTY_LAYER,
              order: Math.max(...document.layers.map((layer) => layer.order)) + 10,
            }}
            submitLabel="Create layer"
            onSubmit={(layer) => {
              onAdd(layer);
              setAddOpen(false);
            }}
          />
        </Dialog>
      </div>
      <ul className="editor-layer-list">
        {document.layers.map((layer) => {
          const entityCount = document.entities.filter(
            (entity) => entity.layerId === layer.id,
          ).length;
          const cellCount = document.cells.filter((cell) => cell.layerId === layer.id).length;
          return (
            <li
              className={
                activeLayerId === layer.id
                  ? "editor-layer-row editor-layer-row--active"
                  : "editor-layer-row"
              }
              key={layer.id}
            >
              <button
                type="button"
                className="editor-layer-choice"
                aria-pressed={activeLayerId === layer.id}
                onClick={() => onSelect(layer.id)}
              >
                {layer.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                <span>
                  <strong>{layer.name}</strong>
                  <small>
                    Order {layer.order} · {entityCount} entities · {cellCount} cells
                  </small>
                </span>
                {layer.locked ? <LockKeyhole aria-label="Locked" /> : null}
              </button>
              <Button
                size="small"
                variant="ghost"
                leadingIcon={<Pencil />}
                onClick={() => {
                  setEditing(layer);
                  setEditOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="danger"
                leadingIcon={<Trash2 />}
                onClick={() => {
                  setDeleting(layer);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </Button>
            </li>
          );
        })}
      </ul>
      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit layer"
        description="Unlocking a layer is allowed; locked layers reject content changes."
      >
        {editing ? (
          <LayerForm
            key={JSON.stringify(editing)}
            initial={editing}
            submitLabel="Apply layer changes"
            onSubmit={(layer) => {
              onEdit(layer);
              setEditOpen(false);
            }}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete layer?"
        description="Only an empty layer can be removed, and one layer must always remain."
      >
        <div className="editor-confirmation">
          <p>
            {deleting
              ? `Delete ${deleting.name} from this in-memory document?`
              : "No layer selected."}
          </p>
          <Button
            variant="danger"
            disabled={!deleting}
            onClick={() => {
              if (deleting) onDelete(deleting.id);
              setDeleteOpen(false);
            }}
          >
            Confirm delete
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
