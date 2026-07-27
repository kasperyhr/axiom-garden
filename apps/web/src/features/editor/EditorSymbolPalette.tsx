import type { DomainProperties, SymbolDefinitionV1, WorldDocumentV1 } from "@axiom-garden/domain";
import {
  Button,
  Dialog,
  Diamond,
  Palette,
  Pencil,
  Plus,
  Shapes,
  Square,
  Trash2,
} from "@axiom-garden/ui";
import { useState } from "react";

import { PropertiesEditor } from "./PropertiesEditor";

const EMPTY_SYMBOL: SymbolDefinitionV1 = {
  id: "symbol:new-symbol" as SymbolDefinitionV1["id"],
  name: "New symbol",
  shape: "circle",
  appearance: { fill: "moss", stroke: "graphite", variant: "solid" },
  defaultProperties: {},
};

function SymbolForm({
  allowIdEdit = false,
  initial,
  onSubmit,
  submitLabel,
}: {
  readonly allowIdEdit?: boolean;
  readonly initial: SymbolDefinitionV1;
  readonly onSubmit: (symbol: SymbolDefinitionV1) => void;
  readonly submitLabel: string;
}) {
  const [draft, setDraft] = useState<SymbolDefinitionV1>(() => ({
    ...initial,
    appearance: { ...initial.appearance },
    defaultProperties: { ...initial.defaultProperties },
  }));
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
          onChange={(event) =>
            setDraft({ ...draft, id: event.target.value as SymbolDefinitionV1["id"] })
          }
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
        <span>Shape</span>
        <select
          value={draft.shape}
          onChange={(event) =>
            setDraft({ ...draft, shape: event.target.value as SymbolDefinitionV1["shape"] })
          }
        >
          {["circle", "square", "triangle", "diamond", "hexagon"].map((shape) => (
            <option key={shape}>{shape}</option>
          ))}
        </select>
      </label>
      <div className="editor-form__coordinates">
        <label>
          <span>Fill</span>
          <select
            value={draft.appearance.fill}
            onChange={(event) =>
              setDraft({
                ...draft,
                appearance: {
                  ...draft.appearance,
                  fill: event.target.value as SymbolDefinitionV1["appearance"]["fill"],
                },
              })
            }
          >
            {["moss", "clay", "brass", "graphite", "paper", "blue", "amber"].map((color) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Stroke</span>
          <select
            value={draft.appearance.stroke}
            onChange={(event) =>
              setDraft({
                ...draft,
                appearance: {
                  ...draft.appearance,
                  stroke: event.target.value as SymbolDefinitionV1["appearance"]["stroke"],
                },
              })
            }
          >
            {["moss", "clay", "brass", "graphite", "paper", "blue", "amber"].map((color) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>Variant</span>
        <select
          value={draft.appearance.variant}
          onChange={(event) =>
            setDraft({
              ...draft,
              appearance: {
                ...draft.appearance,
                variant: event.target.value as SymbolDefinitionV1["appearance"]["variant"],
              },
            })
          }
        >
          {["solid", "outline", "ring", "dot"].map((variant) => (
            <option key={variant}>{variant}</option>
          ))}
        </select>
      </label>
      <PropertiesEditor
        idPrefix="symbol"
        value={draft.defaultProperties}
        onChange={(defaultProperties: DomainProperties) =>
          setDraft({ ...draft, defaultProperties })
        }
      />
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function SymbolGlyph({ symbol }: { readonly symbol: SymbolDefinitionV1 }) {
  const Icon = symbol.shape === "diamond" ? Diamond : symbol.shape === "square" ? Square : Shapes;
  return (
    <span
      className={`editor-symbol-glyph editor-symbol-glyph--${symbol.appearance.fill}`}
      data-shape={symbol.shape}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}

export function EditorSymbolPalette({
  activeSymbolId,
  document,
  onAdd,
  onDelete,
  onEdit,
  onSelect,
}: {
  readonly activeSymbolId: string;
  readonly document: WorldDocumentV1;
  readonly onSelect: (symbolId: SymbolDefinitionV1["id"]) => void;
  readonly onAdd: (symbol: SymbolDefinitionV1) => void;
  readonly onEdit: (symbol: SymbolDefinitionV1) => void;
  readonly onDelete: (symbolId: SymbolDefinitionV1["id"]) => void;
}) {
  const [editing, setEditing] = useState<SymbolDefinitionV1 | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const active = document.palette.symbols.find((symbol) => symbol.id === activeSymbolId);

  return (
    <section className="editor-palette" aria-labelledby="editor-symbols-heading">
      <div className="editor-panel-heading">
        <div>
          <h2 id="editor-symbols-heading">Symbols</h2>
          <p>Choose the abstract symbol used by Place entity.</p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger={
            <Button size="small" variant="secondary" leadingIcon={<Plus />}>
              New
            </Button>
          }
          title="Create symbol"
          description="Create a safe Domain symbol from the fixed shape and color palettes."
        >
          <SymbolForm
            allowIdEdit
            key={`new-symbol-${document.palette.symbols.length}`}
            initial={EMPTY_SYMBOL}
            submitLabel="Create symbol"
            onSubmit={(symbol) => {
              onAdd(symbol);
              setAddOpen(false);
            }}
          />
        </Dialog>
      </div>
      <div className="editor-symbol-list" role="list">
        {document.palette.symbols.map((symbol) => (
          <div className="editor-symbol-row" key={symbol.id} role="listitem">
            <button
              className="editor-symbol-choice"
              type="button"
              aria-pressed={activeSymbolId === symbol.id}
              onClick={() => onSelect(symbol.id)}
            >
              <SymbolGlyph symbol={symbol} />
              <span>
                <strong>{symbol.name}</strong>
                <small>
                  {symbol.shape} · {symbol.appearance.variant}
                </small>
              </span>
            </button>
            <Button
              aria-label={`Edit symbol ${symbol.name}`}
              size="small"
              variant="ghost"
              leadingIcon={<Pencil />}
              onClick={() => {
                setEditing(symbol);
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
          </div>
        ))}
      </div>
      <div className="editor-palette__actions">
        <Button
          size="small"
          variant="danger"
          leadingIcon={<Trash2 />}
          disabled={!active}
          onClick={() => setDeleteOpen(true)}
        >
          Delete active symbol
        </Button>
      </div>
      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit symbol"
        description="Changes update every Entity that references this symbol."
      >
        {editing ? (
          <SymbolForm
            key={JSON.stringify(editing)}
            initial={editing}
            submitLabel="Apply symbol changes"
            onSubmit={(symbol) => {
              onEdit(symbol);
              setEditOpen(false);
            }}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete active symbol?"
        description="Deletion is rejected while any Entity still references this symbol."
      >
        <div className="editor-confirmation">
          <p>
            {active ? `Delete ${active.name} from this in-memory document?` : "No symbol selected."}
          </p>
          <Button
            variant="danger"
            disabled={!active}
            onClick={() => {
              if (active) onDelete(active.id);
              setDeleteOpen(false);
            }}
          >
            Confirm delete
          </Button>
        </div>
      </Dialog>
      <p className="editor-panel-note">
        <Palette aria-hidden="true" /> Active: {active?.name ?? "None"}
      </p>
    </section>
  );
}
