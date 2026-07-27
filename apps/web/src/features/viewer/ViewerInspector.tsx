import {
  getObjectsAtWorldCoordinate,
  type HitResult,
  type LayerVisibilityOverrides,
  type RenderScene,
} from "@axiom-garden/renderer";

function Properties({ value }: { readonly value: Readonly<Record<string, unknown>> }) {
  const entries = Object.entries(value);
  return entries.length === 0 ? (
    <span>None</span>
  ) : (
    <ul className="viewer-properties">
      {entries.map(([key, item]) => (
        <li key={key}>
          <code>{key}</code>: {JSON.stringify(item)}
        </li>
      ))}
    </ul>
  );
}

export function ViewerInspector({
  scene,
  selected,
  visibility,
}: {
  readonly scene: RenderScene;
  readonly selected: HitResult | null;
  readonly visibility: LayerVisibilityOverrides;
}) {
  if (!selected) {
    return (
      <div className="viewer-empty-detail">
        <h2>Inspector</h2>
        <p>Nothing selected</p>
      </div>
    );
  }
  const objects = getObjectsAtWorldCoordinate(scene, selected.worldCoordinate, visibility);
  const entity = objects.entities.find((candidate) => candidate.id === selected.entityId);
  const cell = objects.cells.find((candidate) => candidate.id === selected.cellId);
  const layer = scene.layers.find((candidate) => candidate.id === selected.layerId);
  if (entity) {
    return (
      <div>
        <h2>Inspector</h2>
        <dl className="viewer-detail-list">
          <div>
            <dt>Entity ID</dt>
            <dd>
              <code>{entity.id}</code>
            </dd>
          </div>
          <div>
            <dt>Symbol</dt>
            <dd>{entity.symbolName}</dd>
          </div>
          <div>
            <dt>Shape</dt>
            <dd>{entity.shape}</dd>
          </div>
          <div>
            <dt>Appearance</dt>
            <dd>
              {entity.appearance.variant} · {entity.appearance.fill}
            </dd>
          </div>
          <div>
            <dt>Layer</dt>
            <dd>{layer?.name ?? entity.layerId}</dd>
          </div>
          <div>
            <dt>Coordinate</dt>
            <dd>
              ({entity.coordinate.x}, {entity.coordinate.y})
            </dd>
          </div>
          <div>
            <dt>Orientation</dt>
            <dd>{entity.orientation}°</dd>
          </div>
          <div>
            <dt>Properties</dt>
            <dd>
              <Properties value={entity.properties} />
            </dd>
          </div>
        </dl>
      </div>
    );
  }
  if (cell) {
    return (
      <div>
        <h2>Inspector</h2>
        <dl className="viewer-detail-list">
          <div>
            <dt>Cell ID</dt>
            <dd>
              <code>{cell.id}</code>
            </dd>
          </div>
          <div>
            <dt>Layer</dt>
            <dd>{layer?.name ?? cell.layerId}</dd>
          </div>
          <div>
            <dt>Coordinate</dt>
            <dd>
              ({cell.coordinate.x}, {cell.coordinate.y})
            </dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>{cell.tags.join(", ") || "None"}</dd>
          </div>
          <div>
            <dt>Properties</dt>
            <dd>
              <Properties value={cell.properties} />
            </dd>
          </div>
        </dl>
      </div>
    );
  }
  return (
    <div>
      <h2>Inspector</h2>
      <p>
        Coordinate ({selected.worldCoordinate.x}, {selected.worldCoordinate.y})
      </p>
      <p>No object at this coordinate</p>
    </div>
  );
}
