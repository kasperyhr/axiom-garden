import { z } from "zod";

import {
  CURRENT_WORLD_SCHEMA_VERSION,
  MAX_CELL_RECORDS,
  MAX_DESCRIPTION_LENGTH,
  MAX_ENTITIES,
  MAX_GRID_HEIGHT,
  MAX_GRID_WIDTH,
  MAX_LAYER_ORDER,
  MAX_LAYERS,
  MAX_NAME_LENGTH,
  MAX_SYMBOLS,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  WORLD_FORMAT,
} from "../constants/limits";
import {
  CellRecordIdSchema,
  EntityIdSchema,
  LayerIdSchema,
  SymbolIdSchema,
  WorldIdSchema,
} from "../identifiers/schemas";
import { DomainPropertiesSchema } from "./properties";

const nonBlankString = (maximum: number) =>
  z.string().max(maximum).regex(/\S/u, "Value must not be blank");

export const TagSchema = nonBlankString(MAX_TAG_LENGTH);
export const TagListSchema = z.array(TagSchema).max(MAX_TAGS);

export const WorldMetadataV1Schema = z.strictObject({
  title: nonBlankString(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
  createdAt: z.iso.datetime({ offset: false, precision: 3 }),
  updatedAt: z.iso.datetime({ offset: false, precision: 3 }),
  tags: TagListSchema,
});

export const GridV1Schema = z.strictObject({
  kind: z.literal("square"),
  width: z.int().min(1).max(MAX_GRID_WIDTH),
  height: z.int().min(1).max(MAX_GRID_HEIGHT),
  origin: z.literal("top-left"),
  boundary: z.literal("bounded"),
});

export const CoordinateSchema = z.strictObject({
  x: z.int().nonnegative(),
  y: z.int().nonnegative(),
});

export const SymbolShapeSchema = z.enum(["circle", "square", "triangle", "diamond", "hexagon"]);
export const DomainColorTokenSchema = z.enum([
  "moss",
  "clay",
  "brass",
  "graphite",
  "paper",
  "blue",
  "amber",
]);
export const SymbolVariantSchema = z.enum(["solid", "outline", "ring", "dot"]);

export const SymbolAppearanceV1Schema = z.strictObject({
  fill: DomainColorTokenSchema,
  stroke: DomainColorTokenSchema,
  variant: SymbolVariantSchema,
});

export const SymbolDefinitionV1Schema = z.strictObject({
  id: SymbolIdSchema,
  name: nonBlankString(MAX_NAME_LENGTH),
  shape: SymbolShapeSchema,
  appearance: SymbolAppearanceV1Schema,
  defaultProperties: DomainPropertiesSchema,
});

export const PaletteV1Schema = z.strictObject({
  symbols: z.array(SymbolDefinitionV1Schema).max(MAX_SYMBOLS),
});

export const LayerV1Schema = z.strictObject({
  id: LayerIdSchema,
  name: nonBlankString(MAX_NAME_LENGTH),
  order: z.int().min(0).max(MAX_LAYER_ORDER),
  visible: z.boolean(),
  locked: z.boolean(),
});

export const CellRecordV1Schema = z.strictObject({
  id: CellRecordIdSchema,
  layerId: LayerIdSchema,
  coordinate: CoordinateSchema,
  tags: TagListSchema,
  properties: DomainPropertiesSchema,
});

export const OrientationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

export const EntityV1Schema = z.strictObject({
  id: EntityIdSchema,
  symbolId: SymbolIdSchema,
  layerId: LayerIdSchema,
  coordinate: CoordinateSchema,
  orientation: OrientationSchema,
  properties: DomainPropertiesSchema,
});

export const WorldDocumentV1Schema = z.strictObject({
  format: z.literal(WORLD_FORMAT),
  schemaVersion: z.literal(CURRENT_WORLD_SCHEMA_VERSION).and(z.int()),
  id: WorldIdSchema,
  metadata: WorldMetadataV1Schema,
  grid: GridV1Schema,
  palette: PaletteV1Schema,
  layers: z.array(LayerV1Schema).min(1).max(MAX_LAYERS),
  cells: z.array(CellRecordV1Schema).max(MAX_CELL_RECORDS),
  entities: z.array(EntityV1Schema).max(MAX_ENTITIES),
});

export type WorldMetadataV1 = z.infer<typeof WorldMetadataV1Schema>;
export type GridV1 = z.infer<typeof GridV1Schema>;
export type Coordinate = z.infer<typeof CoordinateSchema>;
export type SymbolShape = z.infer<typeof SymbolShapeSchema>;
export type DomainColorToken = z.infer<typeof DomainColorTokenSchema>;
export type SymbolVariant = z.infer<typeof SymbolVariantSchema>;
export type SymbolAppearanceV1 = z.infer<typeof SymbolAppearanceV1Schema>;
export type SymbolDefinitionV1 = z.infer<typeof SymbolDefinitionV1Schema>;
export type PaletteV1 = z.infer<typeof PaletteV1Schema>;
export type LayerV1 = z.infer<typeof LayerV1Schema>;
export type CellRecordV1 = z.infer<typeof CellRecordV1Schema>;
export type Orientation = z.infer<typeof OrientationSchema>;
export type EntityV1 = z.infer<typeof EntityV1Schema>;
export type WorldDocumentV1 = z.infer<typeof WorldDocumentV1Schema>;
