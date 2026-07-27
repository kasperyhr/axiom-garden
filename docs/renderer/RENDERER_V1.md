# Renderer v1

## 目标与边界

`@axiom-garden/renderer` 是确定、只读、无框架依赖的 Canvas 2D 渲染内核。它把已验证的 `WorldDocumentV1` 或 `SimulationStateV1` 投影为绘制数据，但不修改世界、不生成 TransitionPlan，也不包含 React、DOM 生命周期、网络、存储、时钟或随机源。

依赖方向固定为：

```text
@axiom-garden/domain
        ↓
@axiom-garden/engine
        ↓
@axiom-garden/renderer
        ↓
apps/web
```

## RenderScene

`createRenderSceneFromWorld` 和 `createRenderSceneFromSimulationState` 创建防御性复制、稳定排序的纯数据 `RenderScene`。Scene 包含 bounded square grid、symbols、layers、sparse cells、entities、bounds、来源 tick/digest、`rs1:` scene key，以及可从 canonical arrays 重建的坐标桶。

排序遵循 Domain/Engine 契约：layer 按 order/ID，cell 与 entity 按 layer order、y、x、ID。同一输入必得相同 scene；Scene 不包含 Canvas context、DOM node、React element、Map/Set 持久格式、当前时间或随机值。`rs1:` 是一致性 key，不是安全签名。

## 坐标系统

- World coordinate：非负整数 cell 坐标，原点左上，x 向右、y 向下。
- Scene coordinate：以逻辑 CSS pixel 表示，默认 cell size 为 48。
- Screen coordinate：Canvas 元素内 CSS pixel。
- Backing-store coordinate：仅由 Canvas adapter 按有效 DPR 缩放，不参与 hit-test API。

`worldToScene`、`sceneToWorld`、`sceneToScreen`、`screenToScene`、`worldToScreen`、`screenToWorld` 的转换在浮点容差内可逆。排序和转换不使用 locale。

## Viewport 与 Canvas/DPR

`ViewportState` 保存 offset、zoom、CSS viewport size、cell size 与 DPR。公开操作包括 create、pan、zoom-at-anchor、pinch、fit、center、clamp 和 visible bounds。

- zoom 范围：0.2–6。
- DPR 上限：3。
- 最小 Canvas 逻辑尺寸：64。
- backing store 上限：16,777,216 pixels。
- fit 默认 padding：32 CSS px。
- zoom-at-anchor 保持锚点对应 scene 位置不变；pinch 同时应用双指中心位移。

Web 通过 ResizeObserver 更新 CSS 尺寸；Canvas adapter 只在 backing 尺寸变化时重设像素缓冲，并始终恢复 DPR transform。

## 网格与绘制管线

`createDrawCommands` 生成确定的纯数据命令，`drawCommands` 只要求最小 Canvas 2D context 接口。顺序为：background、可视网格、world boundary、按 layer 排序的 cell marker 与 entities、hover/focus/selection overlays、可选 coordinate labels。

网格只遍历可视范围附近线段。单格低于 16 CSS px 时降低线密度，低于 8 CSS px 时进一步简化，以避免摩尔纹和无效工作。v1 只画有界世界。

## Entity shapes 与 appearance

支持 `circle`、`square`、`triangle`、`diamond`、`hexagon`，以及 `solid`、`outline`、`ring`、`dot`。Renderer 自带 light/dark domain palette，覆盖 moss、clay、brass、graphite、paper、blue、amber；不会解析任意 CSS、URL、SVG 或图片。

orientation 参与 polygon geometry。缩放过小时切换为简化圆形 glyph。Renderer 不读取 properties 的业务含义，也不根据 `active`、`charge` 等 key 改变外观。

## 同格布局与 Cell marker

- 1 entity：居中。
- 2 entities：确定的左右子位置。
- 3–4 entities：确定的象限子位置。
- 5+ entities：绘制 canonical order 前四个并显示 `+N`。

Cell Record 使用中性内框/虚线 marker，不解释 tags 或 properties。cell 先于同 layer entity 绘制。Entity selection 使用双实线；Cell selection 使用两层不同节奏虚线；hover 与键盘 focus 分别使用独立线型。

## Layer 与 hit testing

绘制遵循 layer order 与 canonical ID tie-break。文档 `visible` 可由 Web 的临时 `LayerVisibilityOverrides` 覆盖；override 不修改 World、SimulationState，也不持久化。

`hitTestScene` 接收 CSS pixel。`getObjectsAtWorldCoordinate` 通过有序坐标桶定位，不扫描所有实体；`pickTopmostObject` 先选择最高可见 layer 的 Entity，同 layer 选择反向绘制顺序最上层对象，没有 Entity 时选择 Cell，最后返回 empty coordinate。隐藏 layer 不参与绘制或命中。

## 交互与键盘

Renderer 只提供数学和纯数据结果；Web 保存 inspect/pan、hover、selection、keyboard coordinate 与 layer override。

- 鼠标：click inspect；中键或 Space+左键 pan；wheel zoom；Fit 按钮/双击策略可由 Web 调用。
- 触控：单指轻触 inspect、拖动 pan；双指以中心 pinch；pointer cancel 清理。
- 键盘：方向键观察，Home/End 到端点，Enter/Space 选择，Escape 清除，`+`/`-` zoom，`0` fit，Shift+方向键 pan。

drag threshold 为 6 CSS px，不提供惯性或永久 animation loop。

## 可访问性

Canvas 有名称与 `aria-describedby` 快捷键说明。键盘 focus coordinate 在 Canvas 上可见，selection 通过 polite live region 通知，hover 不播报。

独立的 Accessible scene summary 提供世界标题、grid、visible layers、entity/cell 总数与可见数、tick、focus、selection 和 zoom。Inspector 提供 Entity/Cell/empty coordinate 的结构化文本；附近对象表最多 20 行，避免把大网格映射为数万个 DOM 控件。

## Theme

`LIGHT_RENDERER_THEME` 与 `DARK_RENDERER_THEME` 是独立设计的 RendererTheme。Renderer 不读取 document class 或 CSS variable；Web 根据现有 system/light/dark 解析结果传入主题。主题只使用受信任的内置 palette。

## 性能与调度

- coordinate bucket 支持与单格对象数相关的 hit testing。
- drawing command 只生成可视网格线，并按可见 layer 过滤对象。
- Web 在 scene、viewport、theme、hover 或 selection 改变时请求一帧；同一 frame 合并请求，卸载时取消，不运行永久 60 FPS loop。
- `benchmark:renderer` 覆盖 1000 次转换/命中、draw command 与 4000-entity mock drawing，使用宽松预算检测意外非线性退化。

当前不引入 quadtree、WebGL、完整图形引擎或 Web Worker。

## 安全

Renderer 不执行用户代码，不使用 eval、Function、动态 import、网络、文件、外部图片、任意 SVG/HTML 或任意 CSS。DPR、backing pixels、grid、collection 和 zoom 均有边界。tags/properties 只作为 React 转义文本展示，不进入绘制决策。

## 未来 Editor 边界

Milestone 5 的 Canvas 只用于观察。添加、删除、移动、旋转编辑、拖放、属性表单、多选、Undo/Redo、工具箱与保存属于 Milestone 6 或以后。未来 Editor 必须在 Web/专用交互层把明确操作转换为经过验证的数据；不得把编辑语义塞入 Renderer。
