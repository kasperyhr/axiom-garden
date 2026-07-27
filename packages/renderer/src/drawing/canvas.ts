import type { DrawCommand } from "./commands";
import type { ViewportState } from "../viewport/viewport";
import { getCanvasBackingStore } from "../viewport/viewport";

export interface Canvas2DContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setLineDash(segments: number[]): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fillText(text: string, x: number, y: number): void;
}

export function drawCommands(context: Canvas2DContext, commands: readonly DrawCommand[]): void {
  for (const command of commands) {
    context.setLineDash(
      command.kind === "line" || command.kind === "rect" ? [...(command.dash ?? [])] : [],
    );
    if (command.kind === "clear") {
      context.fillStyle = command.color;
      context.fillRect(0, 0, command.width, command.height);
    } else if (command.kind === "line") {
      context.beginPath();
      context.moveTo(command.from.x, command.from.y);
      context.lineTo(command.to.x, command.to.y);
      context.strokeStyle = command.color;
      context.lineWidth = command.width;
      context.stroke();
    } else if (command.kind === "rect") {
      if (command.fill) {
        context.fillStyle = command.fill;
        context.fillRect(command.x, command.y, command.width, command.height);
      }
      if (command.stroke) {
        context.strokeStyle = command.stroke;
        context.lineWidth = command.lineWidth ?? 1;
        context.strokeRect(command.x, command.y, command.width, command.height);
      }
    } else if (command.kind === "circle") {
      context.beginPath();
      context.arc(command.center.x, command.center.y, command.radius, 0, Math.PI * 2);
      if (command.fill) {
        context.fillStyle = command.fill;
        context.fill();
      }
      if (command.stroke) {
        context.strokeStyle = command.stroke;
        context.lineWidth = command.lineWidth ?? 1;
        context.stroke();
      }
    } else if (command.kind === "polygon") {
      const first = command.points[0];
      if (!first) continue;
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (const point of command.points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      if (command.fill) {
        context.fillStyle = command.fill;
        context.fill();
      }
      if (command.stroke) {
        context.strokeStyle = command.stroke;
        context.lineWidth = command.lineWidth ?? 1;
        context.stroke();
      }
    } else {
      context.fillStyle = command.color;
      context.font = command.font;
      context.textAlign = command.align ?? "left";
      context.fillText(command.text, command.position.x, command.position.y);
    }
  }
}

export function prepareCanvasBackingStore(
  canvas: { width: number; height: number },
  context: Canvas2DContext,
  viewport: ViewportState,
): void {
  const backingStore = getCanvasBackingStore(viewport);
  if (canvas.width !== backingStore.width) canvas.width = backingStore.width;
  if (canvas.height !== backingStore.height) canvas.height = backingStore.height;
  context.setTransform(backingStore.scale, 0, 0, backingStore.scale, 0, 0);
}
