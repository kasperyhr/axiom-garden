import {
  clampViewport,
  createRenderSceneFromSimulationState,
  createViewport,
  DARK_RENDERER_THEME,
  fitGridToViewport,
  LIGHT_RENDERER_THEME,
  zoomViewportAt,
  type HitResult,
  type LayerVisibilityOverrides,
  type Point,
  type ViewportState,
} from "@axiom-garden/renderer";
import {
  Badge,
  Button,
  Callout,
  Dialog,
  Grid3X3,
  Hand,
  Layers3,
  Maximize,
  MousePointer2,
  PanelRight,
  RotateCcw,
  StatusIndicator,
  ZoomIn,
  ZoomOut,
  useTheme,
} from "@axiom-garden/ui";
import { useMemo, useState } from "react";

import { ViewerInspector } from "../features/viewer/ViewerInspector";
import { ViewerLayerPanel } from "../features/viewer/ViewerLayerPanel";
import { ViewerSummary } from "../features/viewer/ViewerSummary";
import { WorldCanvas } from "../features/viewer/WorldCanvas";
import { createViewerStates } from "../features/viewer/viewerData";
import { usePageMetadata } from "../hooks/usePageMetadata";

const VIEWER_STATES = createViewerStates();

function fit(viewport: ViewportState, width: number, height: number): ViewportState {
  return fitGridToViewport(
    createViewport({ ...viewport, viewportWidth: width, viewportHeight: height }),
    { kind: "square", origin: "top-left", boundary: "bounded", width: 12, height: 8 },
  );
}

