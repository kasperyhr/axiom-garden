import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Info,
  LayoutPanelLeft,
  Palette,
  Panel,
  PanelRight,
  Separator,
  Shapes,
  StatusIndicator,
  Tooltip,
} from "@axiom-garden/ui";
import { Link } from "react-router-dom";

import { GeometricInstrument } from "../components/GeometricInstrument";
import { usePageMetadata } from "../hooks/usePageMetadata";

const tools = [
  { label: "Layout preview", icon: <LayoutPanelLeft /> },
  { label: "Shape language", icon: <Shapes /> },
  { label: "Surface tokens", icon: <Palette /> },
] as const;

function InspectorContent() {
  return (
    <div className="inspector-content">
      <Badge tone="info">Preview only</Badge>
      <h2>Inspector placeholder</h2>
      <p>
        This region proves the future information-panel layout. It does not inspect, edit, or retain
        any product data.
      </p>
      <p>
        <Link className="app-inline-link" to="/world-format">
          Review World Document v1
        </Link>
      </p>
      <p>
        <Link className="app-inline-link" to="/engine">
          Open Engine Playground
        </Link>
      </p>
      <p>
        <Link className="app-inline-link" to="/viewer">
          Open World Viewer
        </Link>
      </p>
      <Separator />
      <dl>
        <div>
          <dt>Surface</dt>
          <dd>Elevated</dd>
        </div>
        <div>
          <dt>Width token</dt>
          <dd>19rem</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>Read-only</dd>
        </div>
      </dl>
    </div>
  );
}

export default function WorkspacePage() {
  usePageMetadata("Workspace", "A static preview of the Axiom Garden application shell.");

  return (
    <div className="workspace-page">
      <div className="workspace-page__intro">
        <div>
          <p className="eyebrow">Layout validation</p>
          <h1>Workspace shell preview</h1>
          <p>
            A responsive shell with a lightweight read-only renderer preview. Editing, rules, and
            world modification remain unavailable.
          </p>
          <p className="workspace-page__links">
            <Link className="app-link app-link--primary" to="/viewer">
              Open interactive World Viewer
            </Link>
            <Link className="app-link app-link--secondary" to="/engine">
              Open Engine Playground
            </Link>
          </p>
        </div>
        <Dialog
          trigger={
            <Button
              className="mobile-inspector-trigger"
              variant="secondary"
              leadingIcon={<PanelRight />}
            >
              Open inspector
            </Button>
          }
          title="Inspector preview"
          description="A read-only mobile layout sample."
        >
          <InspectorContent />
        </Dialog>
      </div>

      <section className="workspace-shell" aria-label="Static workspace layout">
        <aside className="tool-rail" aria-label="Preview tools">
          {tools.map((tool) => (
            <Tooltip content={tool.label} key={tool.label}>
              <IconButton aria-label={tool.label} icon={tool.icon} variant="ghost" />
            </Tooltip>
          ))}
        </aside>

        <Panel className="canvas-placeholder">
          <div className="canvas-placeholder__heading">
            <div>
              <p className="eyebrow">Central region</p>
              <h2>Read-only viewer preview</h2>
            </div>
            <Badge>Static</Badge>
          </div>
          <div aria-hidden="true" className="workspace-renderer-preview">
            <GeometricInstrument />
          </div>
          <p className="canvas-placeholder__note">Renderer available · Editing unavailable</p>
        </Panel>

        <Panel className="desktop-inspector">
          <InspectorContent />
        </Panel>

        <footer className="workspace-status">
          <StatusIndicator status="idle" label="Static shell" />
          <span>No world document loaded</span>
          <span>Format: axiom-garden/world v1</span>
          <span>Engine core available · No rule system</span>
          <span>Renderer available · Editing unavailable</span>
          <span className="workspace-status__readonly">
            <Info aria-hidden="true" />
            Read-only preview
          </span>
        </footer>
      </section>
    </div>
  );
}
