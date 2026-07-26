import type { Coordinate, GridV1 } from "../schemas/world";

export function isCoordinateInBounds(coordinate: Coordinate, grid: GridV1): boolean {
  return (
    coordinate.x >= 0 &&
    coordinate.y >= 0 &&
    coordinate.x < grid.width &&
    coordinate.y < grid.height
  );
}

export function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

export function compareCoordinates(left: Coordinate, right: Coordinate): number {
  return left.y - right.y || left.x - right.x;
}
