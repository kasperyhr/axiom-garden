import type {
  CellRecordId,
  DomainColorToken,
  DomainProperties,
  EntityId,
  LayerId,
  Orientation,
  SymbolAppearanceV1,
  SymbolId,
  SymbolShape,
  WorldId,
} from "@axiom-garden/domain";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RenderGrid {
  readonly width: number;
  readonly height: number;
  readonly kind: "square";
  readonly origin: "top-left";
  readonly boundary: "bounded";
}

export interface RenderLayer {
  readonly id: LayerId;
  readonly name: string;
  readonly order: number;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly entityCount: number;
  readonly cellCount: number;
}

export interface RenderSymbol {
  readonly id: SymbolId;
  readonly name: string;
  readonly shape: SymbolShape;
  readonly appearance: SymbolAppearanceV1;
}

export interface RenderCell {
  readonly id: CellRecordId;
  readonly layerId: LayerId;
  readonly layerOrder: number;
  readonly coordinate: Point;
  readonly tags: readonly string[];
  readonly properties: DomainProperties;
}

export interface RenderEntity {
  readonly id: EntityId;
  readonly symbolId: SymbolId;
  readonly symbolName: string;
  readonly layerId: LayerId;
  readonly layerOrder: number;
  readonly coordinate: Point;
  readonly orientation: Orientation;
  readonly shape: SymbolShape;
  readonly appearance: SymbolAppearanceV1;
  readonly properties: DomainProperties;
}

export interface RenderBucket {
  readonly coordinate: Point;
  readonly cellIndexes: readonly number[];
  readonly entityIndexes: readonly number[];
}

export interface RenderScene {
  readonly source: "world" | "simulation";
  readonly sourceWorldId: WorldId;
  readonly title: string;
  readonly tick: number;
  readonly stateDigest: string | null;
  readonly sceneKey: string;
  readonly grid: RenderGrid;
  readonly bounds: Rect;
  readonly symbols: readonly RenderSymbol[];
  readonly layers: readonly RenderLayer[];
  readonly cells: readonly RenderCell[];
  readonly entities: readonly RenderEntity[];
  readonly buckets: readonly RenderBucket[];
}

export type LayerVisibilityOverrides = Readonly<Record<string, boolean>>;

export interface SceneCounts {
  readonly totalEntities: number;
  readonly visibleEntities: number;
  readonly totalCells: number;
  readonly visibleCells: number;
  readonly visibleLayers: number;
}

export interface RendererTheme {
  readonly name: "light" | "dark";
  readonly background: string;
  readonly gridMinor: string;
  readonly gridMajor: string;
  readonly boundary: string;
  readonly cellMarker: string;
  readonly selection: string;
  readonly hover: string;
  readonly keyboardFocus: string;
  readonly text: string;
  readonly glyphText: string;
  readonly domainColors: Readonly<Record<DomainColorToken, string>>;
}
