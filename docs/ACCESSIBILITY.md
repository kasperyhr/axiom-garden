# 无障碍规范

## 目标

Axiom Garden 以 **WCAG 2.2 AA** 为产品目标。优先采用原生 HTML 语义，仅在原生语义不足时使用必要 ARIA。

## Milestone 2 已实现

- 页面具有 Top Bar、导航、唯一主内容区、顺序合理的标题与 Skip Link。
- 路由变化更新 title，并把键盘焦点移动到主内容。
- 所有按钮与链接具有清晰 `:focus-visible`，IconButton 在类型层要求可访问名称。
- Tabs 支持方向键、Home、End 和焦点管理。
- Dialog 提供 focus trap、Escape、关闭后焦点返回和背景滚动管理。
- Dropdown 支持方向键、Escape 与焦点；Tooltip 同时支持 hover、键盘 focus 与 Escape。
- Popover 支持点击外部和 Escape 关闭。
- Toast 使用 `aria-live`，最多保留三条，可手动关闭并自动消失。
- 状态组件同时使用文字与图标，不依赖颜色单独表达。
- `prefers-reduced-motion` 将动效 token 降至最小，关键内容不依赖动画。
- 桌面与移动主要控件目标接近或达到 44×44 CSS px。
- 390px、360px 视口的关键页面有水平溢出自动检查。
- light、dark 均使用独立、可读的语义色。

## 键盘交互约定

- `Tab` / `Shift+Tab`：按视觉和 DOM 顺序移动。
- Tabs：左右方向键切换；Home/End 移到首尾。
- Dropdown：上下方向键移动；Enter/Space 选择；Escape 关闭。
- Dialog/Popover/Tooltip：Escape 关闭；Dialog 内焦点不离开模态表面。
- 页面切换：主内容接收程序化焦点，但不产生滚动跳动。

不添加重复 landmark、错误 role 或仅为测试而存在的冗余 ARIA。

## 自动检查

`pnpm test:a11y` 使用 `@axe-core/playwright` 扫描：

- Home
- Workspace
- Components
- Not Found
- Help Dialog 打开状态

不全局关闭任何严重规则。Milestone 2 建立过程中 axe 实际发现并修复了 live region ARIA、对比度和 404 标题层级问题。

## Milestone 5 Canvas 观察模型

- Viewer Canvas 是一个可聚焦的只读观察面，具有可访问名称和快捷键说明，不为每个格子创建 DOM button。
- 方向键移动观察坐标；Home/End 到边界端点；Enter/Space 观察当前位置最上层对象；Escape 清除选择；`+`、`-` 和 `0` 控制视口。
- 键盘观察坐标有独立虚线轮廓；hover、cell selection、entity selection 使用不同线型或双线，状态不只依赖颜色。
- selection 变化通过克制的 `aria-live="polite"` 通知；hover 不连续播报。
- “Accessible scene summary” 提供世界、网格、可见图层、实体/cell 计数、tick、焦点、选择与 zoom；附近对象表最多显示 20 行。
- Inspector 以语义文本完整呈现 Entity、Cell 或空坐标信息，Canvas 不是唯一信息来源。
- 移动端 Layers 与 Inspector 使用既有可访问 Dialog；主要工具栏控制维持接近 44×44 CSS px 的触控目标。
- axe 覆盖 Viewer 初始、Entity selection、移动端 Inspector 与 dark theme；pointer pinch 数学由无 DOM 单元测试验证，并保留人工触控验收。

## 人工检查

自动工具不能替代人工测试。每次视觉或交互变更至少复核：

- 完整键盘路径、focus 可见性与焦点返回
- 200% 文本缩放、窄屏布局与触控目标
- light/dark 对比度和状态的非颜色表达
- 屏幕阅读器的 landmark、标题、Dialog 描述与 live region
