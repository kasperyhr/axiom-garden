import {
  createAccessibleSceneSummary,
  getObjectsAtWorldCoordinate,
  type HitResult,
  type LayerVisibilityOverrides,
  type Point,
  type RenderScene,
} from "@axiom-garden/renderer";

export function ViewerSummary({
  focusCoordinate,
  scene,
  selected,
  visibility,
  zoom,
}: {
  readonly focusCoordinate: Point;
  readonly scene: RenderScene;
  readonly selected: HitResult | null;
  readonly visibility: LayerVisibilityOverrides;
  readonly zoom: number;
}) {
  const summary = createAccessibleSceneSummary(scene, {
    visibility,
    focusCoordinate,
    selectionCoordinate: selected?.worldCoordinate ?? null,
    zoom,
  });
  const nearby = getObjectsAtWorldCoordinate(scene, focusCoordinate, visibility).entities;
  return (
    <details className="viewer-accessible-summary">
      <summary>Accessible scene summary</summary>
      <dl className="viewer-summary-list">
        <div>
          <dt>World</dt>
          <dd>{summary.worldTitle}</dd>
        </div>
        <div>
          <dt>Grid</dt>
          <dd>{summary.dimensions}</dd>
        </div>
        <div>
          <dt>Visible layers</dt>
          <dd>
            {summary.visibleLayers} of {summary.totalLayers}
          </dd>
        </div>
        <div>
          <dt>Entities</dt>
          <dd>
            {summary.visibleEntities} visible of {summary.totalEntities}
          </dd>
        </div>
        <div>
          <dt>Cell records</dt>
          <dd>
            {summary.visibleCells} visible of {summary.totalCells}
          </dd>
        </div>
        <div>
          <dt>Tick</dt>
          <dd>{summary.tick}</dd>
        </div>
        <div>
          <dt>Keyboard focus</dt>
          <dd>{summary.focus}</dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>{summary.selection}</dd>
        </div>
        <div>
          <dt>Zoom</dt>
          <dd>{summary.zoom}</dd>
        </div>
      </dl>
      <h3>Objects at focused coordinate</h3>
      {nearby.length === 0 ? (
        <p>No visible entities at this coordinate.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Symbol</th>
              <th>Coordinate</th>
              <th>Orientation</th>
            </tr>
          </thead>
          <tbody>
            {nearby.slice(0, 20).map((entity) => (
              <tr key={entity.id}>
                <td>
                  <code>{entity.id}</code>
                </td>
                <td>{entity.symbolName}</td>
                <td>
                  {entity.coordinate.x}, {entity.coordinate.y}
                </td>
                <td>{entity.orientation}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
