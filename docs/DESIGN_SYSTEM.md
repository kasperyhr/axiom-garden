# Axiom Garden 设计系统

## 设计原则

1. **安静而清晰**：层级来自留白、语义和细微表面差异，不依赖夸张动画。
2. **精密而温暖**：几何、节点、轨道与连线表达逻辑仪器；米白、灰绿、陶土与黄铜避免冰冷企业感。
3. **语义优先**：token 以用途命名，状态同时用文字、图标和颜色表达。
4. **无业务状态**：共享组件不包含 World、Rule、Cell 或其他领域概念。
5. **可访问默认值**：键盘、focus、reduced motion、触控目标和对比度不是可选增强。

## Token

权威文件为 `packages/ui/src/styles/tokens.css`。Tailwind 通过 `@theme inline` 引用相同 token，不复制色板。

### 颜色语义

- `canvas`：页面最底层环境。
- `surface`：常规卡片、面板、导航。
- `surface-elevated`：浮层和更高层级表面。
- `text-primary / secondary / muted`：按信息重要度分层。
- `border / border-strong`：结构边界与强调边界。
- `focus`：所有键盘焦点的高对比轮廓。
- `accent-clay`：主要行动与品牌能量。
- `accent-moss`：导航、结构和稳定强调。
- `accent-brass`：仪器刻度与精密细节。
- `success / warning / danger / info`：状态语义；每项都有适配背景色。

颜色值可随主题变化。组件不得通过具体十六进制值判断语义，也不得只用颜色传达状态。

### 字体

- Display、Heading：本地系统 serif 栈，营造精密出版与仪器感。
- Body、Label、Caption：系统 sans-serif 栈，优先可读性。
- Monospace：系统等宽栈，用于 token 和测量值。
- 不请求 Google Fonts 或其他远程字体。

### Spacing

以 4px 为基础，从 `space-1` 到 `space-20`。组件内部优先使用 4/8/12/16/24px；页面结构使用 24/32/40/48/64px。禁止为视觉微调大量引入独立数值。

### Radius

- small：按钮、菜单项、紧凑控件。
- medium：Card、Panel、Toast。
- large：Dialog 与主要展示表面。
- full：Badge、状态点和圆形图标容器。

### Shadow

- subtle：普通表面的最小分离。
- raised：交互卡或重要面板。
- overlay：Dialog、Popover、Dropdown、Toast。

暗色主题使用更深的环境阴影，不做亮色阴影反转。

### Motion

- fast：hover/focus 等即时反馈。
- normal：Dialog、Toast 等状态变化。
- slow：仅供未来克制的空间过渡。
- easing：统一的标准缓动。
- reduced motion：时长降至接近即时，信息理解不依赖动画。

### Layout

包含 page max width、content gutter、header height、sidebar width、inspector width、status bar height。Workspace 响应式布局必须引用这些语义尺寸。

## 组件使用原则

### Card 与 Panel

- Card 表示可独立理解的信息组；只有真实交互时使用 `interactive`。
- 信息卡不得伪装成按钮或链接。
- Panel 表示 App Shell 中持续存在的区域，例如侧栏、Inspector、说明面板。

### Dialog、Popover 与 Tooltip

- Dialog：阻断式任务、需要 focus trap 的帮助或移动抽屉。
- Popover：短小、非阻断、与触发器相关的上下文。
- Tooltip：补充说明，不能承载完成任务所必需的唯一信息。

### Button

一个区域只保留一个明确 primary。危险行为使用 danger 并配合清晰文案；loading 保持尺寸稳定并禁用重复触发；纯图标操作使用 IconButton 且必须提供名称。

### 状态与反馈

Badge 是分类或短标签；StatusIndicator 是实时或系统状态；Callout 是当前区域的重要说明；Toast 是短暂反馈，最多三条且可关闭。错误信息不得暴露 stack trace。

## 图标

唯一图标库为 **Lucide React 1.27.0**，许可证为 ISC，与 Apache-2.0 项目兼容。统一使用 24×24 viewBox、2px 圆角 stroke；装饰图标 `aria-hidden`，独立图标按钮必须有可访问名称。品牌 mark 与 favicon 是项目原创纯 SVG。

## Dark theme

暗色主题是低亮度仪器环境：

- 使用炭黑绿灰画布与分层表面，不使用纯黑/纯白硬反转。
- clay、moss、brass 和状态色分别重新校准。
- 阴影、边界和 muted text 在暗色下有独立值。
- 所有组件必须在 axe 与人工视觉检查中保持可读。

## 禁止模式

- 不引入霓虹赛博朋克、赌场、儿童玩具或通用企业蓝主导视觉。
- 不使用人物、动物、生命体、政治、宗教、民族、暴力或攻击性意象。
- 不散落无语义十六进制颜色，不创建第二套 token。
- 不用 Tooltip 隐藏关键说明，不用 Card 伪装无行为按钮。
- 不加载远程字体、第三方脚本、未许可素材或位图概念图。
- 不在 UI package 放入领域模型、数据持久化或 Worker 实现。
