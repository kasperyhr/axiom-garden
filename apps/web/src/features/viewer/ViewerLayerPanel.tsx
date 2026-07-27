import type { LayerVisibilityOverrides, RenderScene } from "@axiom-garden/renderer";
import { Button, Eye, EyeOff, LockKeyhole } from "@axiom-garden/ui";

export function ViewerLayerPanel({
  onReset,
  onVisibilityChange,
  scene,
  visibility,
}: {
  readonly scene: RenderScene;
  readonly visibility: LayerVisibilityOverrides;
  readonly onVisibilityChange: (layerId: string, visible: boolean) => void;
  readonly onReset: () => void;
}) {
  return (
    <div>
      <div className="viewer-panel-heading">
        <h2>Layers</h2>
        <Button size="small" variant="ghost" onClick={onReset}>
          Reset layers
        </Button>
      </div>
      <ul className="viewer-layer-list">
        {scene.layers.map((layer) => {
          const visible = visibility[layer.id] ?? layer.visible;
          return (
            <li key={layer.id}>
              <button
                type="button"
                className="viewer-layer-toggle"
                aria-pressed={visible}
                onClick={() => onVisibilityChange(layer.id, !visible)}
              >
                <span aria-hidden="true">{visible ? <Eye /> : <EyeOff />}</span>
                <span>
                  <strong>{layer.name}</strong>
                  <small>
                    {layer.entityCount} entities · {layer.cellCount} cells
                  </small>
                </span>
                {layer.locked ? <LockKeyhole aria-label="Locked document layer" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
