import {
  DEFAULT_CELL_SIZE,
  FIT_PADDING,
  MAX_BACKING_STORE_PIXELS,
  MAX_DEVICE_PIXEL_RATIO,
  MAX_ZOOM,
  MIN_CANVAS_SIZE,
  MIN_ZOOM,
} from "../limits/constants";
import type { Point, Rect, RenderGrid } from "../scene/types";

export interface ViewportState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly cellSize: number;
  readonly devicePixelRatio: number;
}

const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function createViewport(input: Partial<ViewportState> = {}): ViewportState {
  return {
    offsetX: finite(input.offsetX ?? 0, 0),
    offsetY: finite(input.offsetY ?? 0, 0),
    zoom: clamp(finite(input.zoom ?? 1, 1), MIN_ZOOM, MAX_ZOOM),
    viewportWidth: Math.max(MIN_CANVAS_SIZE, finite(input.viewportWidth ?? 800, 800)),
    viewportHeight: Math.max(MIN_CANVAS_SIZE, finite(input.viewportHeight ?? 600, 600)),
    cellSize: Math.max(1, finite(input.cellSize ?? DEFAULT_CELL_SIZE, DEFAULT_CELL_SIZE)),
    devicePixelRatio: clamp(finite(input.devicePixelRatio ?? 1, 1), 1, MAX_DEVICE_PIXEL_RATIO),
  };
}

export function worldToScene(coordinate: Point, cellSize = DEFAULT_CELL_SIZE): Point {
  return { x: coordinate.x * cellSize, y: coordinate.y * cellSize };
}

export function sceneToWorld(point: Point, cellSize = DEFAULT_CELL_SIZE): Point {
  return { x: Math.floor(point.x / cellSize), y: Math.floor(point.y / cellSize) };
}

export function sceneToScreen(point: Point, viewport: ViewportState): Point {
  return {
    x: viewport.offsetX + point.x * viewport.zoom,
    y: viewport.offsetY + point.y * viewport.zoom,
  };
}

export function screenToScene(point: Point, viewport: ViewportState): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.zoom,
    y: (point.y - viewport.offsetY) / viewport.zoom,
  };
}

export function worldToScreen(coordinate: Point, viewport: ViewportState): Point {
  return sceneToScreen(worldToScene(coordinate, viewport.cellSize), viewport);
}

export function screenToWorld(point: Point, viewport: ViewportState): Point {
  return sceneToWorld(screenToScene(point, viewport), viewport.cellSize);
}

export function panViewport(
  viewport: ViewportState,
  deltaX: number,
  deltaY: number,
): ViewportState {
  return createViewport({
    ...viewport,
    offsetX: viewport.offsetX + finite(deltaX, 0),
    offsetY: viewport.offsetY + finite(deltaY, 0),
  });
}

export function zoomViewportAt(
  viewport: ViewportState,
  nextZoom: number,
  anchor: Point,
): ViewportState {
  const zoom = clamp(finite(nextZoom, viewport.zoom), MIN_ZOOM, MAX_ZOOM);
  const sceneAnchor = screenToScene(anchor, viewport);
  return createViewport({
    ...viewport,
    zoom,
    offsetX: anchor.x - sceneAnchor.x * zoom,
    offsetY: anchor.y - sceneAnchor.y * zoom,
  });
}

export function zoomViewportFromPinch(
  viewport: ViewportState,
  previousA: Point,
  previousB: Point,
  nextA: Point,
  nextB: Point,
): ViewportState {
  const previousDistance = Math.hypot(previousB.x - previousA.x, previousB.y - previousA.y);
  const nextDistance = Math.hypot(nextB.x - nextA.x, nextB.y - nextA.y);
  if (
    !Number.isFinite(previousDistance) ||
    !Number.isFinite(nextDistance) ||
    previousDistance <= 0 ||
    nextDistance <= 0
  ) {
    return createViewport(viewport);
  }

  const previousCenter = {
    x: (previousA.x + previousB.x) / 2,
    y: (previousA.y + previousB.y) / 2,
  };
  const nextCenter = {
    x: (nextA.x + nextB.x) / 2,
    y: (nextA.y + nextB.y) / 2,
  };
  const anchored = zoomViewportAt(
    viewport,
    viewport.zoom * (nextDistance / previousDistance),
    previousCenter,
  );
  return panViewport(anchored, nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y);
}

