# ADR 0007：采用独立 Canvas 2D Renderer

- 状态：Accepted
- 日期：2026-07-26

## 背景

World Document v1 的最大有界网格为 256×256，后续需要在浏览器中呈现数千个抽象 Entity、图层、缩放、平移和确定性 hit testing。Milestone 5 只需要只读观察，不应把编辑语义、React 生命周期或平台 API引入核心渲染逻辑。

## 决策

建立独立的 `@axiom-garden/renderer` 纯 TypeScript package，依赖 Domain 与 Engine 的公开只读边界。核心生成纯数据 RenderScene 与 draw commands；Web 负责 Canvas DOM、Pointer Events、键盘、ResizeObserver 和按需 requestAnimationFrame 调度。实际绘制使用原生 Canvas 2D 与最小 context 接口。

不采用 DOM/SVG-per-cell，也不引入 WebGL、Three.js、PixiJS、Konva、Fabric.js、Phaser 或其他完整图形框架。

## 理由

1. Canvas 2D 不需要为 65,536 个空格创建 DOM 节点，适合 bounded sparse world。
2. 原生 2D API足以绘制当前五种几何 shape、网格和观察轮廓，依赖与供应链最小。
3. 纯 scene、viewport、geometry、hit-test 和 draw-command 可在无 DOM 的 Node 测试中确定验证。
4. React adapter 与 Renderer 分离，避免 UI 重渲染策略污染 canonical scene 和几何规则。
5. 独立 theme 输入让 light/dark 可控，同时避免 Renderer 读取 CSS 或 document。
6. Canvas 的非视觉缺口通过语义 Inspector、scene summary、键盘模型和 live region 明确补齐。

## 后果

- Web 必须管理 Canvas 生命周期、高 DPI、pointer capture、ResizeObserver 和事件合并。
- 像素级快照会受跨平台抗锯齿影响，因此主回归门禁采用确定 draw-command 与 geometry tests；截图用于固定环境人工验收。
- Canvas 本身不提供逐对象 DOM 语义，必须持续维护可访问摘要和非视觉 Inspector。
- 若未来基准证明 Canvas 2D 无法满足正式规模，需要新 ADR 和兼容的 Renderer API演进；不得在无证据时提前引入 WebGL。
- Renderer 永远保持只读。Milestone 6 的编辑行为必须建立在独立交互/命令边界上。
