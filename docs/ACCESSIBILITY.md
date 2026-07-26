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

## 人工检查

自动工具不能替代人工测试。每次视觉或交互变更至少复核：

- 完整键盘路径、focus 可见性与焦点返回
- 200% 文本缩放、窄屏布局与触控目标
- light/dark 对比度和状态的非颜色表达
- 屏幕阅读器的 landmark、标题、Dialog 描述与 live region