export function fitGridToViewport(
  viewport: ViewportState,
  grid: RenderGrid,
  padding = FIT_PADDING,
): ViewportState {
  const safePadding = Math.max(0, finite(padding, FIT_PADDING));
  const availableWidth = Math.max(1, viewport.viewportWidth - safePadding * 2);
  const availableHeight = Math.max(1, viewport.viewportHeight - safePadding * 2);
  const sceneWidth = grid.width * viewport.cellSize;
  const sceneHeight = grid.height * viewport.cellSize;
  const zoom = clamp(
    Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  return createViewport({
    ...viewport,
    zoom,
    offsetX: (viewport.viewportWidth - sceneWidth * zoom) / 2,
    offsetY: (viewport.viewportHeight - sceneHeight * zoom) / 2,
  });
}

export function centerCoordinate(viewport: ViewportState, coordinate: Point): ViewportState {
  const center = {
    x: (coordinate.x + 0.5) * viewport.cellSize,
    y: (coordinate.y + 0.5) * viewport.cellSize,
  };
  return createViewport({
    ...viewport,
    offsetX: viewport.viewportWidth / 2 - center.x * viewport.zoom,
    offsetY: viewport.viewportHeight / 2 - center.y * viewport.zoom,
  });
}

export function clampViewport(viewport: ViewportState, grid: RenderGrid): ViewportState {
  const sceneWidth = grid.width * viewport.cellSize * viewport.zoom;
  const sceneHeight = grid.height * viewport.cellSize * viewport.zoom;
  const margin = Math.min(64, viewport.cellSize * viewport.zoom);
  const minX = Math.min(margin, viewport.viewportWidth - sceneWidth - margin);
  const maxX = Math.max(viewport.viewportWidth - margin, margin - sceneWidth);
  const minY = Math.min(margin, viewport.viewportHeight - sceneHeight - margin);
  const maxY = Math.max(viewport.viewportHeight - margin, margin - sceneHeight);
  return createViewport({
    ...viewport,
    offsetX: clamp(viewport.offsetX, minX, maxX),
    offsetY: clamp(viewport.offsetY, minY, maxY),
  });
}

export function getVisibleWorldBounds(viewport: ViewportState, grid: RenderGrid): Rect {
  const topLeft = screenToScene({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToScene(
    { x: viewport.viewportWidth, y: viewport.viewportHeight },
    viewport,
  );
  const startX = clamp(Math.floor(topLeft.x / viewport.cellSize) - 1, 0, grid.width);
  const startY = clamp(Math.floor(topLeft.y / viewport.cellSize) - 1, 0, grid.height);
  const endX = clamp(Math.ceil(bottomRight.x / viewport.cellSize) + 1, 0, grid.width);
  const endY = clamp(Math.ceil(bottomRight.y / viewport.cellSize) + 1, 0, grid.height);
  return { x: startX, y: startY, width: endX - startX, height: endY - startY };
}

export interface BackingStoreSize {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

export function getCanvasBackingStore(viewport: ViewportState): BackingStoreSize {
  const requestedPixels =
    viewport.viewportWidth * viewport.viewportHeight * viewport.devicePixelRatio ** 2;
  const resourceScale =
    requestedPixels > MAX_BACKING_STORE_PIXELS
      ? Math.sqrt(MAX_BACKING_STORE_PIXELS / requestedPixels)
      : 1;
  const scale = viewport.devicePixelRatio * resourceScale;
  return {
    width: Math.max(1, Math.floor(viewport.viewportWidth * scale)),
    height: Math.max(1, Math.floor(viewport.viewportHeight * scale)),
    scale,
  };
}
