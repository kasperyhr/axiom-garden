import {
  clampViewport,
  createDrawCommands,
  createViewport,
  drawCommands,
  DRAG_THRESHOLD_PX,
  fitGridToViewport,
  hitTestScene,
  panViewport,
  prepareCanvasBackingStore,
  worldToScreen,
  zoomViewportAt,
  zoomViewportFromPinch,
  type HitResult,
  type LayerVisibilityOverrides,
  type Point,
  type RenderScene,
  type RendererTheme,
  type ViewportState,
} from "@axiom-garden/renderer";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { useRenderScheduler } from "./useRenderScheduler";

interface WorldCanvasProps {
  readonly scene: RenderScene;
  readonly viewport: ViewportState;
  readonly onViewportChange: (viewport: ViewportState) => void;
  readonly mode: "inspect" | "pan";
  readonly visibility: LayerVisibilityOverrides;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly selected: HitResult | null;
  readonly onSelectedChange: (hit: HitResult | null) => void;
  readonly hovered: HitResult | null;
  readonly onHoveredChange: (hit: HitResult | null) => void;
  readonly keyboardCoordinate: Point;
  readonly onKeyboardCoordinateChange: (coordinate: Point) => void;
  readonly theme: RendererTheme;
  readonly onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

interface ActivePointer {
  readonly start: Point;
  readonly panRequested: boolean;
  readonly selectOnTap: boolean;
  last: Point;
  dragged: boolean;
}

function localPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export function WorldCanvas({
  hovered,
  keyboardCoordinate,
  mode,
  onCanvasReady,
  onHoveredChange,
  onKeyboardCoordinateChange,
  onSelectedChange,
  onViewportChange,
  scene,
  selected,
  showCoordinates,
  showGrid,
  theme,
  viewport,
  visibility,
}: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef(viewport);
  const pointersRef = useRef(new Map<number, ActivePointer>());
  const fittedRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const renderCountRef = useRef(0);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const updateViewport = useCallback(
    (next: ViewportState) => {
      viewportRef.current = next;
      onViewportChange(next);
    },
    [onViewportChange],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    prepareCanvasBackingStore(canvas, context, viewport);
    drawCommands(
      context,
      createDrawCommands(scene, viewport, theme, {
        layerVisibility: visibility,
        showGrid,
        showCoordinates,
        hoveredCoordinate: hovered?.worldCoordinate ?? null,
        selectedCoordinate: selected?.worldCoordinate ?? null,
        ...(selected ? { selectedKind: selected.kind } : {}),
        keyboardCoordinate: hasKeyboardFocus ? keyboardCoordinate : null,
      }),
    );
    renderCountRef.current += 1;
    canvas.dataset.renderCount = String(renderCountRef.current);
  }, [
    hovered,
    hasKeyboardFocus,
    keyboardCoordinate,
    scene,
    selected,
    showCoordinates,
    showGrid,
    theme,
    viewport,
    visibility,
  ]);
  useRenderScheduler(draw);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCanvasReady?.(canvas);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = createViewport({
        ...viewportRef.current,
        viewportWidth: Math.max(64, entry.contentRect.width),
        viewportHeight: Math.max(64, entry.contentRect.height),
        devicePixelRatio: window.devicePixelRatio,
      });
      const resolved = fittedRef.current ? next : fitGridToViewport(next, scene.grid);
      fittedRef.current = true;
      updateViewport(resolved);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [onCanvasReady, scene.grid, updateViewport]);

  const selectAt = useCallback(
    (point: Point) => {
      onSelectedChange(hitTestScene(scene, viewportRef.current, point, visibility));
    },
    [onSelectedChange, scene, visibility],
  );

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      start: point,
      last: point,
      dragged: false,
      panRequested:
        mode === "pan" ||
        event.pointerType === "touch" ||
        event.button === 1 ||
        spaceHeldRef.current,
      selectOnTap: event.button !== 1,
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const point = localPoint(canvas, event.clientX, event.clientY);
    const active = pointersRef.current.get(event.pointerId);
    if (!active) {
      if (event.pointerType === "mouse") {
        onHoveredChange(hitTestScene(scene, viewportRef.current, point, visibility));
      }
      return;
    }
    const previous = active.last;
    active.last = point;
    const distance = Math.hypot(point.x - active.start.x, point.y - active.start.y);
    if (distance >= DRAG_THRESHOLD_PX) active.dragged = true;

    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 2) {
      const [first, second] = pointers;
      if (!first || !second) return;
      const movedFirst = event.pointerId === [...pointersRef.current.keys()][0];
      const previousFirst = movedFirst ? previous : first.last;
      const previousSecond = movedFirst ? second.last : previous;
      const next = zoomViewportFromPinch(
        viewportRef.current,
        previousFirst,
        previousSecond,
        first.last,
        second.last,
      );
      updateViewport(clampViewport(next, scene.grid));
      first.dragged = true;
      second.dragged = true;
      event.preventDefault();
      return;
    }
    const shouldPan = active.panRequested || spaceHeldRef.current;
    if (active.dragged && shouldPan) {
      updateViewport(
        clampViewport(
          panViewport(viewportRef.current, point.x - previous.x, point.y - previous.y),
          scene.grid,
        ),
      );
      event.preventDefault();
    }
  };

  const finishPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = pointersRef.current.get(event.pointerId);
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (active && !active.dragged && active.selectOnTap) selectAt(point);
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const anchor = localPoint(event.currentTarget, event.clientX, event.clientY);
    const multiplier = event.deltaY > 0 ? 0.9 : 1.1;
    updateViewport(
      clampViewport(
        zoomViewportAt(viewportRef.current, viewportRef.current.zoom * multiplier, anchor),
        scene.grid,
      ),
    );
  };

  const chooseKeyboardCoordinate = () => {
    const topLeft = worldToScreen(keyboardCoordinate, viewportRef.current);
    selectAt({
      x: topLeft.x + (viewportRef.current.cellSize * viewportRef.current.zoom) / 2,
      y: topLeft.y + (viewportRef.current.cellSize * viewportRef.current.zoom) / 2,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key;
    if (key === " ") spaceHeldRef.current = true;
    if (key === "Escape") {
      onSelectedChange(null);
      event.preventDefault();
      return;
    }
    if (key === "Enter" || key === " ") {
      chooseKeyboardCoordinate();
      event.preventDefault();
      return;
    }
    if (key === "+" || key === "=" || key === "-") {
      const multiplier = key === "-" ? 0.85 : 1.15;
      updateViewport(
        zoomViewportAt(viewportRef.current, viewportRef.current.zoom * multiplier, {
          x: viewportRef.current.viewportWidth / 2,
          y: viewportRef.current.viewportHeight / 2,
        }),
      );
      event.preventDefault();
      return;
    }
    if (key === "0") {
      updateViewport(fitGridToViewport(viewportRef.current, scene.grid));
      event.preventDefault();
      return;
    }
    if (key === "Home" || key === "End") {
      onKeyboardCoordinateChange(
        key === "Home" ? { x: 0, y: 0 } : { x: scene.grid.width - 1, y: scene.grid.height - 1 },
      );
      event.preventDefault();
      return;
    }
    const deltas: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = deltas[key];
    if (!delta) return;
    if (event.shiftKey) {
      updateViewport(panViewport(viewportRef.current, -delta.x * 96, -delta.y * 96));
    } else {
      onKeyboardCoordinateChange({
        x: Math.min(scene.grid.width - 1, Math.max(0, keyboardCoordinate.x + delta.x)),
        y: Math.min(scene.grid.height - 1, Math.max(0, keyboardCoordinate.y + delta.y)),
      });
    }
    event.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`world-canvas world-canvas--${mode}`}
      aria-label={`Read-only grid for ${scene.title}`}
      aria-describedby="viewer-canvas-help viewer-live-selection"
      data-offset-x={viewport.offsetX}
      data-offset-y={viewport.offsetY}
      data-testid="world-canvas"
      data-zoom={viewport.zoom}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => {
        if (event.key === " ") spaceHeldRef.current = false;
      }}
      onPointerCancel={(event) => {
        pointersRef.current.delete(event.pointerId);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={() => onHoveredChange(null)}
      onPointerUp={finishPointer}
      onWheel={handleWheel}
      onBlur={() => setHasKeyboardFocus(false)}
      onFocus={() => setHasKeyboardFocus(true)}
      tabIndex={0}
    />
  );
}
