import {
  DRAG_THRESHOLD_PX,
  clampViewport,
  createDrawCommands,
  createViewport,
  drawCommands,
  fitGridToViewport,
  hitTestScene,
  panViewport,
  prepareCanvasBackingStore,
  screenToWorld,
  worldToScreen,
  zoomViewportAt,
  zoomViewportFromPinch,
  type HitResult,
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

import { useRenderScheduler } from "../viewer/useRenderScheduler";

interface EditorCanvasProps {
  readonly scene: RenderScene;
  readonly viewport: ViewportState;
  readonly onViewportChange: (viewport: ViewportState) => void;
  readonly tool: "inspect" | "pan" | "placeEntity" | "placeCell";
  readonly selected: HitResult | null;
  readonly onActivate: (hit: HitResult) => void;
  readonly onMoveEntity: (entityId: string, coordinate: Point) => void;
  readonly onDragPreview: (
    preview: { readonly entityId: string; readonly coordinate: Point } | null,
  ) => void;
  readonly onDeleteSelection: () => void;
  readonly theme: RendererTheme;
}

interface ActivePointer {
  readonly start: Point;
  readonly panRequested: boolean;
  readonly entityId: string | null;
  last: Point;
  dragged: boolean;
}

function localPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function inBounds(coordinate: Point, scene: RenderScene): boolean {
  return (
    coordinate.x >= 0 &&
    coordinate.y >= 0 &&
    coordinate.x < scene.grid.width &&
    coordinate.y < scene.grid.height
  );
}

export function EditorCanvas({
  onActivate,
  onDeleteSelection,
  onDragPreview,
  onMoveEntity,
  onViewportChange,
  scene,
  selected,
  theme,
  tool,
  viewport,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef(viewport);
  const pointersRef = useRef(new Map<number, ActivePointer>());
  const fittedRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const [keyboardCoordinate, setKeyboardCoordinate] = useState<Point>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<HitResult | null>(null);
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
        showGrid: true,
        showCoordinates: false,
        hoveredCoordinate: hovered?.worldCoordinate ?? null,
        selectedCoordinate: selected?.worldCoordinate ?? null,
        ...(selected ? { selectedKind: selected.kind } : {}),
        keyboardCoordinate: hasKeyboardFocus ? keyboardCoordinate : null,
      }),
    );
  }, [hasKeyboardFocus, hovered, keyboardCoordinate, scene, selected, theme, viewport]);
  useRenderScheduler(draw);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = createViewport({
        ...viewportRef.current,
        viewportWidth: Math.max(64, entry.contentRect.width),
        viewportHeight: Math.max(64, entry.contentRect.height),
        devicePixelRatio: window.devicePixelRatio,
      });
      updateViewport(fittedRef.current ? next : fitGridToViewport(next, scene.grid));
      fittedRef.current = true;
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [scene.grid, updateViewport]);

  const hitAt = useCallback(
    (point: Point) => hitTestScene(scene, viewportRef.current, point),
    [scene],
  );

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    const hit = hitAt(point);
    const movableEntity =
      tool === "inspect" &&
      hit?.kind === "entity" &&
      selected?.kind === "entity" &&
      hit.entityId === selected.entityId
        ? (hit.entityId ?? null)
        : null;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      start: point,
      last: point,
      dragged: false,
      panRequested:
        tool === "pan" ||
        event.button === 1 ||
        spaceHeldRef.current ||
        (event.pointerType === "touch" && movableEntity === null),
      entityId: movableEntity,
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    const active = pointersRef.current.get(event.pointerId);
    if (!active) {
      if (event.pointerType === "mouse") setHovered(hitAt(point));
      return;
    }
    const previous = active.last;
    active.last = point;
    if (Math.hypot(point.x - active.start.x, point.y - active.start.y) >= DRAG_THRESHOLD_PX) {
      active.dragged = true;
    }
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 2) {
      const [first, second] = pointers;
      if (!first || !second) return;
      const previousFirst =
        event.pointerId === [...pointersRef.current.keys()][0] ? previous : first.last;
      const previousSecond =
        event.pointerId === [...pointersRef.current.keys()][0] ? second.last : previous;
      updateViewport(
        clampViewport(
          zoomViewportFromPinch(
            viewportRef.current,
            previousFirst,
            previousSecond,
            first.last,
            second.last,
          ),
          scene.grid,
        ),
      );
      first.dragged = true;
      second.dragged = true;
      event.preventDefault();
      return;
    }
    if (!active.dragged) return;
    if (active.entityId) {
      const coordinate = screenToWorld(point, viewportRef.current);
      onDragPreview(inBounds(coordinate, scene) ? { entityId: active.entityId, coordinate } : null);
      event.preventDefault();
      return;
    }
    if (active.panRequested || spaceHeldRef.current) {
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
    if (!active) return;
    if (active.dragged && active.entityId) {
      const coordinate = screenToWorld(point, viewportRef.current);
      onDragPreview(null);
      if (inBounds(coordinate, scene)) onMoveEntity(active.entityId, coordinate);
      return;
    }
    if (!active.dragged) {
      const hit = hitAt(point);
      if (hit) onActivate(hit);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const anchor = localPoint(event.currentTarget, event.clientX, event.clientY);
    updateViewport(
      clampViewport(
        zoomViewportAt(
          viewportRef.current,
          viewportRef.current.zoom * (event.deltaY > 0 ? 0.9 : 1.1),
          anchor,
        ),
        scene.grid,
      ),
    );
  };

  const activateKeyboardCoordinate = () => {
    const topLeft = worldToScreen(keyboardCoordinate, viewportRef.current);
    const size = viewportRef.current.cellSize * viewportRef.current.zoom;
    const hit = hitAt({ x: topLeft.x + size / 2, y: topLeft.y + size / 2 });
    if (hit) onActivate(hit);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") spaceHeldRef.current = true;
    if (event.key === "Escape") {
      onDragPreview(null);
      event.preventDefault();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      onDeleteSelection();
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      activateKeyboardCoordinate();
      event.preventDefault();
      return;
    }
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      updateViewport(
        zoomViewportAt(
          viewportRef.current,
          viewportRef.current.zoom * (event.key === "-" ? 0.85 : 1.15),
          {
            x: viewportRef.current.viewportWidth / 2,
            y: viewportRef.current.viewportHeight / 2,
          },
        ),
      );
      event.preventDefault();
      return;
    }
    if (event.key === "0") {
      updateViewport(fitGridToViewport(viewportRef.current, scene.grid));
      event.preventDefault();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      setKeyboardCoordinate(
        event.key === "Home"
          ? { x: 0, y: 0 }
          : { x: scene.grid.width - 1, y: scene.grid.height - 1 },
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
    const delta = deltas[event.key];
    if (!delta) return;
    setKeyboardCoordinate((current) => ({
      x: Math.min(scene.grid.width - 1, Math.max(0, current.x + delta.x)),
      y: Math.min(scene.grid.height - 1, Math.max(0, current.y + delta.y)),
    }));
    event.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`world-canvas editor-canvas editor-canvas--${tool}`}
      aria-label={`Editable grid for ${scene.title}`}
      aria-describedby="editor-canvas-help editor-live-region"
      data-testid="editor-canvas"
      data-offset-x={viewport.offsetX}
      data-offset-y={viewport.offsetY}
      data-zoom={viewport.zoom}
      onBlur={() => setHasKeyboardFocus(false)}
      onFocus={() => setHasKeyboardFocus(true)}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => {
        if (event.key === " ") spaceHeldRef.current = false;
      }}
      onPointerCancel={(event) => {
        pointersRef.current.delete(event.pointerId);
        onDragPreview(null);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={() => setHovered(null)}
      onPointerUp={finishPointer}
      onWheel={handleWheel}
      tabIndex={0}
    />
  );
}