export default function WorldViewerPage() {
  usePageMetadata("World viewer", "A read-only Canvas view of an Axiom Garden world state.");
  const { resolvedTheme } = useTheme();
  const [stateKind, setStateKind] = useState<"initial" | "demonstration">("initial");
  const state = stateKind === "initial" ? VIEWER_STATES.initial : VIEWER_STATES.demonstration;
  const scene = useMemo(() => createRenderSceneFromSimulationState(state), [state]);
  const [viewport, setViewport] = useState(() => fit(createViewport(), 800, 600));
  const [mode, setMode] = useState<"inspect" | "pan">("inspect");
  const [visibility, setVisibility] = useState<LayerVisibilityOverrides>({});
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [selected, setSelected] = useState<HitResult | null>(null);
  const [hovered, setHovered] = useState<HitResult | null>(null);
  const [keyboardCoordinate, setKeyboardCoordinate] = useState<Point>({ x: 0, y: 0 });
  const theme = resolvedTheme === "dark" ? DARK_RENDERER_THEME : LIGHT_RENDERER_THEME;

  const setLayerVisibility = (layerId: string, visible: boolean) => {
    setVisibility((current) => ({ ...current, [layerId]: visible }));
    if (selected?.layerId === layerId && !visible) setSelected(null);
  };
  const fitView = () => setViewport((current) => fitGridToViewport(current, scene.grid));
  const zoom = (multiplier: number) =>
    setViewport((current) =>
      clampViewport(
        zoomViewportAt(current, current.zoom * multiplier, {
          x: current.viewportWidth / 2,
          y: current.viewportHeight / 2,
        }),
        scene.grid,
      ),
    );

  const layerPanel = (
    <ViewerLayerPanel
      scene={scene}
      visibility={visibility}
      onReset={() => setVisibility({})}
      onVisibilityChange={setLayerVisibility}
    />
  );
  const inspector = <ViewerInspector scene={scene} selected={selected} visibility={visibility} />;
  const selectionAnnouncement = selected
    ? selected.kind === "entity"
      ? `Selected entity ${selected.entityId} at ${selected.worldCoordinate.x}, ${selected.worldCoordinate.y}`
      : selected.kind === "cell"
        ? `Selected cell ${selected.cellId} at ${selected.worldCoordinate.x}, ${selected.worldCoordinate.y}`
        : `Selected empty coordinate ${selected.worldCoordinate.x}, ${selected.worldCoordinate.y}`
    : "Nothing selected";

  return (
    <div className="viewer-page">
      <header className="viewer-page__header">
        <div>
          <h1>World Viewer</h1>
          <p>Inspect a bounded world state without modifying its document or simulation.</p>
        </div>
        <Badge tone="success">Read-only renderer</Badge>
      </header>

      <Callout title="Observation boundary" tone="info">
        Canvas interaction changes only the local view and selection. Editing, rules, playback,
        persistence, and automatic transitions are unavailable.
      </Callout>

      <section className="viewer-toolbar" aria-label="Viewer controls">
        <div className="viewer-toolbar__group" aria-label="Interaction mode">
          <Button
            size="small"
            variant={mode === "inspect" ? "primary" : "secondary"}
            aria-pressed={mode === "inspect"}
            leadingIcon={<MousePointer2 />}
            onClick={() => setMode("inspect")}
          >
            Inspect
          </Button>
          <Button
            size="small"
            variant={mode === "pan" ? "primary" : "secondary"}
            aria-pressed={mode === "pan"}
            leadingIcon={<Hand />}
            onClick={() => setMode("pan")}
          >
            Pan
          </Button>
        </div>
        <div className="viewer-toolbar__group" aria-label="Viewport">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<ZoomIn />}
            onClick={() => zoom(1.2)}
          >
            Zoom in
          </Button>
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<ZoomOut />}
            onClick={() => zoom(1 / 1.2)}
          >
            Zoom out
          </Button>
          <Button size="small" variant="secondary" leadingIcon={<Maximize />} onClick={fitView}>
            Fit
          </Button>
          <Button
            size="small"
            variant="ghost"
            leadingIcon={<RotateCcw />}
            onClick={() => {
              setViewport((current) =>
                fitGridToViewport(
                  createViewport({
                    viewportWidth: current.viewportWidth,
                    viewportHeight: current.viewportHeight,
                    devicePixelRatio: current.devicePixelRatio,
                  }),
                  scene.grid,
                ),
              );
              setVisibility({});
              setSelected(null);
            }}
          >
            Reset view
          </Button>
        </div>
        <div className="viewer-toolbar__group" aria-label="Display">
          <Button
            size="small"
            variant={showGrid ? "secondary" : "ghost"}
            aria-pressed={showGrid}
            leadingIcon={<Grid3X3 />}
            onClick={() => setShowGrid((value) => !value)}
          >
            Grid
          </Button>
          <Button
            size="small"
            variant={showCoordinates ? "secondary" : "ghost"}
            aria-pressed={showCoordinates}
            leadingIcon={<Grid3X3 />}
            onClick={() => setShowCoordinates((value) => !value)}
          >
            Coordinates
          </Button>
        </div>
        <div className="viewer-toolbar__group viewer-state-toggle" aria-label="Built-in state">
          <Button
            size="small"
            variant={stateKind === "initial" ? "primary" : "ghost"}
            aria-pressed={stateKind === "initial"}
            onClick={() => {
              setStateKind("initial");
              setSelected(null);
            }}
          >
            Initial state
          </Button>
          <Button
            size="small"
            variant={stateKind === "demonstration" ? "primary" : "ghost"}
            aria-pressed={stateKind === "demonstration"}
            onClick={() => {
              setStateKind("demonstration");
              setSelected(null);
            }}
          >
            Demonstration state
          </Button>
        </div>
      </section>

      <p className="viewer-canvas-help" id="viewer-canvas-help">
        Arrow keys move the observation coordinate. Enter or Space selects. Escape clears. Plus and
        minus zoom. Zero fits. Hold Space while dragging to pan.
      </p>

      <div className="viewer-mobile-panel-triggers">
        <Dialog
          trigger={
            <Button variant="secondary" leadingIcon={<Layers3 />}>
              Layers
            </Button>
          }
          title="Viewer layers"
          description="Temporary read-only visibility controls."
        >
          {layerPanel}
        </Dialog>
        <Dialog
          trigger={
            <Button variant="secondary" leadingIcon={<PanelRight />}>
              Inspector
            </Button>
          }
          title="Viewer inspector"
          description="Details for the current read-only selection."
        >
          {inspector}
        </Dialog>
      </div>

      <section className="viewer-workspace" aria-label="Read-only world viewer">
        <div className="viewer-canvas-frame">
          <WorldCanvas
            scene={scene}
            viewport={viewport}
            onViewportChange={setViewport}
            mode={mode}
            visibility={visibility}
            showGrid={showGrid}
            showCoordinates={showCoordinates}
            selected={selected}
            onSelectedChange={setSelected}
            hovered={hovered}
            onHoveredChange={setHovered}
            keyboardCoordinate={keyboardCoordinate}
            onKeyboardCoordinateChange={setKeyboardCoordinate}
            theme={theme}
          />
        </div>
        <aside className="viewer-side-panel" aria-label="Scene layers and inspector">
          <section className="viewer-side-panel__section">{layerPanel}</section>
          <section className="viewer-side-panel__section">{inspector}</section>
        </aside>
        <footer className="viewer-status">
          <StatusIndicator status="healthy" label="Renderer ready" />
          <span>
            Tick <strong data-testid="viewer-tick">{scene.tick}</strong>
          </span>
          <span>
            Digest <code data-testid="viewer-digest">{scene.stateDigest}</code>
          </span>
          <span>Zoom {Math.round(viewport.zoom * 100)}%</span>
          <span>
            Focus ({keyboardCoordinate.x}, {keyboardCoordinate.y})
          </span>
          <span>Renderer available · Editing unavailable</span>
        </footer>
      </section>

      <span
        className="ag-visually-hidden"
        id="viewer-live-selection"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectionAnnouncement}
      </span>
      <ViewerSummary
        focusCoordinate={keyboardCoordinate}
        scene={scene}
        selected={selected}
        visibility={visibility}
        zoom={viewport.zoom}
      />
    </div>
  );
}
