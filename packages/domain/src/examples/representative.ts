import { WorldDocumentV1Schema } from "../schemas/world";

export const REPRESENTATIVE_WORLD_V1 = WorldDocumentV1Schema.parse({
  format: "axiom-garden/world",
  schemaVersion: 1,
  id: "world:quiet-orbit",
  metadata: {
    title: "Quiet Orbit",
    description: "A small abstract arrangement for format validation.",
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    tags: ["example", "abstract", "example"],
  },
  grid: {
    kind: "square",
    width: 12,
    height: 8,
    origin: "top-left",
    boundary: "bounded",
  },
  palette: {
    symbols: [
      {
        id: "symbol:moss-circle",
        name: "Moss circle",
        shape: "circle",
        appearance: { fill: "moss", stroke: "graphite", variant: "solid" },
        defaultProperties: { weight: 1, note: "calm" },
      },
      {
        id: "symbol:brass-diamond",
        name: "Brass diamond",
        shape: "diamond",
        appearance: { fill: "brass", stroke: "graphite", variant: "ring" },
        defaultProperties: { weight: 2, markers: [1, 2] },
      },
    ],
  },
  layers: [
    { id: "layer:annotations", name: "Annotations", order: 20, visible: true, locked: true },
    { id: "layer:objects", name: "Objects", order: 10, visible: true, locked: false },
  ],
  cells: [
    {
      id: "cell:anchor-b",
      layerId: "layer:annotations",
      coordinate: { x: 8, y: 5 },
      tags: ["quiet", "anchor"],
      properties: { label: "B" },
    },
    {
      id: "cell:anchor-a",
      layerId: "layer:annotations",
      coordinate: { x: 2, y: 1 },
      tags: ["anchor"],
      properties: {},
    },
  ],
  entities: [
    {
      id: "entity:diamond-001",
      symbolId: "symbol:brass-diamond",
      layerId: "layer:objects",
      coordinate: { x: 8, y: 5 },
      orientation: 90,
      properties: { weight: 3 },
    },
    {
      id: "entity:circle-001",
      symbolId: "symbol:moss-circle",
      layerId: "layer:objects",
      coordinate: { x: 2, y: 1 },
      orientation: 0,
      properties: { active: true },
    },
    {
      id: "entity:circle-002",
      symbolId: "symbol:moss-circle",
      layerId: "layer:objects",
      coordinate: { x: 2, y: 1 },
      orientation: 180,
      properties: { active: false },
    },
  ],
});
